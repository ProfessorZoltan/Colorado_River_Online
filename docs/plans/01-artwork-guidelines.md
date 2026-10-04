# Law of the River — Artwork Guidelines

**Status:** proposal · **Applies to:** all card art in `artwork/*.jsx`, the
icon set, and any future print edition.
**Goal:** every card reads at a glance on the table at ~110px wide, and still
looks good enlarged to ~320px. Both the digital game and a printed deck use
one art source.

---

## 1. Where we are today (audit summary)

The existing art has a strong, consistent mood: dark WPA-poster silhouettes,
warm desert light, and film grain. Keep that direction. The problems are in
**how it is built and displayed**, not in the taste:

| Problem | Evidence | Consequence |
|---|---|---|
| The art is shrunk into a 72px strip, not cropped | `CardFace` → `CardArtDisplay` at `height:72`, default `meet` scaling (scale 0.21) | Each illustration is a ~51×72px thumbnail with empty bars on both sides; 40–53% of the strip is used |
| Title, type and rules text are baked into every SVG | Bottom band at y≈287 on all files; "DISCARD IF PR ≤ 4", "ROLL d6 · SUBTRACT", "CITIZEN · 4 VP" | The text renders at **0.9–3px**, which is unreadable. It duplicates the card frame and drifts from `cards.json` |
| Art doesn't match the card | `sneaky_pete` → "THE ADJUDICATOR"; both Service Workers titled "SERVICE WORKER"; both Protests titled "PROTEST" | Players learn the wrong name from the image |
| SVG id collisions | `gA`/`vigA`, `gB`/`vigB` defined in both `activist-cards.jsx` and `lawyer-cards_1.jsx` | Activist A and Sneaky Pete, and Activist B and Pro Bono, can show each other's backgrounds |
| Near-black backgrounds on a near-black UI | Art backgrounds `#040806`–`#100400` vs. UI `#0d0b08` / `#1f1a12` | Thumbnails have no edge and figures disappear |
| 409 distinct hex values; 11 near-identical golds | `#C8A020`, `#C8A820`, `#C89820`, `#C0B040`… vs. UI `--gold #c8a550` | Palette drift; the files look like different artists |
| Faction colours disagree between the UI and the SC-case emblems | Nevada gold (UI) vs. slate/silver (art); Chemehuevi green vs. teal; Arizona vs. Quechan are two near-identical reds | Players can't map a court case to a rival at a glance |
| Event and SC-case art is never shown in the game | Only market, tableau and hand cards render `CardArtDisplay` | Nine pieces of finished art are invisible |
| Per-card `feTurbulence` grain at opacity 0.02–0.04 | One full-card filter per card instance | Real rendering cost for an effect that's invisible at thumbnail size |
| Weak or duplicated pieces | Rider of Coat-tails, Team Player, It's a Job, Quid Pro Quo, Donate SC are minimal; Scorched Earth ≈ Severe Drought; SC Session ≈ Adjudicator | Uneven quality bar |

---

## 2. Core principle: art is art, the frame carries information

**No text inside illustrations.** The card frame (React component and print
template) renders all words and numbers from `cards.json`:

- name, type, cost, VP, PR requirement, discard condition
- N / C action text and icons
- event and SC-case reward lines

The one exception is **diegetic text**: words that physically exist in the
scene, such as a protest sign or a newspaper headline. Even then:

- Diegetic text must not be needed to understand the card.
- It must be ≥ 40 viewBox units tall to be readable when enlarged.
- It must never repeat the card name.

This one rule removes the drift between art and data, the illegible micro-text,
and the duplicate titles.

---

## 3. Canvas and safe zones

### 3.1 Canvas
- **Card:** poker size, **63 × 88 mm (5:7)**. This is the standard
  for sleeved card games and lines up with the existing 240 × 340 canvas.
- **SVG viewBox:** `0 0 250 350` (exact 5:7). Existing art migrates from
  240 × 340 by extending backgrounds by 5px on each side.
- **Print bleed:** +3 mm on every side. The background layer must extend to
  `-12 -12 274 374`, but nothing important may sit there.

### 3.2 Zones

