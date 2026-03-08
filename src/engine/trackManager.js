/**
 * trackManager.js
 * All mutations to player resource tracks (water_claim, money, pr).
 * Returns immutable state patches — never mutates the state object directly.
 *
 * Every public function returns:
 *   { playerPatch, logEntries, pendingEffects }
 *
 *   playerPatch:     Partial PlayerState to merge in
 *   logEntries:      Array of log objects describing what happened
 *   pendingEffects:  Any side-effects that need resolving (e.g. milestone VP grant,
 *                    threshold discount unlock, discard-condition card removals)
 */

import { applyDelta, clamp, evaluateDiscardCondition } from './utils.js';
import { TRACK_BOUNDS, VP_MILESTONES, PR_THRESHOLDS, RESOURCES } from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find VP milestones crossed when moving from `oldVal` to `newVal`.
 * Only awards milestones not yet in `alreadyTriggered`.
 * @param {string}   trackKey
 * @param {number}   oldVal
 * @param {number}   newVal
 * @param {number[]} alreadyTriggered
 * @returns {{ milestoneVp: number, newTriggered: number[] }}
 */
function checkMilestones(trackKey, oldVal, newVal, alreadyTriggered) {
  const milestones = VP_MILESTONES[trackKey] ?? [];
  const triggered  = [...alreadyTriggered];
  let   milestoneVp = 0;

  for (const m of milestones) {
    if (!triggered.includes(m.at) && oldVal < m.at && newVal >= m.at) {
      milestoneVp += m.vp;
      triggered.push(m.at);
    }
  }

  return { milestoneVp, newTriggered: triggered };
}

/**
 * Detect PR threshold crossing for the free-lawyer-acquisition benefit.
 * Returns the threshold values now newly active (crossed into from outside).
 * @param {number} oldPr
 * @param {number} newPr
 * @returns {number[]}
 */
