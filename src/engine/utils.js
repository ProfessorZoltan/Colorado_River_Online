/**
 * utils.js
 * Pure, stateless helpers. No game-logic imports — only math and array ops.
 */

// ── Array / deck utilities ─────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle. Returns a new shuffled array.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw `n` cards from the top of a deck array.
 * Returns { drawn, remaining }.
 * @param {any[]} deck
 * @param {number} n
 * @returns {{ drawn: any[], remaining: any[] }}
 */
export function drawFrom(deck, n = 1) {
  const drawn     = deck.slice(0, n);
  const remaining = deck.slice(n);
  return { drawn, remaining };
}

/**
 * Move cards from discard to deck, shuffle, return as new deck.
 * @param {any[]} discard
 * @returns {any[]}
 */
export function reshuffleDiscard(discard) {
  return shuffle([...discard]);
}

/**
 * Expand a composition array (e.g. [{card_id, copies}]) into a flat id array.
 * @param {{ card_id: string, copies: number }[]} composition
 * @returns {string[]}
 */
export function expandComposition(composition) {
  return composition.flatMap(({ card_id, copies }) =>
    Array.from({ length: copies }, () => card_id)
  );
}

/**
 * Slide-and-draw market replenishment.
 * Removes `acquiredIndex`, optionally draws one from `deck`.
 * Returns { market: string[], deck: string[] }.
 * @param {(string|null)[]} market  Array of card ids or null for empty slots
 * @param {string[]}        deck    Replenishment deck (face-down)
 * @param {number}          acquiredIndex
 * @returns {{ market: (string|null)[], deck: string[] }}
 */
export function slideAndDraw(market, deck, acquiredIndex) {
  const newMarket = [...market];
  newMarket.splice(acquiredIndex, 1); // Remove acquired slot
  // Draw from top of deck to fill vacancy at the end
  const newDeck = [...deck];
  const filled  = newDeck.length > 0 ? newDeck.shift() : null;
  newMarket.push(filled);
  return { market: newMarket, deck: newDeck };
}

// ── Numeric utilities ──────────────────────────────────────────────────────

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Resolve a delta against a track with hard_cap enforcement.
 * If hard_cap is false, the value can exceed max (tracked but capped for display).
 * Returns the new clamped value.
 * @param {number}  current
 * @param {number}  delta
 * @param {number}  min
 * @param {number}  max
 * @param {boolean} hard_cap
 * @returns {number}
 */
export function applyDelta(current, delta, min, max, hard_cap) {
  const next = current + delta;
  if (hard_cap) return clamp(next, min, max);
  return Math.max(min, next); // Only enforce floor; ceiling is soft
}

/**
 * Check whether a discard_condition from cards.json is currently met.
 * @param {{ operator: string, field: string, value: number }} condition
 * @param {{ pr: number, money: number, water_claim: number }} resources
 * @returns {boolean}
 */
export function evaluateDiscardCondition(condition, resources) {
  if (!condition) return false;
  const actual = resources[condition.field];
  switch (condition.operator) {
    case 'lte': return actual <= condition.value;
    case 'gte': return actual >= condition.value;
    case 'lt':  return actual <  condition.value;
    case 'gt':  return actual >  condition.value;
    case 'eq':  return actual === condition.value;
    default:    return false;
  }
}

/**
 * Check whether a pr_requirement from cards.json is satisfied.
 * @param {{ operator: string, value: number }|null} requirement
 * @param {number} currentPr
 * @returns {boolean}
 */
export function satisfiesPrRequirement(requirement, currentPr) {
  if (!requirement) return true;
  switch (requirement.operator) {
    case 'lte': return currentPr <= requirement.value;
    case 'gte': return currentPr >= requirement.value;
    case 'lt':  return currentPr <  requirement.value;
    case 'gt':  return currentPr >  requirement.value;
    default:    return true;
  }
}

// ── Docket utilities ───────────────────────────────────────────────────────

/**
 * Return all SC case IDs where both plaintiff and defendant are active.
 * @param {any[]} allCards         Full cards.json array
 * @param {string[]} factionIds    Active faction IDs
 * @returns {any[]}                Filtered sc_case card objects
 */
export function filterDocketCases(allCards, factionIds) {
  const factionSet = new Set(factionIds);
  return allCards.filter(
    c =>
      c.type === 'sc_case' &&
      factionSet.has(c.plaintiff.id) &&
      factionSet.has(c.defendant.id)
  );
}

/**
 * Swap two elements in an array by index. Returns a new array.
 * @template T
 * @param {T[]} arr
 * @param {number} i
 * @param {number} j
 * @returns {T[]}
 */
export function swapIndices(arr, i, j) {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ── Dice ───────────────────────────────────────────────────────────────────

/**
 * Roll a single die with `sides` faces. Returns 1–sides.
 * Injecting a `rollFn` allows deterministic testing.
 * @param {number}           sides
 * @param {()=>number}       rollFn  Optional. Defaults to Math.random.
 * @returns {number}
 */
export function rollDie(sides, rollFn = Math.random) {
  return Math.floor(rollFn() * sides) + 1;
}

// ── ID generation ──────────────────────────────────────────────────────────

/** Lightweight sequential ID for log entries and card instances. */
let _seq = 0;
export function nextId() {
  return ++_seq;
}

/** Reset seq (used in test setup only). */
export function _resetSeq() { _seq = 0; }
