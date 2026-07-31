import { useState, useRef, useEffect, useMemo } from "react";
import { useGameStore } from "../engine/index.js";
import { isActionPhase, satisfiesPrRequirement, lawyerAcquisitionCost, canAcquireWithPr }
  from "../engine/index.js";
import { useNetStore, controlsSeat } from "../net/netStore.js";
import { CardArtDisplay } from "./CardArt.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// (Fonts are loaded via <link> tags in index.html — no runtime injection.)
// ─────────────────────────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --bg0: #0d0b08; --bg1: #161310; --bg2: #1f1a12; --bg3: #29221a;
        --bg4: #342c20; --bg5: #3f3528;
        --b0: #2a2218; --b1: #3d3326; --b2: #564835; --b3: #7a6248;
        --t1: #ecdec6; --t2: #b09070; --t3: #7a5e40; --t4: #4a3820;
        --gold: #c8a550; --gold-dim: #8a6e30;
        --terra: #c4612a; --terra-dim: #7a3a18;
        --water: #3d8fa8; --water-dim: #1e4f60; --water-bright: #5db8d4;
        --pr-pos: #7eb87e; --pr-neg: #c46060;
        --money: #c8a550; --vp: #d4b060;
        --lawyer: #c8a550; --activist: #7eb87e;
        --citizen: #6b9ec8; --strategy: #a07ec8; --event: #c86060;
      }
      html, body, #root { height: 100%; }
      body { background: var(--bg0); color: var(--t1); font-family: 'EB Garamond', Georgia, serif; overflow: auto; }
      ::-webkit-scrollbar { width: 3px; height: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 2px; }

      .f-display { font-family: 'Playfair Display SC', Georgia, serif; }
      .f-mono    { font-family: 'Courier Prime', 'Courier New', monospace; }
      .f-body    { font-family: 'EB Garamond', Georgia, serif; }

      /* Track cells */
      .tcell {
        width: 26px; height: 26px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Courier Prime', monospace; font-size: 10px;
        color: var(--t4); border: 1px solid var(--b0);
        transition: all 0.18s ease; cursor: default; user-select: none;
      }
      .tcell.ms  { border-color: var(--gold-dim); color: var(--gold-dim); }
      .tcell.thr { border-color: var(--water-dim); color: var(--water-dim); }
      .tcell.cur { background: var(--terra); border-color: var(--terra); color: #fff;
                   font-weight: 700; box-shadow: 0 0 10px rgba(196,97,42,0.55); z-index: 1; }
      .tcell.ms.cur, .tcell.thr.cur { border-color: #fff; }

      /* Water slots */
      .wslot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid var(--water-dim); transition: all 0.2s; }
      .wslot.on { background: var(--water); border-color: var(--water-bright);
                  box-shadow: 0 0 5px rgba(61,143,168,0.6); }

      /* Cards */
      .card-face {
        border: 1px solid var(--b2); background: var(--bg2);
        transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
        cursor: pointer; position: relative;
      }
      .card-face:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.7); border-color: var(--b3); }
      .card-face.exhausted { opacity: 0.38; filter: saturate(0.2); pointer-events: none; }
      .card-face.locked    { opacity: 0.25; filter: saturate(0) sepia(0.4); pointer-events: none; }

      /* Market slot (empty) */
      .market-empty {
        border: 1px dashed var(--b1); display: flex; align-items: center;
        justify-content: center; color: var(--t4); font-size: 11px;
        font-family: 'Courier Prime', monospace; letter-spacing: 0.06em;
      }

      /* Docket case chip */
      .docket-chip {
        border: 1px solid var(--b2); background: var(--bg3); flex-shrink: 0;
        transition: all 0.15s; cursor: default;
      }
      .docket-chip.active { border-color: var(--terra); background: var(--bg4); }

      /* Log entry */
      .log-row { border-left: 2px solid; padding: 5px 8px; animation: slidein 0.2s ease; }
      @keyframes slidein { from { opacity:0; transform: translateX(6px); } to { opacity:1; transform: none; } }

      /* Partnership badge */
      .p-badge { border: 1px solid var(--b2); background: var(--bg3); transition: border-color 0.15s; cursor: pointer; }
      .p-badge:hover { border-color: var(--b3); }
      .p-badge.owned { border-color: var(--gold-dim); }

      /* Phase indicator */
      .phase-pip { width: 8px; height: 8px; border-radius: 1px; background: var(--b2); transition: background 0.3s; }
      .phase-pip.done { background: var(--terra-dim); }
      .phase-pip.active { background: var(--terra); box-shadow: 0 0 6px rgba(196,97,42,0.7); }

      /* Pending effect card */
      .pending-card { border: 1px solid var(--terra-dim); background: var(--bg3); animation: fadein 0.3s ease; }
      @keyframes fadein { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: none; } }

      /* Player tab */
      .player-tab { border-bottom: 2px solid transparent; transition: all 0.15s; cursor: pointer; }
      .player-tab.active { border-color: var(--gold); color: var(--t1); }
      .player-tab:not(.active) { color: var(--t3); }
      .player-tab:not(.active):hover { color: var(--t2); }

      /* Subtle grain */
      .grain { position: relative; }
      .grain::after {
        content: ''; position: absolute; inset: 0; pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.028'/%3E%3C/svg%3E");
        z-index: 100;
      }
    `}</style>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD DEFINITION INDEX
//
// Populated from gameState.cardIndex inside GameTable (useMemo) before any
// child component renders. Components read it as a plain lookup table.
// ─────────────────────────────────────────────────────────────────────────────

let CARD_INDEX = {};


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_ORDER = ["round_setup", "negotiate", "consume", "end_step"];
const PHASE_LABELS = {
  round_setup: "Round Setup", negotiate: "Negotiate",
  consume: "Consume", end_step: "End Step",
};
const CARD_COLORS = {
  lawyer: "var(--lawyer)", activist: "var(--activist)",
  citizen: "var(--citizen)", strategy: "var(--strategy)",
  event: "var(--event)", sc_case: "var(--gold)",
};

// ── Lawyer cost (engine is the source of truth — PR surcharge waived at or
//    beyond the −7 / +8 thresholds, see trackManager.prWaivesSurcharge) ──────
function uiLawyerCost(cardDef, currentPr, pendingDiscount = 0) {
  if (!cardDef) return 0;
  return Math.max(0, lawyerAcquisitionCost(cardDef, currentPr) - pendingDiscount);
}

// Flat per-use fee of the market partnership abilities (RULES §14)
const PARTNERSHIP_ABILITY_FEES = { lawyer: 4, activist: 3 };

// Zoom steps for the PhaseBar zoom control (%; persisted to localStorage)
const ZOOM_STEPS = [60, 70, 80, 90, 100, 110, 125, 150];
const ZOOM_STORAGE_KEY = "lotr-zoom";

const FACTION_COLORS = {
  arizona: "#c4612a", california: "#3d8fa8", nevada: "#c8a550",
  chemehuevi: "#7eb87e", fort_mohave: "#a07ec8", quechan: "#c86060",
};
const LOG_COLORS = {
  phase_start: "var(--b3)", event_revealed: "var(--event)", sc_case_resolved: "var(--gold)",
  track_change: "var(--water)", vp_grant: "var(--vp)", card_acquired: "var(--lawyer)",
  warn: "var(--pr-neg)", error: "var(--pr-neg)", incomplete_project_penalty: "var(--terra-dim)", default: "var(--b2)",
};

// ─────────────────────────────────────────────────────────────────────────────
// TINY UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const px = (n) => `${n}px`;
const S = Object.assign; // style merge shorthand

function Label({ children, style = {} }) {
  return (
    <div className="f-mono" style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--t3)", marginBottom: 6, ...style }}>
      {children}
    </div>
  );
}
function Divider({ style = {} }) {
  return <div style={{ height: 1, background: "var(--b0)", margin: "10px 0", ...style }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK WIDGET
// ─────────────────────────────────────────────────────────────────────────────

function TrackWidget({ track, trackKey, label, icon }) {
  const { value, min, max, vp_milestones = [], threshold_markers = [] } = track;
  const cells = [];
  for (let v = min; v <= max; v++) cells.push(v);

  const milestoneVals  = new Set(vp_milestones.map((m) => m.at));
  const thresholdVals  = new Set(threshold_markers.map((m) => m.at));
  const milestoneLookup = Object.fromEntries(vp_milestones.map((m) => [m.at, m.vp]));

  const accentColor = trackKey === "waterClaimTrack" ? "var(--water)"
    : trackKey === "moneyTrack" ? "var(--money)" : value >= 0 ? "var(--pr-pos)" : "var(--pr-neg)";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span className="f-mono" style={{ fontSize: 11, color: accentColor, letterSpacing: "0.08em" }}>{icon}</span>
        <span className="f-mono" style={{ fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
        <span className="f-mono" style={{ fontSize: 16, color: "var(--t1)", marginLeft: "auto", fontWeight: 700 }}>
          {trackKey === "moneyTrack" ? `$${value}` : value}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {cells.map((v) => {
          const isCur = v === value;
          const isMs  = milestoneVals.has(v);
          const isThr = thresholdVals.has(v);
          const cls   = ["tcell", isCur && "cur", isMs && "ms", isThr && "thr"].filter(Boolean).join(" ");
          return (
            <div key={v} className={cls} title={isMs ? `VP milestone: +${milestoneLookup[v]} VP` : isThr ? "Free lawyer threshold" : undefined}>
              {isCur ? (isMs ? "★" : isThr ? "⚖" : v) : isMs ? "★" : isThr ? "⚖" : v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD FACE
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_ICONS = {
  water_claim: "◈", water_claim_track: "◈", water: "💧", money: "$",
  pr: "★", sc_influence: "⚖", protest_influence: "✊",
};

/**
 * CardFace
 *
 * Read-only by default.  When `interactive` is true the component shows
 * play buttons appropriate for the current phase:
 *   action_n → "Play N" button appears in the N-action panel
 *   action_c → "Play C" button appears in the C-action panel
 *
 * Props
 *   interactive  boolean          — enables play buttons
 *   phase        string           — current game phase (PHASES.*)
 *   prValue      number           — player's current PR (for PR-requirement check)
 *   canPlay      boolean          — false when it's not this player's turn
 *   onPlay       fn(side: 'N'|'C') — called when a play button is clicked
 */
function CardFace({
  cardId,
  exhaustState = "ready",
  width = 130,
  onClick,
  // interactive props
  interactive = false,
  phase,
  prValue,
  canPlay = false,
  onPlay,
}) {
  const def = CARD_INDEX[cardId];
  if (!def) return null;

  const typeColor = CARD_COLORS[def.type] || "var(--t2)";
  const exhausted = exhaustState === "exhausted";
  const locked    = exhaustState === "locked";
  const disabled  = exhausted || locked || !canPlay;

  // PR requirement gates ACQUISITION only — the badge below is informational,
  // it never blocks using a card already in the tableau (RULES §7).
  const prOk = satisfiesPrRequirement(def.pr_requirement, prValue ?? 0);
  const cardDisabled = disabled;

  const cls = ["card-face", exhausted && "exhausted", locked && "locked"].filter(Boolean).join(" ");

  // Which side button to show
  const showN = interactive && phase === "negotiate" && !!def.actions?.N;
  const showC = interactive && phase === "consume"  && !!def.actions?.C;

  function PlayBtn({ side }) {
    const sideDisabled = cardDisabled;
    const label = `Play ${side}`;
    const hoverColor = side === "N" ? "var(--terra)" : "var(--water)";
    return (
      <button
        disabled={sideDisabled}
        title={
          locked    ? "Card is locked (Red Herring)" :
          exhausted ? "Card already used this round" :
          !canPlay  ? "Not your turn" :
          undefined
        }
        onClick={e => { e.stopPropagation(); if (!sideDisabled && onPlay) onPlay(side); }}
        onMouseEnter={e => { if (!sideDisabled) e.currentTarget.style.background = hoverColor + "22"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        style={{
          marginTop: 4,
          width: "100%",
          padding: "3px 0",
          background: "transparent",
          border: `1px solid ${sideDisabled ? "var(--b1)" : hoverColor}`,
          borderRadius: 2,
          color: sideDisabled ? "var(--t4)" : hoverColor,
          fontFamily: "'Courier Prime', 'Courier New', monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: sideDisabled ? "not-allowed" : "pointer",
          opacity: sideDisabled ? 0.45 : 1,
          transition: "all 0.12s",
        }}>
        {label}
      </button>
    );
  }

  return (
    <div className={cls} style={{ width, borderRadius: 3 }} onClick={onClick}>
      {/* Header */}
      <div style={{ background: "var(--bg3)", padding: "5px 7px", borderBottom: "1px solid var(--b1)",
          display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: 1, background: typeColor, flexShrink: 0 }} />
        <span className="f-display" style={{ fontSize: 9, color: "var(--t1)", lineHeight: 1.2, flex: 1 }}>{def.name}</span>
        {def.cost != null && (
          <span className="f-mono" style={{ fontSize: 9, color: "var(--gold)" }}>${def.cost}</span>
        )}
        {def.vp != null && def.vp > 0 && (
          <span className="f-mono" style={{ fontSize: 9, color: "var(--vp)" }}>{def.vp}vp</span>
        )}
      </div>

      {/* PR requirement badge */}
      {def.pr_requirement && (
        <div style={{ padding: "2px 7px", background: "var(--bg4)", borderBottom: "1px solid var(--b1)" }}>
          <span className="f-mono" style={{ fontSize: 9, color: prOk ? "var(--t3)" : "var(--pr-neg)" }}>
            PR {def.pr_requirement.operator === "gte" ? "≥" : "≤"} {def.pr_requirement.value}
            {!prOk && " ✗"}
          </span>
        </div>
      )}

      {/* Passive */}
      {def.passive && (
        <div style={{ padding: "4px 7px", background: "var(--bg4)", borderBottom: "1px solid var(--b1)" }}>
          <span className="f-body" style={{ fontSize: 9, color: "var(--gold)", fontStyle: "italic" }}>
            ◆ {def.passive.text}
          </span>
        </div>
      )}

      {/* Card art illustration */}
      <CardArtDisplay cardId={cardId} style={{
        height: 72,
        borderBottom: "1px solid var(--b0)",
        opacity: (exhausted || locked) ? 0.35 : 1,
        transition: "opacity 0.2s",
      }} />

      {/* N action */}
      {def.actions?.N ? (
        <div style={{
          padding: "5px 7px",
          borderBottom: def.actions?.C ? "1px solid var(--b0)" : "none",
          minHeight: 36,
          background: showN ? "var(--bg3)" : undefined,
        }}>
          <div className="f-mono" style={{ fontSize: 9, color: showN ? "var(--terra)" : "var(--t3)", marginBottom: 2 }}>N ·</div>
          <div className="f-body" style={{ fontSize: 10, color: "var(--t2)", lineHeight: 1.35 }}>
            {def.actions.N.icon && <span style={{ marginRight: 3 }}>{ACTION_ICONS[def.actions.N.icon] || def.actions.N.icon}</span>}
            {def.actions.N.text}
          </div>
          {showN && <PlayBtn side="N" />}
        </div>
      ) : (
        <div style={{ padding: "5px 7px", borderBottom: def.actions?.C ? "1px solid var(--b0)" : "none", minHeight: 36 }}>
          <div className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>N · —</div>
        </div>
      )}

      {/* C action */}
      {def.actions?.C && (
        <div style={{
          padding: "5px 7px",
          minHeight: 36,
          background: showC ? "var(--bg3)" : undefined,
        }}>
          <div className="f-mono" style={{ fontSize: 9, color: showC ? "var(--water)" : "var(--t3)", marginBottom: 2 }}>C ·</div>
          <div className="f-body" style={{ fontSize: 10, color: "var(--t2)", lineHeight: 1.35 }}>
            {def.actions.C.icon && <span style={{ marginRight: 3 }}>{ACTION_ICONS[def.actions.C.icon] || def.actions.C.icon}</span>}
            {def.actions.C.text}
          </div>
          {showC && <PlayBtn side="C" />}
        </div>
      )}

      {/* Exhaust state indicator */}
      <div style={{ height: 3, background: exhausted ? "var(--b1)" : locked ? "var(--terra-dim)" : typeColor, opacity: exhausted ? 1 : 0.5 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET GRID (lawyer / activist)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MarketGrid
 *
 * Interactive props (only when a player is active in an action phase):
 *   isActivePlayer  boolean
 *   phase           string
 *   marketType      'lawyer' | 'activist'
 *   activePlayer    full player state (for PR, money, partnerships, pendingLawyerDiscount)
 *   partnershipFlow pending_partnership_acquire effect open for activePlayer, or null.
 *                   While open, the flat ability fee is shown as the price.
 *   onAcquire       fn(marketIndex)
 */
function MarketGrid({
  slots, label, deckCount,
  isActivePlayer = false, phase, marketType, activePlayer, partnershipFlow = null, onAcquire,
}) {
  const inActionPhase = phase === 'negotiate' || phase === 'consume';
  const showButtons   = isActivePlayer && inActionPhase && !!activePlayer;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <Label style={{ margin: 0 }}>{label}</Label>
        {showButtons && marketType === "lawyer" && (activePlayer?.pendingLawyerDiscount ?? 0) > 0 && (
          <span className="f-mono" style={{
            fontSize: 9, color: "var(--gold)",
            padding: "1px 6px", border: "1px solid var(--gold-dim)",
            borderRadius: 2, marginLeft: 6,
          }}>
            −${activePlayer.pendingLawyerDiscount} discount active
          </span>
        )}
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)", marginLeft: "auto" }}>
          deck: {deckCount}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {slots.map((cardId, i) => {
          if (!cardId) {
            return (
              <div key={i} className="market-empty" style={{ height: 72, borderRadius: 3, fontSize: 10 }}>
                Empty
              </div>
            );
          }

          let canAcquire = false;
          let cost       = 0;
          let reason     = '';

          if (showButtons && marketType === 'lawyer') {
            const cardDef = CARD_INDEX[cardId];
            const pr      = activePlayer.prTrack?.value ?? 0;
            const money   = activePlayer.moneyTrack?.value ?? 0;
            const disc    = activePlayer.pendingLawyerDiscount ?? 0;
            // Law Firm flow open → flat ability fee (minus Team Player discount)
            cost = partnershipFlow
              ? Math.max(0, PARTNERSHIP_ABILITY_FEES.lawyer - disc)
              : uiLawyerCost(cardDef, pr, disc);
            const prOk = canAcquireWithPr(cardDef, pr);
            if (!prOk)             { reason = 'PR req not met'; }
            else if (money < cost) { reason = `Need $${cost}`; }
            else                   { canAcquire = true; }
          }

          if (showButtons && marketType === 'activist') {
            const hasBusiness = activePlayer.partnerships?.business;
            const money       = activePlayer.moneyTrack?.value ?? 0;
            cost = PARTNERSHIP_ABILITY_FEES.activist;
            if (!hasBusiness)      { reason = 'Need Business'; }
            else if (money < cost) { reason = `Need $${cost}`; }
            else                   { canAcquire = true; }
          }

          const accentColor = marketType === 'lawyer' ? 'var(--lawyer)' : 'var(--activist)';

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <CardFace cardId={cardId} width="100%" />
              {showButtons && (
                <button
                  disabled={!canAcquire}
                  onClick={() => canAcquire && onAcquire?.(i)}
                  title={canAcquire ? `Acquire for $${cost}` : reason || `$${cost}`}
                  onMouseEnter={e => { if (canAcquire) e.currentTarget.style.background = accentColor + '22'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    background:    'transparent',
                    border:        `1px solid ${canAcquire ? accentColor : 'var(--b1)'}`,
                    borderRadius:  2,
                    color:         canAcquire ? accentColor : 'var(--t4)',
                    fontFamily:    "'Courier Prime', monospace",
                    fontSize:      10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding:       '2px 0',
                    width:         '100%',
                    cursor:        canAcquire ? 'pointer' : 'not-allowed',
                    opacity:       canAcquire ? 1 : 0.45,
                    transition:    'all 0.12s',
                  }}>
                  {canAcquire ? `Acquire  $${cost}` : reason || `$${cost}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCKET QUEUE
