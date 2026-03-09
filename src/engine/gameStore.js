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
         WATER_BANK, PARTNERSHIP_COSTS, PARTNERSHIP_ABILITY_COSTS, MAX_ROUNDS }
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
        // Find a citizen card of the specified type in the cardIndex
        const citizenCard = Object.values(current.cardIndex).find(
          c => c.type === CARD_TYPES.CITIZEN &&
               c.name?.toLowerCase().includes(effect.citizen_type)
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

      default:
        // Requires UI interaction — keep in remaining
        remaining.push(effect);
    }
  }

  return { state: current, remainingEffects: remaining };
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
    });
    // Auto-advance from 'setup_complete' to first EVENT phase
    get().advanceToNextPhase();
  },

  // ── Core dispatch ─────────────────────────────────────────────────────────

  /**
   * Apply a StateUpdate to the game state, process auto-resolvable pending effects,
   * and push current state to undoStack.
   */
  _dispatch(update, newPhase) {
    set(store => {
      const current = store.gameState;

      // Save to undo stack (keep last 20 states)
      const undoStack = [current, ...current.undoStack.slice(0, 19)];
      let   next      = { ...applyUpdate(current, update), undoStack, redoStack: [] };

      if (newPhase) next = { ...next, phase: newPhase };

      // Auto-resolve pending effects
      const allPending = [...(store.pendingEffects ?? []), ...(update.pendingEffects ?? [])];
      const { state: resolved, remainingEffects } =
        autoResolvePending(next, allPending, store.boardTemplate);

      return {
        gameState:      resolved,
        pendingEffects: remainingEffects,
      };
    });
  },

  // ── Phase management ──────────────────────────────────────────────────────

  advanceToNextPhase(rollFn) {
    const { gameState, boardTemplate, _dispatch, endGame } = get();
    const { nextPhase: phase, _roundAfterCleanup, _isGameOver, ...update } = advancePhase(
      gameState,
      undefined,
      { boardTemplate, rollFn }
    );
    _dispatch(update, phase);

    // After CLEANUP: advance round counter (or trigger end-game)
    if (phase === PHASES.CLEANUP) {
      if (_isGameOver) {
        endGame();
      } else {
        set(s => ({ gameState: { ...s.gameState, round: _roundAfterCleanup } }));
      }
    }
  },

  // ── Player actions ────────────────────────────────────────────────────────

  /**
   * Play a card action (N or C side).
   * Validates that it's this player's turn and the card is ready.
   */
  playCardAction(playerId, cardId, side, options = {}) {
    const { gameState, _dispatch } = get();

    // Turn validation
    const activePlayer = gameState.playerOrder[gameState.activePlayerIndex];
    if (activePlayer !== playerId) {
      console.warn(`playCardAction: not ${playerId}'s turn (active: ${activePlayer})`);
      return;
    }

    // Exhaust validation
    const player   = gameState.players[playerId];
    const instance = player.tableau.find(c => c.cardId === cardId);
    if (instance && instance.exhaustState !== EXHAUST_STATES.READY) {
      console.warn(`playCardAction: ${cardId} is ${instance.exhaustState}`);
      return;
    }

    const update = resolveCardAction(gameState, playerId, cardId, side, options);
    _dispatch(update);
  },

  /**
   * End the current player's turn within an action phase.
   * If all players have gone, auto-advances to the next phase.
   */
  endPlayerTurn() {
    const { gameState, _dispatch, advanceToNextPhase } = get();
    const { isPhaseComplete, nextPlayerIndex } = advancePlayerTurn(gameState);

    if (isPhaseComplete) {
      advanceToNextPhase();
    } else {
      _dispatch({
        playerPatches:  {},
        sharedPatches:  {},
        logEntries:     [{
          type:    'turn_end',
          playerId: gameState.playerOrder[gameState.activePlayerIndex],
          message: `${gameState.players[gameState.playerOrder[gameState.activePlayerIndex]].name} ends their turn`,
        }],
        pendingEffects: [],
      });
      set(s => ({ gameState: { ...s.gameState, activePlayerIndex: nextPlayerIndex } }));
    }
  },

  // ── Market actions ────────────────────────────────────────────────────────

  /**
   * Acquire a lawyer from the lawyer market.
   */
  acquireLawyer(playerId, marketIndex) {
    const { gameState, _dispatch } = get();
    const player   = gameState.players[playerId];
    const cardId   = gameState.sharedBoard.lawyerMarket[marketIndex];

    if (!cardId) { console.warn('acquireLawyer: empty slot'); return; }

    const cardDef = gameState.cardIndex[cardId];
    if (!canAcquireWithPr(cardDef, player.prTrack.value)) {
      console.warn(`acquireLawyer: PR requirement not met for ${cardId}`);
      return;
    }

    let cost = lawyerAcquisitionCost(cardDef, player.prTrack.value);
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
          message:  `${player.name} acquires ${cardDef.name} for $${cost}`,
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
  },

  /**
   * Acquire an activist from the activist market.
   */
  acquireActivist(playerId, marketIndex) {
    const { gameState, _dispatch } = get();
    const player  = gameState.players[playerId];
    const cardId  = gameState.sharedBoard.activistMarket[marketIndex];

    if (!cardId) { console.warn('acquireActivist: empty slot'); return; }

    const partnership = player.partnerships.business;
    if (!partnership) {
      console.warn('acquireActivist: requires Business partnership');
      return;
    }

    // Business partnership cost: $3 per activist
    const cost = PARTNERSHIP_COSTS.business;
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
  },

  // ── Partnership actions ────────────────────────────────────────────────────

  /**
   * Purchase a partnership slot.
   */
  purchasePartnership(playerId, partnershipId) {
    const { gameState, _dispatch } = get();
    const player = gameState.players[playerId];

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
  },

  // ── Water allocation ────────────────────────────────────────────────────────

  /**
   * Allocate water cubes to a player's project during the WATER phase.
   * @param {string} playerId
   * @param {'citizen'|'income'} projectType
   * @param {string} projectId
   * @param {number} cubeCount
   */
  allocateWater(playerId, projectType, projectId, cubeCount) {
    const { gameState, _dispatch } = get();
    const player  = gameState.players[playerId];
    const project = player.projects[projectType]?.[projectId];

    if (!project) { console.warn(`allocateWater: unknown project ${projectType}/${projectId}`); return; }

    const maxSlots   = project.water_slots;
    const current    = project.watered;
    const toAdd      = Math.min(cubeCount, maxSlots - current);
    const supply     = gameState.sharedBoard.waterSupply;

    if (toAdd <= 0)      { console.warn('allocateWater: project already full'); return; }
    if (supply < toAdd)  { console.warn(`allocateWater: insufficient water supply (${supply})`); return; }

    const newProjects = {
      ...player.projects,
      [projectType]: {
        ...player.projects[projectType],
        [projectId]: { ...project, watered: current + toAdd },
      },
    };

    _dispatch({
      playerPatches: { [playerId]: { projects: newProjects } },
      sharedPatches: { waterSupply: supply - toAdd },
      logEntries: [{
        type: 'water_allocated', playerId, projectId, projectType, cubeCount: toAdd,
        message: `${player.name} allocates ${toAdd} water to ${projectId} (${current + toAdd}/${maxSlots})`,
      }],
      pendingEffects: [],
    });
  },

  // ── Partnership ability use ──────────────────────────────────────────────────

  /**
   * Use a partnership ability:
   *   law_firm   → Pay $4, triggers acquireLawyer flow (UI picks the market slot)
   *   business   → Pay $3, triggers acquireActivist flow (UI picks the slot)
   *   investment → Pay $2, gain 1 PR immediately
   *
   * For law_firm / business the money is deducted here; the card acquisition
   * is handled by the existing acquireLawyer / acquireActivist actions driven
   * by the UI.  For investment, the full effect resolves here.
   */
  usePartnershipAbility(playerId, partnershipId) {
    const { gameState, _dispatch } = get();
    const player = gameState.players[playerId];

    if (!player.partnerships[partnershipId]) {
      console.warn(`usePartnershipAbility: ${partnershipId} not owned`); return;
    }

    const abilityCost = PARTNERSHIP_ABILITY_COSTS[partnershipId];
    if (!abilityCost) { console.warn(`usePartnershipAbility: unknown id ${partnershipId}`); return; }

    if (player.moneyTrack.value < abilityCost.amount) {
      console.warn(`usePartnershipAbility: insufficient money`); return;
    }

    // Deduct cost
    const { playerPatch: moneyPatch, logEntries: moneyLog, pendingEffects: moneyFx } =
      applyTrackDelta(player, 'money', -abilityCost.amount, `${partnershipId} partnership ability`);

    let extraPatch = {};
    let extraLog   = [];
    let extraFx    = [];

    if (partnershipId === 'investment') {
      // Investment: gain 1 PR immediately
      const { playerPatch: prPatch, logEntries: prLog, pendingEffects: prFx } =
        applyTrackDelta({ ...player, ...moneyPatch }, 'pr', 1, 'investment partnership');
      extraPatch = prPatch;
      extraLog   = prLog;
      extraFx    = prFx;
    }
    // law_firm / business: money deducted; emit a pending effect so the UI
    // can guide the player to pick a card from the market.
    if (partnershipId === 'law_firm' || partnershipId === 'business') {
      extraFx.push({
        type:          'pending_partnership_acquire',
        partnershipId,
        playerId,
        marketType:    partnershipId === 'law_firm' ? 'lawyer' : 'activist',
        message: `${player.name} paid $${abilityCost.amount} — now acquire a `
          + `${partnershipId === 'law_firm' ? 'Lawyer' : 'Activist'} from the market`,
      });
    }

    _dispatch({
      playerPatches: { [playerId]: { ...moneyPatch, ...extraPatch } },
      sharedPatches: {},
      logEntries: [
        ...moneyLog,
        ...extraLog,
        { type: 'partnership_ability_used', playerId, partnershipId,
          message: `${player.name} uses ${partnershipId} partnership ability ($${abilityCost.amount})` },
      ],
      pendingEffects: [...moneyFx, ...extraFx],
    });
  },

  // ── Water bank ────────────────────────────────────────────────────────────

  /** Unlock a player's water bank for $8 (one-time). */
  unlockWaterBank(playerId) {
    const { gameState, _dispatch } = get();
    const player = gameState.players[playerId];

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
   * Place SC influence on the active SC case.
   * Costs 1 water cube per influence.  Can only place on the first docket case.
   * @param {string} playerId
   * @param {string} caseId    — must match docket[0]
   * @param {number} amount
   */
  placeScInfluence(playerId, caseId, amount = 1) {
    const { gameState, _dispatch } = get();
    const player    = gameState.players[playerId];
    const activeCaseId = gameState.sharedBoard.docket[0];

    if (caseId !== activeCaseId) {
      console.warn(`placeScInfluence: ${caseId} is not the active case (${activeCaseId})`); return;
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

  // ── Water deallocation (remove cubes from a project) ─────────────────────────

  /**
   * Remove water cubes from a project (used by the − button in the
   * Water Allocation modal to undo over-allocation).
   */
  deallocateWater(playerId, projectType, projectId, cubeCount) {
    const { gameState, _dispatch } = get();
    const player  = gameState.players[playerId];
    const project = player.projects[projectType]?.[projectId];

    if (!project) { console.warn(`deallocateWater: unknown project ${projectType}/${projectId}`); return; }

    const toRemove = Math.min(cubeCount, project.watered);
    if (toRemove <= 0) { console.warn('deallocateWater: nothing to remove'); return; }

    const newProjects = {
      ...player.projects,
      [projectType]: {
        ...player.projects[projectType],
        [projectId]: { ...project, watered: project.watered - toRemove },
      },
    };

    _dispatch({
      playerPatches: { [playerId]: { projects: newProjects } },
      sharedPatches: { waterSupply: gameState.sharedBoard.waterSupply + toRemove },
      logEntries: [{
        type:    'water_deallocated',
        playerId,
        projectId,
        projectType,
        cubeCount: toRemove,
        message: `${player.name} removes ${toRemove} water from ${projectId} (${project.watered - toRemove}/${project.water_slots})`,
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
  },

  /**
   * Dismiss the water_allocation pendingEffect — called when the player
   * clicks "Done Allocating".  Unblocks the Advance button.
   */
  dismissWaterAllocation() {
    set(s => ({
      pendingEffects: s.pendingEffects.filter(e => e.type !== 'water_allocation'),
    }));
  },

  // ── Pending effect resolution (called by UI) ────────────────────────────────

  resolveChoice(choiceData) {
    const { gameState, pendingEffects, _dispatch } = get();
    const { subtype } = choiceData;

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
          consumed = true;
        }
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
          consumed = found;
        }
        break;

      case 'activist_a_water_direction':
        // choiceData.direction: 1 (gain) or -1 (lose)
        update = resolveCardAction(
          gameState, choiceData.playerId, choiceData.cardId, 'N',
          { delta: choiceData.direction }
        );
        consumed = true;
        break;

      case 'card_alternative_choice':
        // choiceData.alternativeIdx: 0 = primary, 1+ = alternatives[idx-1]
        update = resolveCardAction(
          gameState, choiceData.playerId, choiceData.cardId, choiceData.side,
          { alternativeIdx: choiceData.alternativeIdx }
        );
        consumed = true;
        break;

      default:
        console.warn(`resolveChoice: unhandled subtype "${subtype}"`);
    }

    if (consumed) {
      _dispatch(update);
      set(s => ({
        pendingEffects: s.pendingEffects.filter(e => e.subtype !== subtype),
      }));
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
