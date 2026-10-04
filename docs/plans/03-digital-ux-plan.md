# Law of the River — Digital Gameplay UX Plan

**Goal:** a three-player online game should feel like sitting at a real table.
You see the river, the court and the markets at a glance. Your own mat is in
front of you. Cards look like cards, and hovering one shows it large. You
never have to read the action log to know what just happened.

**Status:** proposal. It builds on the current build (PR #1), which is
functionally correct but visually dense.

---

## 1. Findings from the live review (1440 × 900, 3-player game)

| # | Finding | Measured |
|---|---|---|
| F1 | **Type is too small.** 206 of 313 text nodes are 9–10px; 39 are smaller than 9px (inside the art) | font-size histogram |
| F2 | **The shared board is buried.** The docket starts at y = 1173 and the event deck at y = 1299, below the fold in a 220px sidebar under 8 market cards | element positions |
| F3 | **The river is invisible.** Water supply, the central resource of Consume, appears only as a log line ("Water placed in river: 12") | page text |
| F4 | **Cards have no consistent shape.** Rendered sizes range from 88×262 to 130×235; art is a 51px letterboxed thumbnail | `.card-face` rects |
| F5 | **No card zoom.** The only hover effect is a 3px lift | stylesheet |
| F6 | **Opponents are hidden behind tabs.** To see a rival's money or projects you switch tabs, which replaces your own board | layout |
| F7 | **Your own board is mostly empty track.** Three 20-cell track rows take about 40% of the centre column to show three numbers | screenshot |
| F8 | **The hand strip overlays the board.** The fixed bottom hand covers the lower rows | screenshot |
| F9 | **Event and SC-case art is never rendered** (see the artwork guidelines) | code |
| F10 | **Exhausted cards drop to ~13% opacity**, which is unreadable instead of just "used" | CSS (double fade) |
| F11 | **The log is a raw event stream.** Every track change is its own line; nothing summarises a turn | log panel |
| F12 | **Inconsistent terms.** The track is labelled "Water Claim" but the rules call it Water Rights; ★ means PR in the UI but VP in the rulebook | labels |
| F13 | **`GameTable.jsx` is a 2,724-line single file** with inline styles | code |

---

## 2. Design principles

1. **The table is the interface.** Shared things sit in the middle, your
   things in front of you, rivals around the edges. No tabs to see game state.
2. **Cards are physical objects.** They have one fixed 5:7 shape and a few sizes.
   Exhausted means rotated (a "tapped" card), not invisible.
3. **Hover to read, click to act.** A small card shows art, name and icons;
   hovering shows the full card large; clicking shows its legal actions.
4. **Show what you can do now.** Legal actions glow; illegal ones explain why
   on hover; costs preview the result ("$6 → $3").
5. **Show what just happened.** Animate resource changes on the board. The log
   is the history, not the main feedback channel.
6. **Progressive disclosure.** Numbers first, details on demand.

---

## 3. Target layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ROUND 3/10  ●Setup ●Negotiate ○Consume ○End   "Your turn — 1 action"   [Pass] ⚙ 🔍 ROOM │  top bar (48px)
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ RIVAL: CA     │              THE RIVER                    │ RIVAL: NV     │
│ ◈7 $9 PR2 VP4 │  ≈≈≈≈≈≈ supply 14 ▢▢▢▢▢▢▢▢▢▢▢▢▢▢ ≈≈≈≈≈    │ ◈5 $12 PR-1 VP6│
│ 💧2  ✋2 cards │  [EVENT card face]   [SC: Active case  ]  │ 💧0  ✋1 card  │  rival rails
│ tableau ▮▮▮   │  Drought −4          [AZ ●3  v  CA ●1  ]  │ tableau ▮▮    │  (click = expand)
│ projects ▪▪▪  │                      docket ▯▯ next…      │ projects ▪▪   │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│  LAWYER MARKET  [card][card][card][card]   ACTIVIST MARKET [card][card]…  │  market row
├──────────────────────────────────────────────────────────────────────────┤
│ YOU — ARIZONA   ◈ 4 ▸6   $ 6   PR 2 ▸6   VP 0   💧 0   claims ◈◈◈◈      │  your mat
│ PROJECTS  Farm ○○○○○○  Housing ○○○○  Fire ○○ │ Factory ○○○○○○ Vine ○○○○ Rec ○○ │
│ TABLEAU  [card][card][card]      PARTNERSHIPS ⚖ 🤝 📈   BANK 🏦 ▢▢▢        │
│ HAND  ⟨fanned cards — rise on hover⟩                                       │
└──────────────────────────────────────────────────────────────────────────┘
   log: collapsible drawer on the right edge (closed by default; shows a badge for new events)
```

- **Two-player view:** one rival rail on top instead of two side rails.
- **Four to six players:** rivals become a top row of compact chips that
  expand on click.
- **Your mat is always at the bottom and always your own seat.** In online
  play that's the seat you control. In pass-and-play it follows the active
  player, with a "Pass the device to …" curtain so the next player's hand
  stays hidden.
- **Breakpoints:** ≥1280 full layout; 1024–1279 side rails collapse to chips;
  <1024 is not supported for play (spectator view only). The zoom control
  stays as an accessibility override.

---

## 4. Card presentation system

One `<Card>` component, four sizes, all **5:7** (63 × 88 mm proportions):

| Size | Px (at 100%) | Shows | Used in |
|---|---|---|---|
| `chip` | 28 × 39 | type colour, mini art crop | rival tableaux, the log |
| `table` | 104 × 146 | art fills the top 60% (cropped to fill), name band, cost/VP badges, N/C **icon** strip | markets, your tableau, the event slot |
| `hand` | 120 × 168 | same as `table`, fanned with an overlap | your hand |
| `inspect` | 300 × 420 | full art plus frame, full N/C rules text, PR requirement, discard condition, flavour | hover / long-press preview |

### Hover-to-enlarge (the "inspect" view)
- **Trigger:** hover for 250ms (mouse), keyboard focus (Tab), or long-press
  for 400ms (touch).
- **Placement:** in a portal, anchored next to the card, flipping to the side
  with the most room. It never covers the card you're hovering.
- **Pin:** clicking the magnifier or pressing Space pins the preview into a
  right-side **Inspector** panel, so you can compare two cards.
- **Context line** at the bottom of the preview:
  - "You can use C now"
  - "Costs $5 ($1 + $4 surcharge)"
  - "Locked by Red Herring until End Step"
- **SC cases and events** use the same preview, so the court-case diptych art
  finally gets shown large.

### Card states (readable, never faded out)
| State | Treatment |
|---|---|
| Playable now | Soft glow in the side colour (N = orange, C = teal) |
| Ready but not playable now | Normal |
| Exhausted | **Rotated 90°** and slightly desaturated (≥ 70% opacity) |
| Locked | Rotated, with a padlock badge and a red-herring tag |
| Can't afford or requirement unmet | Normal card; the reason shows on hover |

### Clicking a card
Clicking opens a small **action popover** next to the card:

- "▶ Play N: Pay $2 → +1 Water Rights (6 → 4 money)"
- "Acquire for $5"
- "Use Law Firm ($4)"

Only legal options are enabled. There are no tiny always-visible buttons under
every card.

---

## 5. Board elements

### River (new, centre)
- A horizontal river band. Supply is drawn as cubes in the water plus a big
  number.
- When the Consume phase starts, it **animates the fill**: base supply from
  each player's Water Rights, then the event modifier shown as a labelled
  drop or rise (e.g. "Drought −4").
- When you place water, a cube visibly flies from the river to your project.

### Event slot
The face-up event card shows at `table` size, with a one-line outcome:
"Drought: rolled 4, supply −4". The event deck shows as a face-down stack with
its count, and an "events end after round 7" marker.

### Supreme Court
- The **active case** shows large: plaintiff faction vs. defendant faction,
  with an influence tally bar per side.
- If you're a party and have cubes, the "+1 influence (1 💧)" control sits here.
- The docket is a row of face-down/face-up thumbnails showing which case comes
  next.

### Your mat
- **Tracks become compact meters, not 20-cell rows.** Each shows the value
  large, the next milestone ("▸6 = +1 VP"), and threshold markers for PR
  (−7 / +8 surcharge waiver). Expand on click to see the full track.
- **Projects show as mat spaces with slot circles.** A full project glows; a
  partial one shows "−1 ◈ at End Step if left partial" (from round 3).
  Clicking a project in Consume places water there.
- **Water claim tokens** are shown as tokens ("◈◈◈◈") next to the river. They
  disappear as you spend them.
- **Partnerships:** three small tiles (owned or unowned) instead of three big
  boxes with Buy buttons. Actions go in a popover, like cards.

### Rival rails
- Each rail shows the rival's resources, VP, cube count and hand count (backs
  only), plus a chip-sized tableau (hover enlarges) and a miniature of their
  projects.
- A **turn marker** and **"passed"** state show for each player (so you can see
  "2/3 passed").

---

## 6. Clarity and feedback

1. **Phase coach line** in the top bar, changing with phase and turn. Example:
   "Negotiate — use one N ability, play a Strategy N, buy a partnership or a
   lawyer, or Pass. Free: partnership abilities, water bank."
2. **Turn handoff:** a brief banner ("California's turn") and a gentle chime
   (can be turned off). In online play, the tab title flashes "● Your turn"
   when the window isn't focused.
3. **Floating deltas:** "+3 $", "−1 PR", "+2 VP" rise from the meter that
   changed, colour-coded, for every change, including other players'.
4. **Turn summaries in the log:** one line per player action, e.g. "Bob played
   Quid Pro Quo: −$4, +2 💧". Expand it for the detailed changes. Add filters:
   *My turns / All / Detailed*.
5. **End Step recap modal:** a per-player table of project payouts, penalties
   and discards, with Continue. This replaces a wall of log lines.
6. **Glossary tooltips:** hovering any icon (◈, PR, 💧, N, C) explains it.
   Add a **Rules drawer** (searchable, rendered from `RULES.md`) behind a "?"
   button.
7. **Fix the terms:**
   - Label the track **"Water Rights"** and the tokens **"Water Claims"**.
   - Use the PR and VP icons from the artwork guidelines §9; ★ never means
     two things.
8. **First-game hints:** dismissible callouts, shown once. Examples:
   "Projects pay at End Step", "Partial projects cost Water Rights from
   round 3", "Lawyers cost +$4 unless your PR is ≤−7 or ≥8".

---

## 7. Decluttering checklist

- Remove all always-visible per-card buttons (they move into the action
  popover).
- Remove duplicated text: the card name is in the frame only, never in the art.
- Collapse the log by default.
- Replace the three 20-cell track rows with meters (saves about 300px of
  vertical space).
- Put the Strategy deck and discard counts in a tooltip on a deck stack icon,
  not in a sidebar panel.
- Show partnership and bank details only on hover or popover.
- One accent colour per meaning (side, faction, type), applied the same
  way everywhere.

---

## 8. Accessibility

- Body text ≥ 13px and labels ≥ 11px at 100% zoom. Keep the zoom control at
  60–150%.
- Contrast: WCAG AA for all text (≥ 4.5:1). The current `#4a3820` labels on
  `#0d0b08` fail.
- Factions are identified by **colour and shape** (artwork guidelines §5.3).
- Full keyboard play: Tab moves through legal actions, Enter acts, Space
  inspects, P passes, Z undoes (host/local only).
- Honour `prefers-reduced-motion`: replace movement animations with fades.

---

## 9. Engineering approach

1. **Split `GameTable.jsx`** into `src/ui/table/` (layout regions),
   `src/ui/cards/` (`Card`, `CardPreview`, `ActionPopover`), `src/ui/mat/`,
   `src/ui/rivals/`, `src/ui/shared/` (river, event, court, markets) and
   `src/ui/chrome/` (top bar, log drawer, inspector).
2. **Design tokens:** move inline styles to CSS modules plus a
   `tokens.css` (colours from artwork guidelines §5, a type scale and a 4px
   spacing scale).
3. **Selectors:** a `src/ui/selectors.js` layer derives "legal actions for
   seat X". It's computed from the engine's own validators, so the UI never
   re-implements rules. (The duplicate `uiLawyerCost` logic in `GameTable.jsx`
   goes away.) The same function powers glows, popovers and the balance-sim
   bots.
4. **Animations:** a small event bus where the store emits typed log entries
   and the UI turns them into deltas and fly-ins. Use CSS transforms only.
5. **Visual regression tests:** Playwright screenshots of five canonical states
   (round 1 negotiate, consume with drought, SC session, protest modal, end-step
   recap) at 1280, 1440 and 1920 wide. Add a check that no text renders
   below 11px.

---

## 10. Phased roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **1. Foundations** (1–2 sessions) | Tokens; component split with no visual change; `selectors.js` legal-action layer; terminology fixes | Same UI, ~10 files instead of 1; existing playthrough still works |
| **2. Card system** | `<Card>` at 4 sizes, fixed 5:7 ratio, cover-cropped art, hover/focus/long-press preview, Inspector pin, action popover, rotated exhaust state | Every card in the game has a preview; no per-card buttons left |
| **3. Table layout** | River, event slot, court, market row, your mat with meters, rival rails, collapsible log | Every piece of shared state is visible without scrolling at 1440 × 900 |
| **4. Feedback** | Phase coach, turn banners, floating deltas, turn-summary log, End Step recap, cube fly-ins | A new player can follow a full round without opening the log |
| **5. Polish & a11y** | Glossary tooltips, rules drawer, first-game hints, keyboard play, reduced motion, sound | All text ≥ 11px; AA contrast; full keyboard round |
| **6. Art integration** | Swap in reworked art as it lands (artwork guidelines §10); event and SC art in previews | Squint test passes in the real UI |

Phases 1–3 deliver most of the benefit and are worth doing before the next
online playtest. Phases 4–5 can be adjusted based on what playtesters
actually struggle with.

---

## 11. Open decisions

1. **Pass-and-play privacy:** add a curtain between turns (recommended), or
   keep the current shared view?
2. **Exhausted = rotated 90°:** this matches tabletop convention but uses more
   horizontal space in tableaux. The alternative is an "exhausted" ribbon on an
   upright card.
3. **Sound:** on by default (with a volume control), or off?
4. **Spectator mode:** worth adding for friends watching a game (a cheap
   addition on top of the network layer)?
