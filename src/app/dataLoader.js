/**
 * dataLoader.js
 * Loads and validates the three JSON data files that drive the game engine.
 * All three are static assets — no network fetch needed.
 *
 * In a Vite / CRA project, JSON imports are handled natively:
 *   import cardsData      from '../data/cards.json';
 *   import playerBoardData from '../data/player_board.json';
 *   import sharedBoardData from '../data/shared_board.json';
 *
 * This module wraps those imports, runs lightweight sanity checks,
 * and exports a single `loadGameData()` function that returns
 * { cards, playerBoard, sharedBoard } or throws with a clear message.
 *
 * ── Expected project structure ────────────────────────────────────────────
 *   src/
 *     data/
 *       cards.json          ← cards.json from schemas
 *       player_board.json   ← player_board.json from schemas
 *       shared_board.json   ← shared_board.json from schemas
 *     app/
 *       dataLoader.js       ← this file
 *       App.jsx
 */

import cardsRaw       from '../data/cards.json';
import playerBoardRaw from '../data/player_board.json';
import sharedBoardRaw from '../data/shared_board.json';

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers — catch schema drift early
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_CARD_TYPES = ['activist', 'citizen', 'lawyer', 'strategy', 'event', 'sc_case'];
const EXPECTED_CARD_COUNTS = { activist: 4, citizen: 4, lawyer: 8, strategy: 8, event: 5, sc_case: 15 };

function validateCards(cards) {
  if (!Array.isArray(cards)) throw new Error('cards.json: root must be an array');

  const counts = {};
  for (const card of cards) {
    if (!card.id)   throw new Error(`cards.json: card missing "id" — ${JSON.stringify(card).slice(0, 60)}`);
    if (!card.type) throw new Error(`cards.json: card "${card.id}" missing "type"`);
    counts[card.type] = (counts[card.type] ?? 0) + 1;
  }

  for (const type of REQUIRED_CARD_TYPES) {
    const got      = counts[type]      ?? 0;
    const expected = EXPECTED_CARD_COUNTS[type];
    if (got !== expected) {
      console.warn(`dataLoader: expected ${expected} ${type} cards, found ${got}`);
    }
  }
}

function validatePlayerBoard(pb) {
  if (!pb.board_template) throw new Error('player_board.json: missing "board_template"');
  if (!pb.factions?.length) throw new Error('player_board.json: "factions" array is empty or missing');

  const { tracks } = pb.board_template;
  if (!tracks?.water_claim || !tracks?.money || !tracks?.pr) {
    throw new Error('player_board.json: board_template.tracks must have water_claim, money, and pr');
  }

  for (const faction of pb.factions) {
    if (!faction.id || !faction.starting_values) {
      throw new Error(`player_board.json: faction "${faction.id ?? '?'}" missing id or starting_values`);
    }
  }
}

function validateSharedBoard(sb) {
  const required = ['lawyer_market', 'activist_market', 'strategy_deck', 'event_deck', 'docket'];
  for (const key of required) {
    if (!sb[key]) throw new Error(`shared_board.json: missing "${key}"`);
  }
  if (!sb.event_deck.composition?.length) {
    throw new Error('shared_board.json: event_deck.composition is empty or missing');
  }
  if (!sb.docket.size_by_player_count) {
    throw new Error('shared_board.json: docket.size_by_player_count is missing');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

let _cache = null;

/**
 * Load, validate, and return the three game data files.
 * Result is memoised — safe to call multiple times.
 *
 * @returns {{ cards: Object[], playerBoard: Object, sharedBoard: Object }}
 * @throws  {Error} if any schema validation fails
 */
export function loadGameData() {
  if (_cache) return _cache;

  validateCards(cardsRaw);
  validatePlayerBoard(playerBoardRaw);
  validateSharedBoard(sharedBoardRaw);

  _cache = {
    cards:       cardsRaw,
    playerBoard: playerBoardRaw,
    sharedBoard: sharedBoardRaw,
  };

  return _cache;
}

/**
 * Return the full faction list from player_board.json,
 * enriched with display color (assigned by faction type + order).
 *
 * @returns {FactionOption[]}
 */
const FACTION_COLORS = {
  arizona:    '#c4612a',
  california: '#3d8fa8',
  nevada:     '#c8a550',
  chemehuevi: '#7eb87e',
  fort_mohave:'#a07ec8',
  quechan:    '#c86060',
};

export function getFactionOptions() {
  const { playerBoard } = loadGameData();
  return playerBoard.factions.map(f => ({
    id:           f.id,
    name:         f.name,
    faction_type: f.faction_type,
    color:        FACTION_COLORS[f.id] ?? '#7a6248',
    starting: {
      waterClaim: f.starting_values.water_claim_track,
      money:      f.starting_values.money_track,
      pr:         f.starting_values.pr_track,
    },
  }));
}
