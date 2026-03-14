# Law of the River — Rules Reference for AI Sessions

> This document is the authoritative rules + engine contract for the
> Colorado_River_Online codebase. Read it before making any change to
> game logic. Every rule here is already implemented; if code diverges
> from this document, the code is wrong.

---

## 1. Game Overview

- 2–6 players, each controlling one **Faction** (State or Reservation)
- 10 rounds; no elimination — everyone plays all 10 rounds
- **Win by accumulating the most Victory Points (VP)**

---

## 2. Factions & Starting Values

| Faction | Type | ◈ Water Rights | $ Money | ★ PR |
|---|---|---|---|---|
| Arizona | State | 4 | 3 | 2 |
| California | State | 5 | 3 | 0 |
| Nevada | State | 3 | 4 | 1 |
| Chemehuevi | Reservation | 3 | 2 | 4 |
| Fort Mohave | Reservation | 3 | 3 | 3 |
| Quechan | Reservation | 3 | 2 | 5 |

---

## 3. Resources

| Symbol | Name | Notes |
|---|---|---|
| ◈ | Water Rights track | Track position 3–22. Income source. VP milestones. |
| ◈ token | Water Claims | Per-round spendable tokens = current Water Rights value. Distinct from the track. Zeroed at End Step. |
| 💧 | Water Cubes | Physical cubes. Used for SC influence, Water Bank, Water Bribe. Not the same as Water Claims. |
| $ | Money track | Position 0–19. Income each round = track value. |
| ★ | PR track | Position −8 to +11. Hard cap at +11. Free-lawyer thresholds at −7 and +8. |
| VP | Victory Points | Accumulated; never decrease. Counted at game end. |
| SC Influence | | Placed per active case. Resets after case resolves. |
| Protest Influence | | Accumulated during a Protest event. Resets after resolution. |

---

## 4. Round Structure (4 phases, strictly in order)

### Phase 1 — ROUND SETUP (auto-resolves, no player input)
1. Pass the 1st-player marker clockwise (wraps around).
2. Each player gains **Water Claims = their current Water Rights track value**.
3. Each player gains **Money = their current Money track value** (capped at track max 19).

### Phase 2 — NEGOTIATE (consecutive-pass phase)
- Active player starts at the 1st-player marker holder.
- On your turn, do **one** of:
  - Use a **Lawyer or Activist** — N-side ability only.
  - Play a **Strategy card** — N-side ability only.
  - Buy a **Partnership** (pay cost, mark it owned permanently).
  - **Pass.**
- Taking any real action resets `consecutivePasses` to 0.
- Passing increments `consecutivePasses`.
- **Phase ends when `consecutivePasses >= playerCount`** (all players passed consecutively).
- Turn order wraps around (`activePlayerIndex = (current + 1) % playerCount`).

### Phase 3 — CONSUME (consecutive-pass phase)
1. **Event card** (rounds 2–7 only): flip top card of Event deck and resolve.
   - Rounds 1 and 8–10: no event.
2. **Place water in the river**: `waterSupply = sum of all players' Water Rights track values` ± drought/snow-melt modifier.
3. Players take turns (same consecutive-pass rule as Negotiate). On your turn:
   - Use a **Lawyer or Activist** — C-side ability only.
   - Play a **Strategy card** — C-side ability only.
   - Buy a **Partnership**.
   - Spend **1 Water Claims token → place 1 water cube on any project space** (deducts 1 from river `waterSupply`).
   - **Pass.**

### Phase 4 — END STEP (auto-resolves, no player input)
1. **Project rewards** (starting with 1st-player marker holder, going clockwise): for each fully-watered project, grant reward.
2. **Water Rights penalty** (round 3+ only): any player who has **≥1 Water Claims remaining** OR **≥1 water on any incomplete project** loses 1 on their Water Rights track.
3. **Remove all leftover Water Claims** from all players (set to 0).
4. **Reset exhausted cards** to READY. LOCKED cards age 1 round then unlock.
5. **Discard-condition check**: discard any tableau cards whose PR requirement is no longer met.
6. **Advance round counter** (after round 10, trigger end-game scoring).

---

## 5. Tracks

