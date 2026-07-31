/**
 * gameStore.js
 * Zustand store — the single source of truth for all game state.
 * Wires together: setup, phaseManager, effectResolver, eventHandler, scResolver.
 *
 * Usage (React):
 *   import { useGameStore } from './engine/gameStore.js';
 *   const { state, playCard, advancePhase } = useGameStore();
 *
 * All mutations go through `dispatch()`, which:
 *   1. Saves current state to undoStack
 *   2. Applies the StateUpdate
 *   3. Processes any pendingEffects that can be auto-resolved
 *   4. Appends to actionLog
 */

import { create } from 'zustand';

import { buildInitialState }       from './setup.js';
import { advancePhase, advancePlayerTurn, isActionPhase, processPendingSCResolution }
  from './phaseManager.js';
import { resolveCardAction, applyResourceDelta, commitDocketSwap, commitActivistCChoice,
         commitWaterBribe, resolveIncomePhase, emptyUpdate, mergeUpdates }
  from './effectResolver.js';
import { commitProtestResolution }  from './eventHandler.js';
import { resolveActiveSCCase }      from './scResolver.js';
import { calculateFinalScores }     from './vpCalculator.js';
import { slideAndDraw, nextId }     from './utils.js';
import { EXHAUST_STATES, CARD_TYPES, LAWYER_ACQUISITION_SURCHARGE, PHASES,
         WATER_BANK, PARTNERSHIP_COSTS, PARTNERSHIP_ABILITY_COSTS, MAX_ROUNDS,
         WATER_PENALTY_FIRST_ROUND, INFO_REVEALING_ACTIONS }
  from './constants.js';
import { lawyerAcquisitionCost, canAcquireWithPr, applyTrackDelta,
         applyWaterCubeDelta }
  from './trackManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// State application helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a StateUpdate to the current state object.
 * Returns a new state object (immutable pattern).
 */
function applyUpdate(state, update) {
  if (!update) return state;

  let next = { ...state };

  // Apply player patches
  for (const [pid, patch] of Object.entries(update.playerPatches ?? {})) {
    next = {
      ...next,
      players: {
        ...next.players,
        [pid]: { ...next.players[pid], ...patch },
      },
    };
  }

  // Apply shared board patches
  if (Object.keys(update.sharedPatches ?? {}).length > 0) {
    next = {
      ...next,
      sharedBoard: { ...next.sharedBoard, ...update.sharedPatches },
    };
  }

  // Append log entries
  if (update.logEntries?.length > 0) {
    next = {
      ...next,
      actionLog: [
        ...next.actionLog,
        ...update.logEntries.map(e => ({ ...e, id: nextId(), timestamp: Date.now() })),
      ],
    };
  }

  return next;
}

/**
 * Auto-resolve pendingEffects that don't require player input.
 * Returns { state, remainingEffects }.
 */
function autoResolvePending(state, pendingEffects, boardTemplate) {
  const remaining = [];
  let   current   = state;

  for (const effect of pendingEffects) {
    switch (effect.type) {

      case 'grant_vp': {
        // VP grants from milestone checks — apply directly
        const { playerPatch, logEntries } = {
          playerPatch: { vp: current.players[effect.playerId].vp + effect.amount },
          logEntries: [{
            type: 'vp_applied', playerId: effect.playerId, amount: effect.amount,
            message: `${current.players[effect.playerId].name} receives ${effect.amount} VP (${effect.reason})`,
          }],
        };
        current = applyUpdate(current, {
          playerPatches: { [effect.playerId]: playerPatch },
          sharedPatches: {}, logEntries, pendingEffects: [],
        });
        break;
      }

      case 'resolve_sc_case': {
        const scUpdate = resolveActiveSCCase(current);
        current = applyUpdate(current, scUpdate);
        // Process any new pending effects from SC resolution
        if (scUpdate.pendingEffects?.length > 0) {
          const { state: s2, remainingEffects: r2 } = autoResolvePending(current, scUpdate.pendingEffects, boardTemplate);
          current = s2;
          remaining.push(...r2);
        }
        break;
      }

      case 'grant_citizen_card': {
        // Find a citizen card of the specified type in the cardIndex.
        // citizen_type uses underscores ("service_worker") while card names
        // use spaces ("Service Worker A") — normalize before matching.
        const wanted = (effect.citizen_type ?? '').toLowerCase().replace(/_/g, ' ');
        const citizenCard = Object.values(current.cardIndex).find(
          c => c.type === CARD_TYPES.CITIZEN &&
               c.name?.toLowerCase().includes(wanted)
        );
        if (citizenCard) {
          const instance = { instanceId: `${citizenCard.id}_${nextId()}`, cardId: citizenCard.id, exhaustState: EXHAUST_STATES.READY };
          const player   = current.players[effect.playerId];
          current = applyUpdate(current, {
            playerPatches: { [effect.playerId]: { tableau: [...player.tableau, instance] } },
            sharedPatches: {},
            logEntries: [{ type: 'citizen_card_added', playerId: effect.playerId, cardId: citizenCard.id,
              message: `${player.name} adds ${citizenCard.name} to their tableau` }],
            pendingEffects: [],
          });
        }
        break;
      }

      case 'register_income_modifier': {
        const existing = current.pendingIncomeModifiers ?? [];
        current = { ...current, pendingIncomeModifiers: [...existing, effect] };
        break;
      }

      case 'pr_threshold_reached':
        // Informational — the surcharge waiver is computed from live PR.
        // Dropping it here keeps it from accumulating forever.
        break;

      case 'game_over':
        // endGame() is triggered by the phase manager's _isGameOver flag;
        // this marker effect would otherwise linger in pendingEffects.
        break;

      default:
        // Requires UI interaction — keep in remaining
        remaining.push(effect);
    }
  }

  return { state: current, remainingEffects: remaining };
}

