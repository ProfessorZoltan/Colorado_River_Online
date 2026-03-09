import { useState, useRef, useEffect } from "react";
import { useGameStore } from "../engine/index.js";
import { isActionPhase, satisfiesPrRequirement } from "../engine/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap";

function GlobalStyles() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

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
      body { background: var(--bg0); color: var(--t1); font-family: 'EB Garamond', Georgia, serif; overflow: hidden; }
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
// MOCK GAME STATE  (replace with useGameStore in production)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_STATE = {
  phase: "action_n",
  round: 3,
  activePlayerIndex: 0,
  playerOrder: ["p1", "p2", "p3"],
  players: {
    p1: {
      id: "p1", factionId: "arizona", name: "Arizona", isAI: false,
      waterClaimTrack: { value: 9, min: 3, max: 22, vp_milestones: [{at:6,vp:1},{at:11,vp:2},{at:17,vp:3},{at:22,vp:5}], threshold_markers: [] },
      moneyTrack:      { value: 7, min: 0, max: 19, vp_milestones: [{at:19,vp:5}], threshold_markers: [] },
      prTrack:         { value: 2, min: -8, max: 11, vp_milestones: [{at:6,vp:2},{at:11,vp:5}],
                         threshold_markers: [{at:-7,effect:"free_lawyer_acquisition"},{at:8,effect:"free_lawyer_acquisition"}] },
      vp: 4, waterCubes: 3, protestInfluence: 0,
      scInfluence: { "arizona_v_california": 2, "arizona_v_nevada": 0 },
      hand: ["deal_with_federal_government", "donate_to_sc_justice", "scorched_earth_negotiating"],
      tableau: [
        { instanceId: "sneaky_pete_1", cardId: "sneaky_pete", exhaustState: "ready" },
        { instanceId: "activist_a_1", cardId: "activist_a", exhaustState: "exhausted" },
        { instanceId: "farmer_a_1",   cardId: "farmer_a",   exhaustState: "ready" },
      ],
      partnerships: { law_firm: true, business: false, investment: true },
      waterBank: { unlocked: true, stored: 2 },
      projects: {
        citizen: {
          farm:         { watered: 4, water_slots: 6 },
          housing:      { watered: 4, water_slots: 4 },
          firefighting: { watered: 1, water_slots: 2 },
        },
        income: {
          factory:    { watered: 3, water_slots: 6 },
          vineyard:   { watered: 0, water_slots: 4 },
          recreation: { watered: 2, water_slots: 2 },
        },
      },
    },
    p2: {
      id: "p2", factionId: "california", name: "California", isAI: false,
      waterClaimTrack: { value: 14, min: 3, max: 22, vp_milestones: [{at:6,vp:1},{at:11,vp:2},{at:17,vp:3},{at:22,vp:5}], threshold_markers: [] },
      moneyTrack:      { value: 12, min: 0, max: 19, vp_milestones: [{at:19,vp:5}], threshold_markers: [] },
      prTrack:         { value: -3, min: -8, max: 11, vp_milestones: [{at:6,vp:2},{at:11,vp:5}],
                         threshold_markers: [{at:-7,effect:"free_lawyer_acquisition"},{at:8,effect:"free_lawyer_acquisition"}] },
      vp: 7, waterCubes: 1, protestInfluence: 0,
      scInfluence: { "arizona_v_california": 5, "arizona_v_nevada": 0 },
      hand: ["water_bribe", "protect_our_interests"],
      tableau: [
        { instanceId: "pro_bono_1",   cardId: "pro_bono_attorney", exhaustState: "ready" },
        { instanceId: "activist_b_1", cardId: "activist_b",        exhaustState: "ready" },
      ],
      partnerships: { law_firm: false, business: true, investment: false },
      waterBank: { unlocked: false, stored: 0 },
      projects: {
        citizen: { farm: { watered: 6, water_slots: 6 }, housing: { watered: 2, water_slots: 4 }, firefighting: { watered: 0, water_slots: 2 } },
        income:  { factory: { watered: 5, water_slots: 6 }, vineyard: { watered: 4, water_slots: 4 }, recreation: { watered: 0, water_slots: 2 } },
      },
    },
    p3: {
      id: "p3", factionId: "chemehuevi", name: "Chemehuevi", isAI: false,
      waterClaimTrack: { value: 5, min: 3, max: 22, vp_milestones: [{at:6,vp:1},{at:11,vp:2},{at:17,vp:3},{at:22,vp:5}], threshold_markers: [] },
      moneyTrack:      { value: 3, min: 0, max: 19, vp_milestones: [{at:19,vp:5}], threshold_markers: [] },
      prTrack:         { value: 7, min: -8, max: 11, vp_milestones: [{at:6,vp:2},{at:11,vp:5}],
                         threshold_markers: [{at:-7,effect:"free_lawyer_acquisition"},{at:8,effect:"free_lawyer_acquisition"}] },
      vp: 9, waterCubes: 0, protestInfluence: 0,
      scInfluence: { "arizona_v_california": 0, "arizona_v_nevada": 0 },
      hand: ["red_herring_case"],
      tableau: [
        { instanceId: "in_glory_1",   cardId: "in_it_for_glory", exhaustState: "ready" },
        { instanceId: "activist_c_1", cardId: "activist_c",      exhaustState: "ready" },
      ],
      partnerships: { law_firm: false, business: false, investment: true },
      waterBank: { unlocked: false, stored: 0 },
      projects: {
        citizen: { farm: { watered: 0, water_slots: 6 }, housing: { watered: 1, water_slots: 4 }, firefighting: { watered: 2, water_slots: 2 } },
        income:  { factory: { watered: 0, water_slots: 6 }, vineyard: { watered: 2, water_slots: 4 }, recreation: { watered: 1, water_slots: 2 } },
      },
    },
  },
  sharedBoard: {
    lawyerMarket: ["sneaky_pete", "team_player", null, "workaholic"],
    lawyerDeck: ["anti_environmentalist", "in_it_for_glory", "rider_of_coattails"],
    activistMarket: ["activist_a", "activist_b", "activist_c", "activist_d"],
    activistDeck: [],
    strategyDeck: ["quid_pro_quo", "lobby_federal_government"],
    strategyDiscard: [],
    eventDeck: ["supreme_court_session", "severe_drought", "protest_a", "large_snow_melt", "supreme_court_session"],
    activeEvent: null,
    docket: ["arizona_v_california", "arizona_v_nevada", "california_v_chemehuevi"],
    waterSupply: 0,
  },
  actionLog: [
    { id: 1, type: "phase_start",   phase: "event",    message: "Round 3 — Event Phase",                         timestamp: Date.now() - 240000 },
    { id: 2, type: "event_revealed",cardId: "supreme_court_session", message: "Event revealed: Supreme Court Session", timestamp: Date.now() - 230000 },
    { id: 3, type: "sc_case_resolved", message: "Arizona v. California: California wins (5 vs 2 influence)",     timestamp: Date.now() - 220000 },
    { id: 4, type: "track_change",  message: "California gains 1 water claim (14 → 15)",                         timestamp: Date.now() - 215000 },
    { id: 5, type: "vp_grant",      message: "California gains 3 VP (total: 7)",                                 timestamp: Date.now() - 210000 },
    { id: 6, type: "phase_start",   phase: "action_n", message: "Round 3 — Action (N) Phase — Arizona goes first", timestamp: Date.now() - 180000 },
    { id: 7, type: "card_acquired",           message: "Arizona acquires Sneaky Pete for $7",                              timestamp: Date.now() - 90000 },
    { id: 8, type: "incomplete_project_penalty", message: "Chemehuevi loses 1 water claim — has incomplete project(s) with water on them", timestamp: Date.now() - 30000 },
  ],
  pendingEffects: [],
};

