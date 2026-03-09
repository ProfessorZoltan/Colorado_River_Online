/**
 * setup.js
 * Builds the complete initial GameState from the three JSON schema files
 * and a player configuration array.
 *
 * Usage:
 *   import { buildInitialState } from './setup.js';
 *   const state = buildInitialState(playerConfig, cards, playerBoardSchema, sharedBoardSchema);
 */

import {
  shuffle,
  expandComposition,
  filterDocketCases,
  drawFrom,
} from './utils.js';

import {
  CARD_TYPES,
  DOCKET_SIZE,
  EVENT_DECK_COMPOSITION,
  EXHAUST_STATES,
  MARKET_SIZES,
  STRATEGY_DEAL,
} from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types (JSDoc)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PlayerConfig
 * @property {string} id       Unique player identifier (e.g. 'player_1')
 * @property {string} factionId  Key from player_board.json factions[] (e.g. 'arizona')
 * @property {string} name     Display name
 * @property {boolean} isAI   Whether this player is AI-controlled
 */

/**
 * @typedef {Object} TrackState
 * @property {number} value
 * @property {number} min
 * @property {number} max
 * @property {boolean} hard_cap
 * @property {Array}  vp_milestones
 * @property {Array}  threshold_markers
 * @property {number[]} milestonesTriggered  Values already claimed (avoid re-awarding)
 */

/**
 * @typedef {Object} CardInstance
 * @property {string} instanceId  Unique per-instance ID
 * @property {string} cardId      References cards.json id
 * @property {string} exhaustState  From EXHAUST_STATES
 */

/**
 * @typedef {Object} PlayerState
 * @property {string} id
 * @property {string} factionId
 * @property {string} name
 * @property {boolean} isAI
 *
 * @property {TrackState} waterClaimTrack
 * @property {TrackState} moneyTrack
 * @property {TrackState} prTrack
 *
 * @property {number} vp
 * @property {number} waterCubes         Physical blue cubes in hand/reserve
 * @property {number} protestInfluence   Accumulated this protest event
 * @property {Object} scInfluence        { [caseId]: number }
 *
 * @property {string[]} hand             Card instance IDs (strategy hand)
 * @property {CardInstance[]} tableau    Played lawyer/activist/citizen cards
 *
 * @property {Object} partnerships       { law_firm: bool, business: bool, investment: bool }
 * @property {Object} waterBank          { unlocked: bool, stored: number }
 *
 * @property {Object} projects           { citizen: {[projectId]: {watered: number}}, income: {[projectId]: {watered: number}} }
 * @property {boolean} fullyWateredCitizenFarm      etc. — computed at income phase
 */

/**
 * @typedef {Object} SharedBoardState
 * @property {(string|null)[]} lawyerMarket   Card IDs for face-up slots (null = empty)
 * @property {string[]}        lawyerDeck     Remaining replenishment deck
 * @property {(string|null)[]} activistMarket
 * @property {string[]}        activistDeck
 * @property {string[]}        strategyDeck
 * @property {string[]}        strategyDiscard
 * @property {string[]}        eventDeck
 * @property {string|null}     activeEvent
 * @property {string[]}        docket         Ordered SC case IDs
 * @property {number}          waterSupply    Blue cubes available for distribution
 */

/**
 * @typedef {Object} GameState
 * @property {string}          phase
 * @property {number}          round
 * @property {number}          activePlayerIndex
 * @property {string[]}        playerOrder      Player IDs in turn order
 * @property {Object}          players          { [playerId]: PlayerState }
 * @property {SharedBoardState} sharedBoard
 * @property {Object[]}        actionLog        Append-only history
 * @property {GameState[]}     undoStack        Previous states for undo
 * @property {GameState[]}     redoStack
 * @property {string[]}        activeFactionIds
 * @property {Object}          cardIndex        { [cardId]: CardDefinition } — lookup cache
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildCardIndex(cards) {
  return Object.fromEntries(cards.map(c => [c.id, c]));
}

/**
 * Build a TrackState from the board_template track definition and faction starting value.
 */
function buildTrack(trackDef, startingValue) {
  return {
    value:               startingValue,
    min:                 trackDef.min,
    max:                 trackDef.max,
    hard_cap:            trackDef.hard_cap,
    vp_milestones:       trackDef.vp_milestones ?? [],
    threshold_markers:   trackDef.threshold_markers ?? [],
    milestonesTriggered: [], // milestone `at` values already awarded
  };
}

/**
 * Build initial project state maps for one player (all projects start at 0 watered cubes).
 */
function buildProjectState(boardTemplate) {
  const citizen = {};
  boardTemplate.citizen_projects.forEach(p => {
    citizen[p.id] = { watered: 0, water_slots: p.water_slots };
  });

  const income = {};
  boardTemplate.income_projects.forEach(p => {
    income[p.id] = { watered: 0, water_slots: p.water_slots };
  });

  return { citizen, income };
}

/**
 * Build a single player's initial state.
 */
