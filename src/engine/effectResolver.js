/**
 * effectResolver.js
 * The heart of the engine: reads a card's action object from cards.json
 * and dispatches it to the correct handler.
 *
 * All handlers are pure functions:
 *   resolveEffect(state, playerId, effect, options) → StateUpdate
 *
 * StateUpdate:
 *   {
 *     playerPatches:  { [playerId]: Partial<PlayerState> }
 *     sharedPatches:  Partial<SharedBoardState>
 *     logEntries:     Object[]
 *     pendingEffects: Object[]   // Effects that require further resolution (e.g. VP grants)
 *   }
 */

import {
  applyTrackDelta,
  grantVP,
  applyWaterCubeDelta,
  checkDiscardConditions,
  lawyerAcquisitionCost,
  canAcquireWithPr,
} from './trackManager.js';

import {
  drawFrom,
  reshuffleDiscard,
  slideAndDraw,
  rollDie,
  swapIndices,
  nextId,
} from './utils.js';

import {
  RESOURCES,
  EXHAUST_STATES,
  LAWYER_ACQUISITION_SURCHARGE,
  CARD_TYPES,
} from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal merge helpers
// ─────────────────────────────────────────────────────────────────────────────

function emptyUpdate() {
  return {
    playerPatches:  {},
    sharedPatches:  {},
    logEntries:     [],
    pendingEffects: [],
  };
}

function mergeUpdates(...updates) {
  return updates.reduce((acc, u) => {
    // Merge playerPatches per-player
    for (const [pid, patch] of Object.entries(u.playerPatches ?? {})) {
      acc.playerPatches[pid] = { ...(acc.playerPatches[pid] ?? {}), ...patch };
    }
    acc.sharedPatches  = { ...acc.sharedPatches,  ...(u.sharedPatches  ?? {}) };
    acc.logEntries     = [...acc.logEntries,    ...(u.logEntries     ?? [])];
    acc.pendingEffects = [...acc.pendingEffects, ...(u.pendingEffects ?? [])];
    return acc;
  }, emptyUpdate());
}