```
 0 ┌───────────────────────────┐   ← bleed / trim (print)
   │ ░░░░░░ FRAME HEADER ░░░░░ │ 0–44   frame draws name + cost here (art = background only)
44 │ ┌───────────────────────┐ │
   │ │                       │ │
   │ │   ★  FOCAL ZONE  ★    │ │ 70–200 subject's head/hands/symbol MUST be here
   │ │                       │ │
   │ ├───── TABLE CROP ──────┤ │ 44–220 the 16:11 window shown on the table
   │ │                       │ │
220│ └───────────────────────┘ │
   │ ░░░ FRAME TEXT PANEL ░░░░ │ 220–350 frame draws N/C actions over a
350└───────────────────────────┘          darkened gradient (art continues behind)
```

- **Focal zone** (x 40–210, y 70–200): the identifying subject, the thing a
  player recognises across the table, lives here.
- **Table crop** (x 0–250, y 44–220, roughly 16:11): what the on-table card
  shows. The art is **cropped to fill** (`preserveAspectRatio="xMidYMid slice"`),
  never letterboxed.
- **Text panel** (y 220–350): keep it low-contrast and low-detail; the frame
  overlays rules text here. Use background textures, ground or water — not faces.
- **Enlarged preview** shows the full 250 × 350 with the frame overlaid.

---

## 4. Readability at table size (the "squint test")

The table card is ~110px wide, so 1 viewBox unit ≈ 0.44 screen px.

| Rule | Minimum | Why |
|---|---|---|
| Stroke width that must stay visible | **≥ 3 units** (≈1.3px) | Thinner lines vanish; use them only as texture |
| Smallest meaningful shape | ≥ 12 units | The size of a recognisable hand, tool or icon |
| Subject silhouette | ≥ 35% of the table crop's area | It should read like a playing-card pip |
| Value contrast, subject vs. background | ≥ 40 L* points (CIELAB) | The silhouette has to survive grayscale |
| Background lightness | L* ≥ 14 in at least the top third of the crop | Lifts the card off the `#0d0b08` table |
| Opacity of identifying elements | ≥ 0.6 | Elements at 0.05–0.1 don't render |

**Squint test (required for sign-off):** render the table crop at 110 × 77px
in grayscale. Without reading anything, a tester names the card type and
roughly which card it is. Fewer than 4 out of 5 correct means the piece
gets reworked.

**Two levels of detail.** Put fine detail (hatching, rivets, crowd outlines)
in `<g className="lotr-fine">`. The frame hides that layer below 160px using a
container query, so thumbnails stay clean and enlarged views stay rich.

---

## 5. Colour system

### 5.1 One shared palette
Every hex comes from a ~28-token palette published as `artwork/palette.js`.
These tokens are the same ones the UI uses (`--gold`, `--water`, …). The
existing 409 values snap to the nearest token.

| Family | Tokens (proposed) |
|---|---|
| Night / ground | `ink-0 #0d0b08` (UI only, never in art), `ink-1 #1a140e`, `ink-2 #2a2018`, `ink-3 #3d3326` |
| Earth | `clay #8a4020`, `sienna #c4612a`, `ochre #d4882a`, `sand #e8c890`, `bone #ecdec6` |
| Water | `deep #12384a`, `river #3d8fa8`, `glint #5db8d4`, `foam #b8e0ec` |
| Gold / law | `brass #8a6e30`, `gold #c8a550`, `leaf #e8d080` |
| Life | `sage #7eb87e`, `pine #2a5838` |
| Heat / conflict | `ember #e84808`, `blood #b82018` |
| Night sky / court | `dusk #3a2a5a`, `violet #a07ec8` |

The audit found the art values drift above and below the palette's ranges. Keep
the hue families, but lift the shadows (ink-1 instead of `#040806`) and pull
saturation back from pure `#C82020`-style reds.

### 5.2 Card-type identity
Today the type colours (lawyer gold, activist green, citizen blue, strategy
purple, event red) live only in the UI frame. The art ignores them: citizens are
warm orange, Activist B is all red, strategy is navy.

**Recommendation:** the **frame** carries type identity (coloured header band
plus corner glyph). The **art** has to include its type accent somewhere in the
focal zone: a glint, a garment or a prop. That keeps art free to set a mood
while the type stays recognisable.

> **Decision for you:** citizens are drawn in warm harvest tones but the
> UI codes them blue. Change the citizen type colour to a warm
> `ochre #d4882a` (my recommendation; the art is right, the token is arbitrary),
> or recolour four citizen cards blue?

