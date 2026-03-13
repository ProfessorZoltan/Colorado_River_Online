/**
 * engine/index.js
 * Public API surface for the Law of the River game engine.
 *
 * Import from here — not from individual modules — so internal refactors
 * don't break consumer code.
 *
 * ─── Typical usage ───────────────────────────────────────────────────────────
 *
 *   // 1. Load JSON data (in your app's bootstrap)
 *   import cards          from '../data/cards.json';
 *   import playerBoardDef from '../data/player_board.json';
 *   import sharedBoardDef from '../data/shared_board.json';
 *
 *   // 2. Init the game
 *   import { useGameStore } from './engine';
 *
 *   const { initGame } = useGameStore.getState();
 *   initGame(
 *     [
 *       { id: 'p1', factionId: 'arizona',    name: 'Alice', isAI: false },
 *       { id: 'p2', factionId: 'california', name: 'Bob',   isAI: false },
 *     ],
 *     cards,
 *     playerBoardDef,
 *     sharedBoardDef,
 *   );
 *
 *   // 3. In a React component
 *   const gameState      = useGameStore(s => s.gameState);
 *   const playCardAction = useGameStore(s => s.playCardAction);
 *   const endPlayerTurn  = useGameStore(s => s.endPlayerTurn);
 *   const pendingEffects = useGameStore(s => s.pendingEffects);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Store (React hook + imperative access) ────────────────────────────────
export { useGameStore } from './gameStore.js';

// ── Setup ─────────────────────────────────────────────────────────────────
export { buildInitialState } from './setup.js';

// ── Constants ─────────────────────────────────────────────────────────────
export {
  PHASES,
  PHASE_ORDER,
  CARD_TYPES,
  RESOURCES,
  TRACK_BOUNDS,
  VP_MILESTONES,
  EXHAUST_STATES,
  DOCKET_SIZE,
  EVENT_FIRST_ROUND,
  EVENT_LAST_ROUND,
  WATER_PENALTY_FIRST_ROUND,
} from './constants.js';

// ── Track & resource management ────────────────────────────────────────────
export {
  applyTrackDelta,
  grantVP,
  applyWaterCubeDelta,
  checkDiscardConditions,
  canAcquireWithPr,
  lawyerAcquisitionCost,
} from './trackManager.js';

// ── Effect resolver (for unit testing individual card effects) ─────────────
export {
  resolveCardAction,
  commitDocketSwap,
  commitActivistCChoice,
  commitWaterBribe,
  resolveIncomePhase,
} from './effectResolver.js';

// ── Event handler ─────────────────────────────────────────────────────────
export {
  resolveEventPhase,
  commitProtestResolution,
} from './eventHandler.js';

// ── SC resolver ────────────────────────────────────────────────────────────
export {
  resolveActiveSCCase,
  resolveSpecificSCCase,
} from './scResolver.js';

// ── Phase manager ──────────────────────────────────────────────────────────
export {
  advancePhase,
  advancePlayerTurn,
  isActionPhase,
  nextPhase,
  processPendingSCResolution,
} from './phaseManager.js';

// ── VP calculator ──────────────────────────────────────────────────────────
export {
  calculatePlayerVP,
  calculateFinalScores,
} from './vpCalculator.js';

// ── Pure utilities (useful for testing / UI) ───────────────────────────────
export {
  shuffle,
  drawFrom,
  slideAndDraw,
  filterDocketCases,
  swapIndices,
  rollDie,
  evaluateDiscardCondition,
  satisfiesPrRequirement,
} from './utils.js';
