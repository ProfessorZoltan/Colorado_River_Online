/**
 * vpCalculator.js
 * Computes a player's total VP at any point in the game.
 * Called at end-of-game for final scoring.
 *
 * VP sources:
 *   1. Accumulated vp counter (from track milestones, SC wins, card passives)
 *   2. End-game track bonuses (highest milestone bracket reached)
 *   3. Card VP values (citizens, activists with vp > 0)
 */

import { VP_MILESTONES } from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the current total VP for a single player.
 *
 * @param {Object}  playerState
 * @param {Object}  cardIndex    { [cardId]: CardDefinition }
 * @returns {{ total: number, breakdown: Object[] }}
 */
export function calculatePlayerVP(playerState, cardIndex) {
  const breakdown = [];

  // 1. Running VP counter (milestones, SC wins, etc.)
  breakdown.push({
    source: 'accumulated',
    label:  'Accumulated VP (milestones, SC wins, card passives)',
    amount: playerState.vp,
  });

  // 2. Card VP values in tableau
  let cardVp = 0;
  for (const instance of (playerState.tableau ?? [])) {
    const def = cardIndex[instance.cardId];
    if (def?.vp) {
      cardVp += def.vp;
      breakdown.push({
        source:  'card',
        label:   def.name,
        cardId:  instance.cardId,
        amount:  def.vp,
      });
    }
  }

  // 3. Hand VP values (strategy cards held — vp is null for all current strategies,
  //    but citizens in hand would count if rules evolve)
  let handVp = 0;
  for (const cardId of (playerState.hand ?? [])) {
    const def = cardIndex[cardId];
    if (def?.vp) {
      handVp += def.vp;
      breakdown.push({
        source: 'hand_card',
        label:  `${def.name} (in hand)`,
        cardId,
        amount: def.vp,
      });
    }
  }

  // 4. Track end-game bonuses (highest milestone bracket)
  //    These are awarded at game end if not already triggered mid-game.
  //    The milestonesTriggered array tracks which have been awarded — so we
  //    only add what hasn't already been counted in the running total.
  // NOTE: In the current design, milestones fire in real-time and add to vp directly.
  //       This section is a safety check / alternate scoring mode.
  //       If running real-time milestones are off, uncomment below:
  /*
  const tracks = {
    water_claim: playerState.waterClaimTrack,
    money:       playerState.moneyTrack,
    pr:          playerState.prTrack,
  };

  for (const [trackKey, trackState] of Object.entries(tracks)) {
    const milestones = VP_MILESTONES[trackKey] ?? [];
    for (const m of milestones) {
      if (!trackState.milestonesTriggered.includes(m.at) && trackState.value >= m.at) {
        breakdown.push({
          source: 'track_milestone',
          label:  `${trackKey} milestone at ${m.at}`,
          amount: m.vp,
        });
      }
    }
  }
  */

  const total = playerState.vp + cardVp + handVp;

  return { total, breakdown };
}

/**
 * Compute final scores for all players and rank them.
 *
 * @param {Object} state      Full GameState
 * @returns {Object[]}        Sorted array: [{ playerId, name, total, breakdown }]
 */
export function calculateFinalScores(state) {
  const scores = state.playerOrder.map(pid => {
    const player = state.players[pid];
    const { total, breakdown } = calculatePlayerVP(player, state.cardIndex);
    return {
      playerId:  pid,
      factionId: player.factionId,
      name:      player.name,
      total,
      breakdown,
      // Tiebreakers (adjust order per rulebook)
      waterClaimTrack: player.waterClaimTrack.value,
      moneyTrack:      player.moneyTrack.value,
    };
  });

  // Sort by total VP desc, then water_claim desc as tiebreaker, then money desc
  scores.sort((a, b) => {
    if (b.total !== a.total)               return b.total - a.total;
    if (b.waterClaimTrack !== a.waterClaimTrack) return b.waterClaimTrack - a.waterClaimTrack;
    return b.moneyTrack - a.moneyTrack;
  });

  // Assign rank (tied players get same rank)
  let rank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0 && scores[i].total < scores[i - 1].total) rank = i + 1;
    scores[i].rank = rank;
  }

  return scores;
}
