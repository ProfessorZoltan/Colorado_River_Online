/**
 * scResolver.js
 * Resolves Supreme Court cases from the docket.
 *
 * Rules (from shared_board.json and cards.json sc_case entries):
 *  1. The active case (docket[0]) is resolved.
 *  2. Compare SC influence for the case between plaintiff and defendant factions.
 *  3. Higher influence wins. Ties go to the plaintiff (standard board-game convention —
 *     override via config if the actual rule differs).
 *  4. Apply winner_reward to the winning player, loser_penalty to the losing player.
 *  5. Shift docket left; move resolved case to the end (face-up, cycling queue).
 *  6. Fire any passive triggers (e.g. "In it for Glory" — +1 VP on SC win).
 */

import { applyResourceDelta, mergeUpdates, emptyUpdate } from './effectResolver.js';
import { RESOURCES } from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the SC case at docket[0].
 *
 * @param {Object} state          Full GameState
 * @returns {StateUpdate}
 */
export function resolveActiveSCCase(state) {
  const { docket } = state.sharedBoard;

  if (docket.length === 0) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: 'SC resolver: docket is empty' }],
    };
  }

  const caseId  = docket[0];
  const caseDef = state.cardIndex[caseId];

  if (!caseDef) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'error', message: `SC resolver: unknown case "${caseId}"` }],
    };
  }

  const plaintiffFactionId = caseDef.plaintiff.id;
  const defendantFactionId = caseDef.defendant.id;

  // Find which players represent plaintiff and defendant
  const plaintiffPlayerId = findPlayerByFaction(state, plaintiffFactionId);
  const defendantPlayerId = findPlayerByFaction(state, defendantFactionId);

  if (!plaintiffPlayerId || !defendantPlayerId) {
    return {
      ...emptyUpdate(),
      logEntries: [{
        type:    'error',
        message: `SC resolver: could not find players for factions ${plaintiffFactionId} / ${defendantFactionId}`,
      }],
    };
  }

  // ── Determine winner by SC influence ────────────────────────────────────
  const plaintiffInfluence = state.players[plaintiffPlayerId].scInfluence[caseId] ?? 0;
  const defendantInfluence = state.players[defendantPlayerId].scInfluence[caseId] ?? 0;

  // Tie → plaintiff wins (convention; adjust here if rulebook says otherwise)
  const winnerId = plaintiffInfluence >= defendantInfluence ? plaintiffPlayerId : defendantPlayerId;
  const loserId  = winnerId === plaintiffPlayerId ? defendantPlayerId : plaintiffPlayerId;

  const winnerInfluence = state.players[winnerId].scInfluence[caseId] ?? 0;
  const loserInfluence  = state.players[loserId].scInfluence[caseId]  ?? 0;
  const isTie           = plaintiffInfluence === defendantInfluence;

  let update = emptyUpdate();

  // Log the outcome
  update.logEntries.push({
    type:              'sc_case_resolved',
    caseId,
    caseName:          caseDef.name,
    winnerId,
    loserId,
    winnerInfluence,
    loserInfluence,
    isTie,
    message: `SC Case: ${caseDef.name} — ${state.players[winnerId].name} wins ` +
             `(${winnerInfluence} vs ${loserInfluence} influence)${isTie ? ' [plaintiff wins tie]' : ''}`,
  });

  // ── Apply winner rewards ────────────────────────────────────────────────
  for (const reward of (caseDef.winner_reward ?? [])) {
    update = mergeUpdates(
      update,
      applyResourceDelta(state, winnerId, reward.resource, reward.amount, `SC win: ${caseDef.name}`)
    );
  }

  // ── Apply loser penalties ───────────────────────────────────────────────
  for (const penalty of (caseDef.loser_penalty ?? [])) {
    update = mergeUpdates(
      update,
      applyResourceDelta(state, loserId, penalty.resource, -Math.abs(penalty.amount), `SC loss: ${caseDef.name}`)
    );
  }

  // ── Docket: shift left, append resolved case to end ────────────────────
  const newDocket = [...docket.slice(1), caseId];
  const prevResolved = state.sharedBoard.casesResolvedThisRound ?? [];
  update.sharedPatches = {
    ...update.sharedPatches,
    docket: newDocket,
    casesResolvedThisRound: [...prevResolved, { caseId, winnerId }],
  };

  // ── Reset SC influence for this case (for the next time it cycles around) ─
  const influenceResets = {};
  for (const pid of state.playerOrder) {
    influenceResets[pid] = {
      scInfluence: { ...state.players[pid].scInfluence, [caseId]: 0 },
    };
  }
  update = mergeUpdates(update, { playerPatches: influenceResets, sharedPatches: {}, logEntries: [], pendingEffects: [] });

  // ── Passive trigger: "In it for Glory" — +1 VP on SC win ───────────────
  const winnerTableau = state.players[winnerId].tableau ?? [];
  for (const instance of winnerTableau) {
    const cardDef = state.cardIndex[instance.cardId];
    if (cardDef?.passive?.trigger === 'on_win_sc_case') {
      const vpUpdate = applyResourceDelta(state, winnerId, RESOURCES.VP, 1, `${cardDef.name} passive: SC win`);
      update = mergeUpdates(update, vpUpdate);
      update.logEntries.push({
        type:     'passive_triggered',
        cardId:   instance.cardId,
        playerId: winnerId,
        message:  `${state.players[winnerId].name}'s ${cardDef.name} triggers: +1 VP for winning SC case`,
      });
    }
  }

  return update;
}

/**
 * Resolve a specific SC case by ID (used when players use card abilities that
 * target a non-active docket position — currently no such cards, but future-proofed).
 */
export function resolveSpecificSCCase(state, caseId) {
  // Temporarily swap the target case to index 0 for resolution logic,
  // then restore docket order (minus resolved case, appended to end).
  const { docket } = state.sharedBoard;
  const targetIdx = docket.indexOf(caseId);

  if (targetIdx === -1) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'error', message: `Case ${caseId} not found in docket` }],
    };
  }

  // Temporarily reorder so target is at index 0
  const reordered = [caseId, ...docket.filter(id => id !== caseId)];
  const tempState  = { ...state, sharedBoard: { ...state.sharedBoard, docket: reordered } };
  return resolveActiveSCCase(tempState);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the player ID whose faction matches the given faction ID.
 * @param {Object} state
 * @param {string} factionId
 * @returns {string|null}
 */
function findPlayerByFaction(state, factionId) {
  return state.playerOrder.find(pid => state.players[pid].factionId === factionId) ?? null;
}
