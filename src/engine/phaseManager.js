/**
 * phaseManager.js
 * Drives the round and phase lifecycle.
 *
 * Round structure:
 *   ROUND_SETUP → NEGOTIATE → CONSUME → END_STEP
 *
 *   ROUND_SETUP  auto-resolves (no player input):
 *     • Rotate first-player marker clockwise
 *     • Each player gains waterClaimTrack.value waterClaims tokens
 *     • Each player gains moneyTrack.value money
 *
 *   NEGOTIATE  (consecutive-pass phase, N-side actions):
 *     • Starts with first-player marker holder
 *     • Players can: use lawyer/activist N, play strategy N,
 *       buy a partnership, or Pass
 *     • Phase ends when all players have passed consecutively
 *
 *   CONSUME  (consecutive-pass phase, C-side actions):
 *     • Flip event card (rounds 2–7) and resolve it
 *     • Place water supply = sum of waterClaimTrack values ± event modifier
 *     • Players can: use lawyer/activist C, play strategy C,
 *       buy a partnership, trade 1 waterClaims → 1 water on a project, or Pass
 *     • Phase ends when all players have passed consecutively
 *
 *   END_STEP  auto-resolves:
 *     • Grant rewards for fully-watered projects (starting with first player)
 *     • Round ≥ WATER_PENALTY_FIRST_ROUND: players with ≥1 waterClaims left
 *       OR ≥1 water on an incomplete project lose 1 on waterClaimTrack
 *     • Remove all leftover waterClaims from all players
 *     • Reset exhausted cards to READY, clear per-round flags
 *     • Check discard conditions for all tableau cards
 *     • Advance round counter
 */

import {
  PHASES, PHASE_ORDER, EXHAUST_STATES, MAX_ROUNDS,
  EVENT_FIRST_ROUND, EVENT_LAST_ROUND, WATER_PENALTY_FIRST_ROUND,
} from './constants.js';
import { resolveEventPhase }   from './eventHandler.js';
import { resolveActiveSCCase } from './scResolver.js';
import {
  resolveIncomePhase, emptyUpdate, mergeUpdates,
} from './effectResolver.js';
import { applyTrackDelta, checkDiscardConditions } from './trackManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// ROUND_SETUP  (auto-resolves)
// ─────────────────────────────────────────────────────────────────────────────