/** Effects that block phase advance / passing until a player resolves them. */
function isBlockingEffect(e) {
  return e.type === 'choice_required';
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useGameStore = create((set, get) => ({

  // ── State ────────────────────────────────────────────────────────────────
  gameState:          null,
  boardTemplate:      null,   // player_board.json board_template (for income phase)
  pendingEffects:     [],     // Effects awaiting player input
  pendingIncomeModifiers: [],
  isGameOver:         false,
  finalScores:        null,
  pendingTurnAdvance: false,  // A turn action resolved into a choice; advance when it clears
  protestActivations: {},     // { [playerId]: true } — one activist per player per protest
  undoPending:        [],     // pendingEffects snapshots parallel to gameState.undoStack
  redoPending:        [],

  // ── Initialization ───────────────────────────────────────────────────────

  /**
   * Initialize a new game from JSON schemas and player configs.
   * @param {Object[]} playerConfigs
   * @param {Object}   cards           Full cards.json array
   * @param {Object}   playerBoardJson Full player_board.json
   * @param {Object}   sharedBoardJson Full shared_board.json
   */
  initGame(playerConfigs, cards, playerBoardJson, sharedBoardJson) {
    const gameState = buildInitialState(playerConfigs, cards, playerBoardJson, sharedBoardJson);
    set({
      gameState,
      boardTemplate:      playerBoardJson.board_template,
      pendingEffects:     [],
      pendingIncomeModifiers: [],
      isGameOver:         false,
      finalScores:        null,
      pendingTurnAdvance: false,
      protestActivations: {},
      undoPending:        [],
      redoPending:        [],
    });
    // Auto-advance from 'setup_complete' to first EVENT phase
    get().advanceToNextPhase();
  },

  // ── Core dispatch ─────────────────────────────────────────────────────────

  /**
   * Apply a StateUpdate to the game state, process auto-resolvable pending effects,
   * and push current state to undoStack.
   */
  _dispatch(update, newPhase, { sealUndo = false } = {}) {
    set(store => {
      const current = store.gameState;

      // Save to undo stack (keep last 20 states).
      // When sealUndo is true the action revealed hidden information
      // (e.g. drew from the strategy deck), so we clear the entire
      // undo history to prevent the player exploiting that knowledge.
      const undoStack = sealUndo
        ? []
        : [current, ...current.undoStack.slice(0, 19)];
      // pendingEffects live on the store root — snapshot them in parallel so
      // undo restores choice modals consistently with the game state.
      const undoPending = sealUndo
        ? []
        : [store.pendingEffects, ...store.undoPending.slice(0, 19)];
      let   next      = { ...applyUpdate(current, update), undoStack, redoStack: [] };

      if (newPhase) next = { ...next, phase: newPhase };

      // Auto-resolve pending effects
      const allPending = [...(store.pendingEffects ?? []), ...(update.pendingEffects ?? [])];
      const { state: resolved, remainingEffects } =
        autoResolvePending(next, allPending, store.boardTemplate);

      return {
        gameState:      resolved,
        pendingEffects: remainingEffects,
        undoPending,
        redoPending:    [],
      };
    });
  },

  // ── Turn-economy helpers ──────────────────────────────────────────────────

  /**
   * Called after every TURN action (RULES §4: one action per turn, then play
   * passes clockwise). Resets the consecutive-pass counter and advances the
   * turn — deferred while a blocking choice modal is open.
   */
  _afterTurnAction() {
    set(s => ({ gameState: { ...s.gameState, consecutivePasses: 0 } }));
    const blocked = get().pendingEffects.some(isBlockingEffect);
    if (blocked) { set({ pendingTurnAdvance: true }); return; }
    get()._advanceTurn();
  },

  _advanceTurn() {
    const { gameState } = get();
    set({ pendingTurnAdvance: false });
    if (!isActionPhase(gameState.phase)) return;
    const { nextPlayerIndex } = advancePlayerTurn(gameState);
    set(s => ({ gameState: { ...s.gameState, activePlayerIndex: nextPlayerIndex } }));
  },

  // ── Phase management ──────────────────────────────────────────────────────

  advanceToNextPhase(rollFn) {
    const { gameState, boardTemplate, _dispatch, endGame, pendingEffects } = get();

    // Blocking choices must be resolved before the game moves on
    if (pendingEffects.some(isBlockingEffect)) {
      console.warn('advanceToNextPhase: blocked by pending choice effects');
      return;
    }

    // Leaving the End Step starts the next round — the counter advances HERE,
    // not when the End Step begins (the header showed round N+1 while still
    // resolving round N).
    let baseState = gameState;
    if (gameState.phase === PHASES.END_STEP) {
      baseState = { ...gameState, round: gameState.round + 1 };
      set({ gameState: baseState, protestActivations: {} });
    }

    const {
      nextPhase: phase,
      _nextFirstPlayerIndex,
      _activePlayerIndex,
      _consecutivePasses,
      _roundAfterEndStep,   // legacy — round now advances on END_STEP exit
      _isGameOver,
      ...update
    } = advancePhase(baseState, undefined, { boardTemplate, rollFn });

    _dispatch(update, phase);

    // Apply phase-entry side-effects that live outside the StateUpdate shape
    set(s => {
      let gs = s.gameState;
      if (_nextFirstPlayerIndex != null)
        gs = { ...gs, firstPlayerIndex: _nextFirstPlayerIndex };
      if (_activePlayerIndex != null)
        gs = { ...gs, activePlayerIndex: _activePlayerIndex, consecutivePasses: 0 };
      if (_consecutivePasses != null)
        gs = { ...gs, consecutivePasses: _consecutivePasses };
      return { gameState: gs, pendingTurnAdvance: false };
    });

    // ROUND_SETUP auto-advances immediately to NEGOTIATE
    if (phase === PHASES.ROUND_SETUP) {
      get().advanceToNextPhase();
      return;
    }

    // END_STEP of the final round: trigger scoring
    if (phase === PHASES.END_STEP && _isGameOver) {
      endGame();
    }
  },

  // ── Player actions ────────────────────────────────────────────────────────

  /**
   * Play a card action (N or C side).
   * Validates phase/side, turn, ownership, and readiness. A successful play
   * is a TURN action: the pass counter resets and the turn auto-advances
   * (RULES §4 — one action per turn).
   */
  playCardAction(playerId, cardId, side, options = {}) {
    const { gameState, _dispatch } = get();

    // Phase + side validation: N cards in Negotiate, C cards in Consume
    if (!isActionPhase(gameState.phase)) {
      console.warn(`playCardAction: not an action phase (${gameState.phase})`); return;
    }
    const expectedSide = gameState.phase === PHASES.NEGOTIATE ? 'N' : 'C';
    if (side !== expectedSide) {
      console.warn(`playCardAction: ${side}-side actions not allowed during ${gameState.phase}`); return;
    }

    // Turn validation
    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (activePlayer !== playerId) {
      console.warn(`playCardAction: not ${playerId}'s turn (active: ${activePlayer})`);
      return;
    }

    // Blocking choice open → no new actions
    if (get().pendingEffects.some(isBlockingEffect)) {
      console.warn('playCardAction: resolve the pending choice first'); return;
    }

    const player  = gameState.players[playerId];
    const cardDef = gameState.cardIndex[cardId];
    if (!cardDef) { console.warn(`playCardAction: unknown card ${cardId}`); return; }

    // Ownership validation: strategy cards come from hand, others from tableau
    const isStrategy = cardDef.type === CARD_TYPES.STRATEGY;
    if (isStrategy) {
      if (!player.hand.includes(cardId)) {
        console.warn(`playCardAction: ${cardId} not in ${playerId}'s hand`); return;
      }
    } else {
      const instance = options.instanceId
        ? player.tableau.find(c => c.instanceId === options.instanceId)
        : (player.tableau.find(c => c.cardId === cardId && c.exhaustState === EXHAUST_STATES.READY)
           ?? player.tableau.find(c => c.cardId === cardId));
      if (!instance) {
        console.warn(`playCardAction: ${cardId} not in ${playerId}'s tableau`); return;
      }
      if (instance.exhaustState !== EXHAUST_STATES.READY) {
        console.warn(`playCardAction: ${cardId} is ${instance.exhaustState}`);
        return;
      }
      options = { ...options, instanceId: instance.instanceId };
    }

    const update = resolveCardAction(gameState, playerId, cardId, side, options);

    // Fizzled/rejected plays (wrong side, unpayable cost) are NOT actions:
    // log them without consuming the turn or touching the pass counter.
    if (update._failed) {
      _dispatch(update);
      return;
    }

    // Strategy cards are single-use (RULES §7/§11): hand → discard pile
    if (isStrategy) {
      const baseHand = update.playerPatches[playerId]?.hand ?? player.hand;
      const newHand  = [...baseHand];
      newHand.splice(newHand.indexOf(cardId), 1);
      update.playerPatches[playerId] = {
        ...(update.playerPatches[playerId] ?? {}),
        hand: newHand,
      };
      const baseDiscard = update.sharedPatches.strategyDiscard
        ?? gameState.sharedBoard.strategyDiscard;
      update.sharedPatches = {
        ...update.sharedPatches,
        strategyDiscard: [...baseDiscard, cardId],
      };
    }

    const sealUndo = INFO_REVEALING_ACTIONS.has(`${cardId}_${side}`);
    _dispatch(update, undefined, { sealUndo });
    get()._afterTurnAction();
  },

  /**
   * Legacy manual turn end — advances the turn WITHOUT resetting the
   * consecutive-pass counter (turns auto-advance after actions now).
   */
  endPlayerTurn() {
    const { gameState, _dispatch } = get();
    const { nextPlayerIndex } = advancePlayerTurn(gameState);
    const pid = gameState.playerOrder[gameState.activePlayerIndex];

    _dispatch({
      playerPatches:  {},
      sharedPatches:  {},
      logEntries:     [{ type: 'turn_end', playerId: pid,
        message: `${gameState.players[pid].name} ends their turn` }],
      pendingEffects: [],
    });
    set(s => ({
      gameState: { ...s.gameState, activePlayerIndex: nextPlayerIndex },
    }));
  },

  /**
   * Pass the current player's turn.
   * When consecutivePasses reaches playerOrder.length, the phase ends.
   */
  passPlayerTurn() {
    const { gameState, _dispatch, advanceToNextPhase } = get();

    // A blocking choice (protest, card choice) must resolve before passing
    if (get().pendingEffects.some(isBlockingEffect)) {
      console.warn('passPlayerTurn: resolve the pending choice first'); return;
    }

    const { nextPlayerIndex } = advancePlayerTurn(gameState);
    const pid       = gameState.playerOrder[gameState.activePlayerIndex];
    const newPasses = (gameState.consecutivePasses ?? 0) + 1;

    _dispatch({
      playerPatches:  {},
      sharedPatches:  {},
      logEntries: [{ type: 'turn_pass', playerId: pid,
        message: `${gameState.players[pid].name} passes `
               + `(${newPasses}/${gameState.playerOrder.length} consecutive)` }],
      pendingEffects: [],
    });

    if (newPasses >= gameState.playerOrder.length) {
      advanceToNextPhase();
    } else {
      set(s => ({
        gameState: { ...s.gameState,
          activePlayerIndex: nextPlayerIndex,
          consecutivePasses: newPasses },
      }));
    }
  },

  // ── Market actions ────────────────────────────────────────────────────────

  /**
   * Acquire a lawyer from the lawyer market.
   *
   * Two paths:
   *  - Standard (a TURN action): pay printed cost + $4 surcharge (waived at
   *    PR ≤ −7 / ≥ +8), minus any Team Player discount.
   *  - Via Law Firm partnership (a FREE action): a pending_partnership_acquire
   *    effect is open — pay the flat $4 ability fee instead (RULES §14),
   *    minus any Team Player discount. The fee is charged here, on
   *    completion, so an abandoned ability never strands money.
   */
  acquireLawyer(playerId, marketIndex) {
    const { gameState, _dispatch, pendingEffects } = get();
    const player   = gameState.players[playerId];
    const cardId   = gameState.sharedBoard.lawyerMarket[marketIndex];

    if (!cardId) { console.warn('acquireLawyer: empty slot'); return; }
    if (!isActionPhase(gameState.phase)) {
      console.warn('acquireLawyer: not an action phase'); return;
    }

    const viaPartnership = pendingEffects.find(
      e => e.type === 'pending_partnership_acquire' && e.playerId === playerId
        && e.marketType === 'lawyer'
    );

    // Standard acquisition consumes your turn — it must BE your turn
    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (!viaPartnership && activePlayer !== playerId) {
      console.warn(`acquireLawyer: not ${playerId}'s turn`); return;
    }

    const cardDef = gameState.cardIndex[cardId];
    if (!canAcquireWithPr(cardDef, player.prTrack.value)) {
      console.warn(`acquireLawyer: PR requirement not met for ${cardId}`);
      return;
    }

    let cost = viaPartnership
      ? PARTNERSHIP_ABILITY_COSTS.law_firm.amount
      : lawyerAcquisitionCost(cardDef, player.prTrack.value);
    if (player.pendingLawyerDiscount > 0) {
      cost = Math.max(0, cost - player.pendingLawyerDiscount);
    }

    if (player.moneyTrack.value < cost) {
      console.warn(`acquireLawyer: insufficient money (need ${cost}, have ${player.moneyTrack.value})`);
      return;
    }

    const { market, deck } = slideAndDraw(
      gameState.sharedBoard.lawyerMarket,
      gameState.sharedBoard.lawyerDeck,
      marketIndex
    );

    const instance = { instanceId: `${cardId}_${nextId()}`, cardId, exhaustState: EXHAUST_STATES.READY };
    const { playerPatch: moneyPatch, logEntries: moneyLog } =
      applyTrackDelta(player, 'money', -cost, `acquire lawyer: ${cardDef.name}`);

    _dispatch({
      playerPatches: {
        [playerId]: {
          ...moneyPatch,
          tableau:             [...player.tableau, instance],
          pendingLawyerDiscount: 0,
        },
      },
      sharedPatches: { lawyerMarket: market, lawyerDeck: deck },
      logEntries: [
        ...moneyLog,
        {
          type:     'card_acquired',
          playerId,
          cardId,
          cardType: 'lawyer',
          cost,
          message:  `${player.name} acquires ${cardDef.name} for $${cost}`
                  + (viaPartnership ? ' (Law Firm partnership)' : ''),
        },
      ],
      pendingEffects: [],
    });
    // Clear any pending_partnership_acquire effect for this player (law_firm)
    set(s => ({
      pendingEffects: s.pendingEffects.filter(
        e => !(e.type === 'pending_partnership_acquire' && e.playerId === playerId
              && e.marketType === 'lawyer')
      ),
    }));
    // Standard acquisition is a turn action; partnership acquisition is free
    if (!viaPartnership) get()._afterTurnAction();
  },

  /**
   * Acquire an activist from the activist market.
   * Requires the Business partnership (RULES §7) — flat $3 fee. When used
   * through the partnership ability pending effect it is a FREE action;
   * a direct market buy consumes the turn.
   */
  acquireActivist(playerId, marketIndex) {
    const { gameState, _dispatch, pendingEffects } = get();
    const player  = gameState.players[playerId];
    const cardId  = gameState.sharedBoard.activistMarket[marketIndex];

    if (!cardId) { console.warn('acquireActivist: empty slot'); return; }
    if (!isActionPhase(gameState.phase)) {
      console.warn('acquireActivist: not an action phase'); return;
    }

    const partnership = player.partnerships.business;
    if (!partnership) {
      console.warn('acquireActivist: requires Business partnership');
      return;
    }

    const viaPartnership = pendingEffects.find(
      e => e.type === 'pending_partnership_acquire' && e.playerId === playerId
        && e.marketType === 'activist'
    );

    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (!viaPartnership && activePlayer !== playerId) {
      console.warn(`acquireActivist: not ${playerId}'s turn`); return;
    }

    // Business partnership cost: $3 per activist
    const cost = PARTNERSHIP_ABILITY_COSTS.business.amount;
    if (player.moneyTrack.value < cost) {
      console.warn(`acquireActivist: insufficient money`);
      return;
    }

    const { market, deck } = slideAndDraw(
      gameState.sharedBoard.activistMarket,
      gameState.sharedBoard.activistDeck,
      marketIndex
    );

    const instance = { instanceId: `${cardId}_${nextId()}`, cardId, exhaustState: EXHAUST_STATES.READY };
    const cardDef  = gameState.cardIndex[cardId];
    const { playerPatch: moneyPatch, logEntries: moneyLog } =
      applyTrackDelta(player, 'money', -cost, `acquire activist: ${cardDef.name}`);

    _dispatch({
      playerPatches: { [playerId]: { ...moneyPatch, tableau: [...player.tableau, instance] } },
      sharedPatches: { activistMarket: market, activistDeck: deck },
      logEntries: [
        ...moneyLog,
        { type: 'card_acquired', playerId, cardId, cardType: 'activist', cost,
          message: `${player.name} acquires ${cardDef.name} for $${cost}` },
      ],
      pendingEffects: [],
    });
    // Clear any pending_partnership_acquire effect for this player (business)
    set(s => ({
      pendingEffects: s.pendingEffects.filter(
        e => !(e.type === 'pending_partnership_acquire' && e.playerId === playerId
              && e.marketType === 'activist')
      ),
    }));
    if (!viaPartnership) get()._afterTurnAction();
  },

  /** Cancel an open partnership-acquire flow (no fee was charged yet). */
  cancelPartnershipAcquire(playerId) {
    set(s => ({
      pendingEffects: s.pendingEffects.filter(
        e => !(e.type === 'pending_partnership_acquire' && e.playerId === playerId)
      ),
    }));
  },

  // ── Partnership actions ────────────────────────────────────────────────────

  /**
   * Purchase a partnership slot.
   */
  purchasePartnership(playerId, partnershipId) {
    const { gameState, _dispatch } = get();
    const player = gameState.players[playerId];

    // Buying a partnership is a TURN action (RULES §4)
    if (!isActionPhase(gameState.phase)) {
      console.warn('purchasePartnership: not an action phase'); return;
    }
    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (activePlayer !== playerId) {
      console.warn(`purchasePartnership: not ${playerId}'s turn`); return;
    }

    if (player.partnerships[partnershipId]) {
      console.warn(`purchasePartnership: ${partnershipId} already owned`);
      return;
    }

    const cost = PARTNERSHIP_COSTS[partnershipId];
    if (player.moneyTrack.value < cost) {
      console.warn(`purchasePartnership: insufficient money`);
      return;
    }

    const { playerPatch: moneyPatch, logEntries } =
      applyTrackDelta(player, 'money', -cost, `purchase partnership: ${partnershipId}`);

    _dispatch({
      playerPatches: {
        [playerId]: { ...moneyPatch, partnerships: { ...player.partnerships, [partnershipId]: true } },
      },
      sharedPatches: {},
      logEntries:    [
        ...logEntries,
        { type: 'partnership_purchased', playerId, partnershipId, cost,
          message: `${player.name} purchases ${partnershipId} partnership for $${cost}` },
      ],
      pendingEffects: [],
    });
    get()._afterTurnAction();
  },

  // ── Partnership ability use ──────────────────────────────────────────────────

  /**
   * Use a partnership ability (a FREE action — RULES §14: "can be used at
   * any point during an action phase"; it does not consume the turn):
   *   law_firm   → opens an acquire flow; the flat $4 fee is charged when the
   *                lawyer is actually taken (acquireLawyer), so nothing is
   *                stranded if the flow is abandoned
   *   business   → same, $3, for activists
   *   investment → Pay $2, gain 1 PR immediately
   */
  usePartnershipAbility(playerId, partnershipId) {
    const { gameState, _dispatch, pendingEffects } = get();
    const player = gameState.players[playerId];

    if (!isActionPhase(gameState.phase)) {
      console.warn('usePartnershipAbility: not an action phase'); return;
    }
    if (!player.partnerships[partnershipId]) {
      console.warn(`usePartnershipAbility: ${partnershipId} not owned`); return;
    }

    const abilityCost = PARTNERSHIP_ABILITY_COSTS[partnershipId];
    if (!abilityCost) { console.warn(`usePartnershipAbility: unknown id ${partnershipId}`); return; }

    if (player.moneyTrack.value < abilityCost.amount) {
      console.warn(`usePartnershipAbility: insufficient money`); return;
    }

    if (partnershipId === 'investment') {
      // Investment: pay $2, gain 1 PR immediately
      const { playerPatch: moneyPatch, logEntries: moneyLog, pendingEffects: moneyFx } =
        applyTrackDelta(player, 'money', -abilityCost.amount, `${partnershipId} partnership ability`);
      const { playerPatch: prPatch, logEntries: prLog, pendingEffects: prFx } =
        applyTrackDelta({ ...player, ...moneyPatch }, 'pr', 1, 'investment partnership');

      _dispatch({
        playerPatches: { [playerId]: { ...moneyPatch, ...prPatch } },
        sharedPatches: {},
        logEntries: [
          ...moneyLog, ...prLog,
          { type: 'partnership_ability_used', playerId, partnershipId,
            message: `${player.name} uses investment partnership ability ($${abilityCost.amount})` },
        ],
        pendingEffects: [...moneyFx, ...prFx],
      });
      return;
    }

    if (partnershipId === 'law_firm' || partnershipId === 'business') {
      // Don't double-open the flow
      const marketType = partnershipId === 'law_firm' ? 'lawyer' : 'activist';
      if (pendingEffects.some(e => e.type === 'pending_partnership_acquire'
            && e.playerId === playerId && e.marketType === marketType)) {
        console.warn('usePartnershipAbility: acquire flow already open'); return;
      }
      // No money moves yet — the fee is charged on completion in
      // acquireLawyer / acquireActivist (prevents pay-then-lose-the-fee).
      _dispatch({
        playerPatches: {},
        sharedPatches: {},
        logEntries: [
          { type: 'partnership_ability_used', playerId, partnershipId,
            message: `${player.name} uses the ${partnershipId} partnership — `
              + `pick a ${marketType} from the market ($${abilityCost.amount} on acquisition)` },
        ],
        pendingEffects: [{
          type:          'pending_partnership_acquire',
          partnershipId,
          playerId,
          marketType,
          message: `${player.name}: acquire a ${marketType === 'lawyer' ? 'Lawyer' : 'Activist'} `
            + `from the market for $${abilityCost.amount} (or cancel)`,
        }],
      });
    }
  },

  // ── Water bank ────────────────────────────────────────────────────────────

  /** Unlock a player's water bank for $8 (one-time; free action). */
  unlockWaterBank(playerId) {
    const { gameState, _dispatch } = get();
    const player = gameState.players[playerId];

    if (!isActionPhase(gameState.phase)) { console.warn('unlockWaterBank: not an action phase'); return; }
    if (player.waterBank.unlocked) { console.warn('unlockWaterBank: already unlocked'); return; }
    if (player.moneyTrack.value < WATER_BANK.UNLOCK_COST) {
      console.warn(`unlockWaterBank: need $${WATER_BANK.UNLOCK_COST}`); return;
    }

    const { playerPatch: moneyPatch, logEntries, pendingEffects } =
      applyTrackDelta(player, 'money', -WATER_BANK.UNLOCK_COST, 'unlock water bank');

    _dispatch({
      playerPatches: { [playerId]: { ...moneyPatch, waterBank: { unlocked: true, stored: 0 } } },
      sharedPatches: {},
      logEntries: [...logEntries, {
        type: 'water_bank_unlocked', playerId,
        message: `${player.name} unlocks their water bank for $${WATER_BANK.UNLOCK_COST}`,
      }],
      pendingEffects,
    });
  },

  /**
   * Deposit water cubes into the bank owner's water bank.
   * The depositing player pays $1 per cube to the bank owner.
   * @param {string} depositorId  — the player depositing cubes
   * @param {string} ownerId      — the bank owner (receives $1 per cube)
   * @param {number} cubeCount
   */
  depositToWaterBank(depositorId, ownerId, cubeCount) {
    const { gameState, _dispatch } = get();
    const depositor = gameState.players[depositorId];
    const owner     = gameState.players[ownerId];

    if (!isActionPhase(gameState.phase)) { console.warn('depositToWaterBank: not an action phase'); return; }
    if (!owner.waterBank.unlocked) { console.warn('depositToWaterBank: bank not unlocked'); return; }

    const available = owner.waterBank.stored;
    const capacity  = WATER_BANK.CAPACITY;
    const canStore  = capacity - available;
    const toStore   = Math.min(cubeCount, canStore, depositor.waterCubes);
    const cost      = toStore * WATER_BANK.DEPOSIT_COST;

    if (toStore <= 0)                            { console.warn('depositToWaterBank: nothing to store'); return; }
    if (depositor.moneyTrack.value < cost)       { console.warn(`depositToWaterBank: need $${cost}`); return; }
    if (depositor.waterCubes < toStore)          { console.warn('depositToWaterBank: insufficient cubes'); return; }

    // Depositor: lose cubes + pay cost
    const { playerPatch: cubePatch, logEntries: cubeLog } =
      applyWaterCubeDelta(depositor, -toStore, `deposit to ${owner.name}'s water bank`);
    const { playerPatch: payPatch, logEntries: payLog, pendingEffects: payFx } =
      applyTrackDelta({ ...depositor, ...cubePatch }, 'money', -cost, `water bank deposit fee`);

    // Owner: receive payment + update bank
    const { playerPatch: recvPatch, logEntries: recvLog, pendingEffects: recvFx } =
      applyTrackDelta(owner, 'money', cost, `water bank income from ${depositor.name}`);

    _dispatch({
      playerPatches: {
        [depositorId]: { ...cubePatch, ...payPatch },
        [ownerId]:     { ...recvPatch, waterBank: { ...owner.waterBank, stored: available + toStore } },
      },
      sharedPatches: {},
      logEntries: [...cubeLog, ...payLog, ...recvLog, {
        type: 'water_bank_deposit', depositorId, ownerId, cubeCount: toStore, cost,
        message: `${depositor.name} deposits ${toStore} cube(s) into ${owner.name}'s water bank (paid $${cost})`,
      }],
      pendingEffects: [...payFx, ...recvFx],
    });
  },

  /**
   * Owner withdraws any number of stored cubes from their own water bank (free).
   * @param {string} ownerId
   * @param {number} cubeCount — pass Infinity to withdraw all
   */
  withdrawFromWaterBank(ownerId, cubeCount) {
    const { gameState, _dispatch } = get();
    const owner = gameState.players[ownerId];

    if (!isActionPhase(gameState.phase)) { console.warn('withdrawFromWaterBank: not an action phase'); return; }
    if (!owner.waterBank.unlocked)   { console.warn('withdrawFromWaterBank: bank not unlocked'); return; }
    if (owner.waterBank.stored === 0){ console.warn('withdrawFromWaterBank: bank is empty'); return; }

    const toWithdraw = Math.min(cubeCount, owner.waterBank.stored);
    const { playerPatch: cubePatch, logEntries } =
      applyWaterCubeDelta(owner, toWithdraw, 'withdraw from water bank');

    _dispatch({
      playerPatches: { [ownerId]: {
        ...cubePatch,
        waterBank: { ...owner.waterBank, stored: owner.waterBank.stored - toWithdraw },
      }},
      sharedPatches: {},
      logEntries: [...logEntries, {
        type: 'water_bank_withdraw', ownerId, cubeCount: toWithdraw,
        message: `${owner.name} withdraws ${toWithdraw} cube(s) from their water bank`,
      }],
      pendingEffects: [],
    });
  },

  // ── SC influence ──────────────────────────────────────────────────────────

  /**
   * Place SC influence on the active SC case (free action).
   * Costs 1 water cube per influence.  Can only place on the first docket case,
   * and only the named plaintiff/defendant factions may place (RULES §12).
   * @param {string} playerId
   * @param {string} caseId    — must match docket[0]
   * @param {number} amount
   */
  placeScInfluence(playerId, caseId, amount = 1) {
    const { gameState, _dispatch } = get();
    const player    = gameState.players[playerId];
    const activeCaseId = gameState.sharedBoard.docket[0];

    if (!isActionPhase(gameState.phase)) {
      console.warn('placeScInfluence: not an action phase'); return;
    }
    if (caseId !== activeCaseId) {
      console.warn(`placeScInfluence: ${caseId} is not the active case (${activeCaseId})`); return;
    }
    const caseDef = gameState.cardIndex[caseId];
    const isParty = caseDef?.plaintiff?.id === player.factionId
                 || caseDef?.defendant?.id === player.factionId;
    if (!isParty) {
      console.warn(`placeScInfluence: ${player.factionId} is not a party to ${caseId}`); return;
    }
    if (player.waterCubes < amount) {
      console.warn(`placeScInfluence: need ${amount} water cube(s)`); return;
    }

    const { playerPatch: cubePatch, logEntries: cubeLog } =
      applyWaterCubeDelta(player, -amount, `SC influence on ${caseId}`);

    const currentInfluence = player.scInfluence[caseId] ?? 0;
    const newScInfluence   = { ...player.scInfluence, [caseId]: currentInfluence + amount };

    _dispatch({
      playerPatches: { [playerId]: { ...cubePatch, scInfluence: newScInfluence } },
      sharedPatches: {},
      logEntries: [...cubeLog, {
        type: 'sc_influence_placed', playerId, caseId, amount,
        total: currentInfluence + amount,
        message: `${player.name} places ${amount} SC influence on ${caseId} (total: ${currentInfluence + amount})`,
      }],
      pendingEffects: [],
    });
  },

  /**
   * Dismiss a specific choice_required pendingEffect by subtype.
   * Used when:
   *   (a) the effect fizzles (no valid targets), or
   *   (b) the undo action restores gameState — pendingEffects live outside
   *       gameState on the store top-level, so they must be cleared separately.
   */
  dismissChoiceEffect(subtype) {
    set(s => ({
      pendingEffects: s.pendingEffects.filter(
        e => !(e.type === 'choice_required' && e.subtype === subtype)
      ),
    }));
    // A deferred turn advance may now be unblocked
    if (get().pendingTurnAdvance && !get().pendingEffects.some(isBlockingEffect)) {
      get()._advanceTurn();
    }
  },

  /**
   * Consume phase: trade 1 waterClaims token → place 1 water on a project.
   * A TURN action — placing several cubes takes several turns (RULES §4).
   */
  placeWaterOnProject(playerId, projectType, projectId) {
    const { gameState, _dispatch } = get();
    const player  = gameState.players[playerId];
    const project = player.projects[projectType]?.[projectId];

    if (gameState.phase !== PHASES.CONSUME) {
      console.warn('placeWaterOnProject: only during the Consume phase'); return;
    }
    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (activePlayer !== playerId) {
      console.warn(`placeWaterOnProject: not ${playerId}'s turn`); return;
    }
    if (!project) { console.warn(`placeWaterOnProject: unknown ${projectType}/${projectId}`); return; }
    if ((player.waterClaims ?? 0) < 1) { console.warn('placeWaterOnProject: no waterClaims'); return; }
    if (project.watered >= project.water_slots) { console.warn('placeWaterOnProject: project full'); return; }
    if ((gameState.sharedBoard.waterSupply ?? 0) < 1) { console.warn('placeWaterOnProject: no river water'); return; }

    const newWatered  = project.watered + 1;
    const newProjects = {
      ...player.projects,
      [projectType]: {
        ...player.projects[projectType],
        [projectId]: { ...project, watered: newWatered },
      },
    };

    _dispatch({
      playerPatches: { [playerId]: {
        projects:    newProjects,
        waterClaims: player.waterClaims - 1,
      }},
      sharedPatches: { waterSupply: gameState.sharedBoard.waterSupply - 1 },
      logEntries: [{ type: 'water_placed_on_project', playerId, projectId, projectType,
        message: `${player.name} places water on ${projectId} `
               + `(${newWatered}/${project.water_slots}) — spends 1 water claim` }],
      pendingEffects: [],
    });
    get()._afterTurnAction();
  },

  // ── Protest activist activation (out-of-turn, during a protest event) ──────

  /**
   * During a Protest event each player may use ONE Activist C ability that
   * generates protest influence (RULES §12). This happens out of turn while
   * the protest modal is open, so it bypasses normal turn validation.
   */
  activateProtestActivist(playerId, instanceId) {
    const { gameState, _dispatch, pendingEffects, protestActivations } = get();

    const protestOpen = pendingEffects.some(
      e => e.type === 'choice_required' && e.subtype === 'protest_activation_round'
    );
    if (!protestOpen) { console.warn('activateProtestActivist: no protest in progress'); return; }
    if (protestActivations[playerId]) {
      console.warn('activateProtestActivist: already activated an activist this protest'); return;
    }

    const player   = gameState.players[playerId];
    const instance = player.tableau.find(c => c.instanceId === instanceId);
    if (!instance) { console.warn('activateProtestActivist: card not in tableau'); return; }
    if (instance.exhaustState !== EXHAUST_STATES.READY) {
      console.warn('activateProtestActivist: card not ready'); return;
    }
    const cardDef = gameState.cardIndex[instance.cardId];
    if (cardDef?.type !== CARD_TYPES.ACTIVIST || cardDef?.actions?.C?.icon !== 'protest_influence') {
      console.warn('activateProtestActivist: not a protest-influence activist C ability'); return;
    }

    const update = resolveCardAction(gameState, playerId, instance.cardId, 'C',
      { instanceId });
    if (update._failed) { _dispatch(update); return; }

    _dispatch(update);
    set(s => ({ protestActivations: { ...s.protestActivations, [playerId]: true } }));
  },

  // ── Pending effect resolution (called by UI) ────────────────────────────────

  resolveChoice(choiceData) {
    const { gameState, pendingEffects, _dispatch } = get();
    const { subtype } = choiceData;
    // The original pendingEffect (for fields the UI doesn't round-trip,
    // e.g. the tableau instanceId of the card that raised the choice)
    const sourceEffect = pendingEffects.find(e => e.subtype === subtype);

    let update   = emptyUpdate();
    let consumed = false;

    switch (subtype) {
      case 'activist_c_look_and_draw':
        update   = commitActivistCChoice(gameState, choiceData.playerId, choiceData.chosenCardId);
        consumed = true;
        break;

      case 'docket_swap':
        update   = commitDocketSwap(gameState, choiceData.indexA, choiceData.indexB);
        consumed = true;
        break;

      case 'water_bribe_target':
        update   = commitWaterBribe(gameState, choiceData.playerId, choiceData.targetPlayerId);
        consumed = true;
        break;

      case 'protest_activation_round':
        update   = commitProtestResolution(gameState, choiceData.protestId, gameState.cardIndex);
        consumed = true;
        set({ protestActivations: {} });
        break;

      case 'red_herring_choose_lawyers':
        // choiceData.targetInstanceIds: [instanceIdA, instanceIdB]
        if (choiceData.targetInstanceIds?.length === 2) {
          // Re-invoke resolveCardAction with the chosen targets in options
          update = resolveCardAction(
            gameState,
            choiceData.playerId,
            'red_herring_case',
            'N',
            { targetInstanceIds: choiceData.targetInstanceIds }
          );
        } else {
          // No valid targets — the card fizzles (it already left the hand)
          update = { ...emptyUpdate(), logEntries: [{
            type: 'card_fizzled', playerId: choiceData.playerId,
            message: `${gameState.players[choiceData.playerId]?.name}'s Red Herring Case has no valid targets — effect fizzles`,
          }] };
        }
        consumed = true;
        break;

      case 'rider_coattails_lawyer': {
        // Re-run the chosen lawyer's N action on behalf of the rider player,
        // skipping payment (rider gains the reward, not the cost).
        const { chosenCardId, playerId: rcPlayerId } = choiceData;
        if (chosenCardId) {
          const copiedDef  = gameState.cardIndex[chosenCardId];
          const baseUpdate = resolveCardAction(
            gameState, rcPlayerId, chosenCardId, 'N',
            { skipPayment: true }
          );
          // Prepend a log entry naming the copy
          update = mergeUpdates(
            {
              ...emptyUpdate(),
              logEntries: [{
                type:    'rider_coattails_resolved',
                playerId: rcPlayerId,
                cardId:  chosenCardId,
                message: `${gameState.players[rcPlayerId]?.name} copies ${copiedDef?.name || chosenCardId} N via Rider of Coat-tails`,
              }],
            },
            baseUpdate
          );
        } else {
          // No valid target — just log the fizzle
          update = { ...emptyUpdate(), logEntries: [{
            type: 'rider_coattails_resolved', playerId: choiceData.playerId,
            message: `${gameState.players[choiceData.playerId]?.name} Rider of Coat-tails N — no valid target, effect fizzles`,
          }] };
        }
        consumed = true;
        break;
      }

      case 'rider_coattails_case': {
        // Apply the winner_reward of the chosen case to the rider player.
        const { caseId: rcCaseId, playerId: rcPid } = choiceData;
        if (rcCaseId) {
          const caseDef = gameState.cardIndex[rcCaseId];
          let rcUpdate  = { ...emptyUpdate(), logEntries: [{
            type:    'rider_coattails_resolved',
            playerId: rcPid,
            caseId:  rcCaseId,
            message: `${gameState.players[rcPid]?.name} claims ${caseDef?.name || rcCaseId} winner bonus via Rider of Coat-tails`,
          }] };
          for (const reward of (caseDef?.winner_reward ?? [])) {
            rcUpdate = mergeUpdates(
              rcUpdate,
              applyResourceDelta(gameState, rcPid, reward.resource, reward.amount,
                `Rider of Coat-tails: ${caseDef?.name} winner reward`)
            );
          }
          update   = rcUpdate;
        } else {
          update = { ...emptyUpdate(), logEntries: [{
            type: 'rider_coattails_resolved', playerId: choiceData.playerId,
            message: `${gameState.players[choiceData.playerId]?.name} Rider of Coat-tails C — no valid target, effect fizzles`,
          }] };
        }
        consumed = true;
        break;
      }

      case 'negate_card_or_lawyer':
        // choiceData.targetInstanceId: instanceId of the card/lawyer to negate
        // Mark the instance as locked so its effect is treated as void this round
        {
          if (!choiceData.targetInstanceId) {
            // Dismissed with no target — fizzle
            update = { ...emptyUpdate(), logEntries: [{
              type: 'card_fizzled', playerId: choiceData.playerId,
              message: `${gameState.players[choiceData.playerId]?.name}'s Protect Our Interests has no target — effect fizzles`,
            }] };
            consumed = true;
            break;
          }
          let found = false;
          const playerPatchesNegate = {};
          for (const [pid, player] of Object.entries(gameState.players)) {
            const idx = player.tableau.findIndex(c => c.instanceId === choiceData.targetInstanceId);
            if (idx !== -1) {
              const updatedTableau = player.tableau.map(c =>
                c.instanceId === choiceData.targetInstanceId
                  ? { ...c, exhaustState: 'locked' }
                  : c
              );
              playerPatchesNegate[pid] = { tableau: updatedTableau };
              found = true;
            }
          }
          update = {
            playerPatches: playerPatchesNegate,
            sharedPatches: {},
            logEntries: [{
              type:    'card_negated',
              playerId: choiceData.playerId,
              targetInstanceId: choiceData.targetInstanceId,
              message: `${gameState.players[choiceData.playerId]?.name} negates card effect (${choiceData.targetInstanceId})`,
            }],
            pendingEffects: [],
          };
          consumed = true;
        }
        break;

      case 'activist_a_water_direction':
        // choiceData.direction: 1 (gain) or -1 (lose)
        update = resolveCardAction(
          gameState, choiceData.playerId, choiceData.cardId, 'N',
          { delta: choiceData.direction, instanceId: sourceEffect?.instanceId }
        );
        consumed = true;
        break;

      case 'card_alternative_choice':
        // choiceData.alternativeIdx: 0 = primary, 1+ = alternatives[idx-1]
        update = resolveCardAction(
          gameState, choiceData.playerId, choiceData.cardId, choiceData.side,
          { alternativeIdx: choiceData.alternativeIdx, instanceId: sourceEffect?.instanceId }
        );
        consumed = true;
        break;

      default:
        console.warn(`resolveChoice: unhandled subtype "${subtype}"`);
    }

    if (consumed) {
      // Activist C look-and-draw reveals hidden strategy cards, so seal undo
      // to prevent exploiting knowledge of unseen cards.
      const sealUndo = (subtype === 'activist_c_look_and_draw');
      _dispatch(update, undefined, { sealUndo });
      set(s => ({
        pendingEffects: s.pendingEffects.filter(e => e.subtype !== subtype),
      }));
      // A turn action resolved into this choice — advance the turn now that
      // the choice (and any it chained into) is settled.
      if (get().pendingTurnAdvance && !get().pendingEffects.some(isBlockingEffect)) {
        get()._advanceTurn();
      }
    }
  },

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  undo() {
    set(s => {
      const { gameState } = s;
      if (!gameState.undoStack?.length) return s;
      const [prev, ...rest] = gameState.undoStack;
      return {
        gameState: {
          ...prev,
          undoStack: rest,
          redoStack: [gameState, ...(gameState.redoStack ?? [])],
        },
        // Restore the matching pendingEffects snapshot so an undone card play
        // doesn't leave its choice modal open against rolled-back state
        pendingEffects: s.undoPending[0] ?? [],
        undoPending:    s.undoPending.slice(1),
        redoPending:    [s.pendingEffects, ...s.redoPending],
        pendingTurnAdvance: false,
      };
    });
  },

  redo() {
    set(s => {
      const { gameState } = s;
      if (!gameState.redoStack?.length) return s;
      const [next, ...rest] = gameState.redoStack;
      return {
        gameState: {
          ...next,
          undoStack: [gameState, ...(gameState.undoStack ?? [])],
          redoStack: rest,
        },
        pendingEffects: s.redoPending[0] ?? [],
        redoPending:    s.redoPending.slice(1),
        undoPending:    [s.pendingEffects, ...s.undoPending],
        pendingTurnAdvance: false,
      };
    });
  },

  // ── End game ────────────────────────────────────────────────────────────────

  endGame() {
    const { gameState } = get();
    const finalScores = calculateFinalScores(gameState);
    set({ isGameOver: true, finalScores });
  },

}));
