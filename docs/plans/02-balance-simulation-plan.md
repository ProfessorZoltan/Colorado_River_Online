# Law of the River — Balance Simulation Plan

**Goal:** use automated play on the real engine to measure action strength,
card strength, faction starting positions and victory pathways. Then tune the
numbers until **many different strategies can win**, and confirm the result
with human playtests.

**Status:** proposal. A working prototype harness already exists in
`tools/sim/prototype-sim.mjs` (random/water-first bots, about 18–30 games/sec
single-threaded, deterministic with seeds) and `tools/sim/prototype-probe.mjs`
(targeted exploit checks).

---

## 0. Headline: fix the exploits before measuring anything

A first 200-game run (3 players: Arizona, California, Nevada) gave players
**~100 VP each, of which ~80 came from Firefighter A alone**. As long as
unbounded loops exist, every balance number just measures the bugs. These
were all confirmed by running the engine:

| # | Exploit / defect | Effect | Where | Fix (obvious vs. needs your call) |
|---|---|---|---|---|
| X1 | **Firefighter A C** gives 1 VP per firefighter on each use; each copy exhausts separately, so k copies → k² VP per round; it doesn't replace the normal reward | 3 firefighters → 9 VP per Consume | `effectResolver.js` firefighter_a | Needs a call: implement "instead of the usual bonus" (the card scores only when a firefighting project completes) |
| X2 | **Rider of Coat-tails** has `cost:null`, so it never exhausts. N and C can be repeated without limit; C pays out even on tied cases; the engine doesn't validate targets | ◈ 4→11, or 0→18 VP, in one phase | `cards.json` rider; `gameStore.js` resolveChoice | Obvious: once per round, engine-side validation, winners only |
| X3 | **Depositing into your own Water Bank** duplicates cubes and money (both patches land on the same player and the second wins). *This bug came from PR #1, which enabled own-bank deposits.* | Free cubes and $ without limit | `gameStore.js` depositToWaterBank | Obvious: handle depositor = owner as one patch; owner pays no fee |
| X4 | **Income modifiers are never cleared**, so Farmer A C and Service Worker A C become permanent after one use | Permanent +2 VP per farm | `gameStore.js` / `phaseManager.js` | Obvious: clear at End Step |
| X5 | **Citizen grants always mint an "A" card, with unlimited supply.** Service Worker B is never granted | Unlimited Farmers (4 VP each) | `gameStore.js` grant_citizen_card | Needs a call: how many citizen cards exist and which variant you get |
| X6 | **Investment is unlimited:** $2 → +1 PR as a free action, as often as you can pay | PR milestones and the +8 surcharge waiver become a pure money purchase | `gameStore.js` usePartnershipAbility | Needs a call (see D4) |

**Step 0 is to fix X1–X4 and decide X5/X6.** That's about one session of work,
and it includes regression tests built from `prototype-probe.mjs`.

---

## 1. What "balanced, with many viable paths" means here (success criteria)

Measured in 3-player games (the target table), then checked at 2, 4 and 6:

| Criterion | Target |
|---|---|
| **Faction parity** | Each faction's win rate within **±5 points of fair share** (33% at 3p) in mirror-skill games |
| **Seat parity** | First-player win rate within ±4 points of fair share |
| **Viable pathways** | **≥ 5 distinct archetypes** each reach ≥ 80% of fair share against a mixed field, and none exceeds 130% |
| **No dominant source** | No single VP source makes up > 35% of the average winner's VP |
| **Meaningful choices** | Every card is played at least sometimes by greedy bots, and no card's "win rate when used" differs from its "win rate when not used" by more than ±12 points |
| **No traps** | Every project type and partnership has positive marginal VP in at least one archetype |
| **Interaction** | SC, protest and denial cards change the winner in ≥ 10% of games (they matter, but don't dominate) |
| **Luck share** | Same seeds with swapped skill: skill beats luck ≥ 70% of the time; event dice decide < 15% of games |
| **Score shape** | Winning scores ~35–60 VP; winner's margin is under 5 VP in ≥ 40% of games (close games) |

---

## 2. Design decisions to settle before tuning (D-list)

The simulations will report on these, but the rules have to say *something*
first. Each is currently either ambiguous or very likely different from what
the physical game intends.

| # | Question | Current behaviour | Why it matters | Options to simulate |
|---|---|---|---|---|
| **D1** | **Money model** | Income = current money track value, **added to the same track**, so money doubles every round. A player who only passes reaches $19 (+5 VP) by round 3 | $ becomes nearly free, the $19 milestone is automatic, and $0 is a permanent death spiral | (a) as is; (b) separate **income track** (starts at faction value, raised by income projects) plus cash; (c) flat income of +$4 per round plus project income |
| D2 | **Odd water claims** | Every project has an even number of slots (6/4/2), so an odd claim count always triggers the round-3+ penalty (California at 5 is punished every round); players at ◈3 are immune because the track floors at 3 | Unfair to specific factions | Add a 3- or 5-slot project; let 1 claim carry over; or apply the penalty only to *leftover claims* |
| D3 | **Claims above 12 are useless** | Citizen projects total 12 slots; anything more goes to PR-negative income projects or wastes away | Caps the water-rights path; ◈22 is unreachable without exploits | Larger/extra projects at high ◈; let claims buy SC influence or cubes |
| D4 | **Investment** | Unlimited $2 → +1 PR | PR milestones are just a purchase | Once per round; or escalating cost |
| D5 | **Citizen supply** | Unlimited "A" copies | The farm path has no ceiling | Physical deck counts (e.g. 3 Farmers, 2+2 Service Workers, 3 Firefighters), with the variant drawn at random |
| D6 | **Protest when everyone ties** | Every tied player takes the penalty, so with no activists *everyone* loses 3 PR | Punishes the whole table | No penalty when everyone ties |
| D7 | **SC reward vs. player count** | ~1.8 cases per faction per game at 3p, ~0.9 at 6p | Litigation is a trap at high player counts | Scale SC sessions or rewards by player count |
| D8 | **Lawyer PR requirements** | Checked only when acquiring | Anti-Environmentalist stays usable at high PR | Check on use too? |

### Rulebook and RULES.md must agree (rules lock)
The PowerPoint rulebook and `RULES.md` disagree in 12 places. These affect the
simulation:

- Starting hand size: 3 each vs. scaled by player count.
- It's a Job C: free vs. $1.
- PR floor: hard vs. soft.
- How SC influence is placed: lawyers only vs. also 1 💧.
- Lawyer acquisition counted as a turn action or not.
- Free actions vs. turn actions.
- Rider N: any lawyer vs. your own, activated this phase.
- Anti-Environmentalist C: whether the $2 alternative costs PR.
- Citizens described as "passive abilities".

**Each one gets one answer** before balance runs start. RULES.md stays the
engine contract; the deck gets updated to match.

---

## 3. Harness architecture (turn the prototype into a tool)

### 3.1 Engine changes (small and test-friendly; they also help the UI plan)
1. **`getLegalActions(gameState, pendingEffects, seatId)`** is a pure function
   returning every legal turn action, free action and pending choice. Today
   validity is only discovered by trying actions; the prototype makes ~700
   rejected attempts per game. The same function will drive the UI's
   "playable" glow.
2. **Store actions return `{ ok, reason }`** instead of `console.warn`
   followed by a silent return.
3. **Seeded RNG:** route `shuffle`, `rollDie` and protest insertion through an
   injectable `rng` stored on the game (seed saved in state). That makes a
   game fully replayable from `(seed, action list)`.
4. **Sim mode:** `initGame(..., { sim: true })` turns off undo snapshots and
   logs only typed VP/resource events, without copying the whole log on every
   dispatch (that copying is O(n²) today).
5. **Data overrides:** `initGame` accepts a **variant patch**, a JSON merge
   over `cards.json` / `player_board.json` / `constants`. That lets experiments
   change numbers without editing code. Example:
   `{ "factions.quechan.pr": 4, "cards.pro_bono_attorney.cost": 2 }`.

### 3.2 Runner
- `tools/sim/run.mjs --variant base.json --bots farm,litigator,greedy --players 3 --games 20000 --seed 1`
- Uses **`worker_threads`, one per core.** Each worker owns its own store
  singleton. Expect ~150+ games/sec on 8 cores, so a 20k-game experiment
  takes about 2–3 minutes.
- Output: one JSON line per game holding the seed, seats, final state summary,
  VP-by-source per player, actions taken per player, and the winner.
- **Reproducibility:** any interesting game can be replayed and exported to the
  UI to watch it (load a saved game through the existing Resume path).

### 3.3 Instrumentation (VP attribution)
Every VP grant carries a `source` tag:
`milestone:{track}:{at}`, `card:{id}`, `sc_win`, `glory`, `rider_case`,
`farmer_c`, `pro_bono_c`, and so on.

Every resource delta carries a cause. That gives exact answers to "where did
the winner's points come from" and "what did this card produce over its
lifetime".

---

## 4. Bots

| Bot | Policy | Purpose |
|---|---|---|
| **Random-legal** | Uniform over legal actions; passes with probability p | Sanity baseline; catches crashes and illegal states |
| **Water-first** (exists) | Places claims greedily, otherwise random | Baseline that actually completes projects |
| **Greedy-1** | Tries each legal action on a snapshot, scores it, picks the best. The store is immutable, so snapshot/restore is cheap. Score: VP + a·◈·roundsLeft + b·PR-to-next-milestone + c·min($,10) + d·cubes | The "competent player" yardstick |
| **Archetypes** (greedy with biased weights and fixed priorities) | **Farmer** (citizen engine, PR upkeep) · **Riparian** (◈ rush: Pro Bono, It's a Job, Activist A, Lobby) · **Tycoon** (money/income projects, Law Firm buying sprees) · **Litigator** (Team Player, cubes, Glory, Donate SC) · **Organizer** (activists, protests, Business) · **Saboteur** (Bribe, Red Herring, Scorched Earth, Activist B) · **Hoarder** (control) | Measure whether each pathway can win |
| **ISMCTS** (later, optional) | Information-set Monte Carlo tree search with determinized hidden hands | Stress test: finds strong lines and exploits humans would find within a few games |

Greedy weights are tuned once with a small grid search: maximise win rate
against random bots, then freeze the weights so they act as a fixed
measuring stick.

---

## 5. Experiment catalogue

Each experiment's output is a short report: tables, charts and a
recommendation.

### E1 — Baseline health (after Step 0)
- 20k games per player count (2, 3, 4, 6) with a Greedy-1 mirror.
- Measures VP distribution, game length, VP sources, end-of-game track values,
  and how often each milestone is reached.
- *Question:* are winning scores in the 35–60 range, and does any source make
  up more than 35%?

### E2 — Action strength (exchange rates)
- **Marginal value of one action:** take a mid-game state (round 4, 6, 8),
  force action A instead of the bot's choice, play out 200 continuations, and
  measure ΔVP versus the bot's own choice.
- Run this for every turn action, free action, project and partnership.
  That produces an **action value table** (VP per $, per claim, per PR) to
  compare with the hand-derived rates below.
- Hand-derived starting point (from the economy review):
  - Farm ≈ 0.67 VP per claim (1.0 with Farmer C).
  - Housing ≈ 0.5 VP per claim.
  - Income projects are negative.
  - PR costs ~$2 per point; PR milestones come to ~$2–3.4 per VP depending on faction.
  - ◈ milestones: 11 VP total.
  - SC win ≈ 4–5 VP-equivalent.
- *Hypotheses to confirm:*
  - Pro Bono and Farm are dominant.
  - All income projects, Sneaky Pete N, Deal with Federal Government,
    Scorched Earth, Protect Our Interests, the Water Bank and the direct
    activist purchase are dominated.

### E3 — Card strength
- For each card, measure:
  - **pick rate** (how often greedy bots acquire or play it),
  - **win rate when acquired** vs. not, adjusted for faction and seat,
  - **lifetime VP produced**,
  - **ablation:** remove the card from the game and see the change in its
    archetype's win rate.
- **Cost sweeps** for outliers: for each lawyer, vary cost ±2 and requirement
  ±1 and plot win rate against cost. The balanced cost is where acquiring it
  stops being a clear win.

### E4 — Starting resources (faction parity)
- 3-player games with all 20 faction combinations, rotating seats, 5k games each.
- Fit a model (logistic regression of win on faction + seat + opponents) to
  separate faction strength from seat strength.
- **Solve for parity:** sweep each faction's ◈/$/PR by ±1 and search for the
  smallest set of changes that brings every faction within ±5 points.
  Prefer changes that keep each faction's *flavour* (e.g. Quechan stays
  PR-rich).
- Early signal from the prototype: Nevada (◈3) lags at 13 VP vs. 17.6 for
  Arizona and California; Quechan leads among reservations; California's
  odd ◈5 interacts with D2.

### E5 — Victory pathways (the main goal)
- **Archetype round-robin:** every 3-archetype combination, 2k games each,
  with factions rotated.
- Output: a **win-rate matrix** and **Elo per archetype**. Healthy looks like
  rock-paper-scissors (Litigator beats Tycoon, Saboteur beats Farmer, and so
  on), not a single column of wins.
- For any archetype below 80% of fair share, find the **one cheapest lever**
  that lifts it:
  - Organizer: protest influence → VP; more activist VP.
  - Tycoon: income projects that don't cost PR, or a stronger $19 payoff
    once D1 is settled.
  - Litigator: scale with player count (D7).
  - Riparian: a use for claims above 12 (D3).
- **Hybrid check:** greedy bots that switch archetype at round 5. Pivots should
  be possible, not punished.

### E6 — Player-count scaling
Repeat E1/E4/E5 at 2, 4 and 6 players. Watch the SC share (it shrinks with
more players), docket luck at 2p (only 1 case), and how the strategy deal
scales.

### E7 — Variance and luck
- Swap skill on identical seeds to measure how often the skilled player wins.
- Isolate event luck: hold actions fixed and reroll only events and dice.
- Check that drought/snow-melt swings and protest timing don't decide more than
  15% of games.

### E8 — Regression suite (permanent)
After every rules change, CI runs a 2k-game "health check": no crashes, all
choices resolve, no VP outliers above 3σ (catches new loops), and E1 metrics
stay within tolerances.

---

## 6. Likely tuning levers (to test, not to adopt blindly)

| Problem (expected) | Candidate levers |
|---|---|
| Money is meaningless (D1) | Separate income track; income projects raise *income* instead of paying cash once; $19 milestone becomes "$15 in hand at End Step" |
| Farms dominate | Cap citizen cards (D5); Farmer VP 4 → 3; farm becomes 6 slots + 1 PR cost |
| Income projects are traps | Remove their PR cost, or make the PR cost only apply above PR 5; reward = +income |
| ◈ path tops out | High-◈ milestones give claims-to-VP conversion; a 7th "Aqueduct" project needing 8+ claims |
| Litigation is weak at 4–6p | SC win = 3 + (players − 3) VP; or one extra SC Session card per 2 players |
| Activists are weak | Protest influence also counts at game end (most = +3 VP); Business costs $2 |
| Pro Bono too strong | Printed cost $0 → $2; or C gives +1 VP only once per game |
| Odd-claim tax (D2) | Leftover claims are only penalised if ≥ 2 |

Change **one lever at a time**, re-run E4/E5, and keep a changelog in
`docs/balance/CHANGELOG.md` with before/after metrics.

---

## 7. Human validation loop

Simulations rank candidate variants; humans judge whether the result is fun and
clear.

1. **Telemetry from real games:** the online build exports
   `(seed, action list, final scores)` at game end (opt-in) to a file the host
   can share. These replays feed straight into the analysis.
2. **Playtest protocol:** for each candidate variant, 2–3 sessions with the
   same 3 friends. A short form after each game: perceived strategy, "did you
   feel you had choices", whether there was a "feels bad" moment, and the
   rules questions that came up.
3. **Divergence check:** if humans win with a pathway the bots rate as weak
   (or the reverse), the bots are missing something. Add that line to the
   archetype bots.

---

## 8. Deliverables and sequence

| Step | Work | Output |
|---|---|---|
| **0** | Fix X1–X4; decide X5/X6 and D1–D8; rules lock (RULES.md ↔ rulebook) | Exploit regression tests; RULES.md v2 |
| **1** | Engine hooks: `getLegalActions`, `{ok}` returns, seeded RNG, sim mode, variant patches | Harness API; deterministic replays |
| **2** | Runner with workers, VP-source attribution, Greedy-1 and 7 archetype bots | `tools/sim/` CLI |
| **3** | E1 baseline + E2 action values + E3 card strength | Balance report #1 (HTML dashboard) |
| **4** | E4 faction parity + E5 pathway matrix + E6 player counts | Balance report #2 with proposed changes |
| **5** | Apply levers one at a time; E8 in CI | Variant v1; changelog |
| **6** | Human playtests of v1 vs. base; telemetry | Playtest notes; final tuning |

Steps 0–2 are about 2–3 working sessions. Each experiment batch after that is
about one session including the analysis.

---

## Appendix A — Prototype results (pre-fix, for reference only)

200 games, 3p (Arizona/California/Nevada), water-first bot:

| Condition | Arizona | California | Nevada | Notes |
|---|---|---|---|---|
| Exploits on | 96.5 VP | 105.4 | 75.6 | ~80% of VP from Firefighter A |
| Firefighter off | 17.7 | 17.6 | 13.1 | Remaining mix per game: PR milestones ~5.4, Service Worker cards ~4, Farmer cards ~3, Rider C ~1.3, SC ~0.9, $19 ~0.8, ◈ milestones ~0.7 |
| Pass-only bot | 5 | | | The $19 milestone alone (D1) |

SC participation is symmetric (every faction is in 5 of the 15 cases), but
which cases come up first is down to the shuffle.