const CARD_INDEX = {
  sneaky_pete:           { id: "sneaky_pete", type: "lawyer", name: "Sneaky Pete", cost: 3, vp: null, pr_requirement: null,
    actions: { N: { icon: "money", text: "Pay 1 water claim cube to gain $3" }, C: { icon: null, text: "Draw 1 Strategy card" } } },
  team_player:           { id: "team_player", type: "lawyer", name: "Team Player", cost: 3, vp: null,
    actions: { N: { icon: "water", text: "Pay $1 to gain 1 water cube" }, C: { icon: null, text: "A lawyer you acquire this round costs $3 less" } } },
  workaholic:            { id: "workaholic", type: "lawyer", name: "Workaholic", cost: 1, vp: null,
    actions: { N: null, C: { icon: "water", text: "Gain 2 water cubes instead of 1 when you would gain 1" } } },
  pro_bono_attorney:     { id: "pro_bono_attorney", type: "lawyer", name: "Pro Bono Attorney", cost: 0, vp: null, pr_requirement: { operator: "gte", value: 6 },
    actions: { N: { icon: "water_claim_track", text: "Gain 1 level on the water claim track" }, C: { icon: "sc_influence", text: "Gain 1 SC influence in an active case, or gain 1 VP" } } },
  in_it_for_glory:       { id: "in_it_for_glory", type: "lawyer", name: "In It for Glory", cost: 2, vp: null, pr_requirement: { operator: "lte", value: 7 },
    passive: { text: "Gain 1 VP each time you win a SC case" },
    actions: { N: null, C: { icon: "sc_influence", text: "Gain 1 SC influence in an active case" } } },
  activist_a:            { id: "activist_a", type: "activist", name: "Activist A", cost: null, vp: 0,
    actions: { N: { icon: "water_claim", text: "Gain or Lose 1 water claim cube" }, C: { icon: "protest_influence", text: "+1 protestor influence" } } },
  activist_b:            { id: "activist_b", type: "activist", name: "Activist B", cost: null, vp: 1,
    actions: { N: { icon: null, text: "Add 1 Protest card to the Event deck" }, C: { icon: "protest_influence", text: "+2 protestor influence" } } },
  activist_c:            { id: "activist_c", type: "activist", name: "Activist C", cost: null, vp: 1,
    actions: { N: null, C: { icon: null, text: "Look at 2 Strategy cards. Draw 1, bottom the other." } } },
  activist_d:            { id: "activist_d", type: "activist", name: "Activist D", cost: null, vp: 0,
    actions: { N: { icon: null, text: "Gain 1 Strategy Card" }, C: { icon: "protest_influence", text: "+1 protestor influence" } } },
  farmer_a:              { id: "farmer_a", type: "citizen", name: "Farmer A", cost: null, vp: 4,
    actions: { N: { icon: "pr", text: "Gain 1 PR" }, C: { icon: null, text: "Your fully watered farms produce 2 extra VP this round" } } },
  deal_with_federal_government: { id: "deal_with_federal_government", type: "strategy", name: "Deal w/ Federal Govt", cost: null, vp: null,
    actions: { N: { icon: "money", text: "Lose 1 water claim: Gain $3" }, C: null } },
  donate_to_sc_justice:  { id: "donate_to_sc_justice", type: "strategy", name: "Donate to SC Justice", cost: null, vp: null,
    actions: { N: { icon: null, text: "Switch the order of any two upcoming SC cards" }, C: null } },
  scorched_earth_negotiating: { id: "scorched_earth_negotiating", type: "strategy", name: "Scorched Earth", cost: null, vp: null,
    actions: { N: { icon: null, text: "Pay $2 & lose 1 PR: All opponents lose 1 water cube" }, C: null } },
  water_bribe:           { id: "water_bribe", type: "strategy", name: "Water Bribe", cost: null, vp: null,
    actions: { N: null, C: { icon: null, text: "Give 1 water cube to an opponent: they must give you $3" } } },
  protect_our_interests: { id: "protect_our_interests", type: "strategy", name: "Protect Our Interests", cost: null, vp: null,
    actions: { N: { icon: null, text: "Negate the effect(s) of any 1 card played or lawyer used" }, C: null } },
  red_herring_case:      { id: "red_herring_case", type: "strategy", name: "Red Herring Case", cost: null, vp: null,
    actions: { N: { icon: null, text: "Choose any 2 lawyers. They cannot be used this round." }, C: null } },
  quid_pro_quo:          { id: "quid_pro_quo", type: "strategy", name: "Quid Pro Quo", cost: null,
    actions: { N: { icon: "water", text: "Pay $4: Gain 2 water cubes" }, C: null } },
  lobby_federal_government: { id: "lobby_federal_government", type: "strategy", name: "Lobby Federal Govt", cost: null,
    actions: { N: { icon: "water_claim", text: "Pay $3: Gain 1 water claim" }, C: null } },
  arizona_v_california:  { id: "arizona_v_california",  type: "sc_case", name: "Arizona v. California",  plaintiff: { id: "arizona" },    defendant: { id: "california" } },
  arizona_v_nevada:      { id: "arizona_v_nevada",      type: "sc_case", name: "Arizona v. Nevada",      plaintiff: { id: "arizona" },    defendant: { id: "nevada" } },
  california_v_chemehuevi: { id: "california_v_chemehuevi", type: "sc_case", name: "California v. Chemehuevi", plaintiff: { id: "california" }, defendant: { id: "chemehuevi" } },
  supreme_court_session: { id: "supreme_court_session", type: "event", name: "Supreme Court Session" },
  severe_drought:        { id: "severe_drought",        type: "event", name: "Severe Drought" },
  protest_a:             { id: "protest_a",             type: "event", name: "Protest A" },
  large_snow_melt:       { id: "large_snow_melt",       type: "event", name: "Large Snow Melt" },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_ORDER = ["event", "action_n", "water", "action_c", "income", "cleanup"];
const PHASE_LABELS = {
  event: "Event", action_n: "Action · N", water: "Water",
  action_c: "Court · C", income: "Income", cleanup: "Cleanup",
};
const CARD_COLORS = {
  lawyer: "var(--lawyer)", activist: "var(--activist)",
  citizen: "var(--citizen)", strategy: "var(--strategy)",
  event: "var(--event)", sc_case: "var(--gold)",
};

// ── Lawyer cost helpers (mirrors trackManager.js logic) ─────────────────────
const PR_FREE_THRESHOLDS = [-7, 8];  // PR values that waive the $4 surcharge
const LAWYER_SURCHARGE   = 4;

function uiLawyerCost(cardDef, currentPr, pendingDiscount = 0) {
  if (!cardDef) return 0;
  const atThreshold = PR_FREE_THRESHOLDS.includes(currentPr);
  const base = cardDef.cost + (atThreshold ? 0 : LAWYER_SURCHARGE);
  return Math.max(0, base - pendingDiscount);
}

function uiCanAcquireWithPr(cardDef, currentPr) {
  if (!cardDef?.pr_requirement) return true;
  const { operator, value } = cardDef.pr_requirement;
  if (operator === 'lte') return currentPr <= value;
  if (operator === 'gte') return currentPr >= value;
  return true;
}

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

  const prOk = satisfiesPrRequirement(def.pr_requirement, prValue ?? 0);
  const cardDisabled = disabled || !prOk;

  const cls = ["card-face", exhausted && "exhausted", locked && "locked"].filter(Boolean).join(" ");

  // Which side button to show
  const showN = interactive && phase === "action_n" && !!def.actions?.N;
  const showC = interactive && phase === "action_c" && !!def.actions?.C;

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
          !prOk     ? `PR requirement not met (need ${def.pr_requirement?.operator === "gte" ? "≥" : "≤"} ${def.pr_requirement?.value})` :
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
          fontSize: 8,
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
          <span className="f-mono" style={{ fontSize: 8, color: prOk ? "var(--t3)" : "var(--pr-neg)" }}>
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

      {/* N action */}
      {def.actions?.N ? (
        <div style={{
          padding: "5px 7px",
          borderBottom: def.actions?.C ? "1px solid var(--b0)" : "none",
          minHeight: 36,
          background: showN ? "var(--bg3)" : undefined,
        }}>
          <div className="f-mono" style={{ fontSize: 8, color: showN ? "var(--terra)" : "var(--t3)", marginBottom: 2 }}>N ·</div>
          <div className="f-body" style={{ fontSize: 10, color: "var(--t2)", lineHeight: 1.35 }}>
            {def.actions.N.icon && <span style={{ marginRight: 3 }}>{ACTION_ICONS[def.actions.N.icon] || def.actions.N.icon}</span>}
            {def.actions.N.text}
          </div>
          {showN && <PlayBtn side="N" />}
        </div>
      ) : (
        <div style={{ padding: "5px 7px", borderBottom: def.actions?.C ? "1px solid var(--b0)" : "none", minHeight: 36 }}>
          <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)" }}>N · —</div>
        </div>
      )}

      {/* C action */}
      {def.actions?.C && (
        <div style={{
          padding: "5px 7px",
          minHeight: 36,
          background: showC ? "var(--bg3)" : undefined,
        }}>
          <div className="f-mono" style={{ fontSize: 8, color: showC ? "var(--water)" : "var(--t3)", marginBottom: 2 }}>C ·</div>
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
 *   onAcquire       fn(marketIndex)
 */
function MarketGrid({
  slots, label, deckCount,
  isActivePlayer = false, phase, marketType, activePlayer, onAcquire,
}) {
  const inActionPhase = phase === 'action_n' || phase === 'action_c';
  const showButtons   = isActivePlayer && inActionPhase && !!activePlayer;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <Label style={{ margin: 0 }}>{label}</Label>
        {showButtons && marketType === "lawyer" && (activePlayer?.pendingLawyerDiscount ?? 0) > 0 && (
          <span className="f-mono" style={{
            fontSize: 8, color: "var(--gold)",
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
            cost = uiLawyerCost(cardDef, pr, disc);
            const prOk = uiCanAcquireWithPr(cardDef, pr);
            if (!prOk)             { reason = 'PR req not met'; }
            else if (money < cost) { reason = `Need $${cost}`; }
            else                   { canAcquire = true; }
          }

          if (showButtons && marketType === 'activist') {
            const hasBusiness = activePlayer.partnerships?.business;
            const money       = activePlayer.moneyTrack?.value ?? 0;
            cost = 3;
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
                    fontSize:      8,
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
                    <span key={pid} className="f-mono" style={{ fontSize: 8, color: FACTION_COLORS[players[pid].factionId] || "var(--t3)" }}>
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

function ProjectGroup({ type, projects }) {
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
              {isFull    && <span className="f-mono" style={{ fontSize: 8, color: "var(--water-bright)" }}>✓</span>}
              {isPartial && (
                <span className="f-mono"
                  title="Water carries over, but you will lose 1 Water Claim at end of Income phase"
                  style={{ fontSize: 9, color: "var(--terra)", cursor: "default" }}>
                  −◈
                </span>
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
          fontSize: 8, color: "var(--gold)", padding: "2px 8px",
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
                fontSize: 8, marginBottom: 2,
                color: owned ? "var(--gold)" : "var(--t3)",
              }}>{p.label}</div>
              <div className="f-mono" style={{ fontSize: 8, color: owned ? "var(--t2)" : "var(--t4)", marginBottom: 4 }}>
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
                    fontFamily: "'Courier Prime', monospace", fontSize: 8,
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
                    fontFamily: "'Courier Prime', monospace", fontSize: 8,
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
  const hasCubes        = (player?.waterCubes ?? 0) > 0;
  const canWithdraw     = unlocked && stored > 0;

  // Other players with unlocked banks this player could deposit into
  const otherBanks = playerOrder
    .filter(pid => pid !== player?.id && allPlayers[pid]?.waterBank?.unlocked)
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
          <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)" }}>
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

          {/* Deposit into OTHER players' banks */}
          {otherBanks.map(owner => {
            const space = 9 - owner.waterBank.stored;
            const depositCount = Math.min(space, player?.waterCubes ?? 0);
            const cost = depositCount * 1;
            const canDeposit = depositCount > 0 && (player?.moneyTrack?.value ?? 0) >= cost && hasCubes;
            return (
              <button
                key={owner.id}
                disabled={!canDeposit}
                onClick={() => canDeposit && onDeposit?.(owner.id, 1)}
                title={canDeposit ? `Deposit 1 cube to ${owner.name}'s bank ($1)` : `Can't deposit`}
                onMouseEnter={e => { if (canDeposit) e.currentTarget.style.background = "var(--water)11"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                style={miniBtn(canDeposit ? "var(--water-dim)" : null)}>
                +1 → {owner.name.slice(0, 6)}
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
    fontSize: 8, letterSpacing: "0.1em",
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
 *   isActivePlayer  boolean          — true when this player is the active player this turn
 *   phase           string           — current game phase
 *   onPlayCard      fn(cardId, side) — fires when a tableau card play button is clicked
 */
/**
 * PlayerBoard
 *
 * Extra props for interactive mode:
 *   isActivePlayer  boolean
 *   phase           string
 *   activeCaseId    string|null  — docket[0], for SC influence buttons
 *   allPlayers      object       — full players map (for water bank deposits)
 *   playerOrder     string[]
 *   onPlayCard      fn(cardId, side)
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
  onPlayCard,
  onBuyPartnership, onUsePartnership,
  onUnlockBank, onDeposit, onWithdraw,
  onPlaceScInfluence,
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
        <ProjectGroup type="citizen" projects={player.projects} />
        <ProjectGroup type="income"  projects={player.projects} />
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
      {activeCaseId && isActivePlayer && (phase === "action_n" || phase === "action_c") && (
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
                  fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
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
                interactive={isActivePlayer && (phase === "action_n" || phase === "action_c")}
                phase={phase}
                prValue={prValue}
                canPlay={isActivePlayer}
                onPlay={(side) => onPlayCard?.(instance.cardId, side)}
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
 * Renders strategy cards held in the active player's hand.
 * In action_n phase, each card shows a "Play" button that fires onPlayStrategy.
 *
 * Props
 *   hand             string[]         — array of cardIds
 *   isActivePlayer   boolean
 *   phase            string
 *   onPlayStrategy   fn(cardId)       — plays the card as its N-side action
 */
function StrategyHand({ hand, isActivePlayer = false, phase, onPlayStrategy }) {
  const showPlay = isActivePlayer && phase === "action_n";

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px 16px",
        background: "var(--bg1)", borderTop: "1px solid var(--b0)", minHeight: 72, overflowX: "auto" }}>
      <div style={{ marginRight: 4, flexShrink: 0 }}>
        <Label style={{ marginBottom: 2 }}>Hand</Label>
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>{hand.length} card{hand.length !== 1 ? "s" : ""}</span>
      </div>
      {hand.length === 0 ? (
        <span className="f-mono" style={{ fontSize: 10, color: "var(--t4)" }}>— no strategy cards —</span>
      ) : (
        hand.map((cardId, i) => {
          const def = CARD_INDEX[cardId];
          return (
            <div key={`${cardId}_${i}`} style={{ position: "relative", flexShrink: 0 }}>
              <CardFace cardId={cardId} exhaustState="ready" width={120} />
              {showPlay && def && (
                <button
                  onClick={() => onPlayStrategy?.(cardId)}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--strategy)22"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  style={{
                    marginTop: 3,
                    width: "100%",
                    padding: "3px 0",
                    background: "transparent",
                    border: "1px solid var(--strategy)",
                    borderRadius: 2,
                    color: "var(--strategy)",
                    fontFamily: "'Courier Prime', 'Courier New', monospace",
                    fontSize: 8,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}>
                  Play
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

function PhaseBar({ state, activePlayer, canUndo, canRedo, onUndo, onRedo, children }) {
  const phaseIdx = PHASE_ORDER.indexOf(state.phase);
  const fColor   = FACTION_COLORS[activePlayer?.factionId] || "var(--terra)";

  return (
    <div style={{ height: 44, background: "var(--bg1)", borderBottom: "1px solid var(--b0)",
        display: "flex", alignItems: "center", paddingInline: 16, gap: 16, flexShrink: 0 }}>

      {/* Game title */}
      <span className="f-display" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
        Law of the River
      </span>

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

      {/* Phase controls (End Turn / Advance) */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
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

function ActionLog({ log, pendingEffects }) {
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
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
              <span className="f-mono" style={{ fontSize: 8, color: "var(--t4)" }}>{formatTime(entry.timestamp)}</span>
              {entry.type === "phase_start" && (
                <span className="f-mono" style={{ fontSize: 8, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
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
  onAcquireLawyer, onAcquireActivist,
}) {
  const { lawyerMarket, lawyerDeck, activistMarket, activistDeck,
          eventDeck, strategyDeck, strategyDiscard, docket } = sharedBoard;

  const nextEvent = eventDeck[0];
  const nextEventDef = CARD_INDEX[nextEvent];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%", overflowY: "auto", padding: "12px 10px" }}>

      <MarketGrid
        label="Lawyer Market" slots={lawyerMarket} deckCount={lawyerDeck.length}
        isActivePlayer={isActivePlayer} phase={phase} marketType="lawyer"
        activePlayer={activePlayer} onAcquire={onAcquireLawyer}
      />
      <Divider />
      <MarketGrid
        label="Activist Market" slots={activistMarket} deckCount={activistDeck.length}
        isActivePlayer={isActivePlayer} phase={phase} marketType="activist"
        activePlayer={activePlayer} onAcquire={onAcquireActivist}
      />
      <Divider />
      <DocketQueue docket={docket} playerOrder={playerOrder} players={players} />
      <Divider />

      {/* Event Deck */}
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <Label style={{ margin: 0 }}>Event Deck</Label>
          <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)", marginLeft: "auto" }}>{eventDeck.length} left</span>
        </div>
        <div style={{ padding: "7px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)" }}>
          <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)", marginBottom: 3 }}>Next event:</div>
          <div className="f-display" style={{ fontSize: 10, color: "var(--event)" }}>{nextEventDef?.name || "—"}</div>
        </div>
      </div>

      <Divider />

      {/* Strategy Deck */}
      <div>
        <Label>Strategy Deck</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "5px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)", flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)" }}>Draw</div>
            <div className="f-mono" style={{ fontSize: 16, color: "var(--strategy)" }}>{strategyDeck.length}</div>
          </div>
          <div style={{ padding: "5px 9px", border: "1px solid var(--b1)", borderRadius: 2, background: "var(--bg3)", flex: 1 }}>
            <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)" }}>Discard</div>
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
 */
function ChoiceResolutionModal({ effect, state, onResolve, onUndo }) {
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);

  if (!effect) return null;

  const player = state.players[effect.playerId];
  const fColor = FACTION_COLORS[player?.factionId] || 'var(--terra)';

  // ── Shared chrome ──────────────────────────────────────────────────────────
  function Modal({ title, subtitle, children }) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 110,
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
            <div>
              <div className="f-display" style={{ fontSize: 12, color: 'var(--terra)', letterSpacing: '0.06em' }}>
                {title}
              </div>
              {subtitle && (
                <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Shared confirm button
  function ConfirmBtn({ label, disabled, onClick }) {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--terra)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = disabled ? 'var(--t4)' : 'var(--terra)'; }}
        style={{
          marginTop: 16, padding: '6px 20px',
          background: 'none',
          border: `1px solid ${disabled ? 'var(--b1)' : 'var(--terra)'}`,
          borderRadius: 2,
          color: disabled ? 'var(--t4)' : 'var(--terra)',
          fontFamily: "'Courier Prime', monospace",
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          transition: 'all 0.15s',
        }}>
        {label}
      </button>
    );
  }

  // Shared selectable card chip
  function CardChip({ cardId, instanceId, selected, onClick, extra }) {
    const def = CARD_INDEX[cardId];
    const typeColor = CARD_COLORS[def?.type] || 'var(--t2)';
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px',
          border: `1px solid ${selected ? 'var(--terra)' : 'var(--b2)'}`,
          borderRadius: 2,
          background: selected ? 'var(--bg4)' : 'var(--bg3)',
          cursor: 'pointer', transition: 'all 0.12s',
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
              onClick={() => {
                if (selA === null) { setSelA(idx); }
                else if (selB === null && idx !== selA) { setSelB(idx); }
                else { setSelA(idx); setSelB(null); }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 2, marginBottom: 4, cursor: 'pointer',
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
              {idx === 0 && <span className="f-mono" style={{ fontSize: 8, color: 'var(--terra)' }}>active</span>}
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
              onClick={() => setSelA(pid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 2, marginBottom: 4, cursor: 'pointer',
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
        subtitle="All players may activate activists. Player with lowest influence loses.">
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 12 }}>
          Current influence (activists were played earlier this round):
        </div>
        {state.playerOrder.map(pid => {
          const p  = state.players[pid];
          const fC = FACTION_COLORS[p.factionId] || 'var(--t2)';
          return (
            <div key={pid} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 2, marginBottom: 4,
              border: '1px solid var(--b1)', background: 'var(--bg3)',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: fC }} />
              <span className="f-body" style={{ fontSize: 12, color: 'var(--t1)', flex: 1 }}>{p.name}</span>
              <span className="f-mono" style={{ fontSize: 14, color: 'var(--pr-pos)', fontWeight: 700 }}>
                {p.protestInfluence ?? 0}
              </span>
              <span className="f-mono" style={{ fontSize: 9, color: 'var(--t4)' }}>influence</span>
            </div>
          );
        })}
        <div className="f-mono" style={{
          fontSize: 9, color: 'var(--terra-dim)',
          marginTop: 12, padding: '6px 10px',
          border: '1px solid var(--terra-dim)', borderRadius: 2, lineHeight: 1.5,
        }}>
          ⚠ Once you click Resolve, the player(s) with the lowest influence receive penalties.
          Make sure all activists have been played first.
        </div>
        <ConfirmBtn
          label="Resolve Protest"
          disabled={false}
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
              <strong style={{ color: 'var(--terra)' }}>Undo Card Play</strong> — restores state
              to before the card was played. The strategy card returns to your hand.
              <br />
              <strong style={{ color: 'var(--t3)' }}>Dismiss</strong> — the card effect fizzles.
              The card stays exhausted and is discarded at cleanup.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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
              <button
                onClick={() => onResolve({ subtype: effect.subtype, playerId: effect.playerId, targetInstanceIds: [] })}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--b2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  flex: 1, padding: '6px 0',
                  background: 'transparent',
                  border: '1px solid var(--b2)',
                  borderRadius: 2,
                  color: 'var(--t3)',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s',
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
    // Own lawyers activated (exhausted or locked) this phase
    const ownLawyers = (player?.tableau || []).filter(inst => {
      const def = CARD_INDEX[inst.cardId];
      return def?.type === 'lawyer' && inst.exhaustState === 'exhausted';
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
    // Cases where the active player has no influence (not involved)
    const docket = state.sharedBoard.docket || [];
    const uninvolvedCases = docket.filter(caseId => {
      const caseDef = CARD_INDEX[caseId];
      if (!caseDef) return false;
      const isPlaintiff = caseDef.plaintiff?.id === player?.factionId;
      const isDefendant = caseDef.defendant?.id === player?.factionId;
      return !isPlaintiff && !isDefendant;
    });
    return (
      <Modal
        title="Rider of Coat-tails C — Claim Case Bonus"
        subtitle={`${player?.name} — choose a SC case won this round you were not involved in`}>
        <div className="f-mono" style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 10 }}>
          Cases you are not party to:
        </div>
        {uninvolvedCases.length === 0 && (
          <div className="f-mono" style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 8 }}>
            No eligible cases. Effect has no valid target.
          </div>
        )}
        {uninvolvedCases.map(caseId => (
          <div
            key={caseId}
            onClick={() => setSelA(caseId)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 2, marginBottom: 4, cursor: 'pointer',
              border: `1px solid ${selA === caseId ? 'var(--terra)' : 'var(--b2)'}`,
              background: selA === caseId ? 'var(--bg4)' : 'var(--bg3)',
              transition: 'all 0.12s',
            }}>
            <span style={{ fontSize: 11 }}>⚖</span>
            <span className="f-display" style={{ fontSize: 10, color: 'var(--t1)', flex: 1 }}>
              {CARD_INDEX[caseId]?.name || caseId}
            </span>
            {selA === caseId && <span className="f-mono" style={{ fontSize: 9, color: 'var(--terra)' }}>✓</span>}
          </div>
        ))}
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
            onClick={() => onResolve({ subtype: effect.subtype, playerId: effect.playerId,
              cardId: effect.cardId, direction: 1 })}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--water)22'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              flex: 1, padding: '10px 0',
              background: 'transparent', border: '1px solid var(--water)',
              borderRadius: 2, color: 'var(--water)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            ▲ Gain 1
          </button>
          <button
            onClick={() => onResolve({ subtype: effect.subtype, playerId: effect.playerId,
              cardId: effect.cardId, direction: -1 })}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terra)22'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              flex: 1, padding: '10px 0',
              background: 'transparent', border: '1px solid var(--terra)',
              borderRadius: 2, color: 'var(--terra)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.15s',
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
              onClick={() => onResolve({
                subtype: effect.subtype,
                playerId: effect.playerId,
                cardId: effect.cardId,
                side: effect.side,
                alternativeIdx: opt.idx,
              })}
              onMouseEnter={e => { e.currentTarget.style.background = fColor + '18'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                background: 'transparent',
                border: `1px solid ${opt.idx === 0 ? fColor : 'var(--b2)'}`,
                borderRadius: 2,
                color: opt.idx === 0 ? 'var(--t1)' : 'var(--t2)',
                fontFamily: "'Courier Prime', monospace",
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 8, color: opt.idx === 0 ? fColor : 'var(--t4)',
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

// ─────────────────────────────────────────────────────────────────────────────
// WATER ALLOCATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WaterAllocationModal
 *
 * Shown during the WATER phase while the water_allocation pendingEffect is
 * unresolved.  Lets all players distribute water cubes to their projects.
 *
 * Layout:
 *   - Water supply counter (shared pool, live)
 *   - One section per player; their projects listed as rows
 *   - Each project row shows current fill, +1 / Fill / −1 buttons
 *   - "Done" button dismisses the pendingEffect, enabling Advance
 *
 * Props
 *   state           full gameState
 *   waterSupply     number (from sharedBoard.waterSupply)
 *   onAllocate      fn(playerId, projectType, projectId, count)
 *   onDone          fn() — clears the water_allocation pendingEffect
 */
function WaterAllocationModal({ state, waterSupply, onAllocate, onDone }) {
  const allDefs = {
    citizen: PROJECT_DEFS.citizen,
    income:  PROJECT_DEFS.income,
  };

  // Tally unfilled slots across all players to show a "fill all" affordance
  const totalUnfilled = state.playerOrder.reduce((sum, pid) => {
    const p = state.players[pid];
    return sum + Object.entries({ ...p.projects.citizen, ...p.projects.income })
      .reduce((s, [, proj]) => s + Math.max(0, proj.water_slots - proj.watered), 0);
  }, 0);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      background: "rgba(13,11,8,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--water-dim)",
        borderRadius: 4, width: "100%", maxWidth: 700,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--b1)",
          display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
        }}>
          <span className="f-display" style={{ fontSize: 13, color: "var(--water)", letterSpacing: "0.08em" }}>
            Water Allocation
          </span>
          <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase",
              letterSpacing: "0.12em" }}>
            Round {state.round}
          </span>

          {/* Supply counter */}
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 10,
            padding: "5px 14px", border: "1px solid var(--water-dim)",
            borderRadius: 2, background: "var(--bg3)",
          }}>
            <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase",
                letterSpacing: "0.1em" }}>
              Supply
            </span>
            <span className="f-mono" style={{
              fontSize: 22, color: waterSupply > 0 ? "var(--water-bright)" : "var(--t4)",
              fontWeight: 700, lineHeight: 1,
            }}>
              {waterSupply}
            </span>
            <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)" }}>💧</span>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {state.playerOrder.map((pid) => {
            const player = state.players[pid];
            const fColor = FACTION_COLORS[player.factionId] || "var(--terra)";
            return (
              <div key={pid} style={{ marginBottom: 20 }}>
                {/* Player sub-header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 8, paddingBottom: 5,
                  borderBottom: "1px solid var(--b1)",
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: 1, background: fColor }} />
                  <span className="f-body" style={{ fontSize: 12, color: "var(--t1)" }}>{player.name}</span>
                  <span className="f-mono" style={{ fontSize: 9, color: "var(--water)", marginLeft: 4 }}>
                    {player.waterCubes} 💧
                  </span>
                </div>

                {/* Projects */}
                {["citizen", "income"].map((ptype) => (
                  <div key={ptype} style={{ marginBottom: 8 }}>
                    <div className="f-mono" style={{ fontSize: 8, color: "var(--t4)",
                        textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 4 }}>
                      {ptype === "citizen" ? "Citizen Projects" : "Income Projects"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {allDefs[ptype].map((def) => {
                        const proj     = player.projects[ptype]?.[def.id] || { watered: 0, water_slots: def.slots };
                        const slots    = proj.water_slots ?? def.slots;
                        const watered  = proj.watered;
                        const full     = watered >= slots;
                        const empty    = watered === 0;
                        const canAdd1  = !full && waterSupply >= 1;
                        const canFill  = !full && waterSupply >= (slots - watered);
                        const canSub1  = watered > 0;

                        const rowBorder = full
                          ? "var(--water-dim)"
                          : watered > 0 ? "var(--terra-dim)" : "var(--b0)";

                        return (
                          <div key={def.id} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 8px",
                            background: "var(--bg3)",
                            border: `1px solid ${rowBorder}`,
                            borderRadius: 2,
                          }}>
                            <span style={{ fontSize: 11, flexShrink: 0 }}>{def.icon}</span>
                            <span className="f-body" style={{ fontSize: 11, color: "var(--t2)", minWidth: 80 }}>
                              {def.label}
                            </span>

                            {/* Water slots visual */}
                            <div style={{ display: "flex", gap: 3, flex: 1 }}>
                              {Array.from({ length: slots }).map((_, i) => (
                                <div key={i} className={`wslot ${i < watered ? "on" : ""}`} />
                              ))}
                              <span className="f-mono" style={{ fontSize: 9, color: "var(--t4)", marginLeft: 4 }}>
                                {watered}/{slots}
                              </span>
                            </div>

                            {/* Reward label */}
                            <span className="f-mono" style={{
                              fontSize: 8,
                              color: ptype === "citizen" ? "var(--pr-pos)" : "var(--money)",
                              minWidth: 70, textAlign: "right",
                            }}>
                              {def.reward}
                            </span>

                            {/* Allocation buttons */}
                            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                              <AllocBtn
                                label="−"
                                enabled={canSub1}
                                color="var(--terra)"
                                title="Remove 1 water cube"
                                onClick={() => onAllocate(pid, ptype, def.id, -1)}
                              />
                              <AllocBtn
                                label="+1"
                                enabled={canAdd1}
                                color="var(--water)"
                                title="Add 1 water cube"
                                onClick={() => onAllocate(pid, ptype, def.id, 1)}
                              />
                              <AllocBtn
                                label="Fill"
                                enabled={canFill}
                                color="var(--water-bright)"
                                title={`Fill all ${slots - watered} remaining slots`}
                                onClick={() => onAllocate(pid, ptype, def.id, slots - watered)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--b1)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          {waterSupply > 0 && (
            <span className="f-mono" style={{ fontSize: 9, color: "var(--water-dim)", letterSpacing: "0.08em" }}>
              {waterSupply} cube{waterSupply !== 1 ? "s" : ""} remain unallocated
            </span>
          )}
          {waterSupply === 0 && (
            <span className="f-mono" style={{ fontSize: 9, color: "var(--water-bright)", letterSpacing: "0.08em" }}>
              ✓ All water distributed
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {/* Always allow Done — players may intentionally leave supply unspent */}
            <button
              onClick={onDone}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--water)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--water)"; }}
              style={{
                background: "none",
                border: "1px solid var(--water)",
                borderRadius: 2,
                color: "var(--water)",
                fontFamily: "'Courier Prime', 'Courier New', monospace",
                fontSize: 10,
                letterSpacing: "0.14em",
                padding: "6px 20px",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}>
              Done Allocating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small +/− allocation button used inside WaterAllocationModal */
function AllocBtn({ label, enabled, color, title, onClick }) {
  return (
    <button
      disabled={!enabled}
      title={title}
      onClick={onClick}
      onMouseEnter={e => { if (enabled) e.currentTarget.style.background = color + "22"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      style={{
        background: "transparent",
        border: `1px solid ${enabled ? color : "var(--b1)"}`,
        borderRadius: 2,
        color: enabled ? color : "var(--t4)",
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        fontSize: 9,
        padding: "2px 7px",
        cursor: enabled ? "pointer" : "not-allowed",
        opacity: enabled ? 1 : 0.4,
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}>
      {label}
    </button>
  );
}

/**
 * PhaseControls
 *
 * Action phases  (action_n / action_c):
 *   Shows "End Turn" for the active player.
 *   Other players see a dimmed "Waiting…" indicator.
 *
 * Water phase:
 *   Shows "Advance" but disabled while a water_allocation pendingEffect
 *   is unresolved — forces players to allocate cubes first.
 *
 * Event phase:
 *   Shows "Advance" but disabled while a protest_activation_round
 *   pendingEffect is unresolved.
 *
 * Income / Cleanup:
 *   Shows "Advance" always enabled — engine auto-resolves these.
 */
function PhaseControls({ phase, activePlayer, viewingPlayer, pendingEffects, endPlayerTurn, advanceToNextPhase }) {
  const inActionPhase = isActionPhase(phase);
  const isYourTurn    = activePlayer?.id === viewingPlayer?.id;

  // Block Advance if there are effects that require player decisions first
  const BLOCKING_EFFECT_TYPES = new Set([
    'water_allocation',
    'protest_activation_round',
    'choice_required',
  ]);
  const hasBlockingEffect = pendingEffects.some(e => BLOCKING_EFFECT_TYPES.has(e.type));

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

  // ── Action phase: End Turn ───────────────────────────────────────────────
  if (inActionPhase) {
    if (!isYourTurn) {
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
        <span className="f-mono" style={{ fontSize: 9, color: "var(--t3)", letterSpacing: "0.08em" }}>
          Your turn
        </span>
        <button
          style={btn("var(--terra)")}
          onClick={endPlayerTurn}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--terra)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--terra)"; }}>
          End Turn →
        </button>
      </div>
    );
  }

  // ── Non-action phases: Advance ───────────────────────────────────────────
  const advanceBlocked = hasBlockingEffect;
  const blockReason = advanceBlocked
    ? (pendingEffects.find(e => e.type === 'water_allocation')
        ? "Allocate water before advancing"
        : pendingEffects.find(e => e.type === 'protest_activation_round')
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

  const sorted = [...finalScores].sort((a, b) => b.totalVP - a.totalVP);

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
          {sorted.map((entry, i) => {
            const fColor = FACTION_COLORS[entry.factionId] || "var(--t2)";
            return (
              <div key={entry.playerId} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                background: i === 0 ? "var(--bg4)" : "var(--bg3)",
                border: `1px solid ${i === 0 ? fColor + "66" : "var(--b0)"}`,
                borderRadius: 2,
              }}>
                <span className="f-mono" style={{ fontSize: 11, color: "var(--t4)", minWidth: 16 }}>
                  {i === 0 ? "★" : `${i + 1}.`}
                </span>
                <div style={{ width: 7, height: 7, borderRadius: 1, background: fColor, flexShrink: 0 }} />
                <span className="f-body" style={{ flex: 1, fontSize: 13, color: i === 0 ? "var(--t1)" : "var(--t2)" }}>
                  {entry.name}
                </span>
                <span className="f-mono" style={{ fontSize: 16, color: "var(--vp)", fontWeight: 700 }}>
                  {entry.totalVP}
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
  // ── Live store values ──────────────────────────────────────────────
  const storeState         = useGameStore(s => s.gameState);
  const storePending       = useGameStore(s => s.pendingEffects);
  const isGameOver         = useGameStore(s => s.isGameOver);
  const finalScores        = useGameStore(s => s.finalScores);
  const endPlayerTurn      = useGameStore(s => s.endPlayerTurn);
  const advanceToNextPhase = useGameStore(s => s.advanceToNextPhase);
  const playCardAction             = useGameStore(s => s.playCardAction);
  const allocateWater              = useGameStore(s => s.allocateWater);
  const dismissWaterAllocation     = useGameStore(s => s.dismissWaterAllocation);
  const deallocateWater            = useGameStore(s => s.deallocateWater);
  const purchasePartnership        = useGameStore(s => s.purchasePartnership);
  const usePartnershipAbility      = useGameStore(s => s.usePartnershipAbility);
  const unlockWaterBank            = useGameStore(s => s.unlockWaterBank);
  const depositToWaterBank         = useGameStore(s => s.depositToWaterBank);
  const withdrawFromWaterBank      = useGameStore(s => s.withdrawFromWaterBank);
  const placeScInfluence           = useGameStore(s => s.placeScInfluence);
  const resolveChoice              = useGameStore(s => s.resolveChoice);
  const acquireLawyer              = useGameStore(s => s.acquireLawyer);
  const acquireActivist            = useGameStore(s => s.acquireActivist);
  const undo                       = useGameStore(s => s.undo);
  const redo                       = useGameStore(s => s.redo);
  const dismissChoiceEffect        = useGameStore(s => s.dismissChoiceEffect);
  const canUndo = (state.undoStack?.length ?? 0) > 0;
  const canRedo = (state.redoStack?.length ?? 0) > 0;

  // Fall back to mock when running standalone (no initGame called yet)
  const state          = storeState ?? MOCK_STATE;
  const pendingEffects = storeState ? (storePending ?? []) : (MOCK_STATE.pendingEffects ?? []);

  // Merge real card definitions into the display lookup (real data wins over mock stubs)
  if (state.cardIndex) Object.assign(CARD_INDEX, state.cardIndex);

  // ── Local UI state ────────────────────────────────────────────────
  const [viewedPlayerId, setViewedPlayerId] = useState(state.playerOrder[0]);

  // Track the active player; auto-switch the viewed tab to follow them
  const activeId = state.playerOrder[state.activePlayerIndex];
  useEffect(() => { setViewedPlayerId(activeId); }, [activeId]);

  // Guard against a stale viewedPlayerId after state changes
  const safeViewedId = state.players[viewedPlayerId] ? viewedPlayerId : state.playerOrder[0];
  const activePlayer = state.players[activeId];
  const viewedPlayer = state.players[safeViewedId];

  // ── Handlers ─────────────────────────────────────────────────────
  // In mock/dev mode, these are no-ops so buttons render without crashing
  const handleEndTurn      = storeState ? endPlayerTurn      : () => {};
  const handleAdvancePhase = storeState ? advanceToNextPhase : () => {};
  const handlePlayAgain    = () => window.location.reload();

  // Card action handler — routes through the store's playCardAction.
  // playerId is always the active player (engine enforces turn order).
  const handlePlayCard = (cardId, side) => {
    if (storeState && activePlayer) playCardAction(activePlayer.id, cardId, side);
  };
  const handlePlayStrategy = (cardId) => handlePlayCard(cardId, 'N');

  // Water allocation handlers
  const waterAllocationEffect = pendingEffects.find(e => e.type === 'water_allocation');
  const handleAllocateWater = (playerId, projectType, projectId, count) => {
    if (!storeState) return;
    if (count > 0) {
      allocateWater(playerId, projectType, projectId, count);
    } else if (count < 0) {
      // Remove cubes: handled via a direct dispatch in the store
      deallocateWater(playerId, projectType, projectId, Math.abs(count));
    }
  };
  const handleDoneAllocating = () => {
    if (storeState) dismissWaterAllocation();
  };

  // Partnership handlers
  const handleBuyPartnership = (partnershipId) => {
    if (storeState && activePlayer) purchasePartnership(activePlayer.id, partnershipId);
  };
  const handleUsePartnership = (partnershipId) => {
    if (storeState && activePlayer) usePartnershipAbility(activePlayer.id, partnershipId);
  };

  // Water bank handlers
  const handleUnlockBank = () => {
    if (storeState && activePlayer) unlockWaterBank(activePlayer.id);
  };
  const handleDeposit = (ownerId, count) => {
    if (storeState && activePlayer) depositToWaterBank(activePlayer.id, ownerId, count);
  };
  const handleWithdraw = (count) => {
    if (storeState && activePlayer) withdrawFromWaterBank(activePlayer.id, count);
  };

  // SC influence handler
  const activeCaseId = state.sharedBoard?.docket?.[0] ?? null;
  const handlePlaceScInfluence = (caseId, amount) => {
    if (storeState && activePlayer) placeScInfluence(activePlayer.id, caseId, amount);
  };

  // Choice resolution
  const activeChoiceEffect = pendingEffects.find(e => e.type === 'choice_required');
  const handleResolveChoice = (choiceData) => {
    if (storeState) resolveChoice(choiceData);
  };

  // Market acquisition handlers
  const handleAcquireLawyer = (marketIndex) => {
    if (storeState && activePlayer) acquireLawyer(activePlayer.id, marketIndex);
  };
  const handleAcquireActivist = (marketIndex) => {
    if (storeState && activePlayer) acquireActivist(activePlayer.id, marketIndex);
  };

  // Global undo/redo handlers
  const handleUndo = () => { if (storeState) undo(); };
  const handleRedo = () => { if (storeState) redo(); };

  // Undo a card play from inside a choice modal (undo game state + clear the
  // pending effect, which lives outside gameState on the store top-level)
  const handleUndoChoiceCard = () => {
    if (!storeState) return;
    undo();
    if (activeChoiceEffect) dismissChoiceEffect(activeChoiceEffect.subtype);
  };

  return (
    <div className="grain" style={{ width: "100vw", height: "100vh", display: "flex",
        flexDirection: "column", background: "var(--bg0)", overflow: "hidden", position: "relative" }}>
      <GlobalStyles />

      {/* ── Game Over overlay ── */}
      {isGameOver && (
        <GameOverOverlay finalScores={finalScores} onPlayAgain={handlePlayAgain} />
      )}

      {/* ── Phase Bar ── */}
      <PhaseBar state={state} activePlayer={activePlayer} canUndo={canUndo} canRedo={canRedo} onUndo={handleUndo} onRedo={handleRedo}>
        <PhaseControls
          phase={state.phase}
          activePlayer={activePlayer}
          viewingPlayer={viewedPlayer}
          pendingEffects={pendingEffects}
          endPlayerTurn={handleEndTurn}
          advanceToNextPhase={handleAdvancePhase}
        />
      </PhaseBar>

      {/* ── Main 3-column layout ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 230px",
          overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — Shared board */}
        <div style={{ borderRight: "1px solid var(--b0)", overflowY: "auto" }}>
          <SharedBoardPanel
            sharedBoard={state.sharedBoard}
            playerOrder={state.playerOrder}
            players={state.players}
            isActivePlayer={safeViewedId === activeId}
            phase={state.phase}
            activePlayer={activePlayer}
            onAcquireLawyer={handleAcquireLawyer}
            onAcquireActivist={handleAcquireActivist}
          />
        </div>

        {/* CENTER — Player board */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

          {/* ── Choice Resolution Modal ── */}
          {activeChoiceEffect && storeState && (
            <ChoiceResolutionModal
              effect={activeChoiceEffect}
              state={state}
              onResolve={handleResolveChoice}
              onUndo={handleUndoChoiceCard}
            />
          )}

          {/* ── Water Allocation Modal ── */}
          {waterAllocationEffect && storeState && (
            <WaterAllocationModal
              state={state}
              waterSupply={state.sharedBoard.waterSupply}
              onAllocate={handleAllocateWater}
              onDone={handleDoneAllocating}
            />
          )}

          {/* Player switcher tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--b0)",
              padding: "0 16px", background: "var(--bg1)", flexShrink: 0 }}>
            {state.playerOrder.map((pid) => {
              const p = state.players[pid];
              const isActivePid = pid === activeId;
              const isViewed    = pid === safeViewedId;
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
                </button>
              );
            })}
          </div>

          {/* Scrollable board area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            <PlayerBoard
              player={viewedPlayer}
              isActivePlayer={safeViewedId === activeId}
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
            />
          </div>
        </div>

        {/* RIGHT — Action log */}
        <div style={{ borderLeft: "1px solid var(--b0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ActionLog log={state.actionLog} pendingEffects={pendingEffects} />
        </div>
      </div>

      {/* ── Strategy Hand (bottom strip) ── */}
      <StrategyHand
        hand={viewedPlayer.hand}
        isActivePlayer={safeViewedId === activeId}
        phase={state.phase}
        onPlayStrategy={handlePlayStrategy}
      />
    </div>
  );
}
