/**
 * constants.js
 * All hard-coded game rules derived from the JSON schemas.
 * If a value changes, change it here — nowhere else.
 */

// ── Phases within a round ──────────────────────────────────────────────────
// Order is enforced by phaseManager. "N" = Normal action side of cards,
// "C" = Court action side. These keys match the action keys in cards.json.
export const PHASES = {
  EVENT:    'event',    // Reveal & resolve 1 event card
  ACTION_N: 'action_n', // Players take Normal (N) card actions in turn order
  WATER:    'water',    // Water cubes distributed via water_claim tracks
  ACTION_C: 'action_c', // Players take Court (C) card actions in turn order
  INCOME:   'income',   // Fully-watered projects pay out rewards
  CLEANUP:  'cleanup',  // Exhaust resets, discard-condition checks, turn advance
};

export const PHASE_ORDER = [
  PHASES.EVENT,
  PHASES.ACTION_N,
  PHASES.WATER,
  PHASES.ACTION_C,
  PHASES.INCOME,
  PHASES.CLEANUP,
];

// ── Card types (match cards.json "type" field) ─────────────────────────────
export const CARD_TYPES = {
  ACTIVIST: 'activist',
  CITIZEN:  'citizen',
  LAWYER:   'lawyer',
  STRATEGY: 'strategy',
  EVENT:    'event',
  SC_CASE:  'sc_case',
};

// ── Resource IDs (match player_board.json resource_id / resource fields) ───
export const RESOURCES = {
  WATER_CLAIM: 'water_claim',       // Track position (not physical cubes)
  WATER_CLAIM_TRACK: 'water_claim_track', // Alias used in some card rewards
  MONEY:       'money',
  PR:          'pr',
  WATER:       'water',             // Physical blue cubes in supply
  VP:          'vp',                // Victory points (not a track)
  SC_INFLUENCE:'sc_influence',      // Accumulated per SC case
  PROTEST_INFLUENCE: 'protest_influence',
  CITIZEN_CARD: 'citizen_card',     // Reward that grants a specific citizen card
};

// ── Track bounds (from player_board.json board_template.tracks) ───────────
export const TRACK_BOUNDS = {
  water_claim: { min: 3,  max: 22, hard_cap: false },
  money:       { min: 0,  max: 19, hard_cap: false },
  pr:          { min: -8, max: 11, hard_cap: true  },
};

// ── VP milestones (from player_board.json) ────────────────────────────────
// Checked whenever a track value crosses a milestone boundary.
export const VP_MILESTONES = {
  water_claim: [
    { at: 6,  vp: 1 },
    { at: 11, vp: 2 },
    { at: 17, vp: 3 },
    { at: 22, vp: 5 },
  ],
  money: [
    { at: 19, vp: 5 },
  ],
  pr: [
    { at: 6,  vp: 2 },
    { at: 11, vp: 5 },
  ],
};

// ── PR threshold markers (from player_board.json) ─────────────────────────
// Crossing these positions grants a discount on lawyer acquisition.
export const PR_THRESHOLDS = {
  FREE_LAWYER_ACQUISITION: [-7, 8],  // At these PR values, the $4 lawyer surcharge is waived
};

// ── Market sizes (from shared_board.json) ─────────────────────────────────
export const MARKET_SIZES = {
  lawyer:   4,  // face_up_slots
  activist: 4,
};

// ── Acquisition costs (from shared_board.json lawyer_market.acquisition_cost) ──
export const LAWYER_ACQUISITION_SURCHARGE = 4; // Standard extra fee on top of card cost

// ── Partnership buy costs (from player_board.json partnerships) ───────────
export const PARTNERSHIP_COSTS = {
  law_firm:   4,
  business:   3,
  investment: 2,
};

// ── Partnership ability costs (per use) ───────────────────────────────────
export const PARTNERSHIP_ABILITY_COSTS = {
  law_firm:   { resource: RESOURCES.MONEY, amount: 4 },
  business:   { resource: RESOURCES.MONEY, amount: 3 },
  investment: { resource: RESOURCES.MONEY, amount: 2 },
};

// ── Water bank (from player_board.json water_bank) ────────────────────────
export const WATER_BANK = {
  UNLOCK_COST:   8,
  CAPACITY:      9,
  DEPOSIT_COST:  1,  // Per cube, paid to bank owner
};

// ── Event deck composition (from shared_board.json event_deck.composition) ─
export const EVENT_DECK_COMPOSITION = [
  { card_id: 'supreme_court_session', copies: 4 },
  { card_id: 'severe_drought',        copies: 2 },
  { card_id: 'protest_a',             copies: 1 },
  { card_id: 'protest_b',             copies: 1 },
  { card_id: 'large_snow_melt',       copies: 1 },
];

// ── Docket sizing (from shared_board.json docket.size_by_player_count) ────
export const DOCKET_SIZE = { 2: 1, 3: 3, 4: 6, 5: 10, 6: 15 };

// ── SC case rewards & penalties (universal across all cases in cards.json) ─
export const SC_CASE_WINNER_REWARD = [
  { resource: RESOURCES.WATER_CLAIM_TRACK, amount: 1 },
  { resource: RESOURCES.VP,               amount: 3 },
  { resource: RESOURCES.PR,               amount: 1 },
];
export const SC_CASE_LOSER_PENALTY = [
  { resource: RESOURCES.WATER_CLAIM_TRACK, amount: -1 },
  { resource: RESOURCES.MONEY,            amount: -2 },
  { resource: RESOURCES.PR,               amount: -1 },
];

// ── Exhaust states ────────────────────────────────────────────────────────
export const EXHAUST_STATES = {
  READY:     'ready',
  EXHAUSTED: 'exhausted',
  LOCKED:    'locked',   // e.g. Red Herring Case effect
};

// ── Game limits ───────────────────────────────────────────────────────────
export const MAX_PLAYERS    = 6;
export const MIN_PLAYERS    = 2;
export const MAX_ROUNDS     = 10; // Game ends after round 10 CLEANUP phase
export const STRATEGY_DEAL  = 3;  // Cards dealt to each player at setup