function enterRoundSetupPhase(state) {
  const logEntries = [{
    type:    'phase_start',
    phase:   PHASES.ROUND_SETUP,
    round:   state.round,
    message: `Round ${state.round} — Round Setup`,
  }];

  // Rotate first-player marker clockwise
  const nextFirstIdx = (state.firstPlayerIndex + 1) % state.playerOrder.length;

  // Each player gains waterClaims = waterClaimTrack.value
  //              gains money      = moneyTrack.value
  const playerPatches = {};
  for (const pid of state.playerOrder) {
    const p            = state.players[pid];
    const claimsGained = p.waterClaimTrack.value;
    const moneyGained  = p.moneyTrack.value;
    const newMoney     = Math.min(p.moneyTrack.value + moneyGained, p.moneyTrack.max ?? 19);

    playerPatches[pid] = {
      waterClaims: claimsGained,
      moneyTrack:  { ...p.moneyTrack, value: newMoney },
    };

    logEntries.push({
      type:    'round_setup_income',
      playerId: pid,
      waterClaims: claimsGained,
      money:       moneyGained,
      message: `${p.name} gains ${claimsGained} water claims and $${moneyGained}`,
    });
  }

  logEntries.push({
    type:    'first_player_rotated',
    round:   state.round,
    newFirstPlayerId: state.playerOrder[nextFirstIdx],
    message: `${state.players[state.playerOrder[nextFirstIdx]].name} receives the 1st-player marker`,
  });

  return {
    playerPatches,
    sharedPatches: {},
    logEntries,
    pendingEffects: [],
    _nextFirstPlayerIndex: nextFirstIdx,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEGOTIATE  (consecutive-pass phase; N-side actions)
// ─────────────────────────────────────────────────────────────────────────────

function enterNegotiatePhase(state) {
  return {
    ...emptyUpdate(),
    logEntries: [{
      type:    'phase_start',
      phase:   PHASES.NEGOTIATE,
      round:   state.round,
      message: `Round ${state.round} — Negotiate Phase — ${state.players[state.playerOrder[state.firstPlayerIndex]].name} goes first`,
    }],
    _activePlayerIndex:  state.firstPlayerIndex,
    _consecutivePasses:  0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSUME  (consecutive-pass phase; C-side actions + water placement)
// ─────────────────────────────────────────────────────────────────────────────

function enterConsumePhase(state, rollFn) {
  const logEntries = [{
    type:    'phase_start',
    phase:   PHASES.CONSUME,
    round:   state.round,
    message: `Round ${state.round} — Consume Phase`,
  }];

  let update = { ...emptyUpdate(), logEntries };

  // ── Event card (rounds EVENT_FIRST_ROUND – EVENT_LAST_ROUND) ────────────
  if (state.round >= EVENT_FIRST_ROUND && state.round <= EVENT_LAST_ROUND) {
    const eventUpdate = resolveEventPhase(state, rollFn);
    update = mergeUpdates(update, eventUpdate);
  } else {
    update.logEntries.push({
      type:    'event_skipped',
      round:   state.round,
      message: state.round < EVENT_FIRST_ROUND
        ? `Round ${state.round} — No event this round`
        : `Round ${state.round} — Event phase has ended (events ran rounds ${EVENT_FIRST_ROUND}–${EVENT_LAST_ROUND})`,
    });
  }

  // ── Place water supply ───────────────────────────────────────────────────
  // Sum all players' waterClaimTrack values, modified by drought/snow-melt
  const baseSupply = state.playerOrder.reduce(
    (sum, pid) => sum + state.players[pid].waterClaimTrack.value, 0
  );
  // Drought/snow-melt patches may have already been applied to sharedBoard
  // by resolveEventPhase above. If waterSupply was set there, use it.
  const eventSupply = update.sharedPatches?.waterSupply;
  const waterSupply = eventSupply != null ? eventSupply : baseSupply;

  update = mergeUpdates(update, {
    ...emptyUpdate(),
    sharedPatches: { waterSupply },
    logEntries: [{
      type:    'water_placed',
      round:   state.round,
      waterSupply,
      message: `Water placed in river: ${waterSupply} (sum of water rights${eventSupply != null ? ', modified by event' : ''})`,
    }],
  });

  return {
    ...update,
    _activePlayerIndex: state.firstPlayerIndex,
    _consecutivePasses: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// END_STEP  (auto-resolves)
// ─────────────────────────────────────────────────────────────────────────────

function enterEndStepPhase(state, boardTemplate) {
  let update = {
    ...emptyUpdate(),
    logEntries: [{
      type:    'phase_start',
      phase:   PHASES.END_STEP,
      round:   state.round,
      message: `Round ${state.round} — End Step`,
    }],
  };

  // ── 1. Project rewards (starting with first player) ───────────────────────
  const incomeModifiers = state.pendingIncomeModifiers ?? [];
  const orderedPids = [
    ...state.playerOrder.slice(state.firstPlayerIndex),
    ...state.playerOrder.slice(0, state.firstPlayerIndex),
  ];

  for (const pid of orderedPids) {
    const playerIncomeUpdate = resolveIncomePhase(state, pid, boardTemplate, incomeModifiers);
    update = mergeUpdates(update, playerIncomeUpdate);
  }

  // ── 2. Water-rights track penalty (round ≥ WATER_PENALTY_FIRST_ROUND) ────
  //    Trigger: player has ≥1 waterClaims left  OR  ≥1 water on any incomplete project
  if (state.round >= WATER_PENALTY_FIRST_ROUND) {
    const allProjectDefs = [
      ...boardTemplate.citizen_projects,
      ...boardTemplate.income_projects,
    ];

    for (const pid of state.playerOrder) {
      // Use post-income patches so just-completed projects (now watered=0) aren't counted
      const patchedPlayer = {
        ...state.players[pid],
        ...(update.playerPatches?.[pid] ?? {}),
      };

      const hasLeftoverClaims = (patchedPlayer.waterClaims ?? 0) > 0;

      const hasPartialProject = allProjectDefs.some(def => {
        const type = def.citizen_type ? 'citizen' : 'income';
        const proj = patchedPlayer.projects?.[type]?.[def.id];
        return proj && proj.watered > 0 && proj.watered < def.water_slots;
      });

      if (!hasLeftoverClaims && !hasPartialProject) continue;

      const { playerPatch, logEntries: penLogs, pendingEffects: penPE } =
        applyTrackDelta(state.players[pid], 'water_claim', -1,
          'leftover water claims or partial project at end of round');

      const reasons = [
        hasLeftoverClaims  && `${patchedPlayer.waterClaims} leftover claim(s)`,
        hasPartialProject  && 'partial project with water on it',
      ].filter(Boolean).join('; ');

      update = mergeUpdates(update, {
        playerPatches:  { [pid]: playerPatch },
        sharedPatches:  {},
        logEntries: [
          ...penLogs,
          {
            type:    'water_rights_penalty',
            playerId: pid,
            message: `${state.players[pid].name} loses 1 water rights — ${reasons}`,
          },
        ],
        pendingEffects: penPE,
      });
    }
  }

  // ── 3. Remove all leftover waterClaims & reset per-round cubes ────────────
  const resetPatches = {};
  for (const pid of state.playerOrder) {
    resetPatches[pid] = {
      waterClaims:           0,
      protestInfluence:      0,
      pendingLawyerDiscount: 0,
      workaholicActive:      false,
    };
  }
  update = mergeUpdates(update, {
    playerPatches: resetPatches,
    sharedPatches: { waterSupply: 0, casesResolvedThisRound: [] },
    logEntries:    [],
    pendingEffects: [],
  });

  // ── 4. Reset exhausted cards; check discard conditions ───────────────────
  const tableauPatches = {};
  for (const pid of state.playerOrder) {
    const player = state.players[pid];

    const resetTableau = player.tableau.map(c => {
      if (c.exhaustState === EXHAUST_STATES.LOCKED) {
        if (c.lockedRound === state.round) {
          return { ...c, exhaustState: EXHAUST_STATES.READY, lockedRound: undefined };
        }
        return { ...c, lockedRound: c.lockedRound ?? state.round };
      }
      return { ...c, exhaustState: EXHAUST_STATES.READY };
    });

    // Check discard conditions on the reset tableau
    const resetPlayer = { ...player, tableau: resetTableau,
      ...(update.playerPatches?.[pid] ?? {}) };
    const { cardsToDiscard, logEntries: discardLogs } =
      checkDiscardConditions(resetPlayer, state.cardIndex);

    const finalTableau = cardsToDiscard.length > 0
      ? resetTableau.filter(c => !cardsToDiscard.includes(c.instanceId))
      : resetTableau;

    tableauPatches[pid] = { tableau: finalTableau };
    if (discardLogs.length > 0) {
      update = mergeUpdates(update, {
        playerPatches: {}, sharedPatches: {}, logEntries: discardLogs, pendingEffects: [],
      });
    }
  }
  update = mergeUpdates(update, {
    playerPatches: tableauPatches, sharedPatches: {}, logEntries: [], pendingEffects: [],
  });

  // ── 5. Advance round counter (or end game) ────────────────────────────────
  const isLastRound = state.round >= MAX_ROUNDS;
  const nextRound   = isLastRound ? state.round : state.round + 1;

  if (isLastRound) {
    update.logEntries.push({
      type: 'game_over', round: state.round,
      message: `Round ${state.round} complete — game over after ${MAX_ROUNDS} rounds`,
    });
  }

  return {
    ...update,
    pendingEffects: isLastRound
      ? [...(update.pendingEffects ?? []),
         { type: 'game_over', message: 'End Step complete — trigger scoring' }]
      : (update.pendingEffects ?? []),
    _roundAfterEndStep: nextRound,
    _isGameOver:        isLastRound,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase advance
// ─────────────────────────────────────────────────────────────────────────────

export function nextPhase(currentPhase) {
  const idx = PHASE_ORDER.indexOf(currentPhase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return PHASE_ORDER[0];
  return PHASE_ORDER[idx + 1];
}

/**
 * Advance the game to the next (or specified) phase.
 * Returns StateUpdate + { nextPhase, _nextFirstPlayerIndex?, _roundAfterEndStep?, _isGameOver? }
 */
export function advancePhase(state, targetPhase, options = {}) {
  const phase = targetPhase ?? nextPhase(state.phase);
  let update;

  switch (phase) {
    case PHASES.ROUND_SETUP:
      update = enterRoundSetupPhase(state);
      break;

    case PHASES.NEGOTIATE:
      update = enterNegotiatePhase(state);
      break;

    case PHASES.CONSUME:
      update = enterConsumePhase(state, options.rollFn);
      break;

    case PHASES.END_STEP:
      update = enterEndStepPhase(state, options.boardTemplate);
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
 * Advance to the next player in turn order (wrapping around).
 * nextIndex is relative to playerOrder, starting from firstPlayerIndex each phase.
 */
export function advancePlayerTurn(state) {
  const n         = state.playerOrder.length;
  const nextIndex = (state.activePlayerIndex + 1) % n;
  return {
    nextPlayerIndex: nextIndex,
    nextPlayerId:    state.playerOrder[nextIndex],
  };
}

/**
 * Returns true if the given phase allows player turns with consecutive-pass ending.
 */
export function isActionPhase(phase) {
  return phase === PHASES.NEGOTIATE || phase === PHASES.CONSUME;
}

// ─────────────────────────────────────────────────────────────────────────────
// SC case resolution from pending effects
// ─────────────────────────────────────────────────────────────────────────────

export function processPendingSCResolution(state) {
  const scEffects = state.pendingEffects?.filter(e => e.type === 'resolve_sc_case') ?? [];
  if (scEffects.length === 0) return emptyUpdate();

  let update = emptyUpdate();
  for (const effect of scEffects) {
    update = mergeUpdates(update, resolveActiveSCCase(state));
  }
  return update;
}
