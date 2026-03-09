/**
 * phaseManager.js
 * Drives the round and phase lifecycle.
 *
 * Round structure:
 *   EVENT → ACTION_N → WATER → ACTION_C → INCOME → CLEANUP
 *
 * Each phase has:
 *   - An `enter` function: sets up phase state, returns StateUpdate
 *   - Actions that players take during the phase (dispatched by gameStore)
 *   - An `exit` function: validates phase completion, advances to next
 */

import { PHASES, PHASE_ORDER, EXHAUST_STATES, MAX_ROUNDS } from './constants.js';
import { resolveEventPhase } from './eventHandler.js';
import { resolveActiveSCCase } from './scResolver.js';
import { resolveIncomePhase, emptyUpdate, mergeUpdates } from './effectResolver.js';
import { applyTrackDelta } from './trackManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// Phase entry points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enter the EVENT phase: reveal and resolve the top event card.
 */
function enterEventPhase(state, rollFn) {
  const update = resolveEventPhase(state, rollFn);
  return {
    ...update,
    sharedPatches: { ...update.sharedPatches },
    logEntries: [
      { type: 'phase_start', phase: PHASES.EVENT, round: state.round,
        message: `Round ${state.round} — Event Phase` },
      ...update.logEntries,
    ],
  };
}

/**
 * Enter ACTION_N or ACTION_C phase.
 * Sets activePlayerIndex to 0, logs phase start.
 */
function enterActionPhase(state, phase) {
  return {
    ...emptyUpdate(),
    logEntries: [{
      type:    'phase_start',
      phase,
      round:   state.round,
      message: `Round ${state.round} — ${phase === PHASES.ACTION_N ? 'Action (N)' : 'Court (C)'} Phase — ${state.players[state.playerOrder[0]].name} goes first`,
    }],
  };
}

/**
 * Enter WATER phase: compute water supply from water_claim tracks.
 * The water supply is the sum of all players' water_claim track values.
 * Each player then allocates water cubes to their projects.
 */
function enterWaterPhase(state) {
  const totalWaterClaims = state.playerOrder.reduce(
    (sum, pid) => sum + state.players[pid].waterClaimTrack.value, 0
  );

  // Apply drought/snow-melt modifiers from active event (if any applied a delta)
  // Those are already applied to sharedBoard.waterSupply by eventHandler.
  // We set a fresh baseline here if waterSupply is 0 (start of game / first water phase).
  const waterSupply = state.sharedBoard.waterSupply > 0
    ? state.sharedBoard.waterSupply  // Already modified by event card
    : totalWaterClaims;

  return {
    ...emptyUpdate(),
    sharedPatches: { waterSupply, droughtRoll: null, snowMeltRoll: null },
    logEntries:    [{
      type:    'phase_start',
      phase:   PHASES.WATER,
      round:   state.round,
      waterSupply,
      message: `Round ${state.round} — Water Phase (supply: ${waterSupply})`,
    }],
    // Water allocation is interactive — emitted as pendingEffect for UI
    pendingEffects: [{
      type:    'water_allocation',
      supply:  waterSupply,
      message: 'Players must allocate water cubes to their projects',
    }],
  };
}

/**
 * Enter INCOME phase: resolve all fully-watered project rewards, then apply
 * the incomplete-project penalty.
 *
 * Incomplete-project penalty rule:
 *   After payouts, if a player has >= 1 project where 0 < watered < water_slots,
 *   they lose 1 space on their Water Claim track.
 *   Partial water is kept -- it carries over to the next round.
 *   Fully-watered projects reset to 0 (cubes return to supply) as normal.
 */
function enterIncomePhase(state, boardTemplate) {
  let update = {
    ...emptyUpdate(),
    logEntries: [{
      type:    'phase_start',
      phase:   PHASES.INCOME,
      round:   state.round,
      message: `Round ${state.round} — Income Phase`,
    }],
  };

  // Collect income modifiers registered as pendingEffects during ACTION_C
  const incomeModifiers = state.pendingIncomeModifiers ?? [];

  for (const pid of state.playerOrder) {
    const playerIncomeUpdate = resolveIncomePhase(state, pid, boardTemplate, incomeModifiers);
    update = mergeUpdates(update, playerIncomeUpdate);
  }

  // -- Incomplete-project water-claim penalty ----------------------------
  // Read projects from the *post-payout* patches so that projects that just
  // completed and reset to 0 are not counted as 'started incomplete'.
  const allProjectDefs = [
    ...boardTemplate.citizen_projects,
    ...boardTemplate.income_projects,
  ];

  for (const pid of state.playerOrder) {
    const patchedProjects =
      update.playerPatches?.[pid]?.projects ?? state.players[pid].projects;

    const hasStartedIncomplete = allProjectDefs.some(def => {
      const type = def.citizen_type ? 'citizen' : 'income';
      const proj = patchedProjects[type]?.[def.id];
      return proj && proj.watered > 0 && proj.watered < def.water_slots;
    });

    if (!hasStartedIncomplete) continue;

    const playerState = state.players[pid];
    const { playerPatch, logEntries, pendingEffects } = applyTrackDelta(
      playerState,
      'water_claim',
      -1,
      'incomplete project(s) at end of Income phase'
    );

    update = mergeUpdates(update, {
      playerPatches:  { [pid]: playerPatch },
      sharedPatches:  {},
      logEntries: [
        ...logEntries,
        {
          type:    'incomplete_project_penalty',
          playerId: pid,
          message: `${playerState.name} loses 1 water claim — has incomplete project(s) with water on them`,
        },
      ],
      pendingEffects,
    });
  }

  return update;
}