function buildPlayerState(playerConfig, factionDef, boardTemplate) {
  const sv = factionDef.starting_values;
  const tracks = boardTemplate.tracks;

  return {
    id:          playerConfig.id,
    factionId:   playerConfig.factionId,
    name:        playerConfig.name,
    isAI:        playerConfig.isAI ?? false,

    waterClaimTrack: buildTrack(tracks.water_claim, sv.water_claim_track),
    moneyTrack:      buildTrack(tracks.money,        sv.money_track),
    prTrack:         buildTrack(tracks.pr,           sv.pr_track),

    vp:               0,
    waterCubes:       0,  // Physical water cubes in reserve (not claim track)
    protestInfluence: 0,
    scInfluence:      {},

    hand:    [],  // Strategy card instance IDs dealt at setup
    tableau: [],  // Played lawyer/activist/citizen CardInstances

    partnerships: {
      law_firm:   false,
      business:   false,
      investment: false,
    },
    waterBank: {
      unlocked: false,
      stored:   0,
    },

    projects: buildProjectState(boardTemplate),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the complete initial GameState.
 *
 * @param {PlayerConfig[]}  playerConfigs        2–6 player config objects
 * @param {Object[]}        cards                Full cards.json array
 * @param {Object}          playerBoardSchema    Full player_board.json
 * @param {Object}          sharedBoardSchema    Full shared_board.json
 * @returns {GameState}
 */
export function buildInitialState(playerConfigs, cards, playerBoardSchema, sharedBoardSchema) {
  const boardTemplate = playerBoardSchema.board_template;
  const factionMap    = Object.fromEntries(
    playerBoardSchema.factions.map(f => [f.id, f])
  );
  const cardIndex = buildCardIndex(cards);
  const activeFactionIds = playerConfigs.map(p => p.factionId);

  // ── Players ──────────────────────────────────────────────────────────────
  const players = {};
  const playerOrder = [];

  for (const pc of playerConfigs) {
    const factionDef = factionMap[pc.factionId];
    if (!factionDef) throw new Error(`Unknown faction: ${pc.factionId}`);
    players[pc.id]  = buildPlayerState(pc, factionDef, boardTemplate);
    playerOrder.push(pc.id);
  }

  // ── Lawyer market ─────────────────────────────────────────────────────────
  const allLawyerIds  = cards.filter(c => c.type === CARD_TYPES.LAWYER).map(c => c.id);
  const lawyerShuffled = shuffle(allLawyerIds);
  const lawyerMarket   = lawyerShuffled.slice(0, MARKET_SIZES.lawyer);
  const lawyerDeck     = lawyerShuffled.slice(MARKET_SIZES.lawyer);

  // ── Activist market ───────────────────────────────────────────────────────
  const allActivistIds  = cards.filter(c => c.type === CARD_TYPES.ACTIVIST).map(c => c.id);
  const activistShuffled = shuffle(allActivistIds);
  // All 4 activists go face-up; replenishment deck starts empty
  const activistMarket   = activistShuffled.slice(0, MARKET_SIZES.activist);
  const activistDeck     = activistShuffled.slice(MARKET_SIZES.activist); // []

  // ── Strategy deck & deal ──────────────────────────────────────────────────
  const allStrategyIds = cards.filter(c => c.type === CARD_TYPES.STRATEGY).map(c => c.id);
  let strategyDeck     = shuffle(allStrategyIds);
  let strategyDiscard  = [];

  // Deal STRATEGY_DEAL cards to each player
  for (const playerId of playerOrder) {
    const { drawn, remaining } = drawFrom(strategyDeck, STRATEGY_DEAL);
    players[playerId].hand = drawn; // Strategy cards held as raw card IDs in hand
    strategyDeck = remaining;
  }

  // ── Event deck ────────────────────────────────────────────────────────────
  const eventIds = expandComposition(EVENT_DECK_COMPOSITION);
  const eventDeck = shuffle(eventIds);

  // ── Docket ────────────────────────────────────────────────────────────────
  const docketCases   = filterDocketCases(cards, activeFactionIds);
  const docketCaseIds = shuffle(docketCases.map(c => c.id));
  // Validate expected size
  const expectedDocketSize = DOCKET_SIZE[playerConfigs.length];
  if (docketCaseIds.length !== expectedDocketSize) {
    console.warn(
      `Docket: expected ${expectedDocketSize} cases for ${playerConfigs.length} players, ` +
      `got ${docketCaseIds.length}. Faction filtering may be incomplete.`
    );
  }

  // ── Initial SC influence ───────────────────────────────────────────────────
  for (const playerId of playerOrder) {
    const influence = {};
    docketCaseIds.forEach(cid => { influence[cid] = 0; });
    players[playerId].scInfluence = influence;
  }

  // ── Assemble ──────────────────────────────────────────────────────────────
  return {
    phase:              'setup_complete', // phaseManager will advance to PHASES.EVENT
    round:              1,
    activePlayerIndex:  0,
    playerOrder,
    players,

    sharedBoard: {
      lawyerMarket,
      lawyerDeck,
      activistMarket,
      activistDeck,
      strategyDeck,
      strategyDiscard,
      eventDeck,
      activeEvent:  null,
      docket:       docketCaseIds,
      waterSupply:  0,   // Determined at start of WATER phase
      casesResolvedThisRound: [], // [{caseId, winnerId}] — cleared each cleanup
    },

    activeFactionIds,
    cardIndex,

    actionLog:  [],
    undoStack:  [],
    redoStack:  [],
  };
}
