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
  applyCashDelta,
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

// 'money' is cash in hand (see applyCashDelta); the money TRACK is the income
// track, addressed by the 'income' resource.
const RESOURCE_TO_TRACK = {
  [RESOURCES.WATER_CLAIM]:       'water_claim',
  [RESOURCES.WATER_CLAIM_TRACK]: 'water_claim',
  [RESOURCES.INCOME]:            'money',
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

  if (resource === RESOURCES.MONEY) {
    const { playerPatch, logEntries } = applyCashDelta(player, amount, reason);
    return playerUpdate(playerId, playerPatch, logEntries);
  }

  const trackKey = RESOURCE_TO_TRACK[resource];
  if (trackKey) {
    // NOTE: discard-condition checks happen ONLY at End Step (RULES §4 step 5),
    // not on every mid-round track change.
    const { playerPatch, logEntries, pendingEffects } =
      applyTrackDelta(player, trackKey, amount, reason);
    return playerUpdate(playerId, playerPatch, logEntries, pendingEffects);
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

  let workingPlayer = state.players[playerId];
  let update        = emptyUpdate();

  for (const p of payments) {
    const amount = -Math.abs(p.amount); // Payments are always negative deltas

    // ── Affordability: a cost you cannot fully pay rejects the action ──────
    const trackKey = RESOURCE_TO_TRACK[p.resource];
    if (p.resource === RESOURCES.MONEY) {
      if ((workingPlayer.cash ?? 0) < Math.abs(p.amount)) {
        return { ok: false, update: null, error: `Insufficient cash to pay cost` };
      }
    } else if (trackKey) {
      const trackStateKey = { water_claim: 'waterClaimTrack', money: 'moneyTrack', pr: 'prTrack' }[trackKey];
      const current = workingPlayer[trackStateKey]?.value ?? 0;
      const min     = workingPlayer[trackStateKey]?.min   ?? 0;
      if (current + amount < min) {
        return { ok: false, update: null, error: `Insufficient ${p.resource} to pay cost` };
      }
    } else if (p.resource === RESOURCES.WATER || p.resource === 'water') {
      if ((workingPlayer.waterCubes ?? 0) < Math.abs(p.amount)) {
        return { ok: false, update: null, error: `Insufficient water cubes to pay cost` };
      }
    }

    const workingState = { ...state, players: { ...state.players, [playerId]: workingPlayer } };
    const costUpdate   = applyResourceDelta(workingState, playerId, p.resource, amount, 'payment');
    update             = mergeUpdates(update, costUpdate);
    const patch        = costUpdate.playerPatches?.[playerId];
    if (patch) workingPlayer = { ...workingPlayer, ...patch };
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

  // Influence amounts must be numbers — string amounts corrupt totals via concatenation
  const numAmount = Number(amount) || 0;
  const player    = state.players[playerId];
  const current   = Number(player.scInfluence[targetCase]) || 0;
  const newVal    = current + numAmount;
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
  let didReshuffle = false;

  // Reshuffle discard into deck if we don't have enough cards
  if (deck.length < amount && discard.length > 0) {
    deck    = [...deck, ...reshuffleDiscard(discard)];
    discard = [];
    didReshuffle = true;
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
  // Insert at a random position within the remaining deck. Appending to the
  // bottom of a 9-card cycling deck with only 6 event rounds meant the card
  // could never be drawn.
  const newEventDeck = [...state.sharedBoard.eventDeck];
  const insertAt = Math.floor(Math.random() * (newEventDeck.length + 1));
  newEventDeck.splice(insertAt, 0, protestCardId);
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
  let update        = emptyUpdate();
  // Thread a working copy of the player through every applied delta so that
  // multiple project rewards in one End Step stack instead of overwriting
  // each other (last-writer-wins patch collisions lost rewards AND left
  // earlier projects un-reset, paying out forever).
  let workingPlayer = state.players[playerId];

  const workingState = () => ({
    ...state,
    players: { ...state.players, [playerId]: workingPlayer },
  });
  const applyU = (u) => {
    update = mergeUpdates(update, u);
    const patch = u.playerPatches?.[playerId];
    if (patch) workingPlayer = { ...workingPlayer, ...patch };
  };

  // Only this player's registered modifiers apply to this player's projects
  const myMods    = modifiers.filter(m => m.playerId === playerId);
  const farmerMod = myMods.find(m => m.subtype === 'farmer_a_farm_vp');
  let   swaMod    = myMods.find(m => m.subtype === 'service_worker_a_income_double');
  const fireMod   = myMods.find(m => m.subtype === 'firefighter_a_vp');

  const allProjects = [
    ...boardTemplate.citizen_projects,
    ...boardTemplate.income_projects,
  ];

  for (const projectDef of allProjects) {
    const actualType    = projectDef.citizen_type ? 'citizen' : 'income';
    const playerProject = workingPlayer.projects[actualType][projectDef.id];

    if (!playerProject) continue;
    if (playerProject.watered < projectDef.water_slots) continue;

    // Service Worker A: the first fully-watered income project doubles its
    // income/money bonus this round (one project only).
    const doubleMoney = !!swaMod && actualType === 'income';
    if (doubleMoney) swaMod = null;

    // Firefighter A: a fully-watered firefighting project pays 1 VP per
    // Firefighter in tableau INSTEAD of its usual bonus (PR + citizen card).
    const firefighterSwap = !!fireMod && projectDef.id === 'firefighting';
    if (firefighterSwap) {
      const firefighters = workingPlayer.tableau
        .filter(c => c.cardId === 'firefighter_a').length;
      applyU(applyResourceDelta(
        workingState(), playerId, RESOURCES.VP, firefighters,
        `Firefighter A: ${firefighters} Firefighter(s) instead of the firefighting bonus`
      ));
    }

    for (const reward of (firefighterSwap ? [] : (projectDef.fully_watered_reward ?? []))) {
      if (reward.resource === RESOURCES.CITIZEN_CARD || reward.resource === 'citizen_card') {
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
          message:  `${workingPlayer.name} earns a ${reward.citizen_type} citizen card from ${projectDef.id}`,
        });
      } else {
        const isMoney = reward.resource === RESOURCES.MONEY || reward.resource === RESOURCES.INCOME;
        const mult    = (doubleMoney && isMoney && reward.amount > 0) ? 2 : 1;
        applyU(applyResourceDelta(
          workingState(), playerId, reward.resource, reward.amount * mult,
          `${projectDef.id} fully watered${mult > 1 ? ' (Service Worker A: doubled)' : ''}`
        ));
      }
    }

    // Farmer A: fully-watered farms produce +2 extra VP this round
    if (farmerMod && projectDef.id === 'farm') {
      applyU(applyResourceDelta(
        workingState(), playerId, RESOURCES.VP, 2, 'Farmer A: fully watered farm bonus'
      ));
    }

    // Reset water after income (cubes return to supply)
    applyU(playerUpdate(playerId, {
      projects: {
        ...workingPlayer.projects,
        [actualType]: {
          ...workingPlayer.projects[actualType],
          [projectDef.id]: { ...playerProject, watered: 0 },
        },
      },
    }));
  }

  return update;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatch: resolveCardAction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cards whose listed side MUST resolve through resolveTextDrivenEffect,
 * regardless of their display icon. The icon field on these actions is
 * for UI display only — routing by icon gave them generic wrong effects.
 */
const TEXT_HANDLER_SIDES = {
  activist_b:                   'N',
  activist_c:                   'C',
  activist_d:                   'N',
  sneaky_pete:                  'C',
  team_player:                  'C',
  workaholic:                   'C',
  rider_of_coattails:           'NC',
  in_it_for_glory:              'C',
  deal_with_federal_government: 'N',
  quid_pro_quo:                 'N',
  lobby_federal_government:     'N',
  scorched_earth_negotiating:   'N',
  water_bribe:                  'C',
  red_herring_case:             'N',
  donate_to_sc_justice:         'N',
  protect_our_interests:        'N',
  service_worker_b:             'C',
  farmer_a:                     'C',
  service_worker_a:             'C',
  firefighter_a:                'C',
};

/**
 * Resolve a card action (N or C side) for a player.
 *
 * @param {Object} state         Current GameState
 * @param {string} playerId      Acting player
 * @param {string} cardId        cards.json id
 * @param {'N'|'C'} side         Which action side
 * @param {Object} [options]     Extra options (e.g. chosen targets, instanceId)
 * @returns {StateUpdate}        May carry `_failed: true` when nothing resolved
 */
export function resolveCardAction(state, playerId, cardId, side, options = {}) {
  const cardDef = state.cardIndex[cardId];
  if (!cardDef) throw new Error(`Unknown card: ${cardId}`);

  const action = cardDef.actions?.[side];
  if (!action) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'warn', message: `Card ${cardId} has no ${side} action` }],
      _failed: true,
    };
  }

  // ── Alternatives: ask BEFORE paying or exhausting anything ────────────────
  // Payment/exhaust happen on the re-dispatch once the player has chosen,
  // using the chosen variant's own payment (a free alternative costs nothing).
  if (action.alternatives?.length > 0 && options.alternativeIdx === undefined) {
    return {
      ...emptyUpdate(),
      pendingEffects: [{
        type:         'choice_required',
        subtype:      'card_alternative_choice',
        playerId,
        cardId,
        side,
        instanceId:   options.instanceId,
        primary:      { icon: action.icon, text: action.text },
        alternatives: action.alternatives,
        message: `${state.players[playerId].name} must choose an effect for ${cardDef.name} ${side}`,
      }],
    };
  }

  // Route to primary or chosen alternative
  const resolvedAction = (options.alternativeIdx > 0)
    ? { ...action, ...action.alternatives[options.alternativeIdx - 1] }
    : action;

  // ── Payment (from the resolved variant; skipped for copies e.g. Rider) ────
  const payResult = options.skipPayment
    ? { ok: true, update: emptyUpdate() }
    : applyPayments(state, playerId, resolvedAction.payment);
  if (!payResult.ok) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'error', message: payResult.error }],
      _failed: true,
    };
  }

  let update = payResult.update;
  const player = state.players[playerId];

  // ── Exhaust exactly one card instance ─────────────────────────────────────
  // options.instanceId targets a specific copy; otherwise the first READY copy.
  if (action.cost === 'exhaust') {
    let exhaustedOne = false;
    const newTableau = player.tableau.map(c => {
      if (exhaustedOne) return c;
      const match = options.instanceId
        ? c.instanceId === options.instanceId
        : (c.cardId === cardId && c.exhaustState === EXHAUST_STATES.READY);
      if (match) { exhaustedOne = true; return { ...c, exhaustState: EXHAUST_STATES.EXHAUSTED }; }
      return c;
    });
    if (exhaustedOne) {
      update = mergeUpdates(update, playerUpdate(playerId, { tableau: newTableau }));
    }
  }

  // ── Resolve the effect ────────────────────────────────────────────────────
  let effectUpdate = emptyUpdate();

  // Dedicated per-card handlers take priority over generic icon routing
  const dedicatedSides = TEXT_HANDLER_SIDES[cardId] ?? '';
  if (dedicatedSides.includes(side) && options.alternativeIdx === undefined) {
    effectUpdate = resolveTextDrivenEffect(state, playerId, cardId, side, resolvedAction, options);
    return mergeUpdates(update, effectUpdate);
  }

  const resolvedIcon = resolvedAction.icon;

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
            instanceId: options.instanceId,
            message: `${state.players[playerId].name}: Gain or Lose 1 Water Rights?`,
          }],
        };
      } else {
        effectUpdate = applyResourceDelta(
          state, playerId, RESOURCES.WATER_CLAIM,
          options.delta ?? resolvedAction.amount ?? 1,
          `${cardDef.name} ${side} action`
        );
      }
      break;

    case 'water_claim_track':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.WATER_CLAIM,
        options.delta ?? resolvedAction.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'money':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.MONEY,
        resolvedAction.amount ?? options.amount ?? 3,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'pr':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.PR,
        resolvedAction.amount ?? options.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'water':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.WATER,
        resolvedAction.amount ?? options.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'vp':
      effectUpdate = applyResourceDelta(
        state, playerId, RESOURCES.VP,
        resolvedAction.amount ?? options.amount ?? 1,
        `${cardDef.name} ${side} action`
      );
      break;

    case 'sc_influence': {
      const parsed = resolvedAction.text?.match(/(\d+)\s*SC/);
      const amt = options.amount
        ?? resolvedAction.amount
        ?? (parsed ? parseInt(parsed[1], 10) : 1);
      effectUpdate = resolveScInfluence(state, playerId, amt, options.caseId);
      break;
    }

    case 'protest_influence':
      effectUpdate = resolveProtestInfluence(
        state, playerId,
        options.amount ?? resolvedAction.amount
          ?? parseInt(resolvedAction.text?.match(/\+(\d+)/)?.[1] ?? '1', 10)
      );
      break;

    case null:
      // No icon — text-driven or special effect
      effectUpdate = resolveTextDrivenEffect(state, playerId, cardId, side, resolvedAction, options);
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
      return playerUpdate(
        playerId,
        { workaholicActive: true },
        [{ type: 'workaholic_active', playerId,
           message: `${state.players[playerId].name} activates Workaholic — next +1 water becomes +2` }]
      );

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
        // Applies at End Step: a fully-watered firefighting project then pays
        // 1 VP per Firefighter instead of its usual bonus (see resolveIncomePhase).
        // Registering it twice in a round has no extra effect.
        return {
          ...emptyUpdate(),
          pendingEffects: [{
            type:    'register_income_modifier',
            subtype: 'firefighter_a_vp',
            playerId,
            message: `${state.players[playerId].name} activates Firefighter A: a fully watered `
                   + `firefighting project scores 1 VP per Firefighter this round`,
          }],
        };
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

  if ((giver.waterCubes ?? 0) < 1) {
    return {
      ...emptyUpdate(),
      logEntries: [{ type: 'error', playerId,
        message: `${giver.name} has no water cube to give — Water Bribe fizzles` }],
    };
  }

  // Receiver pays what they can, up to $3 — the giver cannot mint money the
  // receiver doesn't have.
  const payment = Math.min(3, receiver.cash ?? 0);

  // Giver loses 1 water, receiver gets it
  const giveWater   = applyResourceDelta(state, playerId,      RESOURCES.WATER, -1, 'Water Bribe given');
  const takeWater   = applyResourceDelta(state, targetPlayerId, RESOURCES.WATER, +1, 'Water Bribe received');
  // Receiver pays the giver
  const receiverPay = applyResourceDelta(state, targetPlayerId, RESOURCES.MONEY, -payment, 'Water Bribe payment');
  const giverReceive= applyResourceDelta(state, playerId,       RESOURCES.MONEY, +payment, 'Water Bribe payment received');

  return mergeUpdates(giveWater, takeWater, receiverPay, giverReceive);
}

export { mergeUpdates, emptyUpdate, applyResourceDelta };