function checkPrThresholds(oldPr, newPr) {
  return PR_THRESHOLDS.FREE_LAWYER_ACQUISITION.filter(t => {
    const wasAt = oldPr === t;
    const isAt  = newPr === t;
    return !wasAt && isAt;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core mutator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a delta to one of a player's resource tracks.
 *
 * @param {Object} playerState   Current PlayerState
 * @param {'water_claim'|'money'|'pr'} trackKey
 * @param {number} delta         Positive = gain, negative = loss
 * @param {string} reason        Human-readable reason (for log)
 * @returns {{ playerPatch: Object, logEntries: Object[], pendingEffects: Object[] }}
 */
export function applyTrackDelta(playerState, trackKey, delta, reason = '') {
  const trackStateKey = {
    water_claim: 'waterClaimTrack',
    money:       'moneyTrack',
    pr:          'prTrack',
  }[trackKey];

  if (!trackStateKey) throw new Error(`Unknown trackKey: ${trackKey}`);

  const track  = playerState[trackStateKey];
  const bounds = TRACK_BOUNDS[trackKey];
  const oldVal = track.value;
  const newVal = applyDelta(oldVal, delta, bounds.min, bounds.max, bounds.hard_cap);

  const logEntries    = [];
  const pendingEffects = [];

  // ── Milestone VP check ───────────────────────────────────────────────────
  const { milestoneVp, newTriggered } = checkMilestones(
    trackKey, oldVal, newVal, track.milestonesTriggered
  );

  if (milestoneVp > 0) {
    logEntries.push({
      type:      'milestone_vp',
      playerId:  playerState.id,
      trackKey,
      milestone: newVal,
      vp:        milestoneVp,
      message:   `${playerState.name} reaches ${trackKey} milestone at ${newVal}: +${milestoneVp} VP`,
    });
    pendingEffects.push({
      type:     'grant_vp',
      playerId: playerState.id,
      amount:   milestoneVp,
      reason:   `${trackKey} milestone at ${newVal}`,
    });
  }

  // ── PR threshold check ───────────────────────────────────────────────────
  if (trackKey === 'pr') {
    const crossedThresholds = checkPrThresholds(oldVal, newVal);
    for (const t of crossedThresholds) {
      logEntries.push({
        type:      'pr_threshold',
        playerId:  playerState.id,
        threshold: t,
        message:   `${playerState.name} reaches PR ${t}: free lawyer acquisition discount active`,
      });
      pendingEffects.push({
        type:      'pr_threshold_reached',
        playerId:  playerState.id,
        threshold: t,
      });
    }
  }

  // ── Build patch ───────────────────────────────────────────────────────────
  const updatedTrack = {
    ...track,
    value:               newVal,
    milestonesTriggered: newTriggered,
  };

  logEntries.unshift({
    type:     'track_change',
    playerId: playerState.id,
    trackKey,
    from:     oldVal,
    to:       newVal,
    delta,
    reason,
    message:  `${playerState.name} ${delta >= 0 ? 'gains' : 'loses'} ${Math.abs(delta)} ${trackKey} (${oldVal} → ${newVal})${reason ? ': ' + reason : ''}`,
  });

  return {
    playerPatch:    { [trackStateKey]: updatedTrack },
    logEntries,
    pendingEffects,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VP direct grant (milestones, SC cases, card passives)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grant VP directly (not via a track milestone).
 * @param {Object} playerState
 * @param {number} amount
 * @param {string} reason
 * @returns {{ playerPatch: Object, logEntries: Object[], pendingEffects: Object[] }}
 */
export function grantVP(playerState, amount, reason = '') {
  const newVp = playerState.vp + amount;
  return {
    playerPatch:    { vp: newVp },
    logEntries:     [{
      type:    'vp_grant',
      playerId: playerState.id,
      amount,
      total:   newVp,
      reason,
      message: `${playerState.name} gains ${amount} VP (total: ${newVp})${reason ? ': ' + reason : ''}`,
    }],
    pendingEffects: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Water cube management (physical cubes, not claim track)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adjust a player's physical water cube count.
 * @param {Object} playerState
 * @param {number} delta
 * @param {string} reason
 */
export function applyWaterCubeDelta(playerState, delta, reason = '') {
  const newVal = Math.max(0, playerState.waterCubes + delta);
  return {
    playerPatch:    { waterCubes: newVal },
    logEntries:     [{
      type:     'water_cube_change',
      playerId:  playerState.id,
      from:     playerState.waterCubes,
      to:       newVal,
      delta,
      reason,
      message:  `${playerState.name} ${delta >= 0 ? 'gains' : 'loses'} ${Math.abs(delta)} water cube(s) (total: ${newVal})`,
    }],
    pendingEffects: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Discard condition checker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check all cards in a player's tableau for discard conditions.
 * Call this after any track update.
 *
 * @param {Object}   playerState
 * @param {Object}   cardIndex    { [cardId]: CardDefinition }
 * @returns {{ cardsToDiscard: string[], logEntries: Object[] }}
 *   cardsToDiscard: instanceIds that must be removed from tableau
 */
export function checkDiscardConditions(playerState, cardIndex) {
  const resources = {
    pr:          playerState.prTrack.value,
    money:       playerState.moneyTrack.value,
    water_claim: playerState.waterClaimTrack.value,
  };

  const cardsToDiscard = [];
  const logEntries     = [];

  for (const instance of playerState.tableau) {
    const cardDef = cardIndex[instance.cardId];
    if (!cardDef?.discard_condition) continue;

    if (evaluateDiscardCondition(cardDef.discard_condition, resources)) {
      cardsToDiscard.push(instance.instanceId);
      logEntries.push({
        type:      'discard_condition_met',
        playerId:  playerState.id,
        cardId:    instance.cardId,
        cardName:  cardDef.name,
        condition: cardDef.discard_condition,
        message:   `${playerState.name}'s ${cardDef.name} is discarded (discard condition met)`,
      });
    }
  }

  return { cardsToDiscard, logEntries };
}

// ─────────────────────────────────────────────────────────────────────────────
// PR requirement check for lawyer acquisition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can a player acquire a specific lawyer card given their current PR?
 * @param {Object} cardDef   Card definition from cards.json
 * @param {number} currentPr
 * @returns {boolean}
 */
export function canAcquireWithPr(cardDef, currentPr) {
  if (!cardDef.pr_requirement) return true;
  const req = cardDef.pr_requirement;
  switch (req.operator) {
    case 'lte': return currentPr <= req.value;
    case 'gte': return currentPr >= req.value;
    default:    return true;
  }
}

/**
 * Compute the effective acquisition cost for a lawyer card.
 * Discount applies if player is at PR -7 or +8.
 * @param {Object} cardDef
 * @param {number} currentPr
 * @returns {number}  Total money cost
 */
export function lawyerAcquisitionCost(cardDef, currentPr) {
  const SURCHARGE = 4;
  const atThreshold = PR_THRESHOLDS.FREE_LAWYER_ACQUISITION.includes(currentPr);
  return cardDef.cost + (atThreshold ? 0 : SURCHARGE);
}