### 5.3 Faction colours (single source of truth)
Move faction colours to one module (`src/data/factions.js`), used by the UI,
SC-case art, player mats, cubes and print. The proposal keeps them distinct from
each other **and** from the type colours:

| Faction | Proposed | Emblem motif (landscape-based) | Change from today |
|---|---|---|---|
| Arizona | `sienna #c4612a` | saguaro + sun | Art primary aligns to UI |
| California | `river #3d8fa8` | wave + coastal range | Art darkens to match |
| Nevada | `silver #a8b8c4` | mountains + mine headframe | **UI changes from gold to silver.** The art is right, and gold collides with the Lawyer type |
| Chemehuevi | `pine-teal #2a8a7a` | basket-weave pattern | Merge UI green and art teal |
| Fort Mojave | `violet #a07ec8` | canyon + mesquite | Darken slightly |
| Quechan | `ochre #d4882a` | river delta + bean field | **Change** from rose; fixes the Arizona/Quechan red clash |

Every faction also gets a **shape** (circle, square, triangle, diamond,
hexagon, chevron) so colour-blind players can tell them apart. Use it on
markers, tabs and cubes.

---

## 6. Depicting real places and people (important)

The six factions are three real U.S. states and three real, federally
recognised sovereign tribal nations. The game is about a real, ongoing water
conflict.

- **Don't use official seals, flags or emblems** of states or tribes. They are
  sovereign or official marks, and their use can be restricted. Build emblems
  from landscape and natural features instead, as the SC-case template already
  partly does.
- **No pan-Indian stereotypes:** no headdresses, tipis, war paint or "tribal"
  ornament copied from other nations. Basket-weave and similar motifs should
  draw on that nation's own documented traditions, or stay generic
  landscape. Before any print or public release, **get review from each
  tribe's cultural office.**
- **Use official names.** The tribe's name is the **Fort Mojave Indian Tribe**
  ("Mohave" is the Arizona town spelling). The repo currently uses "Fort Mohave"
  in `player_board.json` and in the card ids. The display name should change
  even if the ids stay the same. Also check "Chemehuevi Indian Tribe" and
  "Quechan Indian Tribe of the Fort Yuma Indian Reservation" for long-form text.
- Use consistent terms. The art currently mixes "RESERVATION", "TRIBE",
  "NATION" and "TRIBAL NATION". Pick **Nation** for display (respectful and
  short) and **Reservation** only where it means the land.
- Lawyers, activists and citizens are **archetypes, not real people.** Avoid
  likenesses of real officials or litigants.

---

## 7. Style rules (keep and codify)

1. **Silhouette-first WPA poster style.** Flat shapes with 2–3 value layers.
   Light comes from one direction per card (low sun, warm side light).
2. **The river motif:** every card has a water element somewhere, even a glint
   or a dry channel. It's the thread that ties the deck together.
3. **Faceless figures** stay faceless, but give each a defining **prop or pose**
   (scales, ledger, hose, megaphone, shovel). The prop is what you identify at
   table size.
4. **Mood by type:**
   - Lawyer: interior, desk lamp, paper and brass.
   - Activist: street, crowd, signs.
   - Citizen: field, town, labour under a big sky.
   - Strategy: noir backroom, hands, money and water exchanging.
   - Event: elemental (sky, sun, snow, crowd, court).
   - SC case: split-composition diptych.
5. **Grain:** use one shared `<filter id="lotr-grain">` defined once in the app
   root (not per card), applied to the full-bleed layer only in the enlarged view.

---

## 8. Technical contract for art components

```jsx
// artwork/<type>/<CardName>.jsx
export default function CardSneakyPete({ idPrefix }) {
  // every <defs> id MUST be `${idPrefix}-…` (the frame passes a unique prefix per instance)
  return (
    <svg viewBox="0 0 250 350" preserveAspectRatio="xMidYMid slice">
      <g className="lotr-base">…background + subject…</g>
      <g className="lotr-fine">…detail hidden at small sizes…</g>
    </svg>
  );
}
```

- **One card per file**, grouped in a folder by type. Gallery pages move to
  `artwork/_gallery/`.
- **Unique ids:** every gradient, filter and pattern id is namespaced with the
  `idPrefix` prop. This fixes the current collisions. A lint check in CI fails
  on any duplicate literal id.
