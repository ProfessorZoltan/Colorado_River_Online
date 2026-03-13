/**
 * constants.js
 * All hard-coded game rules derived from the JSON schemas.
 * If a value changes, change it here — nowhere else.
 */

// ── Phases within a round ──────────────────────────────────────────────────
// New phase order per rules:
//   ROUND_SETUP  — first player rotates; all players gain water claims & money
//   NEGOTIATE    — N-side actions, strategy N, partnerships, pass (consecutive)
//   CONSUME      — event (rounds 2–7); water placed; C-side actions, water on
//                  projects, partnerships, pass (consecutive)
//   END_STEP     — project rewards; water-rights penalty (round 3+);
//                  remove leftover claims; discard-condition check
export const PHASES = {
  ROUND_SETUP: 'round_setup',
  NEGOTIATE:   'negotiate',
  CONSUME:     'consume',
  END_STEP:    'end_step',
};

export const PHASE_ORDER = [
  PHASES.ROUND_SETUP,
  PHASES.NEGOTIATE,
  PHASES.CONSUME,
  PHASES.END_STEP,
];

// Event card rules: skip round 1; active rounds 2–7 only
export const EVENT_FIRST_ROUND = 2;
export const EVENT_LAST_ROUND  = 7;

// Water-rights track penalty starts round 3
export const WATER_PENALTY_FIRST_ROUND = 3;

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
  WATER_CLAIM: 'water_claim',             // Track position
  WATER_CLAIM_TRACK: 'water_claim_track', // Alias used in some card rewards
  MONEY:       'money',
  PR:          'pr',
  WATER:       'water',             // Physical blue cubes (SC, water bank, bribe)
  WATER_CLAIMS_TOKEN: 'water_claims_token', // Per-round claim tokens gained at Round Setup
  VP:          'vp',
  SC_INFLUENCE:'sc_influence',
  PROTEST_INFLUENCE: 'protest_influence',
  CITIZEN_CARD: 'citizen_card',
};

// ── Track bounds (from player_board.json board_template.tracks) ───────────
export const TRACK_BOUNDS = {
  water_claim: { min: 3,  max: 22, hard_cap: false },
  money:       { min: 0,  max: 19, hard_cap: false },
  pr:          { min: -8, max: 11, hard_cap: true  },
};

// ── VP milestones ────────────────────────────────────────────────────────
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

// ── PR threshold markers ─────────────────────────────────────────────────
export const PR_THRESHOLDS = {
  FREE_LAWYER_ACQUISITION: [-7, 8],
};

// ── Market sizes ─────────────────────────────────────────────────────────
export const MARKET_SIZES = {
  lawyer:   4,
  activist: 4,
};

// ── Acquisition costs ────────────────────────────────────────────────────
export const LAWYER_ACQUISITION_SURCHARGE = 4;

// ── Partnership buy costs ─────────────────────────────────────────────────
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

// ── Water bank ───────────────────────────────────────────────────────────
export const WATER_BANK = {
  UNLOCK_COST:   8,
  CAPACITY:      9,
  DEPOSIT_COST:  1,
};

// ── Event deck composition ────────────────────────────────────────────────
export const EVENT_DECK_COMPOSITION = [
  { card_id: 'supreme_court_session', copies: 4 },
  { card_id: 'severe_drought',        copies: 2 },
  { card_id: 'protest_a',             copies: 1 },
  { card_id: 'protest_b',             copies: 1 },
  { card_id: 'large_snow_melt',       copies: 1 },
];

// ── Docket sizing ─────────────────────────────────────────────────────────
export const DOCKET_SIZE = { 2: 1, 3: 3, 4: 6, 5: 10, 6: 15 };

// ── SC case rewards & penalties ───────────────────────────────────────────
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
  LOCKED:    'locked',
};

// ── Game limits ───────────────────────────────────────────────────────────
export const MAX_PLAYERS    = 6;
export const MIN_PLAYERS    = 2;
export const MAX_ROUNDS     = 10;
export const STRATEGY_DEAL  = 3;