function playerUpdate(playerId, patch, log = [], effects = []) {
  return {
    playerPatches:  { [playerId]: patch },
    sharedPatches:  {},
    logEntries:     log,
    pendingEffects: effects,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource effect dispatch
// Maps a resource string from cards.json to the correct track key
// ─────────────────────────────────────────────────────────────────────────────

const RESOURCE_TO_TRACK = {
  [RESOURCES.WATER_CLAIM]:       'water_claim',
  [RESOURCES.WATER_CLAIM_TRACK]: 'water_claim',
  [RESOURCES.MONEY]:             'money',
  [RESOURCES.PR]:                'pr',
};

/**
 * Apply a single resource delta to a player.
 * Handles track resources, water cubes, and VP.
 */
function applyResourceDelta(state, playerId, resource, amount, reason) {
  const player = state.players[playerId];
  const update = emptyUpdate();

  if (resource === RESOURCES.WATER || resource === 'water') {
    // Workaholic C passive: if active and gaining exactly 1 cube, gain 2 instead
    let effectiveAmount = amount;
    let extraPatch = {};
    if (amount === 1 && player.workaholicActive) {
      effectiveAmount = 2;
      extraPatch = { workaholicActive: false };
    }
    const { playerPatch, logEntries, pendingEffects } =
      applyWaterCubeDelta(player, effectiveAmount, reason);
    return playerUpdate(playerId, { ...playerPatch, ...extraPatch }, logEntries, pendingEffects);
  }

  if (resource === RESOURCES.VP || resource === 'vp') {
    const { playerPatch, logEntries } = grantVP(player, amount, reason);
    return playerUpdate(playerId, playerPatch, logEntries);
  }

  const trackKey = RESOURCE_TO_TRACK[resource];
  if (trackKey) {
    const { playerPatch, logEntries, pendingEffects } =
      applyTrackDelta(player, trackKey, amount, reason);
    // After any track change, check discard conditions on tableau
    const { cardsToDiscard, logEntries: discardLogs } =
      checkDiscardConditions({ ...player, ...playerPatch }, state.cardIndex);

    const discardPatch = cardsToDiscard.length > 0
      ? { tableau: player.tableau.filter(c => !cardsToDiscard.includes(c.instanceId)) }
      : {};

    return playerUpdate(
      playerId,
      { ...playerPatch, ...discardPatch },
      [...logEntries, ...discardLogs],
      pendingEffects
    );
  }

  console.warn(`effectResolver: unknown resource "${resource}" — skipped`);
  return emptyUpdate();
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate and apply payment costs before resolving an action.
 * Returns { ok, update, error }.
 */
function applyPayments(state, playerId, payments) {
  if (!payments || payments.length === 0) return { ok: true, update: emptyUpdate() };

  const player = state.players[playerId];
  let update   = emptyUpdate();

  for (const p of payments) {
    const amount = -Math.abs(p.amount); // Payments are always negative deltas

    // Validate affordability
    const trackKey = RESOURCE_TO_TRACK[p.resource];
    if (trackKey) {
      const trackStateKey = { water_claim: 'waterClaimTrack', money: 'moneyTrack', pr: 'prTrack' }[trackKey];
      const current = player[trackStateKey]?.value ?? 0;
      const min     = player[trackStateKey]?.min   ?? 0;
      if (current + amount < min && player[trackStateKey]?.hard_cap) {
        return { ok: false, update: null, error: `Insufficient ${p.resource} to pay cost` };
      }
    }

    const costUpdate = applyResourceDelta(state, playerId, p.resource, amount, 'payment');
    update = mergeUpdates(update, costUpdate);
    // Apply patch to check subsequent payments against updated state
    // (shallow apply for validation — the real commit happens in gameStore)
  }

  return { ok: true, update, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// SC influence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grant SC influence for the active case (docket[0]) or a specified case.
 */
function resolveScInfluence(state, playerId, amount, caseId = null) {
  const targetCase = caseId ?? state.sharedBoard.docket[0];
  if (!targetCase) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: 'SC influence gained but no active case in docket' }],
    };
  }

  const player    = state.players[playerId];
  const current   = player.scInfluence[targetCase] ?? 0;
  const newVal    = current + amount;
  const newInfluence = { ...player.scInfluence, [targetCase]: newVal };

  return playerUpdate(
    playerId,
    { scInfluence: newInfluence },
    [{
      type:     'sc_influence',
      playerId,
      caseId:   targetCase,
      from:     current,
      to:       newVal,
      message:  `${state.players[playerId].name} gains ${amount} SC influence in ${targetCase} (total: ${newVal})`,
    }]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Protest influence
// ─────────────────────────────────────────────────────────────────────────────

function resolveProtestInfluence(state, playerId, amount) {
  const player = state.players[playerId];
  const newVal = (player.protestInfluence ?? 0) + amount;
  return playerUpdate(
    playerId,
    { protestInfluence: newVal },
    [{
      type:     'protest_influence',
      playerId,
      from:     player.protestInfluence,
      to:       newVal,
      message:  `${player.name} gains ${amount} protest influence (total: ${newVal})`,
    }]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card draw/acquire effects
// ─────────────────────────────────────────────────────────────────────────────

function resolveDrawStrategy(state, playerId, amount = 1) {
  const { strategyDeck, strategyDiscard } = state.sharedBoard;
  let deck    = [...strategyDeck];
  let discard = [...strategyDiscard];

  // Reshuffle discard into deck if we don't have enough cards
  if (deck.length < amount && discard.length > 0) {
    deck    = reshuffleDiscard(discard);
    discard = [];
  }

  // After reshuffle attempt, if still empty → effect does nothing
  if (deck.length === 0) {
    return {
      ...emptyUpdate(),
      logEntries: [{
        type:    'no_op',
        playerId,
        message: `${state.players[playerId].name} cannot draw a Strategy card — none available after reshuffle attempt`,
      }],
    };
  }

  const { drawn, remaining } = drawFrom(deck, Math.min(amount, deck.length));
  const player = state.players[playerId];
  const didReshuffle = discard !== state.sharedBoard.strategyDiscard; // reshuffle happened

  return mergeUpdates(
    playerUpdate(
      playerId,
      { hand: [...player.hand, ...drawn] },
      [
        ...(didReshuffle ? [{ type: 'strategy_deck_reshuffled',
          message: 'Strategy discard reshuffled into new draw deck' }] : []),
        {
          type:     'draw_strategy',
          playerId,
          cardIds:  drawn,
          count:    drawn.length,
          message:  `${player.name} draws ${drawn.length} Strategy card(s)`,
        },
      ]
    ),
    { playerPatches: {}, sharedPatches: { strategyDeck: remaining, strategyDiscard: discard }, logEntries: [], pendingEffects: [] }
  );
}

/**
 * Add a protest event card to the event deck (Activist B N-action, Service Worker B C-action).
 */
function resolveAddProtestToEventDeck(state, protestCardId = 'protest_a') {
  const newEventDeck = [...state.sharedBoard.eventDeck, protestCardId];
  return {
    playerPatches:  {},
    sharedPatches:  { eventDeck: newEventDeck },
    logEntries:     [{
      type:    'protest_added_to_deck',
      cardId:  protestCardId,
      message: `A Protest card (${protestCardId}) is added to the Event deck`,
    }],
    pendingEffects: [],
  };
}

/**
 * Resolve "Look at 2 Strategy cards. Draw 1 and put the other on the bottom" (Activist C).
 * This requires player interaction — we emit a pendingEffect for the UI to handle.
 *
 * Deck exhaustion rules:
 *   - If deck is empty, reshuffle the strategy discard pile into a new face-down deck first.
 *   - If deck is still empty after reshuffling (no Strategy cards available at all), do nothing.
 */
function resolveActivistCAction(state, playerId) {
  let { strategyDeck, strategyDiscard } = state.sharedBoard;

  // Reshuffle discard into deck if needed
  if (strategyDeck.length === 0 && strategyDiscard.length > 0) {
    strategyDeck    = reshuffleDiscard(strategyDiscard);
    strategyDiscard = [];
  }

  // Still empty after reshuffle — no Strategy cards exist anywhere
  if (strategyDeck.length === 0) {
    return {
      ...emptyUpdate(),
      logEntries: [{
        type:    'no_op',
        playerId,
        message: `${state.players[playerId].name} uses Activist C but no Strategy cards are available — no effect`,
      }],
    };
  }

  // Peek at top 1 or 2 cards (may only be 1 if deck has 1 card)
  const topTwo = strategyDeck.slice(0, Math.min(2, strategyDeck.length));
  const sharedPatchesForReshuffle = strategyDiscard !== state.sharedBoard.strategyDiscard
    ? { strategyDeck, strategyDiscard }
    : {};

  return {
    ...emptyUpdate(),
    sharedPatches: sharedPatchesForReshuffle,
    pendingEffects: [{
      type:    'choice_required',
      subtype: 'activist_c_look_and_draw',
      playerId,
      options: topTwo,
      message: `${state.players[playerId].name} must choose 1 of ${topTwo.length} Strategy card(s) to draw`,
    }],
    logEntries: [
      ...(Object.keys(sharedPatchesForReshuffle).length > 0 ? [{
        type:    'strategy_deck_reshuffled',
        message: 'Strategy discard reshuffled into new draw deck',
      }] : []),
      {
        type:    'activist_c_triggered',
        playerId,
        message: `${state.players[playerId].name} uses Activist C: looking at top ${topTwo.length} Strategy card(s)`,
      },
    ],
  };
}

/**
 * Resolve docket swap (Donate to SC Justice strategy card).
 * Requires player to choose two indices — emits a pendingEffect.
 */
function resolveDocketSwap(state, playerId) {
  return {
    ...emptyUpdate(),
    pendingEffects: [{
      type:    'choice_required',
      subtype: 'docket_swap',
      playerId,
      docket:  [...state.sharedBoard.docket],
      message: `${state.players[playerId].name} must choose 2 SC cases to swap in the docket`,
    }],
    logEntries: [{
      type:    'docket_swap_triggered',
      playerId,
      message: `${state.players[playerId].name} plays Donate to SC Justice — choosing cases to swap`,
    }],
  };
}

/**
 * Commit a docket swap after the player has chosen indices.
 */
export function commitDocketSwap(state, indexA, indexB) {
  const newDocket = swapIndices(state.sharedBoard.docket, indexA, indexB);
  return {
    ...emptyUpdate(),
    sharedPatches: { docket: newDocket },
    logEntries: [{
      type:    'docket_swap',
      indexA, indexB,
      caseA:   state.sharedBoard.docket[indexA],
      caseB:   state.sharedBoard.docket[indexB],
      message: `Docket reordered: ${state.sharedBoard.docket[indexA]} ↔ ${state.sharedBoard.docket[indexB]}`,
    }],
  };
}

/**
 * Commit Activist C choice: draw one card, bottom the other.
 */
export function commitActivistCChoice(state, playerId, chosenCardId) {
  // The deck at this point already reflects any reshuffle done in resolveActivistCAction
  const deck   = [...state.sharedBoard.strategyDeck];
  const topTwo = deck.splice(0, Math.min(2, deck.length));

  const kept   = topTwo.find(id => id === chosenCardId);
  const bottom = topTwo.find(id => id !== chosenCardId);

  if (!kept) {
    // Chosen card not in top two — defensive fallback: draw first, bottom second
    console.warn(`commitActivistCChoice: chosenCardId "${chosenCardId}" not found in top two; defaulting`);
    const [fallbackKept, fallbackBottom] = topTwo;
    const fallbackDeck = fallbackBottom ? [...deck, fallbackBottom] : deck;
    const player = state.players[playerId];
    return mergeUpdates(
      playerUpdate(playerId, { hand: [...player.hand, fallbackKept] }, [
        { type: 'activist_c_resolved', playerId, drew: fallbackKept, bottomedId: fallbackBottom,
          message: `${player.name} draws ${fallbackKept} (fallback) and places ${fallbackBottom ?? 'nothing'} at bottom` },
      ]),
      { playerPatches: {}, sharedPatches: { strategyDeck: fallbackDeck }, logEntries: [], pendingEffects: [] }
    );
  }

  const newDeck = bottom ? [...deck, bottom] : deck;
  const player  = state.players[playerId];

  return mergeUpdates(
    playerUpdate(
      playerId,
      { hand: [...player.hand, kept] },
      [{ type: 'activist_c_resolved', playerId, drew: kept, bottomedId: bottom,
         message: `${player.name} draws ${kept} and places ${bottom ?? 'nothing'} at bottom of Strategy deck` }]
    ),
    { playerPatches: {}, sharedPatches: { strategyDeck: newDeck }, logEntries: [], pendingEffects: [] }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rider of Coat-tails — passive reference effects
// (These are triggered externally by the engine when conditions are met.)
// ─────────────────────────────────────────────────────────────────────────────

// Handled via passive trigger resolution — see passiveResolver (future module).

// ─────────────────────────────────────────────────────────────────────────────
// Red Herring Case — lock two lawyers
// ─────────────────────────────────────────────────────────────────────────────

function resolveRedHerring(state, playerId, targetCardInstanceIds) {
  // targetCardInstanceIds: 2 lawyer instanceIds chosen by the playing player
  // We lock them on whichever players own them
  const updates = [];
  for (const [pid, player] of Object.entries(state.players)) {
    const locked = player.tableau.map(c =>
      targetCardInstanceIds.includes(c.instanceId)
        ? { ...c, exhaustState: EXHAUST_STATES.LOCKED }
        : c
    );
    if (locked.some((c, i) => c.exhaustState !== player.tableau[i]?.exhaustState)) {
      updates.push(playerUpdate(pid, { tableau: locked }, [{
        type:     'card_locked',
        playerId: pid,
        cardInstanceIds: targetCardInstanceIds,
        message:  `${player.name}'s lawyer(s) locked by Red Herring Case`,
      }]));
    }
  }
  return mergeUpdates(...updates);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorched Earth Negotiating — all opponents lose 1 water cube
// ─────────────────────────────────────────────────────────────────────────────

function resolveScorchedEarth(state, playerId) {
  const updates = [];
  for (const pid of state.playerOrder) {
    if (pid === playerId) continue;
    updates.push(applyResourceDelta(state, pid, RESOURCES.WATER, -1, 'Scorched Earth Negotiating'));
  }
  return mergeUpdates(...updates);
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Player — discount next lawyer acquisition
// ─────────────────────────────────────────────────────────────────────────────
// This sets a flag on the player state that lawyerAcquisitionCost() checks.

function resolveTeamPlayerDiscount(state, playerId) {
  const player = state.players[playerId];
  return playerUpdate(
    playerId,
    { pendingLawyerDiscount: 3 },
    [{
      type:    'team_player_discount',
      playerId,
      message: `${player.name} will pay $3 less on their next lawyer acquisition this round`,
    }]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Protect Our Interests — negate any 1 card or lawyer effect (UI-driven)
// ─────────────────────────────────────────────────────────────────────────────

function resolveProtectOurInterests(state, playerId) {
  return {
    ...emptyUpdate(),
    pendingEffects: [{
      type:    'choice_required',
      subtype: 'negate_card_or_lawyer',
      playerId,
      message: `${state.players[playerId].name} plays Protect Our Interests — choose a card effect to negate`,
    }],
    logEntries: [{
      type:    'protect_our_interests_played',
      playerId,
      message: `${state.players[playerId].name} plays Protect Our Interests`,
    }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fully-watered project reward resolver (called at INCOME phase)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve rewards for all fully-watered projects for one player.
 * Farmer A C-action and Service Worker A C-action can modify these —
 * pass `modifiers` array from active tableau cards.
 *
 * @param {Object} state
 * @param {string} playerId
 * @param {Object} boardTemplate  player_board.json board_template
 * @param {Object[]} modifiers    Active modifier effects this income phase
 */
export function resolveIncomePhase(state, playerId, boardTemplate, modifiers = []) {
  const player  = state.players[playerId];
  let   update  = emptyUpdate();
  const allProjects = [
    ...boardTemplate.citizen_projects,
    ...boardTemplate.income_projects,
  ];

  for (const projectDef of allProjects) {
    const projectType = allProjects.some(p => p === projectDef && p.citizen_type)
      ? 'citizen' : 'income';
    const actualType   = projectDef.citizen_type ? 'citizen' : 'income';
    const playerProject = player.projects[actualType][projectDef.id];

    if (!playerProject) continue;
    const isFullyWatered = playerProject.watered >= projectDef.water_slots;
    if (!isFullyWatered) continue;

    for (const reward of (projectDef.fully_watered_reward ?? [])) {
      // Check for Farmer A modifier (+2 VP on fully watered farms)
      if (reward.resource === RESOURCES.VP || reward.resource === 'vp') {
        let vpAmount = reward.amount;
        const farmerAMod = modifiers.find(m => m.subtype === 'farmer_a_farm_vp' && projectDef.project_type === 'farm');
        if (farmerAMod) vpAmount += 2;

        const swaMod = modifiers.find(m => m.subtype === 'service_worker_a_income_double' && actualType === 'income');
        if (swaMod) vpAmount *= 2;

        update = mergeUpdates(update, applyResourceDelta(state, playerId, 'vp', vpAmount, `${projectDef.id} fully watered`));
      } else if (reward.resource === RESOURCES.CITIZEN_CARD || reward.resource === 'citizen_card') {
        // Citizen card grants are handled as pendingEffects — the engine adds the card to tableau
        update.pendingEffects.push({
          type:         'grant_citizen_card',
          playerId,
          citizen_type: reward.citizen_type,
          amount:       reward.amount,
          reason:       `${projectDef.id} fully watered`,
        });
        update.logEntries.push({
          type:     'citizen_card_reward',
          playerId,
          citizen_type: reward.citizen_type,
          message:  `${player.name} earns a ${reward.citizen_type} citizen card from ${projectDef.id}`,
        });
      } else {
        update = mergeUpdates(
          update,
          applyResourceDelta(state, playerId, reward.resource, reward.amount, `${projectDef.id} fully watered`)
        );
      }
    }

    // Reset water after income (cubes return to supply)
    update = mergeUpdates(update, {
      playerPatches: {
        [playerId]: {
          projects: {
            ...player.projects,
            [actualType]: {
              ...player.projects[actualType],
              [projectDef.id]: { ...playerProject, watered: 0 },
            },
          },
        },
      },
      sharedPatches: {},
      logEntries: [],
      pendingEffects: [],
    });
  }

  return update;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatch: resolveCardAction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a card action (N or C side) for a player.
 *
 * @param {Object} state         Current GameState
 * @param {string} playerId      Acting player
 * @param {string} cardId        cards.json id
 * @param {'N'|'C'} side         Which action side
 * @param {Object} [options]     Extra options (e.g. chosen targets)
 * @returns {StateUpdate}
 */
export function resolveCardAction(state, playerId, cardId, side, options = {}) {
  const cardDef = state.cardIndex[cardId];
  if (!cardDef) throw new Error(`Unknown card: ${cardId}`);

  const action = cardDef.actions?.[side];
  if (!action) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: `Card ${cardId} has no ${side} action` }],
    };
  }

  // ── Payment first (skipped when options.skipPayment is true) ──────────────
  const payResult = options.skipPayment
    ? { ok: true, update: emptyUpdate() }
    : applyPayments(state, playerId, action.payment);
  if (!payResult.ok) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'error', message: payResult.error }],
    };
  }

  let update = payResult.update;
  const player = state.players[playerId];

  // ── Exhaust the card ──────────────────────────────────────────────────────
  if (action.cost === 'exhaust') {
    const newTableau = player.tableau.map(c =>
      c.cardId === cardId ? { ...c, exhaustState: EXHAUST_STATES.EXHAUSTED } : c
    );
    update = mergeUpdates(update, playerUpdate(playerId, { tableau: newTableau }));
  }

  // ── Resolve the effect ────────────────────────────────────────────────────

  // If card has alternatives and player hasn't chosen, ask before resolving.
  if (action.alternatives?.length > 0 && options.alternativeIdx === undefined) {
    return mergeUpdates(update, {
      ...emptyUpdate(),
      pendingEffects: [{
        type:         'choice_required',
        subtype:      'card_alternative_choice',
        playerId,
        cardId,
        side,
        primary:      { icon: action.icon, text: action.text },
        alternatives: action.alternatives,
        message: `${state.players[playerId].name} must choose an effect for ${cardDef.name} ${side}`,
      }],
    });
  }

  // Route to primary or chosen alternative
  const resolvedAction = (options.alternativeIdx > 0)
    ? { ...action, ...action.alternatives[options.alternativeIdx - 1] }
    : action;
  const resolvedIcon = resolvedAction.icon;

  let effectUpdate = emptyUpdate();

  switch (resolvedIcon) {
    case 'water_claim':
      // activist_a N: 'Gain or Lose 1' — player must pick direction.
      // Other water_claim cards always gain (options.delta defaults to +1).
      if (resolvedAction.text?.toLowerCase().includes('or lose') && options.delta === undefined) {
        effectUpdate = {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'choice_required',
            subtype: 'activist_a_water_direction',
            playerId,
            cardId,
            message: `${state.players[playerId].name}: Gain or Lose 1 water claim?`,
          }],
        };
      } else {
        effectUpdate = applyResourceDelta(
          state, playerId, RESOURCES.WATER_CLAIM,
          options.delta ?? 1,
          `${cardDef.name} ${side} action`
        );
      }
      break;

    case 'water_claim_track':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.WATER_CLAIM,
        options.delta ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'money':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.MONEY,
        options.amount ?? 3,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'pr':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.PR,
        options.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'water':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.WATER,
        options.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'sc_influence':
      effectUpdate = resolveScInfluence(
        state, playerId,
        options.amount ?? resolvedAction.text?.match(/(\d+) SC/)?.[1] ?? 1,
        options.caseId
      );
      break;

    case 'protest_influence':
      effectUpdate = resolveProtestInfluence(
        state, playerId,
        options.amount ?? parseInt(resolvedAction.text?.match(/\+(\d+)/)?.[1] ?? '1', 10)
      );
      break;

    case null:
      // No icon — text-driven or special effect
      effectUpdate = resolveTextDrivenEffect(state, playerId, cardId, side, action, options);
      break;

    default:
      console.warn(`effectResolver: unhandled icon "${resolvedIcon}" on ${cardId} ${side}`);
  }

  return mergeUpdates(update, effectUpdate);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text-driven effect router (for null-icon actions)
// ─────────────────────────────────────────────────────────────────────────────

function resolveTextDrivenEffect(state, playerId, cardId, side, action, options) {
  // Route by card ID — the cleanest way since each is unique
  switch (cardId) {
    case 'activist_b':
      if (side === 'N') return resolveAddProtestToEventDeck(state, 'protest_a');
      break;

    case 'activist_c':
      if (side === 'C') return resolveActivistCAction(state, playerId);
      break;

    case 'activist_d':
      if (side === 'N') return resolveDrawStrategy(state, playerId, 1);
      break;

    case 'sneaky_pete':
      if (side === 'C') return resolveDrawStrategy(state, playerId, 1);
      break;

    case 'team_player':
      if (side === 'C') return resolveTeamPlayerDiscount(state, playerId);
      break;

    case 'workaholic':
      // Sets a flag on player state. The next time this player gains exactly
      // 1 water cube, applyResourceDelta checks the flag and gives 2 instead.
      return mergeUpdates(update, playerUpdate(
        playerId,
        { workaholicActive: true },
        [{ type: 'workaholic_active', playerId,
           message: `${state.players[playerId].name} activates Workaholic — next +1 water becomes +2` }]
      ));

    case 'rider_of_coattails':
      // N: "Gain the bonus of any of your lawyers activated this phase, if they cost more"
      // C: "Gain the bonus of any court case won this round, if you were not involved"
      // Both require UI selection → pendingEffect
      return {
        ...emptyUpdate(),
        pendingEffects: [{
          type:    'choice_required',
          subtype: side === 'N' ? 'rider_coattails_lawyer' : 'rider_coattails_case',
          playerId,
          message: `${state.players[playerId].name} uses Rider of Coat-tails ${side}`,
        }],
      };

    case 'in_it_for_glory':
      if (side === 'C') {
        return resolveScInfluence(state, playerId, options.amount ?? 1, options.caseId);
      }
      break;

    case 'deal_with_federal_government':
      if (side === 'N') return applyResourceDelta(state, playerId, RESOURCES.MONEY, 3, 'Deal with Federal Government');
      break;

    case 'quid_pro_quo':
      if (side === 'N') return applyResourceDelta(state, playerId, RESOURCES.WATER, 2, 'Quid Pro Quo');
      break;

    case 'lobby_federal_government':
      if (side === 'N') return applyResourceDelta(state, playerId, RESOURCES.WATER_CLAIM, 1, 'Lobby Federal Government');
      break;

    case 'scorched_earth_negotiating':
      if (side === 'N') return resolveScorchedEarth(state, playerId);
      break;

    case 'water_bribe':
      if (side === 'C') {
        // Give 1 water cube to an opponent; they must give $3 back
        // Requires target selection
        return {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'choice_required',
            subtype: 'water_bribe_target',
            playerId,
            message: `${state.players[playerId].name} plays Water Bribe — choose opponent to give water to`,
          }],
        };
      }
      break;

    case 'red_herring_case':
      if (side === 'N') {
        if (options.targetInstanceIds?.length === 2) {
          return resolveRedHerring(state, playerId, options.targetInstanceIds);
        }
        return {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'choice_required',
            subtype: 'red_herring_choose_lawyers',
            playerId,
            message: `${state.players[playerId].name} plays Red Herring Case — choose 2 lawyers to lock`,
          }],
        };
      }
      break;

    case 'donate_to_sc_justice':
      if (side === 'N') {
        if (options.indexA !== undefined && options.indexB !== undefined) {
          return commitDocketSwap(state, options.indexA, options.indexB);
        }
        return resolveDocketSwap(state, playerId);
      }
      break;

    case 'protect_our_interests':
      if (side === 'N') return resolveProtectOurInterests(state, playerId);
      break;

    case 'service_worker_b':
      if (side === 'C') return resolveAddProtestToEventDeck(state, 'protest_a');
      break;

    case 'farmer_a':
      if (side === 'C') {
        // "Your fully watered farms produce 2 extra VP this round"
        // This is an income-phase modifier — emit a pending modifier registration
        return {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'register_income_modifier',
            subtype: 'farmer_a_farm_vp',
            playerId,
            message: `${state.players[playerId].name} activates Farmer A: +2 VP from fully watered farms this round`,
          }],
        };
      }
      break;

    case 'service_worker_a':
      if (side === 'C') {
        return {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'register_income_modifier',
            subtype: 'service_worker_a_income_double',
            playerId,
            message: `${state.players[playerId].name} activates Service Worker A: one income project doubles its reward`,
          }],
        };
      }
      break;

    case 'firefighter_a':
      if (side === 'C') {
        // Count firefighters in tableau, grant 1 VP each (instead of standard firefighting reward)
        const firefighterCount = state.players[playerId].tableau
          .filter(c => state.cardIndex[c.cardId]?.type === CARD_TYPES.CITIZEN &&
                       state.cardIndex[c.cardId]?.name?.toLowerCase().includes('firefighter'))
          .length;
        return applyResourceDelta(state, playerId, RESOURCES.VP, firefighterCount, 'Firefighter A: 1 VP per firefighter');
      }
      break;

    default:
      console.warn(`effectResolver: no text handler for ${cardId} ${side}`);
  }

  return emptyUpdate();
}

// ─────────────────────────────────────────────────────────────────────────────
// Water bribe commit
// ─────────────────────────────────────────────────────────────────────────────

export function commitWaterBribe(state, playerId, targetPlayerId) {
  const giver    = state.players[playerId];
  const receiver = state.players[targetPlayerId];

  // Giver loses 1 water, receiver gets it
  const giveWater   = applyResourceDelta(state, playerId,      RESOURCES.WATER, -1, 'Water Bribe given');
  const takeWater   = applyResourceDelta(state, targetPlayerId, RESOURCES.WATER, +1, 'Water Bribe received');
  // Receiver pays $3 to giver
  const receiverPay = applyResourceDelta(state, targetPlayerId, RESOURCES.MONEY, -3, 'Water Bribe payment');
  const giverReceive= applyResourceDelta(state, playerId,       RESOURCES.MONEY, +3, 'Water Bribe payment received');

  return mergeUpdates(giveWater, takeWater, receiverPay, giverReceive);
}

export { mergeUpdates, emptyUpdate, applyResourceDelta };