- **Element budget:** ≤ 120 rendered elements per card. No per-card
  `feTurbulence`. Avoid `opacity` on large groups that animate.
- **Valid attributes only.** Today `opacity="0.4+i*0.05"` (event-cards:600)
  and `opacity="1.2"` exist.
- **Registry:** `CardArt.jsx` maps `cardId → component`. Add a dev-only
  fallback (a type-coloured placeholder with the card name) so missing art is
  visible, not blank.
- **Remove the dead `art` field** in `cards.json` (it references PNGs that
  don't exist) or repurpose it to hold the component name.
- **SC cases:** keep the template approach. Pass a `seed` derived from the case
  id so each case gets its own case number and texture.

---

## 9. Iconography

Replace the rulebook's 11 raster PNGs (256px, baked dark backgrounds) and the
UI's mixed emoji with **one SVG icon set** (`src/ui/icons/`), used in the UI,
in card frames and in the rulebook.

| Concept | Today | Proposal |
|---|---|---|
| Water Rights (track) | ◈ | ◈ in a **track pill** (a filled diamond on a bar) |
| Water Claims (tokens) | ◈ (same glyph!) | Outlined diamond token |
| Water cube | 💧 | Isometric cube, `river` fill |
| Money | $ | Coin with $ |
| PR | ★ | Megaphone or "public eye" glyph. **Stop using ★ for PR** |
| VP | ★ in rulebook milestones (conflict) | Laurel medallion; **only** VP uses it |
| SC influence | ⚖ | Gavel |
| Protest influence | ✊ | Raised fist |
| Exhaust cost | text | Rotated-card glyph |
| N / C sides | text "N ·" / "C ·" | Two badges: **N** = handshake (orange), **C** = water drop (teal) |

Icons are designed on a 24px grid with a 2px stroke, and must stay legible at
14px.

---

## 10. Rework list (priority order)

**P0 — wrong or broken:**
1. **Sneaky Pete:** needs new art. Suggestion: a back-alley fixer pocketing
   cash while water drains from a pipe. Move "The Adjudicator" to an unused
   future lawyer.
2. **Fix the id collisions** (`gA`/`vigA`/`gB`/`vigB`, plus the latent `gC`/`gD`/`vigD`).
3. **Strip baked text** from all 44 pieces. Keep only diegetic signage that
   meets §2.
4. **Show event and SC-case art in the game.** This is UI work, covered in the
   digital plan.

**P1 — duplicates and weak pieces:**
5. **Service Worker A vs. B:** give them distinct scenes. A = the market stall
   (income doubling); B = the community notice board (adds protests).
6. **Protest A vs. B:** two different crowds and colours. B is smaller with
   rust tones; A is a large red march.
7. **Scorched Earth vs. Severe Drought:** these currently share a composition.
   Make Scorched Earth a *human* act: a hand closing a headgate, or burning a
   contract.
8. Redo **Rider of Coat-tails, Team Player, It's a Job, Quid Pro Quo and Donate
   to SC Justice** up to the quality of Activist D and Protest A.
9. **Normalise lawyer series I** (solid bright title bands, patterns) to the
   shared look.

**P2 — consistency pass:**
10. Snap colours to the shared palette, lift the backgrounds, run the squint
    test on every card.
11. Re-tone faction emblems to the §5.3 colours; fix the Fort Mojave name.

---

## 11. Production process

1. **Style tile first.** Redo one card per type (5 cards), approve them, then
   batch the rest.
2. **Each card ships with:** the art JSX, a table-crop screenshot at 110px, an
   enlarged screenshot at 320px, and a squint-test result.
3. **Gallery page** (`/gallery` route, dev only) renders every card at table,
   hover and print sizes side by side on the real UI background, for review.
4. **Print path:** a script renders each SVG at 300 dpi (744 × 1039px plus
   bleed) to PNG/PDF for a print-and-play kit or a manufacturer.
5. **Acceptance checklist per card:**
   - ☐ no baked text (or approved diegetic text)
   - ☐ subject in the focal zone
   - ☐ squint test ≥ 4/5
   - ☐ palette tokens only
   - ☐ namespaced ids
   - ☐ ≤ 120 elements
   - ☐ type accent present
   - ☐ cultural review where it applies