### Water Rights Track
- Range: 3–22 (soft bounds — engine clamps, no hard cap).
- **VP milestones** (one-time, not repeatable): reach 6→+1VP, 11→+2VP, 17→+3VP, 22→+5VP.
- Increases: card effects, SC win reward.
- Decreases: End Step penalty (leftover claims or partial project, round 3+), SC loss penalty, some card effects.

### Money Track
- Range: 0–19.
- **VP milestone**: reach 19→+5VP.
- Income each round = current track value (added at Round Setup).
- Spending: lawyer acquisition (cost + $4 surcharge), partnership buys, card ability payments.

### PR Track
- Range: −8 to +11. **Hard cap at +11** (cannot exceed).
- **VP milestones**: reach 6→+2VP, 11→+5VP.
- **Free-lawyer thresholds**: when PR is at −7 or +8 (or beyond), the $4 lawyer surcharge is waived.
- Increases: card effects.
- Decreases: card effects, Anti-Environmentalist payment, SC loss penalty.

---

## 6. VP Sources

1. Track milestones (Water Rights, Money, PR) — one-time each.
2. SC Court win: +3VP per win.
3. Citizens in tableau: printed VP value.
4. Activists in tableau: printed VP value (Activist B=1, Activist C=1).
5. In it for Glory passive: +1VP each time that player wins an SC case.
6. Farmer A C-action: +2 extra VP on fully-watered farms this round.
7. Firefighter A C-action: 1VP per Firefighter in tableau instead of normal reward.
8. Service Worker A C-action: double one income project reward this round.

---

## 7. Cards

### Card Types

| Type | Acquired from | N side | C side | Discarded when |
|---|---|---|---|---|
| Lawyer | Lawyer Market (4 slots) | Negotiate phase | Consume phase | Never (unless effect) |
| Activist | Activist Market (4 slots, requires Business partnership) | Negotiate phase | Consume phase | Never (unless effect) |
| Citizen | Completing Citizen Projects | Negotiate phase | Consume phase | PR requirement fails at End Step |
| Strategy | 3 dealt at start; drawn via card effects | Negotiate phase | Consume phase | After use (single-use) |
| Event | — (resolved from deck) | — | Resolved automatically | After resolution |

### Card Exhaustion
- `cost: "exhaust"` on an action = card must be in READY state to use; becomes EXHAUSTED after.
- Rider of Coat-tails has `cost: null` — does NOT exhaust when used.
- EXHAUSTED cards reset to READY at End Step cleanup.
- LOCKED cards (Red Herring target) stay LOCKED for 1 round, then unlock at next End Step.

### Acquiring Lawyers
- Pay printed cost + **$4 surcharge** (standard).
- Surcharge waived if player's PR is at or beyond −7 or +8 threshold markers.
- Law Firm partnership: alternative acquisition method (pay $4, no surcharge).

### Acquiring Activists
- Requires **Business partnership** owned.
- Cost: $3 via Business partnership ability.

---

## 8. Lawyer Card Reference

| ID | Cost | PR Req | N Action | C Action |
|---|---|---|---|---|
| sneaky_pete | $3 | — | Pay 1◈ → gain $3 | Draw 1 Strategy card |
| anti_environmentalist | $5 | PR ≤ 1 | Pay 1★ → gain 1 SC influence | Pay 1★ → gain 2 SC influence **OR** gain $2 |
| pro_bono_attorney | $0 | PR ≥ 6 | +1 Water Rights track | +1 SC influence **OR** +1VP |
| its_a_job_lawyer | $2 | — | Pay $2 → +1 Water Rights | Pay $1 → +1 SC influence |
| team_player | $3 | — | Pay $1 → gain 1💧 | Next lawyer acquired this round costs $3 less |
| workaholic | $1 | — | (none) | Next time you would gain 1💧, gain 2 instead (one-time flag) |
| rider_of_coattails | $1 | — | Copy N-bonus of any own lawyer activated this phase (must cost more) | Claim winner reward of any SC case resolved this round (not a party) |
| in_it_for_glory | $2 | PR ≤ 7 | (none) **passive**: +1VP each SC win | +1 SC influence |