/**
 * Enter CLEANUP phase:
 *  - Reset all exhausted cards to READY (LOCKED cards stay LOCKED for 1 round,
 *    then unlock — Red Herring Case)
 *  - Clear protest influence
 *  - Clear pending income modifiers
 *  - Advance activePlayerIndex to 0
 *  - Advance round counter
 */
function enterCleanupPhase(state) {
  const playerPatches = {};

  for (const pid of state.playerOrder) {
    const player = state.players[pid];

    const resetTableau = player.tableau.map(c => {
      if (c.exhaustState === EXHAUST_STATES.LOCKED) {
        // Locked cards unlock after 1 round — store lockedRound to track this
        if (c.lockedRound === state.round) {
          return { ...c, exhaustState: EXHAUST_STATES.READY, lockedRound: undefined };
        }
        return { ...c, lockedRound: c.lockedRound ?? state.round }; // Remember when it was locked
      }
      return { ...c, exhaustState: EXHAUST_STATES.READY };
    });

    playerPatches[pid] = {
      tableau:          resetTableau,
      protestInfluence:     0,
      pendingLawyerDiscount: 0,
      workaholicActive:     false,
    };
  }

  const isLastRound = state.round >= MAX_ROUNDS;
  const nextRound   = isLastRound ? state.round : state.round + 1;
  const logEntries  = [
    { type: 'phase_start', phase: PHASES.CLEANUP, round: state.round,
      message: `Round ${state.round} — Cleanup Phase` },
    ...(isLastRound ? [{ type: 'game_over', round: state.round,
      message: `Round ${state.round} complete — game over after ${MAX_ROUNDS} rounds` }] : []),
  ];

  return {
    playerPatches,
    sharedPatches:    { waterSupply: 0 },
    logEntries,
    pendingEffects:   isLastRound
      ? [{ type: 'game_over', message: 'Final round cleanup complete — trigger scoring' }]
      : [],
    _roundAfterCleanup: nextRound,
    _isGameOver:        isLastRound,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase advance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the next phase in the cycle.
 * @param {string} currentPhase
 * @returns {string}
 */
export function nextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return PHASE_ORDER[0];
  return PHASE_ORDER[idx + 1];
}

/**
 * Advance the game to the specified phase (or the next one if not specified).
 * Returns a StateUpdate that the gameStore should apply before updating `state.phase`.
 *
 * @param {Object}  state
 * @param {string}  [targetPhase]   If omitted, advances to next phase in PHASE_ORDER
 * @param {Object}  [options]
 * @param {Object}  [options.boardTemplate]  Required for INCOME phase
 * @param {Function}[options.rollFn]         Optional RNG for EVENT phase
 * @returns {StateUpdate & { nextPhase: string }}
 */
export function advancePhase(state, targetPhase, options = {}) {
  const phase = targetPhase ?? nextPhase(state.phase);
  let update;

  switch (phase) {
    case PHASES.EVENT:
      update = enterEventPhase(state, options.rollFn);
      break;

    case PHASES.ACTION_N:
      update = enterActionPhase(state, PHASES.ACTION_N);
      break;

    case PHASES.WATER:
      update = enterWaterPhase(state);
      break;

    case PHASES.ACTION_C:
      update = enterActionPhase(state, PHASES.ACTION_C);
      break;

    case PHASES.INCOME:
      update = enterIncomePhase(state, options.boardTemplate);
      break;

    case PHASES.CLEANUP:
      update = enterCleanupPhase(state);
      break;

    default:
      update = emptyUpdate();
  }

  return { ...update, nextPhase: phase };
}

// ─────────────────────────────────────────────────────────────────────────────
// Player turn management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance to the next player's turn within an action phase.
 * Returns { isPhaseComplete, nextPlayerIndex }.
 *
 * @param {Object} state
 * @returns {{ isPhaseComplete: boolean, nextPlayerIndex: number, nextPlayerId: string|null }}
 */
export function advancePlayerTurn(state) {
  const nextIndex = state.activePlayerIndex + 1;
  const isPhaseComplete = nextIndex >= state.playerOrder.length;

  return {
    isPhaseComplete,
    nextPlayerIndex: isPhaseComplete ? 0 : nextIndex,
    nextPlayerId:    isPhaseComplete ? null : state.playerOrder[nextIndex],
  };
}

/**
 * Check whether a given phase is an action phase where players take turns.
 */
export function isActionPhase(phase) {
  return phase === PHASES.ACTION_N || phase === PHASES.ACTION_C;
}

// ─────────────────────────────────────────────────────────────────────────────
// SC case resolution from pending effects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process any pending SC case resolution effects in the state.
 * Called by gameStore after event phase produces a 'resolve_sc_case' pendingEffect.
 */
export function processPendingSCResolution(state) {
  const scEffects = state.pendingEffects?.filter(e => e.type === 'resolve_sc_case') ?? [];
  if (scEffects.length === 0) return emptyUpdate();

  let update = emptyUpdate();
  for (const effect of scEffects) {
    update = mergeUpdates(update, resolveActiveSCCase(state));
  }
  return update;
}
