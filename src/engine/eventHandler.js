/**
 * eventHandler.js
 * Resolves all event card effects from the shared_board.json event_deck.
 *
 * Called by phaseManager during the EVENT phase.
 * Each resolver returns a StateUpdate (same shape as effectResolver).
 */

import { rollDie, drawFrom } from './utils.js';
import { applyResourceDelta, emptyUpdate, mergeUpdates } from './effectResolver.js';
import { RESOURCES } from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Event phase entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flip the top event card, place it in the active slot, and resolve its effect.
 * After resolution the card cycles to the bottom of the deck.
 *
 * @param {Object}   state
 * @param {Function} rollFn   Optional seeded RNG for testing (()=>number, 0–1)
 * @returns {StateUpdate & { requiresPlayerInput: boolean }}
 */
export function resolveEventPhase(state, rollFn = Math.random) {
  const { eventDeck } = state.sharedBoard;

  if (eventDeck.length === 0) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: 'Event deck is empty — skipping event phase' }],
      requiresPlayerInput: false,
    };
  }

  const { drawn: [eventCardId], remaining } = drawFrom(eventDeck, 1);
  // Card cycles: goes to bottom after resolution
  const newEventDeck = [...remaining, eventCardId];

  const logEntry = {
    type:    'event_revealed',
    cardId:  eventCardId,
    message: `Event revealed: ${eventCardId}`,
  };

  // Place in active slot (for UI display during resolution)
  const setupPatch = {
    playerPatches:  {},
    sharedPatches:  { eventDeck: newEventDeck, activeEvent: eventCardId },
    logEntries:     [logEntry],
    pendingEffects: [],
  };

  // Dispatch to specific resolver
  let effectUpdate;
  switch (eventCardId) {
    case 'supreme_court_session':
      effectUpdate = resolveSupremeCourtSession(state);
      break;
    case 'severe_drought':
      effectUpdate = resolveSevereDrought(state, rollFn);
      break;
    case 'large_snow_melt':
      effectUpdate = resolveLargeSnowMelt(state, rollFn);
      break;
    case 'protest_a':
      effectUpdate = resolveProtest(state, 'protest_a');
      break;
    case 'protest_b':
      effectUpdate = resolveProtest(state, 'protest_b');
      break;
    default:
      console.warn(`eventHandler: unknown event card "${eventCardId}"`);
      effectUpdate = emptyUpdate();
  }

  const combined = mergeUpdates(setupPatch, effectUpdate);

  // Clear activeEvent after resolution (end of event phase)
  combined.sharedPatches = {
    ...combined.sharedPatches,
    activeEvent: null,
  };

  return {
    ...combined,
    requiresPlayerInput: effectUpdate.requiresPlayerInput ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Supreme Court Session
// "Resolve the Supreme Court case that is in the docket, then move it to last"
// ─────────────────────────────────────────────────────────────────────────────

function resolveSupremeCourtSession(state) {
  const { docket } = state.sharedBoard;

  if (docket.length === 0) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: 'SC Session: docket is empty — no case to resolve' }],
    };
  }

  // Defer to the SC resolver — emit as a pendingEffect so scResolver handles rewards
  return {
    ...emptyUpdate(),
    pendingEffects: [{
      type:   'resolve_sc_case',
      caseId: docket[0],
    }],
    logEntries: [{
      type:    'sc_session_triggered',
      caseId:  docket[0],
      message: `Supreme Court Session: resolving ${docket[0]}`,
    }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Severe Drought
// "Roll 1 d6 during water determination. Subtract that many blue cubes."
// ─────────────────────────────────────────────────────────────────────────────

function resolveSevereDrought(state, rollFn) {
  const roll = rollDie(6, rollFn);
  const newSupply = Math.max(0, state.sharedBoard.waterSupply - roll);

  return {
    playerPatches:  {},
    sharedPatches:  { waterSupply: newSupply, droughtRoll: roll },
    logEntries:     [{
      type:    'severe_drought',
      roll,
      from:    state.sharedBoard.waterSupply,
      to:      newSupply,
      message: `Severe Drought: rolled ${roll} — water supply reduced from ${state.sharedBoard.waterSupply} to ${newSupply}`,
    }],
    pendingEffects: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Large Snow Melt
// "Roll 1 d6 during water determination. Add that many blue cubes."
// ─────────────────────────────────────────────────────────────────────────────

function resolveLargeSnowMelt(state, rollFn) {
  const roll = rollDie(6, rollFn);
  const newSupply = state.sharedBoard.waterSupply + roll;

  return {
    playerPatches:  {},
    sharedPatches:  { waterSupply: newSupply, snowMeltRoll: roll },
    logEntries:     [{
      type:    'large_snow_melt',
      roll,
      from:    state.sharedBoard.waterSupply,
      to:      newSupply,
      message: `Large Snow Melt: rolled ${roll} — water supply increased from ${state.sharedBoard.waterSupply} to ${newSupply}`,
    }],
    pendingEffects: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Protest A & B
// "All players activate activists if they choose to.
//  Player(s) with lowest protestor influence lose [penalty]."
// ─────────────────────────────────────────────────────────────────────────────

function resolveProtest(state, protestCardId) {
  // Protest resolution requires player interaction (activist activation choices)
  // Emit as a pendingEffect — the UI drives activist selection per player,
  // then calls commitProtestResolution() below.
  return {
    ...emptyUpdate(),
    requiresPlayerInput: true,
    pendingEffects: [{
      type:       'protest_activation_round',
      protestId:  protestCardId,
      playerOrder: [...state.playerOrder],
      message:    `Protest ${protestCardId}: all players may activate activists`,
    }],
    logEntries: [{
      type:    'protest_started',
      cardId:  protestCardId,
      message: `Protest event: ${protestCardId} — players may activate activists`,
    }],
  };
}

/**
 * Called after all players have declared their protest influence for this event.
 * Applies penalties to the player(s) with lowest influence.
 *
 * @param {Object}   state
 * @param {string}   protestCardId   'protest_a' | 'protest_b'
 * @param {Object}   cardIndex       { [cardId]: CardDefinition }
 * @returns {StateUpdate}
 */
export function commitProtestResolution(state, protestCardId, cardIndex) {
  const cardDef   = cardIndex[protestCardId];
  const penalties = cardDef?.actions?.C?.penalty ?? [];

  // Find minimum protest influence
  const influences = state.playerOrder.map(pid => ({
    playerId:         pid,
    protestInfluence: state.players[pid].protestInfluence ?? 0,
  }));

  const minInfluence = Math.min(...influences.map(i => i.protestInfluence));
  const losers       = influences.filter(i => i.protestInfluence === minInfluence);

  let update = emptyUpdate();

  for (const loser of losers) {
    for (const penalty of penalties) {
      const penUpdate = applyResourceDelta(
        state,
        loser.playerId,
        penalty.resource,
        -Math.abs(penalty.amount),
        `Protest ${protestCardId} penalty (lowest influence: ${minInfluence})`
      );
      update = mergeUpdates(update, penUpdate);
    }
    update.logEntries.push({
      type:      'protest_penalty',
      playerId:  loser.playerId,
      influence: loser.protestInfluence,
      message:   `${state.players[loser.playerId].name} has lowest protest influence (${loser.protestInfluence}) — receives ${protestCardId} penalties`,
    });
  }

  // Reset all protest influence after resolution
  const resetPatches = {};
  for (const pid of state.playerOrder) {
    resetPatches[pid] = { protestInfluence: 0 };
  }

  return mergeUpdates(update, {
    playerPatches:  resetPatches,
    sharedPatches:  {},
    logEntries:     [{ type: 'protest_resolved', message: `Protest ${protestCardId} resolved` }],
    pendingEffects: [],
  });
}