**anti_environmentalist C** has `alternatives`: primary = 2 SC influence (with PR cost), alternative = gain $2 (no PR cost). Player must choose.

**pro_bono_attorney C** has `alternatives`: primary = +1 SC influence, alternative = +1VP.

---

## 9. Activist Card Reference

| ID | VP | N Action | C Action |
|---|---|---|---|
| activist_a | 0 | **Gain OR Lose** 1 Water Rights (player chooses direction) | +1 Protest Influence |
| activist_b | 1 | Add 1 Protest card to Event deck | +2 Protest Influence |
| activist_c | 1 | (none) | Look at 2 Strategy cards; draw 1, bottom the other |
| activist_d | 0 | Gain 1 Strategy card | +1 Protest Influence |

---

## 10. Citizen Card Reference

| ID | VP | Discard if | N Action | C Action |
|---|---|---|---|---|
| farmer_a | 4 | — | +1 PR | Fully-watered farms produce +2 extra VP this round |
| service_worker_a | 2 | PR ≤ 4 | +$1 | One fully-watered income project doubles its bonus this round |
| service_worker_b | 1 | PR ≤ 0 | +1 PR | Add a Protest card to the Event deck |
| firefighter_a | — | — | (none) | Gain 1VP per Firefighter in tableau (replaces normal project reward) |

Citizen cards are gained as rewards for completing Citizen Projects (Farm, Housing, Firefighting).

---

## 11. Strategy Card Reference (single-use)

| ID | N Action | C Action |
|---|---|---|
| deal_with_federal_government | Pay 1◈ → gain $3 | — |
| quid_pro_quo | Pay $4 → gain 2💧 | — |
| lobby_federal_government | Pay $3 → gain 1◈ | — |
| scorched_earth_negotiating | Pay $2 + 1★ → all opponents lose 1💧 | — |
| water_bribe | — | Give 1💧 to an opponent → they must give you $3 |
| red_herring_case | Choose 2 lawyers (any tableau) → they cannot be used this round | — |
| donate_to_sc_justice | Swap any two upcoming SC cases in the docket | — |
| protect_our_interests | Negate the effect of any 1 card played or 1 lawyer used | — |

Deck: 8 cards total. Reshuffle discard into new deck when draw pile is exhausted. If still empty after reshuffle, the effect fizzles.

---

## 12. Event Cards (rounds 2–7 only)

Deck composition: 4× Supreme Court Session, 2× Severe Drought, 1× Protest A, 1× Protest B, 1× Large Snow Melt = **9 cards total**.

### Protest A (×1)
- All players may use one Activist C ability to generate Protest Influence (optional).
- Player(s) with **lowest** Protest Influence lose **−3 PR**.
- Ties: all tied players receive the penalty.
- Resolves via `protest_activation_round` pendingEffect in UI.

### Protest B (×1)
- Same as Protest A but penalty is **−1 PR and −1 Water Rights**.

### Severe Drought (×2)
- Roll 1d6. **Subtract** result from river `waterSupply` this Consume phase.
- Minimum supply is 0.

### Large Snow Melt (×1)
- Roll 1d6. **Add** result to river `waterSupply` this Consume phase.

### Supreme Court Session (×4)
- The SC case at the **front of the docket** becomes active.
- Only the named **Plaintiff** and **Defendant** factions may place SC Influence (using Lawyer C abilities).
- **Winner** = highest influence → +1◈ +3VP +1★.
- **Loser** = lowest influence → −1◈ −$2 −1★.
- **Tie** (equal influence) → no rewards, no penalties.
- Resolved case moves to **back** of docket (cycles indefinitely).
- `casesResolvedThisRound` on sharedBoard records [{caseId, winnerId}] for Rider of Coat-tails.

---

## 13. Water Projects

Each player board has 6 project spaces. Fill all slots with water cubes → project pays reward at End Step. Partial water carries over between rounds.

| ID | Type | Slots | Reward on completion |
|---|---|---|---|
| farm | Citizen | 6 | +4 PR + Farmer citizen card |
| housing | Citizen | 4 | +2 PR + Service Worker citizen card |
| firefighting | Citizen | 2 | +1 PR + Firefighter citizen card |
| factory | Income | 6 | +$5 and −3 PR |
| vineyard | Income | 4 | +$3 and −2 PR |
| recreation | Income | 2 | +$1 and −1 PR |