// ─────────────────────────────────────────────────────────────────────────────

function DocketQueue({ docket, scInfluenceByPlayer, playerOrder, players }) {
  return (
    <div>
      <Label>Docket</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {docket.map((caseId, idx) => {
          const cDef = CARD_INDEX[caseId];
          const isActive = idx === 0;
          return (
            <div key={caseId} className={`docket-chip ${isActive ? "active" : ""}`}
              style={{ padding: "5px 8px", borderRadius: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span className="f-mono" style={{ fontSize: 9, color: isActive ? "var(--terra)" : "var(--t4)" }}>
                  {isActive ? "▶" : `${idx + 1}.`}
                </span>
                <span className="f-display" style={{ fontSize: 9, color: isActive ? "var(--t1)" : "var(--t2)" }}>
                  {cDef?.name || caseId}
                </span>
              </div>
              {/* Influence summary */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {playerOrder.map((pid) => {
                  const inf = players[pid].scInfluence?.[caseId] ?? 0;
                  if (inf === 0) return null;
                  return (
                    <span key={pid} className="f-mono" style={{ fontSize: 9, color: FACTION_COLORS[players[pid].factionId] || "var(--t3)" }}>
                      {players[pid].name.slice(0, 3).toUpperCase()}: {inf}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT ROW
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_DEFS = {
  citizen: [
    { id: "farm",         label: "Farm",         icon: "🌾", slots: 6, reward: "+4 PR · +Farmer",        rewardColor: "var(--pr-pos)" },
    { id: "housing",      label: "Housing",       icon: "🏘", slots: 4, reward: "+2 PR · +Svc Worker",    rewardColor: "var(--pr-pos)" },
    { id: "firefighting", label: "Firefighting",  icon: "🔥", slots: 2, reward: "+1 PR · +Firefighter",   rewardColor: "var(--pr-pos)" },
  ],
  income: [
    { id: "factory",    label: "Factory",    icon: "🏭", slots: 6, reward: "+$5 / −3 PR",  rewardColor: "var(--money)" },
    { id: "vineyard",   label: "Vineyard",   icon: "🍇", slots: 4, reward: "+$3 / −2 PR",  rewardColor: "var(--money)" },
    { id: "recreation", label: "Recreation", icon: "⛳", slots: 2, reward: "+$1 / −1 PR",  rewardColor: "var(--money)" },
  ],
};

function ProjectGroup({ type, projects, isActivePlayer=false, phase, waterClaims=0, waterSupply=0, onPlaceWater }) {
  const defs = PROJECT_DEFS[type];
  const label = type === "citizen" ? "Citizen Projects" : "Income Projects";
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {defs.map((def) => {
          const proj      = projects[type]?.[def.id] || { watered: 0 };
          const isFull    = proj.watered >= def.slots;
          // Started but not complete — water carries over but costs −1 water claim at end of Income phase
          const isPartial = proj.watered > 0 && !isFull;
          const borderColor = isFull ? "var(--water-dim)" : isPartial ? "var(--terra-dim)" : "var(--b0)";
          const bgColor     = isFull ? "var(--bg4)"      : isPartial ? "var(--bg3)"       : "var(--bg3)";
          return (
            <div key={def.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                background: bgColor, border: `1px solid ${borderColor}`,
                borderRadius: 2, transition: "all 0.2s" }}>
              <span style={{ fontSize: 12 }}>{def.icon}</span>
              <span className="f-body" style={{ fontSize: 11, color: "var(--t2)", minWidth: 72 }}>{def.label}</span>
              <div style={{ display: "flex", gap: 3, flex: 1 }}>
                {Array.from({ length: def.slots }).map((_, i) => (
                  <div key={i} className={`wslot ${i < proj.watered ? "on" : ""}`} />
                ))}
              </div>
              <span className="f-mono" style={{ fontSize: 9, color: def.rewardColor }}>{def.reward}</span>
              {isFull && <span className="f-mono" style={{ fontSize: 9, color: "var(--water-bright)" }}>✓</span>}
              {isPartial && !isFull && (
                <span className="f-mono"
                  title="Partial — you will lose 1 Water Rights at End Step"
                  style={{ fontSize: 9, color: "var(--terra)", cursor: "default" }}>−◈</span>
              )}
              {isActivePlayer && phase === "consume" && !isFull && waterClaims > 0 && waterSupply > 0 && (
                <button
                  onClick={() => onPlaceWater?.(type, def.id)}
                  onMouseEnter={e => { e.currentTarget.style.background="var(--water)33"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
                  title="Spend 1 water claim to place 1 water here"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--water-bright)",
                    borderRadius: 2, color: "var(--water-bright)",
                    fontFamily: "'Courier Prime',monospace",
                    fontSize: 10, padding: "1px 7px",
                    cursor: "pointer", transition: "all 0.12s",
                    flexShrink: 0,
                  }}>
                  +◈
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNERSHIPS + WATER BANK
// ─────────────────────────────────────────────────────────────────────────────

const PARTNERSHIP_DEFS = [
  { id: "law_firm",   label: "Law Firm",   icon: "⚖",  buyCost: 4, ability: "Pay $4 → Acquire 1 Lawyer" },
  { id: "business",   label: "Business",   icon: "🤝", buyCost: 3, ability: "Pay $3 → Acquire 1 Activist" },
  { id: "investment", label: "Investment", icon: "📈", buyCost: 2, ability: "Pay $2 → Gain 1 PR" },
];

/**
 * PartnershipsRow
 *
 * Extra props for interactive mode:
 *   isActivePlayer   boolean
 *   money            number — player's current money (for affordability check)
 *   onBuy            fn(partnershipId)
 *   onUse            fn(partnershipId)
 */
function PartnershipsRow({ partnerships, isActivePlayer = false, money = 0, pendingLawyerDiscount = 0, onBuy, onUse }) {
  return (
    <div>
      <Label>Partnerships</Label>
      {pendingLawyerDiscount > 0 && (
        <div className="f-mono" style={{
          fontSize: 9, color: "var(--gold)", padding: "2px 8px",
          border: "1px solid var(--gold-dim)", borderRadius: 2,
          marginBottom: 5, letterSpacing: "0.08em",
        }}>
          ⚡ Next lawyer −${pendingLawyerDiscount} (Team Player)
        </div>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        {PARTNERSHIP_DEFS.map((p) => {
          const owned       = partnerships[p.id];
          const canAffordBuy = money >= p.buyCost;
          const canAffordUse = money >= p.buyCost; // ability cost = same value

          return (
            <div key={p.id} className={`p-badge ${owned ? "owned" : ""}`}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 2, textAlign: "center" }}>
              <div style={{ fontSize: 14, marginBottom: 3 }}>{p.icon}</div>
              <div className="f-display" style={{
                fontSize: 9, marginBottom: 2,
                color: owned ? "var(--gold)" : "var(--t3)",
              }}>{p.label}</div>
              <div className="f-mono" style={{ fontSize: 9, color: owned ? "var(--t2)" : "var(--t4)", marginBottom: 4 }}>
                {owned ? p.ability : `Buy: $${p.buyCost}`}
              </div>

              {isActivePlayer && !owned && (
                <button
                  disabled={!canAffordBuy}
                  onClick={() => onBuy?.(p.id)}
                  onMouseEnter={e => { if (canAffordBuy) e.currentTarget.style.background = "var(--gold)22"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  title={canAffordBuy ? `Buy ${p.label} for $${p.buyCost}` : `Need $${p.buyCost}`}
                  style={{
                    width: "100%", padding: "3px 0",
                    background: "transparent",
                    border: `1px solid ${canAffordBuy ? "var(--gold)" : "var(--b1)"}`,
                    borderRadius: 2,
                    color: canAffordBuy ? "var(--gold)" : "var(--t4)",
                    fontFamily: "'Courier Prime', monospace", fontSize: 10,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    cursor: canAffordBuy ? "pointer" : "not-allowed",
                    opacity: canAffordBuy ? 1 : 0.45,
                    transition: "all 0.12s",
                  }}>
                  Buy
                </button>
              )}

              {isActivePlayer && owned && (
                <button
                  disabled={!canAffordUse}
                  onClick={() => onUse?.(p.id)}
                  onMouseEnter={e => { if (canAffordUse) e.currentTarget.style.background = "var(--gold)22"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  title={canAffordUse ? `Use ${p.label} ability ($${p.buyCost})` : `Need $${p.buyCost}`}
                  style={{
                    width: "100%", padding: "3px 0",
                    background: "transparent",
                    border: `1px solid ${canAffordUse ? "var(--gold-dim)" : "var(--b1)"}`,
                    borderRadius: 2,
                    color: canAffordUse ? "var(--gold)" : "var(--t4)",
                    fontFamily: "'Courier Prime', monospace", fontSize: 10,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    cursor: canAffordUse ? "pointer" : "not-allowed",
                    opacity: canAffordUse ? 1 : 0.45,
                    transition: "all 0.12s",
                  }}>
                  Use
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * WaterBankWidget
 *
 * Extra props for interactive mode:
 *   isActivePlayer   boolean — is the viewed player the active player?
 *   player           object  — the full player state (for money + cubes)
 *   allPlayers       object  — { [pid]: playerState } (to find other unlocked banks)
 *   playerOrder      string[]
 *   onUnlock         fn()
 *   onDeposit        fn(ownerId, count)
 *   onWithdraw       fn(count)
 */
function WaterBankWidget({
  waterBank, isActivePlayer = false, player, allPlayers = {}, playerOrder = [],
  onUnlock, onDeposit, onWithdraw,
}) {
  const { unlocked, stored } = waterBank;
  const canAffordUnlock = (player?.moneyTrack?.value ?? 0) >= 8;
  const canWithdraw     = unlocked && stored > 0;

  // ANY unlocked bank accepts deposits — including the depositor's own
  // (RULES §15: ANY player may deposit, paying the owner $1 per cube)
  const depositBanks = playerOrder
    .filter(pid => allPlayers[pid]?.waterBank?.unlocked)
    .map(pid => allPlayers[pid]);

  return (
    <div style={{
      minWidth: 160, padding: "8px 10px",
      border: `1px solid ${unlocked ? "var(--water-dim)" : "var(--b0)"}`,
      borderRadius: 2, background: unlocked ? "var(--bg3)" : "var(--bg2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: unlocked ? 6 : 0 }}>
        <span style={{ fontSize: 14 }}>🏦</span>
        <div style={{ flex: 1 }}>
          <div className="f-display" style={{ fontSize: 9, color: unlocked ? "var(--water)" : "var(--t4)" }}>
            Water Bank
          </div>
          <div className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>
            {unlocked ? `${stored}/9 stored` : "$8 to unlock"}
          </div>
        </div>
      </div>

      {/* Slot dots */}
      {unlocked && (
        <div style={{ display: "flex", gap: 2, marginBottom: 6, flexWrap: "wrap" }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`wslot ${i < stored ? "on" : ""}`} style={{ width: 10, height: 10 }} />
          ))}
        </div>
      )}

      {/* Buttons for active player */}
      {isActivePlayer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {!unlocked && (
            <button
              disabled={!canAffordUnlock}
              onClick={onUnlock}
              title={canAffordUnlock ? "Unlock your water bank for $8" : "Need $8 to unlock"}
              onMouseEnter={e => { if (canAffordUnlock) e.currentTarget.style.background = "var(--water)22"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={miniBtn(canAffordUnlock ? "var(--water)" : null)}>
              Unlock ($8)
            </button>
          )}

          {unlocked && canWithdraw && (
            <button
              onClick={() => onWithdraw?.(stored)}
              title={`Withdraw all ${stored} cube(s) for free`}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--water)22"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={miniBtn("var(--water-bright)")}>
              Withdraw All
            </button>
          )}

          {/* Deposit 1 cube for $1 into any unlocked bank (own bank included) */}
          {depositBanks.map(owner => {
            const isOwn      = owner.id === player?.id;
            const hasSpace   = owner.waterBank.stored < 9;
            const canDeposit = hasSpace
              && (player?.waterCubes ?? 0) >= 1
              && (player?.moneyTrack?.value ?? 0) >= 1;
            const reason = !hasSpace ? "Bank is full"
              : (player?.waterCubes ?? 0) < 1 ? "Need 1 water cube"
              : "Need $1";
            return (
              <button
                key={owner.id}
                disabled={!canDeposit}
                onClick={() => canDeposit && onDeposit?.(owner.id, 1)}
                title={canDeposit
                  ? `Deposit 1 cube into ${isOwn ? "your own" : `${owner.name}'s`} bank ($1)`
                  : reason}
                onMouseEnter={e => { if (canDeposit) e.currentTarget.style.background = "var(--water)11"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                style={miniBtn(canDeposit ? "var(--water-dim)" : null)}>
                +1 → {isOwn ? "own bank" : owner.name.slice(0, 6)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Shared mini-button style for WaterBankWidget */
function miniBtn(color) {
  const c = color || "var(--b1)";
  return {
    width: "100%", padding: "2px 0",
    background: "transparent",
    border: `1px solid ${c}`,
    borderRadius: 2, color: c,
    fontFamily: "'Courier Prime', monospace",
    fontSize: 10, letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: color ? "pointer" : "not-allowed",
    opacity: color ? 1 : 0.4,
    transition: "all 0.12s",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER BOARD  (center panel)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PlayerBoard
 *
 * Extra props for interactive mode:
 *   isActivePlayer  boolean      — this player is active AND this client controls the seat
 *   phase           string
 *   activeCaseId    string|null  — docket[0], for SC influence buttons
 *   allPlayers      object       — full players map (for water bank deposits)
 *   playerOrder     string[]
 *   onPlayCard      fn(cardId, side, instanceId)
 *   onBuyPartnership   fn(partnershipId)
 *   onUsePartnership   fn(partnershipId)
 *   onUnlockBank       fn()
 *   onDeposit          fn(ownerId, count)
 *   onWithdraw         fn(count)
 *   onPlaceScInfluence fn(caseId, amount)
 */
function PlayerBoard({
  player, isActivePlayer = false, phase,
  activeCaseId, allPlayers = {}, playerOrder = [],
  waterSupply = 0,
  onPlayCard,
  onBuyPartnership, onUsePartnership,
  onUnlockBank, onDeposit, onWithdraw,
  onPlaceScInfluence,
  onPlaceWater,
}) {
  const fColor  = FACTION_COLORS[player.factionId] || "var(--terra)";
  const prValue = player.prTrack?.value ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 10,
          borderBottom: "1px solid var(--b1)" }}>
        <div style={{ width: 10, height: 10, borderRadius: 1, background: fColor, flexShrink: 0 }} />
        <span className="f-display" style={{ fontSize: 15, color: "var(--t1)", letterSpacing: "0.05em" }}>{player.name}</span>
        <span className="f-mono" style={{ fontSize: 10, color: "var(--vp)", marginLeft: 4 }}>{player.vp} VP</span>
        {(player.protestInfluence ?? 0) > 0 && (
          <span className="f-mono" title="Protest influence this round"
            style={{ fontSize: 9, color: "var(--activist)", padding: "1px 5px",
              border: "1px solid var(--activist)", borderRadius: 2 }}>
            ✊{player.protestInfluence}
          </span>
        )}
        {player.workaholicActive && (
          <span className="f-mono" title="Workaholic active — next +1 water becomes +2"
            style={{ fontSize: 9, color: "var(--water)", padding: "1px 5px",
              border: "1px solid var(--water)", borderRadius: 2 }}>
            ⚡×2💧
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {(player.waterClaims ?? 0) > 0 && (
            <span className="f-mono"
              title={`${player.waterClaims} water claim token(s) to spend this round`}
              style={{ fontSize: 10, color: "var(--water-bright)",
                border: "1px solid var(--water-bright)", borderRadius: 2,
                padding: "1px 5px" }}>
              ◈×{player.waterClaims}
            </span>
          )}
          <span style={{ fontSize: 11 }}>💧</span>
          <span className="f-mono" style={{ fontSize: 13, color: "var(--water)" }}>{player.waterCubes}</span>
        </div>
      </div>

      {/* Tracks */}
      <div>
        <TrackWidget track={player.waterClaimTrack} trackKey="waterClaimTrack" label="Water Claim" icon="◈" />
        <TrackWidget track={player.moneyTrack}      trackKey="moneyTrack"      label="Money"       icon="$" />
        <TrackWidget track={player.prTrack}         trackKey="prTrack"         label="PR"          icon="★" />
      </div>

      <Divider />

      {/* Projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ProjectGroup type="citizen" projects={player.projects}
          isActivePlayer={isActivePlayer} phase={phase}
          waterClaims={player.waterClaims ?? 0}
          waterSupply={waterSupply}
          onPlaceWater={onPlaceWater} />
        <ProjectGroup type="income"  projects={player.projects}
          isActivePlayer={isActivePlayer} phase={phase}
          waterClaims={player.waterClaims ?? 0}
          waterSupply={waterSupply}
          onPlaceWater={onPlaceWater} />
      </div>

      <Divider />

      {/* Partnerships + Bank */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
        <PartnershipsRow
          partnerships={player.partnerships}
          isActivePlayer={isActivePlayer}
          money={player.moneyTrack?.value ?? 0}
          pendingLawyerDiscount={player.pendingLawyerDiscount ?? 0}
          onBuy={onBuyPartnership}
          onUse={onUsePartnership}
        />
        <WaterBankWidget
          waterBank={player.waterBank}
          isActivePlayer={isActivePlayer}
          player={player}
          allPlayers={allPlayers}
          playerOrder={playerOrder}
          onUnlock={onUnlockBank}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
        />
      </div>

      {/* SC Influence — shown in action phases when there's an active case */}
      {activeCaseId && isActivePlayer && (phase === "negotiate" || phase === "consume") && (
        <>
          <Divider />
          <div>
            <Label>SC Influence</Label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px",
              border: "1px solid var(--b1)",
              borderRadius: 2, background: "var(--bg3)",
            }}>
              <span style={{ fontSize: 11 }}>⚖</span>
              <span className="f-body" style={{ fontSize: 11, color: "var(--t2)", flex: 1 }}>
                {activeCaseId.replace(/_/g, " ")}
              </span>
              <span className="f-mono" style={{ fontSize: 12, color: "var(--gold)" }}>
                {player.scInfluence?.[activeCaseId] ?? 0}
              </span>
              <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>influence</span>
              <button
                disabled={(player.waterCubes ?? 0) < 1}
                onClick={() => onPlaceScInfluence?.(activeCaseId, 1)}
                title="Place 1 SC influence (costs 1 water cube)"
                onMouseEnter={e => { if ((player.waterCubes ?? 0) >= 1) e.currentTarget.style.background = "var(--gold)22"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                style={{
                  background: "transparent",
                  border: `1px solid ${(player.waterCubes ?? 0) >= 1 ? "var(--gold)" : "var(--b1)"}`,
                  borderRadius: 2,
                  color: (player.waterCubes ?? 0) >= 1 ? "var(--gold)" : "var(--t4)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 10px",
                  cursor: (player.waterCubes ?? 0) >= 1 ? "pointer" : "not-allowed",
                  opacity: (player.waterCubes ?? 0) >= 1 ? 1 : 0.4,
                  transition: "all 0.12s",
                }}>
                +1 (💧)
              </button>
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* Tableau */}
      {player.tableau.length > 0 && (
        <div>
          <Label>Tableau</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {player.tableau.map((instance) => (
              <CardFace
                key={instance.instanceId}
                cardId={instance.cardId}
                exhaustState={instance.exhaustState}
                width={130}
                interactive={isActivePlayer && (phase === "negotiate" || phase === "consume")}
                phase={phase}
                prValue={prValue}
                canPlay={isActivePlayer}
                onPlay={(side) => onPlayCard?.(instance.cardId, side, instance.instanceId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY HAND  (bottom strip)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StrategyHand
 *
 * Renders strategy cards held in the viewed player's hand.
 * Side-aware: a "Play N" button appears in Negotiate only for cards with an
 * N action; "Play C" in Consume only for cards with a C action (cards.json is
 * the source of truth — most strategy cards are N-only, water_bribe is C-only).
 *
 * Props
 *   hand             string[]           — array of cardIds
 *   isActivePlayer   boolean            — viewed player is active AND controlled by this client
 *   showFaces        boolean            — false → render face-down backs (online hidden info)
 *   phase            string
 *   waterCubes       number             — viewed player's cubes (water_bribe gating)
 *   onPlayStrategy   fn(cardId, side)   — plays the card on the given side
 */
function StrategyHand({ hand, isActivePlayer = false, showFaces = true, phase, waterCubes = 0, onPlayStrategy }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 16px",
        background: "var(--bg1)", borderTop: "1px solid var(--b0)", minHeight: 72, overflowX: "auto" }}>
      <div style={{ marginRight: 4, flexShrink: 0 }}>
        <Label style={{ marginBottom: 2 }}>Hand</Label>
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>{hand.length} card{hand.length !== 1 ? "s" : ""}</span>
      </div>
      {hand.length === 0 ? (
        <span className="f-mono" style={{ fontSize: 10, color: "var(--t4)" }}>— no strategy cards —</span>
      ) : !showFaces ? (
        // Hidden information (online play): face-down backs + count only
        hand.map((_, i) => (
          <div key={i} style={{
            width: 120, height: 64, flexShrink: 0, borderRadius: 3,
            border: "1px solid var(--b2)", background: "var(--bg3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="f-display" style={{ fontSize: 10, color: "var(--t4)", letterSpacing: "0.12em" }}>
              ◆ ◆ ◆
            </span>
          </div>
        ))
      ) : (
        hand.map((cardId, i) => {
          const def  = CARD_INDEX[cardId];
          const side = phase === "negotiate" ? "N" : phase === "consume" ? "C" : null;
          const hasAction = side && !!def?.actions?.[side];
          // water_bribe C: needs a cube to give away
          const needsCube  = cardId === "water_bribe" && side === "C" && waterCubes < 1;
          const canPlay    = isActivePlayer && hasAction && !needsCube;
          const showButton = isActivePlayer && hasAction;
          return (
            <div key={`${cardId}_${i}`} style={{ position: "relative", flexShrink: 0 }}>
              <CardFace cardId={cardId} exhaustState="ready" width={120} />
              {showButton && (
                <button
                  disabled={!canPlay}
                  title={needsCube ? "Needs 1 water cube" : `Play ${side}-side action`}
                  onClick={() => canPlay && onPlayStrategy?.(cardId, side)}
                  onMouseEnter={e => { if (canPlay) e.currentTarget.style.background = "var(--strategy)22"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  style={{
                    marginTop: 3,
                    width: "100%",
                    padding: "3px 0",
                    background: "transparent",
                    border: `1px solid ${canPlay ? "var(--strategy)" : "var(--b1)"}`,
                    borderRadius: 2,
                    color: canPlay ? "var(--strategy)" : "var(--t4)",
                    fontFamily: "'Courier Prime', 'Courier New', monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: canPlay ? "pointer" : "not-allowed",
                    opacity: canPlay ? 1 : 0.45,
                    transition: "all 0.12s",
                  }}>
                  Play {side}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE BAR  (top)
// ─────────────────────────────────────────────────────────────────────────────

function PhaseBar({ state, activePlayer, canUndo, canRedo, onUndo, onRedo,
    mode = "local", roomCode = null, guestConnected = true,
    zoom = 100, onZoomIn, onZoomOut, children }) {
  const phaseIdx = PHASE_ORDER.indexOf(state.phase);
  const fColor   = FACTION_COLORS[activePlayer?.factionId] || "var(--terra)";

  const zoomBtn = (enabled) => ({
    background: "transparent", border: "1px solid var(--b2)", borderRadius: 2,
    color: enabled ? "var(--t2)" : "var(--t4)",
    fontFamily: "'Courier Prime', monospace", fontSize: 11, lineHeight: 1,
    width: 20, height: 20, padding: 0,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.4, transition: "all 0.12s",
  });

  return (
    <div style={{ height: 44, background: "var(--bg1)", borderBottom: "1px solid var(--b0)",
        display: "flex", alignItems: "center", paddingInline: 16, gap: 16, flexShrink: 0 }}>

      {/* Game title */}
      <span className="f-display" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
        Law of the River
      </span>

      {/* Room code chip (online play) */}
      {mode !== "local" && roomCode && (
        <span className="f-mono" title={mode === "host" ? "You are hosting this room" : "Connected room"}
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.12em",
            border: "1px solid var(--gold-dim)", borderRadius: 2, padding: "2px 7px",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          ROOM {roomCode}
          {mode === "guest" && (
            <span title={guestConnected ? "Connected to host" : "Disconnected from host"}
              style={{ width: 6, height: 6, borderRadius: "50%",
                background: guestConnected ? "var(--pr-pos)" : "var(--pr-neg)",
                boxShadow: `0 0 5px ${guestConnected ? "var(--pr-pos)" : "var(--pr-neg)"}` }} />
          )}
        </span>
      )}

      <div style={{ width: 1, height: 20, background: "var(--b1)" }} />

      {/* Round counter */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Round</span>
        <span className="f-mono" style={{ fontSize: 16, color: "var(--t1)", fontWeight: 700, lineHeight: 1 }}>{state.round}</span>
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>/10</span>
      </div>

      {/* Phase pips */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {PHASE_ORDER.map((ph, i) => (
          <div key={ph} title={PHASE_LABELS[ph]}
            className={`phase-pip ${i < phaseIdx ? "done" : i === phaseIdx ? "active" : ""}`} />
        ))}
        <span className="f-mono" style={{ fontSize: 10, color: "var(--terra)", marginLeft: 6, letterSpacing: "0.1em" }}>
          {PHASE_LABELS[state.phase] || state.phase}
        </span>
      </div>

      {/* Active player */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: 1, background: fColor,
            boxShadow: `0 0 8px ${fColor}88`, animation: "pulsedot 2s ease-in-out infinite" }} />
        <span className="f-body" style={{ fontSize: 12, color: "var(--t1)", fontStyle: "italic" }}>
          {activePlayer?.name}’s turn
        </span>
        <style>{`@keyframes pulsedot { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
      </div>

      {/* Phase controls (Pass / Advance) + zoom */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {/* Zoom control */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, marginRight: 4 }}>
          <button
            title="Zoom out"
            disabled={zoom <= ZOOM_STEPS[0]}
            onClick={onZoomOut}
            style={zoomBtn(zoom > ZOOM_STEPS[0])}>
            −
          </button>
          <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", minWidth: 30, textAlign: "center" }}>
            {zoom}%
          </span>
          <button
            title="Zoom in"
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            onClick={onZoomIn}
            style={zoomBtn(zoom < ZOOM_STEPS[ZOOM_STEPS.length - 1])}>
            +
          </button>
        </div>
        {canUndo && (
          <button
            onClick={onUndo}
            title="Undo last action"
            onMouseEnter={e => { e.currentTarget.style.background = "var(--b2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            style={{
              background: "transparent", border: "1px solid var(--b2)",
              borderRadius: 2, color: "var(--t3)",
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "3px 10px", cursor: "pointer", transition: "all 0.12s",
            }}>
            ↩ Undo
          </button>
        )}
        {canRedo && (
          <button
            onClick={onRedo}
            title="Redo last undone action"
            onMouseEnter={e => { e.currentTarget.style.background = "var(--b2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            style={{
              background: "transparent", border: "1px solid var(--b2)",
              borderRadius: 2, color: "var(--t3)",
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "3px 10px", cursor: "pointer", transition: "all 0.12s",
            }}>
            Redo ↪
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION LOG  (right panel)
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ActionLog({ log, pendingEffects, onCancelPartnership, canControl = () => true }) {
  const logRef = useRef(null);
  // Entries render newest-first, so new activity appears at the TOP
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Pending effects */}
      {pendingEffects.length > 0 && (
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--b0)", flexShrink: 0 }}>
          <Label>Awaiting Input</Label>
          {pendingEffects.map((e, i) => {
            const isPartnershipAcquire = e.type === "pending_partnership_acquire";
            const accentColor = isPartnershipAcquire ? "var(--gold)" : "var(--terra)";
            const icon = isPartnershipAcquire
              ? (e.marketType === "lawyer" ? "⚖" : "✊")
              : "⟳";
            const label = isPartnershipAcquire
              ? `Acquire from ${e.marketType === "lawyer" ? "Lawyer" : "Activist"} Market`
              : (e.subtype || e.type);
            return (
              <div key={i} className="pending-card"
                style={{ padding: "7px 9px", borderRadius: 2, marginBottom: 4,
                  borderColor: isPartnershipAcquire ? "var(--gold-dim)" : undefined }}>
                <div className="f-body" style={{ fontSize: 11, color: accentColor, marginBottom: 3 }}>
                  {icon} {label}
                </div>
                <div className="f-body" style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.4 }}>
                  {e.message}
                </div>
                {isPartnershipAcquire && canControl(e.playerId) && (
                  <button
                    onClick={() => onCancelPartnership?.(e.playerId)}
                    title="Cancel — no fee has been charged yet"
                    onMouseEnter={ev => { ev.currentTarget.style.background = "var(--terra)22"; }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = "transparent"; }}
                    style={{
                      marginTop: 6, padding: "3px 10px",
                      background: "transparent",
                      border: "1px solid var(--terra-dim)",
                      borderRadius: 2, color: "var(--terra)",
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                      cursor: "pointer", transition: "all 0.12s",
                    }}>
                    ✕ Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log header */}
      <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
        <Label>Action Log</Label>
      </div>

      {/* Log entries */}
      <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
        {[...log].reverse().map((entry) => (
          <div key={entry.id} className="log-row"
            style={{ marginBottom: 5, borderColor: LOG_COLORS[entry.type] || LOG_COLORS.default }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 2, alignItems: "baseline" }}>
              <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>{formatTime(entry.timestamp)}</span>
              {entry.type === "phase_start" && (
                <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  — {PHASE_LABELS[entry.phase] || entry.phase} —
                </span>
              )}
            </div>
            <div className="f-body" style={{ fontSize: 11, color: entry.type === "phase_start" ? "var(--t3)" : "var(--t2)", lineHeight: 1.45 }}>
              {entry.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BOARD PANEL  (left)
// ─────────────────────────────────────────────────────────────────────────────

function SharedBoardPanel({
  sharedBoard, playerOrder, players,
  isActivePlayer = false, phase, activePlayer,
  partnershipFlows = {},
  onAcquireLawyer, onAcquireActivist,
}) {
  const { lawyerMarket, lawyerDeck, activistMarket, activistDeck,
          eventDeck, strategyDeck, strategyDiscard, docket } = sharedBoard;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%", overflowY: "auto", padding: "12px 10px" }}>

      <MarketGrid
        label="Lawyer Market" slots={lawyerMarket} deckCount={lawyerDeck.length}
        isActivePlayer={isActivePlayer} phase={phase} marketType="lawyer"
        activePlayer={activePlayer} partnershipFlow={partnershipFlows.lawyer ?? null}
        onAcquire={onAcquireLawyer}
      />
      <Divider />
      <MarketGrid
        label="Activist Market" slots={activistMarket} deckCount={activistDeck.length}
        isActivePlayer={isActivePlayer} phase={phase} marketType="activist"
        activePlayer={activePlayer} partnershipFlow={partnershipFlows.activist ?? null}
        onAcquire={onAcquireActivist}
      />
      <Divider />
      <DocketQueue docket={docket} playerOrder={playerOrder} players={players} />
      <Divider />

      {/* Event Deck — face-down: the next event is hidden information */}
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <Label style={{ margin: 0 }}>Event Deck</Label>
          <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)", marginLeft: "auto" }}>{eventDeck.length} left</span>
        </div>
        <div style={{ padding: "7px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)" }}>
          <div className="f-display" style={{ fontSize: 10, color: "var(--event)" }}>
            {eventDeck.length > 0 ? `${eventDeck.length} card${eventDeck.length !== 1 ? "s" : ""} face-down` : "— empty —"}
          </div>
        </div>
      </div>

      <Divider />

      {/* Strategy Deck */}
      <div>
        <Label>Strategy Deck</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "5px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)", flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>Draw</div>
            <div className="f-mono" style={{ fontSize: 16, color: "var(--strategy)" }}>{strategyDeck.length}</div>
          </div>
          <div style={{ padding: "5px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)", flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>Discard</div>
            <div className="f-mono" style={{ fontSize: 16, color: "var(--t3)" }}>{strategyDiscard.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT: GAME TABLE
// ─────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// PHASE CONTROLS
// ───────────────────────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────────────────────
// CHOICE RESOLUTION MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ChoiceResolutionModal
 *
 * Renders the appropriate UI for whichever choice_required pendingEffect is
 * currently active.  One effect is shown at a time (the first in the list).
 *
 * Supported subtypes:
 *   activist_c_look_and_draw   — pick 1 of 2 strategy cards
 *   docket_swap                — pick 2 docket positions to swap
 *   water_bribe_target         — pick an opponent to receive water
 *   protest_activation_round   — all players set protest influence, then resolve
 *   red_herring_choose_lawyers — pick 2 lawyers (any tableau) to lock
 *   rider_coattails_lawyer     — pick one of own lawyers activated this phase
 *   rider_coattails_case       — pick a won SC case from the docket
 *   negate_card_or_lawyer      — pick any card/lawyer in play to negate
 *
 * Multiplayer props:
 *   canInteract        boolean — this client controls effect.playerId's seat
 *   canResolveProtest  boolean — host/local only (table-level resolution)
 *   canControlSeat     fn(pid) — per-seat check (protest activist buttons)
 *   protestActivations object  — { [pid]: true } once a player used an activist
 *   onActivateProtestActivist fn(pid, instanceId)
 */
function ChoiceResolutionModal({
  effect, state, onResolve, onUndo, canUndo,
  canInteract = true, canResolveProtest = true, canControlSeat = () => true,
  protestActivations = {}, onActivateProtestActivist,
}) {
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);

  if (!effect) return null;

  const player = state.players[effect.playerId];
  const fColor = FACTION_COLORS[player?.factionId] || 'var(--terra)';

  // ── Shared chrome ──────────────────────────────────────────────────────────
  // A blocking choice must block the WHOLE screen (fixed overlay above the
  // phase bar, markets and hand — nothing else is clickable until resolved).
  function Modal({ title, subtitle, children }) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: 'rgba(13,11,8,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--terra-dim)',
          borderRadius: 4, width: '100%', maxWidth: 560,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--b1)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 1, background: fColor }} />
            <div style={{ flex: 1 }}>
              <div className="f-display" style={{ fontSize: 12, color: 'var(--terra)', letterSpacing: '0.06em' }}>
                {title}
              </div>
              {subtitle && (
                <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            {canUndo && (
              <button
                onClick={onUndo}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--terra)22'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--terra)',
                  borderRadius: 2,
                  color: 'var(--terra)',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '4px 10px',
                  cursor: 'pointer', transition: 'all 0.12s',
                  flexShrink: 0,
                }}>
                ↩ Undo Card Play
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Shared confirm button — inert unless this client may act on the choice
  function ConfirmBtn({ label, disabled, onClick, allowed = canInteract }) {
    const isDisabled = disabled || !allowed;
    return (
      <button
        disabled={isDisabled}
        onClick={onClick}
        title={!allowed ? `Waiting for ${player?.name ?? 'another player'} to choose` : undefined}
        onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = 'var(--terra)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = isDisabled ? 'var(--t4)' : 'var(--terra)'; }}
        style={{
          marginTop: 16, padding: '6px 20px',
          background: 'none',
          border: `1px solid ${isDisabled ? 'var(--b1)' : 'var(--terra)'}`,
          borderRadius: 2,
          color: isDisabled ? 'var(--t4)' : 'var(--terra)',
          fontFamily: "'Courier Prime', monospace",
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.45 : 1,
          transition: 'all 0.15s',
        }}>
        {label}
      </button>
    );
  }

  // Shared selectable card chip — selection disabled for spectating clients
  function CardChip({ cardId, instanceId, selected, onClick, extra }) {
    const def = CARD_INDEX[cardId];
    const typeColor = CARD_COLORS[def?.type] || 'var(--t2)';
    return (
      <div
        onClick={canInteract ? onClick : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px',
          border: `1px solid ${selected ? 'var(--terra)' : 'var(--b2)'}`,
          borderRadius: 2,
          background: selected ? 'var(--bg4)' : 'var(--bg3)',
          cursor: canInteract ? 'pointer' : 'default',
          transition: 'all 0.12s',
          marginBottom: 4,
        }}>
        <div style={{ width: 6, height: 6, borderRadius: 1, background: typeColor, flexShrink: 0 }} />
        <span className="f-display" style={{ fontSize: 10, color: 'var(--t1)', flex: 1 }}>
          {def?.name || cardId}
        </span>
        {extra && <span className="f-mono" style={{ fontSize: 9, color: 'var(--t3)' }}>{extra}</span>}
        {selected && <span className="f-mono" style={{ fontSize: 9, color: 'var(--terra)' }}>✓</span>}
      </div>
    );
  }

  // ── activist_c_look_and_draw ──────────────────────────────────────────────
  if (effect.subtype === 'activist_c_look_and_draw') {
    const options = effect.options || [];
    return (
      <Modal
        title="Activist C — Draw a Strategy Card"
        subtitle={`${player?.name} — choose 1 card to draw, the other goes to the bottom`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          Top {options.length} of Strategy deck:
        </div>
        {options.map(cardId => (
          <CardChip
            key={cardId} cardId={cardId}
            selected={selA === cardId}
            onClick={() => setSelA(cardId)}
          />
        ))}
        <ConfirmBtn
          label="Draw Selected"
          disabled={!selA}
          onClick={() => onResolve({ subtype: effect.subtype, playerId: effect.playerId, chosenCardId: selA })}
        />
      </Modal>
    );
  }

  // ── docket_swap ───────────────────────────────────────────────────────────
  if (effect.subtype === 'docket_swap') {
    const docket = effect.docket || state.sharedBoard.docket;
    return (
      <Modal
        title="Donate to SC Justice — Swap Docket"
        subtitle={`${player?.name} — select 2 cases to swap positions`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          {selA !== null && selB !== null
            ? `Will swap position ${selA + 1} ↔ position ${selB + 1}`
            : selA !== null
              ? 'Now select the second case'
              : 'Select the first case to move'}
        </div>
        {docket.map((caseId, idx) => {
          const isSelA = selA === idx;
          const isSelB = selB === idx;
          return (
            <div
              key={`${caseId}-${idx}`}
              onClick={canInteract ? () => {
                if (selA === null) { setSelA(idx); }
                else if (selB === null && idx !== selA) { setSelB(idx); }
                else { setSelA(idx); setSelB(null); }
              } : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 2, marginBottom: 4,
                cursor: canInteract ? 'pointer' : 'default',
                border: `1px solid ${isSelA || isSelB ? 'var(--terra)' : 'var(--b2)'}`,
                background: isSelA || isSelB ? 'var(--bg4)' : 'var(--bg3)',
                transition: 'all 0.12s',
              }}>
              <span className="f-mono" style={{ fontSize: 10, color: 'var(--t4)', minWidth: 16 }}>
                {isSelA ? 'A' : isSelB ? 'B' : `${idx + 1}.`}
              </span>
              <span className="f-display" style={{ fontSize: 10, color: 'var(--t1)', flex: 1 }}>
                {CARD_INDEX[caseId]?.name || caseId}
              </span>
              {idx === 0 && <span className="f-mono" style={{ fontSize: 9, color: 'var(--terra)' }}>active</span>}
            </div>
          );
        })}
        <ConfirmBtn
          label="Confirm Swap"
          disabled={selA === null || selB === null}
          onClick={() => onResolve({ subtype: effect.subtype, indexA: selA, indexB: selB })}
        />
      </Modal>
    );
  }

  // ── water_bribe_target ────────────────────────────────────────────────────
  if (effect.subtype === 'water_bribe_target') {
    const opponents = state.playerOrder.filter(pid => pid !== effect.playerId);
    return (
      <Modal
        title="Water Bribe — Choose Target"
        subtitle={`${player?.name} — give 1 water cube to an opponent, receive $3`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          Select an opponent to receive the cube (they pay you $3):
        </div>
        {opponents.map(pid => {
          const opp = state.players[pid];
          const fC  = FACTION_COLORS[opp.factionId] || 'var(--t2)';
          return (
            <div
              key={pid}
              onClick={canInteract ? () => setSelA(pid) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 2, marginBottom: 4,
                cursor: canInteract ? 'pointer' : 'default',
                border: `1px solid ${selA === pid ? 'var(--terra)' : 'var(--b2)'}`,
                background: selA === pid ? 'var(--bg4)' : 'var(--bg3)',
                transition: 'all 0.12s',
              }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: fC }} />
              <span className="f-body" style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{opp.name}</span>
              <span className="f-mono" style={{ fontSize: 9, color: 'var(--water)' }}>{opp.waterCubes} 💧</span>
              <span className="f-mono" style={{ fontSize: 9, color: 'var(--money)' }}>${opp.moneyTrack.value}</span>
              {selA === pid && <span className="f-mono" style={{ fontSize: 9, color: 'var(--terra)' }}>✓</span>}
            </div>
          );
        })}
        <ConfirmBtn
          label="Confirm Bribe"
          disabled={!selA}
          onClick={() => onResolve({ subtype: effect.subtype, playerId: effect.playerId, targetPlayerId: selA })}
        />
      </Modal>
    );
  }

  // ── protest_activation_round ──────────────────────────────────────────────
  if (effect.subtype === 'protest_activation_round') {
    return (
      <Modal
        title={`Protest — ${effect.protestId?.replace(/_/g, ' ')}`}
        subtitle="Activating activists is optional. Player(s) with lowest influence lose.">
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 12 }}>
          Protest influence accumulated this round (0 if no activists played):
        </div>
        {state.playerOrder.map(pid => {
          const p  = state.players[pid];
          const fC = FACTION_COLORS[p.factionId] || 'var(--t2)';
          const activated  = !!protestActivations[pid];
          const controlled = canControlSeat(pid);
          // READY tableau activists whose C ability generates protest influence
          const protestActivists = p.tableau.filter(inst => {
            const def = CARD_INDEX[inst.cardId];
            return def?.type === 'activist'
              && def?.actions?.C?.icon === 'protest_influence'
              && inst.exhaustState === 'ready';
          });
          return (
            <div key={pid} style={{ marginBottom: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 2,
                border: '1px solid var(--b1)', background: 'var(--bg3)',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: 1, background: fC }} />
                <span className="f-body" style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{p.name}</span>
                {activated && (
                  <span className="f-mono" title="Already activated an activist this protest"
                    style={{ fontSize: 9, color: 'var(--activist)' }}>✊ used</span>
                )}
                <span className="f-mono" style={{ fontSize: 14, color: 'var(--pr-pos)', fontWeight: 700 }}>
                  {p.protestInfluence ?? 0}
                </span>
                <span className="f-mono" style={{ fontSize: 9, color: 'var(--t4)' }}>influence</span>
              </div>
              {/* Activist activation buttons — only for seats this client controls,
                  hidden once the player has used their one activist (RULES §12) */}
              {controlled && !activated && protestActivists.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, paddingLeft: 17 }}>
                  {protestActivists.map(inst => {
                    const def = CARD_INDEX[inst.cardId];
                    const amt = parseInt(def?.actions?.C?.text?.match(/\+(\d+)/)?.[1] ?? '1', 10);
                    return (
                      <button
                        key={inst.instanceId}
                        onClick={() => onActivateProtestActivist?.(pid, inst.instanceId)}
                        title={`Use ${def?.name}: ${def?.actions?.C?.text}`}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--activist)22'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        style={{
                          padding: '3px 10px',
                          background: 'transparent',
                          border: '1px solid var(--activist)',
                          borderRadius: 2, color: 'var(--activist)',
                          fontFamily: "'Courier Prime', monospace",
                          fontSize: 10, letterSpacing: '0.06em',
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}>
                        ✊ Use {def?.name || inst.cardId} (+{amt})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="f-mono" style={{
          fontSize: 9, color: 'var(--t4)',
          marginTop: 12, padding: '6px 10px',
          border: '1px solid var(--b2)', borderRadius: 2, lineHeight: 1.6,
        }}>
          Each player may activate at most ONE protest-influence activist —
          activation is optional. All players tied at the lowest influence share
          the penalty.
        </div>
        <ConfirmBtn
          label={canResolveProtest ? 'Resolve Protest' : 'Waiting for host to resolve…'}
          disabled={false}
          allowed={canResolveProtest}
          onClick={() => onResolve({ subtype: effect.subtype, protestId: effect.protestId })}
        />
      </Modal>
    );
  }

  // ── red_herring_choose_lawyers ────────────────────────────────────────────
  if (effect.subtype === 'red_herring_choose_lawyers') {
    // Collect all lawyers across all tableaux
    const allLawyers = [];
    for (const pid of state.playerOrder) {
      const p = state.players[pid];
      for (const instance of p.tableau) {
        const def = CARD_INDEX[instance.cardId];
        if (def?.type === 'lawyer' && instance.exhaustState !== 'locked') {
          allLawyers.push({ ...instance, ownerName: p.name, ownerFaction: p.factionId });
        }
      }
    }
    const selected = [selA, selB].filter(Boolean);
    return (
      <Modal
        title="Red Herring Case — Lock 2 Lawyers"
        subtitle={`${player?.name} — choose any 2 lawyers. They cannot be used this round.`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          {selected.length === 0 ? 'Select first lawyer to lock'
            : selected.length === 1 ? 'Select second lawyer to lock'
            : '2 lawyers selected — confirm when ready'}
        </div>
        {allLawyers.map(inst => {
          const isSel = selA === inst.instanceId || selB === inst.instanceId;
          const fC    = FACTION_COLORS[inst.ownerFaction] || 'var(--t2)';
          return (
            <CardChip
              key={inst.instanceId}
              cardId={inst.cardId}
              instanceId={inst.instanceId}
              selected={isSel}
              extra={inst.ownerName}
              onClick={() => {
                if (isSel) {
                  if (selA === inst.instanceId) setSelA(selB);
                  setSelB(null);
                } else if (!selA) { setSelA(inst.instanceId); }
                else if (!selB)   { setSelB(inst.instanceId); }
              }}
            />
          );
        })}
        {allLawyers.length === 0 && (
          <>
            <div className="f-mono" style={{
              fontSize: 10, color: 'var(--t4)', marginBottom: 10,
            }}>
              No lawyers in play — the card has no valid targets.
            </div>
            <div className="f-mono" style={{
              fontSize: 9, lineHeight: 1.5, color: 'var(--terra-dim)',
              padding: '6px 10px',
              border: '1px solid var(--terra-dim)',
              borderRadius: 2, marginBottom: 4,
            }}>
              {canUndo && (
                <>
                  <strong style={{ color: 'var(--terra)' }}>Undo Card Play</strong> — restores state
                  to before the card was played. The strategy card returns to your hand.
                  <br />
                </>
              )}
              <strong style={{ color: 'var(--t3)' }}>Dismiss</strong> — the card effect fizzles.
              The card stays exhausted and is discarded at cleanup.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {canUndo && (
                <button
                  onClick={onUndo}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--terra)22'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    flex: 1, padding: '6px 0',
                    background: 'transparent',
                    border: '1px solid var(--terra)',
                    borderRadius: 2,
                    color: 'var(--terra)',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  ↩ Undo Card Play
                </button>
              )}
              <button
                disabled={!canInteract}
                onClick={() => canInteract && onResolve({ subtype: effect.subtype, playerId: effect.playerId, targetInstanceIds: [] })}
                onMouseEnter={e => { if (canInteract) e.currentTarget.style.background = 'var(--b2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  flex: 1, padding: '6px 0',
                  background: 'transparent',
                  border: '1px solid var(--b2)',
                  borderRadius: 2,
                  color: 'var(--t3)',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: canInteract ? 'pointer' : 'not-allowed',
                  opacity: canInteract ? 1 : 0.45,
                  transition: 'all 0.15s',
                }}>
                Dismiss (fizzle)
              </button>
            </div>
          </>
        )}
        {allLawyers.length > 0 && (
          <ConfirmBtn
            label="Lock These Lawyers"
            disabled={!selA || !selB}
            onClick={() => onResolve({
              subtype: effect.subtype,
              playerId: effect.playerId,
              targetInstanceIds: [selA, selB],
            })}
          />
        )}
      </Modal>
    );
  }

  // ── rider_coattails_lawyer ────────────────────────────────────────────────
  if (effect.subtype === 'rider_coattails_lawyer') {
    // Own lawyers activated this phase, whose cost > 1 (rider costs $1)
    const riderCost = CARD_INDEX['rider_of_coattails']?.cost ?? 1;
    const ownLawyers = (player?.tableau || []).filter(inst => {
      const def = CARD_INDEX[inst.cardId];
      return def?.type === 'lawyer'
        && inst.exhaustState === 'exhausted'
        && (def.cost ?? 0) > riderCost
        && def.actions?.N;  // must have an N action to copy
    });
    return (
      <Modal
        title="Rider of Coat-tails N — Copy a Lawyer Bonus"
        subtitle={`${player?.name} — choose a lawyer you activated this phase to copy its bonus`}>
        {ownLawyers.length === 0 && (
          <div className="f-mono" style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 8 }}>
            No lawyers activated this phase. Effect has no valid target.
          </div>
        )}
        {ownLawyers.map(inst => (
          <CardChip
            key={inst.instanceId}
            cardId={inst.cardId}
            selected={selA === inst.cardId}
            onClick={() => setSelA(inst.cardId)}
          />
        ))}
        <ConfirmBtn
          label={ownLawyers.length === 0 ? 'Dismiss (no target)' : 'Copy Bonus'}
          disabled={ownLawyers.length > 0 && !selA}
          onClick={() => onResolve({
            subtype: effect.subtype,
            playerId: effect.playerId,
            chosenCardId: selA || null,
          })}
        />
      </Modal>
    );
  }

  // ── rider_coattails_case ──────────────────────────────────────────────────
  if (effect.subtype === 'rider_coattails_case') {
    // Cases resolved THIS ROUND where the active player was not a party
    const resolvedThisRound = state.sharedBoard.casesResolvedThisRound ?? [];
    const uninvolvedCases = resolvedThisRound
      .map(r => r.caseId)
      .filter(caseId => {
        const caseDef = CARD_INDEX[caseId];
        if (!caseDef) return false;
        const isPlaintiff = caseDef.plaintiff?.id === player?.factionId;
        const isDefendant = caseDef.defendant?.id === player?.factionId;
        return !isPlaintiff && !isDefendant;
      });
    return (
      <Modal
        title="Rider of Coat-tails C — Claim Case Bonus"
        subtitle={`${player?.name} — SC cases resolved this round (not your party)`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          Resolved this round — choose one to claim winner bonus:
        </div>
        {uninvolvedCases.length === 0 && (
          <div className="f-mono" style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 8 }}>
            No SC cases were resolved this round (or all were cases you were party to).
          </div>
        )}
        {uninvolvedCases.map(caseId => {
          const caseDef = CARD_INDEX[caseId];
          const rewards = caseDef?.winner_reward ?? [];
          const rewardStr = rewards.map(r => {
            const icons = { water_claim_track: '◈', water_claim: '◈', vp: 'VP', pr: '★', money: '$', water: '💧' };
            return `+${r.amount}${icons[r.resource] || r.resource}`;
          }).join('  ');
          return (
            <div
              key={caseId}
              onClick={canInteract ? () => setSelA(caseId) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 2, marginBottom: 4,
                cursor: canInteract ? 'pointer' : 'default',
                border: `1px solid ${selA === caseId ? 'var(--terra)' : 'var(--b2)'}`,
                background: selA === caseId ? 'var(--bg4)' : 'var(--bg3)',
                transition: 'all 0.12s',
              }}>
              <span style={{ fontSize: 11 }}>⚖</span>
              <div style={{ flex: 1 }}>
                <div className="f-display" style={{ fontSize: 10, color: 'var(--t1)' }}>
                  {caseDef?.name || caseId}
                </div>
                {rewardStr && (
                  <div className="f-mono" style={{ fontSize: 9, color: 'var(--gold)', marginTop: 2 }}>
                    {rewardStr}
                  </div>
                )}
              </div>
              {selA === caseId && <span className="f-mono" style={{ fontSize: 9, color: 'var(--terra)' }}>✓</span>}
            </div>
          );
        })}
        <ConfirmBtn
          label={uninvolvedCases.length === 0 ? 'Dismiss (no target)' : 'Claim Bonus'}
          disabled={uninvolvedCases.length > 0 && !selA}
          onClick={() => onResolve({
            subtype: effect.subtype,
            playerId: effect.playerId,
            caseId: selA || null,
          })}
        />
      </Modal>
    );
  }

  // ── negate_card_or_lawyer ─────────────────────────────────────────────────
  if (effect.subtype === 'negate_card_or_lawyer') {
    // All cards in all tableaux that are exhausted (have been played this round)
    const playedCards = [];
    for (const pid of state.playerOrder) {
      if (pid === effect.playerId) continue; // Can't negate own cards
      const p = state.players[pid];
      for (const inst of p.tableau) {
        if (inst.exhaustState === 'exhausted') {
          playedCards.push({ ...inst, ownerName: p.name, ownerFaction: p.factionId });
        }
      }
    }
    return (
      <Modal
        title="Protect Our Interests — Negate a Card"
        subtitle={`${player?.name} — choose a card/lawyer used this round to negate its effect`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          Cards played by opponents this round (exhausted):
        </div>
        {playedCards.length === 0 && (
          <div className="f-mono" style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 8 }}>
            No opponent cards played yet. You may dismiss.
          </div>
        )}
        {playedCards.map(inst => (
          <CardChip
            key={inst.instanceId}
            cardId={inst.cardId}
            instanceId={inst.instanceId}
            selected={selA === inst.instanceId}
            extra={inst.ownerName}
            onClick={() => setSelA(selA === inst.instanceId ? null : inst.instanceId)}
          />
        ))}
        <ConfirmBtn
          label={playedCards.length === 0 ? 'Dismiss (no target)' : 'Negate Effect'}
          disabled={playedCards.length > 0 && !selA}
          onClick={() => onResolve({
            subtype: effect.subtype,
            playerId: effect.playerId,
            targetInstanceId: selA || null,
          })}
        />
      </Modal>
    );
  }

  // ── activist_a_water_direction ──────────────────────────────────────────
  if (effect.subtype === 'activist_a_water_direction') {
    return (
      <Modal
        title="Activist A — Water Claim"
        subtitle={`${player?.name} — Gain or Lose 1 water claim?`}>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            disabled={!canInteract}
            onClick={() => canInteract && onResolve({ subtype: effect.subtype, playerId: effect.playerId,
              cardId: effect.cardId, direction: 1 })}
            onMouseEnter={e => { if (canInteract) e.currentTarget.style.background = 'var(--water)22'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              flex: 1, padding: '10px 0',
              background: 'transparent', border: '1px solid var(--water)',
              borderRadius: 2, color: 'var(--water)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: canInteract ? 'pointer' : 'not-allowed',
              opacity: canInteract ? 1 : 0.45,
              transition: 'all 0.15s',
            }}>
            ▲ Gain 1
          </button>
          <button
            disabled={!canInteract}
            onClick={() => canInteract && onResolve({ subtype: effect.subtype, playerId: effect.playerId,
              cardId: effect.cardId, direction: -1 })}
            onMouseEnter={e => { if (canInteract) e.currentTarget.style.background = 'var(--terra)22'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              flex: 1, padding: '10px 0',
              background: 'transparent', border: '1px solid var(--terra)',
              borderRadius: 2, color: 'var(--terra)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: canInteract ? 'pointer' : 'not-allowed',
              opacity: canInteract ? 1 : 0.45,
              transition: 'all 0.15s',
            }}>
            ▼ Lose 1
          </button>
        </div>
      </Modal>
    );
  }

  // ── card_alternative_choice ───────────────────────────────────────────────
  if (effect.subtype === 'card_alternative_choice') {
    const cardDef = CARD_INDEX[effect.cardId];
    const primary = effect.primary;
    const alts    = effect.alternatives ?? [];
    const opts    = [
      { idx: 0, text: primary.text, label: 'Primary effect' },
      ...alts.map((a, i) => ({ idx: i + 1, text: a.text, label: `Alternative ${i + 1}` })),
    ];
    return (
      <Modal
        title={`${cardDef?.name || effect.cardId} — Choose Effect`}
        subtitle={`${player?.name} — ${effect.side} action`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {opts.map(opt => (
            <button
              key={opt.idx}
              disabled={!canInteract}
              onClick={() => canInteract && onResolve({
                subtype: effect.subtype,
                playerId: effect.playerId,
                cardId: effect.cardId,
                side: effect.side,
                alternativeIdx: opt.idx,
              })}
              onMouseEnter={e => { if (canInteract) e.currentTarget.style.background = fColor + '18'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                background: 'transparent',
                border: `1px solid ${opt.idx === 0 ? fColor : 'var(--b2)'}`,
                borderRadius: 2,
                color: opt.idx === 0 ? 'var(--t1)' : 'var(--t2)',
                fontFamily: "'Courier Prime', monospace",
                cursor: canInteract ? 'pointer' : 'not-allowed',
                opacity: canInteract ? 1 : 0.55,
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 9, color: opt.idx === 0 ? fColor : 'var(--t4)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.4 }}>{opt.text}</div>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // ── Fallback for unknown subtypes ─────────────────────────────────────────
  return (
    <Modal title="Pending Choice" subtitle={effect.subtype}>
      <div className="f-body" style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>
        {effect.message}
      </div>
      <ConfirmBtn label="Dismiss" disabled={false} onClick={() => onResolve({ subtype: effect.subtype })} />
    </Modal>
  );
}

/**
 * PhaseControls
 *
 * Negotiate / Consume phases (turns auto-advance after every TURN action —
 * there is no "End Turn" button):
 *   The client controlling the active seat sees a "Pass" button plus a hint
 *   that taking an action ends the turn. Everyone else sees a waiting note.
 *   Pass is disabled while a blocking choice_required pendingEffect is open.
 *
 * Round Setup / End Step auto-resolve; the Advance button (host/local only)
 * moves the game on. Guests see a "waiting for host" note instead.
 */
function PhaseControls({ phase, activePlayer, pendingEffects, isGuest = false,
    canControlActive = true, passPlayerTurn, advanceToNextPhase }) {
  const inActionPhase = isActionPhase(phase);
  const hasBlockingEffect = pendingEffects.some(e => e.type === 'choice_required');

  // ── Shared style builders ────────────────────────────────────────────────
  const btn = (color, disabled = false) => ({
    background: "none",
    border: `1px solid ${disabled ? "var(--b2)" : color}`,
    borderRadius: 2,
    color: disabled ? "var(--t4)" : color,
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    fontSize: 10,
    letterSpacing: "0.12em",
    padding: "5px 14px",
    cursor: disabled ? "not-allowed" : "pointer",
    textTransform: "uppercase",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
  });

  // ── Action phase: Pass only (actions end the turn automatically) ─────────
  if (inActionPhase) {
    if (!canControlActive) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: 1, background: "var(--t4)",
              animation: "pulsedot 1.6s ease-in-out infinite" }} />
          <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)",
              letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {activePlayer?.name}’s turn
          </span>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", letterSpacing: "0.06em" }}>
          taking an action ends your turn
        </span>
        <button
          disabled={hasBlockingEffect}
          style={btn("var(--t3)", hasBlockingEffect)}
          onClick={hasBlockingEffect ? undefined : passPlayerTurn}
          onMouseEnter={e => { if (!hasBlockingEffect) e.currentTarget.style.background = "var(--b2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          title={hasBlockingEffect
            ? "Resolve the pending choice before passing"
            : "Pass your turn (no action taken)"}>
          Pass
        </button>
      </div>
    );
  }

  // ── Non-action phases: Advance (host/local) or waiting note (guest) ──────
  if (isGuest) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 1, background: "var(--t4)",
            animation: "pulsedot 1.6s ease-in-out infinite" }} />
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)",
            letterSpacing: "0.1em", textTransform: "uppercase" }}>
          waiting for host
        </span>
      </div>
    );
  }

  const advanceBlocked = hasBlockingEffect;
  const blockReason = advanceBlocked
    ? (pendingEffects.find(e => e.subtype === 'protest_activation_round')
        ? "Resolve protest before advancing"
        : "Resolve pending effects before advancing")
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {advanceBlocked && (
        <span className="f-mono" style={{ fontSize: 9, color: "var(--terra-dim)",
            letterSpacing: "0.08em", maxWidth: 180, textAlign: "right", lineHeight: 1.3 }}>
          {blockReason}
        </span>
      )}
      <button
        disabled={advanceBlocked}
        style={btn("var(--gold)", advanceBlocked)}
        onClick={advanceBlocked ? undefined : advanceToNextPhase}
        onMouseEnter={e => { if (!advanceBlocked) { e.currentTarget.style.background = "#c8a55011"; }}}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
        Advance →
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// GAME OVER OVERLAY
// ───────────────────────────────────────────────────────────────────────────────

function GameOverOverlay({ finalScores, onPlayAgain }) {
  if (!finalScores) return null;

  // finalScores comes pre-ranked from calculateFinalScores (field: rank,
  // ties share a rank). Entries carry `total`, not `totalVP`.
  const sorted = [...finalScores].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.total - a.total);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(13,11,8,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--b2)",
        borderRadius: 4, padding: "32px 40px", minWidth: 360, maxWidth: 480,
      }}>
        <div className="f-display" style={{ fontSize: 18, color: "var(--gold)", letterSpacing: "0.1em",
            textAlign: "center", marginBottom: 6 }}>
          Game Over
        </div>
        <div className="f-mono" style={{ fontSize: 9, color: "var(--t4)", textAlign: "center",
            letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
          Final Standings
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
          {sorted.map((entry) => {
            const fColor = FACTION_COLORS[entry.factionId] || "var(--t2)";
            const isWinner = entry.rank === 1;
            return (
              <div key={entry.playerId} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                background: isWinner ? "var(--bg4)" : "var(--bg3)",
                border: `1px solid ${isWinner ? fColor + "66" : "var(--b0)"}`,
                borderRadius: 2,
              }}>
                <span className="f-mono" style={{ fontSize: 11, color: isWinner ? "var(--gold)" : "var(--t4)", minWidth: 20 }}>
                  {isWinner ? "🥇" : `${entry.rank}.`}
                </span>
                <div style={{ width: 7, height: 7, borderRadius: 1, background: fColor, flexShrink: 0 }} />
                <span className="f-body" style={{ flex: 1, fontSize: 13, color: isWinner ? "var(--t1)" : "var(--t2)" }}>
                  {entry.name}
                </span>
                <span className="f-mono" style={{ fontSize: 16, color: "var(--vp)", fontWeight: 700 }}>
                  {entry.total}
                </span>
                <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>VP</span>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={onPlayAgain}
            style={{
              background: "none", border: "1px solid var(--b2)", borderRadius: 2,
              color: "var(--t2)", fontFamily: "'Playfair Display SC', Georgia, serif",
              fontSize: 10, letterSpacing: "0.16em", padding: "8px 28px",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "var(--gold)"; e.target.style.color = "var(--gold)"; }}
            onMouseLeave={e => { e.target.style.borderColor = "var(--b2)";  e.target.style.color = "var(--t2)"; }}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// ROOT: GAME TABLE
// ───────────────────────────────────────────────────────────────────────────────

export default function GameTable() {
  // Populate the module-level card definition index from live state BEFORE any
  // child renders (memoized reassignment — no per-component mutation, and the
  // whole tree below is gated on storeState existing).
  const storeState = useGameStore(s => s.gameState);
  useMemo(() => { CARD_INDEX = storeState?.cardIndex ?? {}; }, [storeState?.cardIndex]);

  if (!storeState) return null;
  return <GameTableInner />;
}

function GameTableInner() {
  // ── Live game store values ─────────────────────────────────────────
  const state              = useGameStore(s => s.gameState);
  const pendingEffects     = useGameStore(s => s.pendingEffects) ?? [];
  const isGameOver         = useGameStore(s => s.isGameOver);
  const finalScores        = useGameStore(s => s.finalScores);
  const protestActivations = useGameStore(s => s.protestActivations) ?? {};
  const advanceToNextPhase = useGameStore(s => s.advanceToNextPhase);
  const playCardAction           = useGameStore(s => s.playCardAction);
  const purchasePartnership      = useGameStore(s => s.purchasePartnership);
  const usePartnershipAbility    = useGameStore(s => s.usePartnershipAbility);
  const cancelPartnershipAcquire = useGameStore(s => s.cancelPartnershipAcquire);
  const unlockWaterBank          = useGameStore(s => s.unlockWaterBank);
  const depositToWaterBank       = useGameStore(s => s.depositToWaterBank);
  const withdrawFromWaterBank    = useGameStore(s => s.withdrawFromWaterBank);
  const placeScInfluence         = useGameStore(s => s.placeScInfluence);
  const resolveChoice            = useGameStore(s => s.resolveChoice);
  const acquireLawyer            = useGameStore(s => s.acquireLawyer);
  const acquireActivist          = useGameStore(s => s.acquireActivist);
  const activateProtestActivist  = useGameStore(s => s.activateProtestActivist);
  const undo                     = useGameStore(s => s.undo);
  const redo                     = useGameStore(s => s.redo);
  const dismissChoiceEffect      = useGameStore(s => s.dismissChoiceEffect);
  const passPlayerTurn           = useGameStore(s => s.passPlayerTurn);
  const placeWaterOnProjectStore = useGameStore(s => s.placeWaterOnProject);

  // ── Multiplayer (net store) ────────────────────────────────────────
  const mode           = useNetStore(s => s.mode);
  const mySeats        = useNetStore(s => s.mySeats);
  const seatMap        = useNetStore(s => s.seatMap);
  const roomCode       = useNetStore(s => s.roomCode);
  const peerError      = useNetStore(s => s.peerError);
  const guestConnected = useNetStore(s => !!s.hostConn?.open);
  const isGuest        = mode === 'guest';
  const canControl     = (pid) => controlsSeat(mode, mySeats, pid);

  // Host-only controls: undo/redo (guests get no-op stubs anyway — hide them)
  const canUndo = !isGuest && (state.undoStack?.length ?? 0) > 0;
  const canRedo = !isGuest && (state.redoStack?.length ?? 0) > 0;

  // ── Zoom (persisted) ───────────────────────────────────────────────
  const [zoom, setZoom] = useState(() => {
    let stored = NaN;
    try { stored = parseInt(localStorage.getItem(ZOOM_STORAGE_KEY) ?? '', 10); } catch { /* ignore */ }
    return ZOOM_STEPS.includes(stored) ? stored : 100;
  });
  useEffect(() => {
    try { localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom)); } catch { /* ignore */ }
  }, [zoom]);
  const zoomIdx       = ZOOM_STEPS.indexOf(zoom);
  const handleZoomIn  = () => setZoom(ZOOM_STEPS[Math.min(zoomIdx + 1, ZOOM_STEPS.length - 1)]);
  const handleZoomOut = () => setZoom(ZOOM_STEPS[Math.max(zoomIdx - 1, 0)]);

  // ── Dismissable connection-error banner ────────────────────────────
  const [dismissedError, setDismissedError] = useState(null);
  const showPeerError = !!peerError && peerError !== dismissedError;

  // ── Local UI state ────────────────────────────────────────────────
  const [viewedPlayerId, setViewedPlayerId] = useState(state.playerOrder[0]);

  // Track the active player; auto-switch the viewed tab to follow them
  const activeId = state.playerOrder[state.activePlayerIndex];
  useEffect(() => { setViewedPlayerId(activeId); }, [activeId]);

  // Guard against a stale viewedPlayerId after state changes
  const safeViewedId = state.players[viewedPlayerId] ? viewedPlayerId : state.playerOrder[0];
  const activePlayer = state.players[activeId];
  const viewedPlayer = state.players[safeViewedId];

  // May this client act with the currently ACTIVE player's pieces?
  const canControlActive = canControl(activeId);
  // Viewed board is interactive only when it is the active player's board
  // AND this client controls that seat (always true in local mode).
  const canActViewed = safeViewedId === activeId && canControlActive;

  // ── Handlers ─────────────────────────────────────────────────────
  const handlePlaceWater = (projectType, projectId) => {
    if (activePlayer) placeWaterOnProjectStore(activePlayer.id, projectType, projectId);
  };
  const handlePlayAgain = () => window.location.reload();

  // Tableau card plays carry the exact instanceId (duplicate citizen copies
  // exist); strategy plays are side-aware and come from the hand.
  const handlePlayCard = (cardId, side, instanceId) => {
    if (activePlayer) playCardAction(activePlayer.id, cardId, side, { instanceId });
  };
  const handlePlayStrategy = (cardId, side) => {
    if (activePlayer) playCardAction(activePlayer.id, cardId, side);
  };

  // Partnership handlers
  const handleBuyPartnership = (partnershipId) => {
    if (activePlayer) purchasePartnership(activePlayer.id, partnershipId);
  };
  const handleUsePartnership = (partnershipId) => {
    if (activePlayer) usePartnershipAbility(activePlayer.id, partnershipId);
  };
  const handleCancelPartnership = (playerId) => cancelPartnershipAcquire(playerId);

  // Open partnership-acquire flows for the ACTIVE player — while open, the
  // market shows the flat ability fee as that player's price.
  const partnershipFlows = {
    lawyer: pendingEffects.find(e => e.type === 'pending_partnership_acquire'
      && e.playerId === activeId && e.marketType === 'lawyer') ?? null,
    activist: pendingEffects.find(e => e.type === 'pending_partnership_acquire'
      && e.playerId === activeId && e.marketType === 'activist') ?? null,
  };

  // Water bank handlers
  const handleUnlockBank = () => {
    if (activePlayer) unlockWaterBank(activePlayer.id);
  };
  const handleDeposit = (ownerId, count) => {
    if (activePlayer) depositToWaterBank(activePlayer.id, ownerId, count);
  };
  const handleWithdraw = (count) => {
    if (activePlayer) withdrawFromWaterBank(activePlayer.id, count);
  };

  // SC influence handler
  const activeCaseId = state.sharedBoard?.docket?.[0] ?? null;
  const handlePlaceScInfluence = (caseId, amount) => {
    if (activePlayer) placeScInfluence(activePlayer.id, caseId, amount);
  };

  // Choice resolution
  const activeChoiceEffect = pendingEffects.find(e => e.type === 'choice_required');
  const handleResolveChoice = (choiceData) => resolveChoice(choiceData);

  // Market acquisition handlers
  const handleAcquireLawyer = (marketIndex) => {
    if (activePlayer) acquireLawyer(activePlayer.id, marketIndex);
  };
  const handleAcquireActivist = (marketIndex) => {
    if (activePlayer) acquireActivist(activePlayer.id, marketIndex);
  };

  // Undo a card play from inside a choice modal (undo game state + clear the
  // pending effect, which lives outside gameState on the store top-level)
  const handleUndoChoiceCard = () => {
    undo();
    if (activeChoiceEffect) dismissChoiceEffect(activeChoiceEffect.subtype);
  };

  return (
    <div className="grain" style={{
        width: "100%", minWidth: 1080, height: "100%",
        display: "flex", flexDirection: "column",
        background: "var(--bg0)", position: "relative",
        zoom: zoom / 100,
      }}>
      <GlobalStyles />

      {/* ── Connection error banner ── */}
      {showPeerError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "5px 16px", flexShrink: 0,
          background: "rgba(196,96,96,0.14)", borderBottom: "1px solid var(--pr-neg)",
        }}>
          <span className="f-mono" style={{ fontSize: 10, color: "var(--pr-neg)", flex: 1 }}>
            ⚠ {peerError}
          </span>
          <button
            onClick={() => setDismissedError(peerError)}
            title="Dismiss"
            style={{
              background: "transparent", border: "none", color: "var(--pr-neg)",
              fontFamily: "'Courier Prime', monospace", fontSize: 11,
              cursor: "pointer", padding: "0 4px",
            }}>
            ✕
          </button>
        </div>
      )}

      {/* ── Game Over overlay ── */}
      {isGameOver && (
        <GameOverOverlay finalScores={finalScores} onPlayAgain={handlePlayAgain} />
      )}

      {/* ── Choice Resolution Modal (full-screen blocking overlay) ── */}
      {activeChoiceEffect && (
        <ChoiceResolutionModal
          effect={activeChoiceEffect}
          state={state}
          onResolve={handleResolveChoice}
          onUndo={handleUndoChoiceCard}
          canUndo={canUndo}
          canInteract={canControl(activeChoiceEffect.playerId)}
          canResolveProtest={!isGuest}
          canControlSeat={canControl}
          protestActivations={protestActivations}
          onActivateProtestActivist={activateProtestActivist}
        />
      )}

      {/* ── Phase Bar ── */}
      <PhaseBar
        state={state} activePlayer={activePlayer}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        mode={mode} roomCode={roomCode} guestConnected={guestConnected}
        zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}>
        <PhaseControls
          phase={state.phase}
          activePlayer={activePlayer}
          pendingEffects={pendingEffects}
          isGuest={isGuest}
          canControlActive={canControlActive}
          passPlayerTurn={passPlayerTurn}
          advanceToNextPhase={advanceToNextPhase}
        />
      </PhaseBar>

      {/* ── Main 3-column layout ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px minmax(0,1fr) 230px",
          overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — Shared board */}
        <div style={{ borderRight: "1px solid var(--b0)", overflowY: "auto" }}>
          <SharedBoardPanel
            sharedBoard={state.sharedBoard}
            playerOrder={state.playerOrder}
            players={state.players}
            isActivePlayer={canActViewed}
            phase={state.phase}
            activePlayer={activePlayer}
            partnershipFlows={partnershipFlows}
            onAcquireLawyer={handleAcquireLawyer}
            onAcquireActivist={handleAcquireActivist}
          />
        </div>

        {/* CENTER — Player board */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

          {/* Player switcher tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--b0)",
              padding: "0 16px", background: "var(--bg1)", flexShrink: 0 }}>
            {state.playerOrder.map((pid) => {
              const p = state.players[pid];
              const isActivePid  = pid === activeId;
              const isViewed     = pid === safeViewedId;
              const disconnected = seatMap?.[pid]?.connected === false;
              return (
                <button key={pid}
                  className={`player-tab f-display ${isViewed ? "active" : ""}`}
                  onClick={() => setViewedPlayerId(pid)}
                  style={{ padding: "8px 14px", background: "transparent", border: "none",
                      fontSize: 10, letterSpacing: "0.06em", cursor: "pointer",
                      borderBottom: `2px solid ${isViewed ? FACTION_COLORS[p.factionId] || "var(--gold)" : "transparent"}`,
                      color: isViewed ? "var(--t1)" : "var(--t3)", transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 6 }}>
                  {isActivePid && (
                    <div style={{ width: 5, height: 5, borderRadius: "50%",
                        background: FACTION_COLORS[p.factionId] || "var(--terra)",
                        boxShadow: `0 0 6px ${FACTION_COLORS[p.factionId] || "var(--terra)"}` }} />
                  )}
                  {p.name}
                  <span className="f-mono" style={{ fontSize: 9, color: "var(--vp)" }}>{p.vp}vp</span>
                  {disconnected && (
                    <span className="f-mono" title="Player disconnected"
                      style={{ fontSize: 9, color: "var(--pr-neg)" }}>(disconnected)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable board area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            <PlayerBoard
              player={viewedPlayer}
              isActivePlayer={canActViewed}
              phase={state.phase}
              activeCaseId={activeCaseId}
              allPlayers={state.players}
              playerOrder={state.playerOrder}
              onPlayCard={handlePlayCard}
              onBuyPartnership={handleBuyPartnership}
              onUsePartnership={handleUsePartnership}
              onUnlockBank={handleUnlockBank}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onPlaceScInfluence={handlePlaceScInfluence}
              waterSupply={state.sharedBoard.waterSupply ?? 0}
              onPlaceWater={handlePlaceWater}
            />
          </div>
        </div>

        {/* RIGHT — Action log */}
        <div style={{ borderLeft: "1px solid var(--b0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ActionLog
            log={state.actionLog}
            pendingEffects={pendingEffects}
            onCancelPartnership={handleCancelPartnership}
            canControl={canControl}
          />
        </div>
      </div>

      {/* ── Strategy Hand (bottom strip) ── */}
      <StrategyHand
        hand={viewedPlayer.hand}
        isActivePlayer={canActViewed}
        showFaces={canControl(safeViewedId)}
        phase={state.phase}
        waterCubes={viewedPlayer.waterCubes ?? 0}
        onPlayStrategy={handlePlayStrategy}
      />
    </div>
  );
}