**After paying out, a project's `watered` counter resets to 0** (water returns to supply implicitly).

---

## 14. Partnerships

Owned permanently once bought. Can be used at any point during an action phase.

| ID | Buy cost | Ability (pay each use) |
|---|---|---|
| law_firm | $4 | Pay $4 → acquire 1 Lawyer from market (bypasses standard action) |
| business | $3 | Pay $3 → acquire 1 Activist from market (required to acquire Activists at all) |
| investment | $2 | Pay $2 → +1 PR immediately |

---

## 15. Water Bank

- Pay **$8 once** to permanently unlock (capacity: 9 cubes).
- **Deposit**: ANY player may pay the owner $1 per cube to store cubes (stored in owner's colour).
- **Withdraw**: owner retrieves any stored cubes for free, any future turn including later rounds.

---

## 16. Supreme Court Docket

Docket size by player count:

| Players | Cases in docket |
|---|---|
| 2 | 1 |
| 3 | 3 |
| 4 | 6 |
| 5 | 10 |
| 6 | 15 |

Only cases where **both** plaintiff and defendant factions are in the active player set appear. Cases cycle to the back of the queue after resolution.

---

## 17. End-Game Scoring

After Round 10 End Step completes:

1. Sum accumulated VP counter (milestones, SC wins, passives).
2. Add VP from Citizens and Activists still in tableau.
3. **Tiebreaker order**: most Water Rights → most Money → most PR → most 💧 Water Cubes.

---

## 18. Engine Architecture (for code changes)

```
src/
  engine/
    constants.js      — All magic numbers. Change rules here first.
    setup.js          — buildInitialState(playerConfigs, cards, playerBoard, sharedBoard)
    phaseManager.js   — advancePhase(), isActionPhase(), advancePlayerTurn()
    effectResolver.js — resolveCardAction(), resolveIncomePhase(), applyResourceDelta()
    trackManager.js   — applyTrackDelta(), applyWaterCubeDelta(), checkDiscardConditions()
    eventHandler.js   — resolveEventPhase(), commitProtestResolution()
    scResolver.js     — resolveActiveSCCase()
    vpCalculator.js   — calculatePlayerVP(), calculateFinalScores()
    gameStore.js      — Zustand store. All player-facing actions live here.
    index.js          — Re-exports everything public.
  ui/
    GameTable.jsx     — Single-file React UI (~2800 lines). Reads from gameStore.
    CardArt.jsx       — Registry: cardId → SVG artwork component.
  app/
    App.jsx           — Root. Screens: loading → setup → game → error.
    dataLoader.js     — Loads and validates the 3 JSON data files.
  data/
    cards.json        — All 44 card definitions (activists/citizens/lawyers/strategy/events/SC cases).
    player_board.json — Board template + 6 faction starting values.
    shared_board.json — Market sizes, event deck, docket config.
```

### StateUpdate shape (returned by all engine functions)
```js
{
  playerPatches:  { [playerId]: Partial<PlayerState> },
  sharedPatches:  Partial<SharedBoardState>,
  logEntries:     LogEntry[],
  pendingEffects: PendingEffect[],
}
```

### PendingEffect subtypes requiring UI modals
| subtype | UI action |
|---|---|
| `water_allocation` | Legacy modal (no longer auto-triggered) |
| `protest_activation_round` | Protest resolution modal |
| `choice_required / activist_a_water_direction` | Gain or Lose 1 Water Rights |
| `choice_required / card_alternative_choice` | Choose primary or alternative effect |
| `choice_required / red_herring_choose_lawyers` | Pick 2 lawyers to lock |
| `choice_required / activist_c_look_and_draw` | Pick 1 of 2 Strategy cards |
| `choice_required / water_bribe_target` | Pick target player |
| `choice_required / docket_swap` | Pick 2 SC cases to swap |
| `choice_required / rider_coattails_lawyer` | Pick lawyer to copy |
| `choice_required / rider_coattails_case` | Pick resolved SC case to claim |
| `choice_required / negate_card_or_lawyer` | Pick card/lawyer to negate |
| `resolve_sc_case` | Auto-resolved in _dispatch |
| `grant_citizen_card` | Auto-resolved in _dispatch |
| `register_income_modifier` | Auto-resolved in _dispatch |
| `game_over` | Triggers endGame() |

### Key player state fields
```js
{
  waterClaimTrack: { value, min:3, max:22, vp_milestones, milestonesTriggered },
  moneyTrack:      { value, min:0, max:19, vp_milestones },
  prTrack:         { value, min:-8, max:11, hard_cap:true },
  vp:              number,
  waterCubes:      number,   // physical cubes (SC, bank, bribe)
  waterClaims:     number,   // per-round tokens (zeroed at End Step)
  protestInfluence: number,  // cleared at End Step
  pendingLawyerDiscount: number,  // cleared at End Step
  workaholicActive: boolean, // cleared at End Step or when triggered
  scInfluence:     { [caseId]: number },
  hand:            string[], // strategy card IDs
  tableau:         CardInstance[],  // { instanceId, cardId, exhaustState }
  partnerships:    { law_firm, business, investment },
  waterBank:       { unlocked, stored },
  projects:        { citizen: { farm, housing, firefighting }, income: { factory, vineyard, recreation } },
                   // each project: { watered: number, water_slots: number }
  firstPlayerIndex: number,  // index into playerOrder (root state field)
  consecutivePasses: number, // root state field
}
```

### Key store actions
| Action | Description |
|---|---|
| `initGame(playerConfigs, cards, playerBoard, sharedBoard)` | Boot; auto-advances to ROUND_SETUP → NEGOTIATE |
| `advanceToNextPhase()` | Advance phase; ROUND_SETUP auto-chains to NEGOTIATE |
| `endPlayerTurn()` | Took an action; resets consecutivePasses, advances to next player |
| `passPlayerTurn()` | Pass; increments consecutivePasses; ends phase if all passed |
| `playCardAction(playerId, cardId, side, options)` | Play N or C side; resets consecutivePasses |
| `placeWaterOnProject(playerId, projectType, projectId)` | Spend 1 Water Claims + 1 river water → +1 on project |
| `resolveChoice(choiceData)` | Resolve a pendingEffect that required player input |
| `undo()` / `redo()` | 20-state snapshot stack |
| `acquireLawyer(playerId, marketIndex)` | Buy from lawyer market |
| `acquireActivist(playerId, marketIndex)` | Buy from activist market (requires Business) |
| `purchasePartnership(playerId, partnershipId)` | Buy a partnership |
| `usePartnershipAbility(playerId, partnershipId)` | Use a partnership ability |
| `placeScInfluence(playerId, caseId, amount)` | Place SC influence (spends water cubes) |
| `depositToWaterBank(ownerId, depositorId, cubeCount)` | Store cubes in water bank |
| `withdrawFromWaterBank(ownerId, cubeCount)` | Retrieve own stored cubes |

---

## 19. Known Deferred Items

- **Rider of Coat-tails N/C**: fully implemented as of latest commit.
- **`protect_our_interests`** (Negate card): resolveChoice handler `negate_card_or_lawyer` marks target LOCKED; actual effect voiding not enforced by engine (UI displays locked state).
- **`donate_to_sc_justice`** (Docket swap): resolveChoice handler `docket_swap` implemented via `commitDocketSwap`.
- **Water supply formula**: confirmed as sum of all Water Rights track values ± event modifier (not a shared pool separate from tracks).
- **SC case tie**: tie = no winner, no loser, no rewards or penalties (plaintiff does NOT win ties — unlike earlier implementation; this is correct per rules).

---

## 20. File Locations

| File | Purpose |
|---|---|
| `RULES.md` | This document |
| `law_of_the_river_rulebook.pptx` | Human-readable rulebook (10 slides) |
| `src/data/cards.json` | All 44 card definitions |
| `src/data/player_board.json` | Board template + faction starting values |
| `src/data/shared_board.json` | Shared board config |
| `artwork/*.jsx` | SVG card illustrations (7 files, ~3000 lines total) |
| `src/ui/CardArt.jsx` | cardId → component registry |
