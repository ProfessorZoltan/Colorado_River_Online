// Throwaway feasibility probe: headless random-bot Monte Carlo on the real engine.
// Usage: node sim.mjs [games=200] [policy=random|waterfirst] [factions=arizona,california,nevada] [stripUndo=1]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/[/]$/, '');
const N        = +(process.argv[2] ?? 200);
const POLICY   = process.argv[3] ?? 'waterfirst';
const FACTIONS = (process.argv[4] ?? 'arizona,california,nevada').split(',');
const STRIP    = (process.argv[5] ?? '1') === '1';
const SEED0    = +(process.argv[6] ?? 12345);

// ── Seeded RNG: monkeypatch Math.random (engine uses it directly in utils.js) ──
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mulberry32(SEED0);
Math.random = () => rng();

// Silence engine console.warn noise (rejections are console.warn + return)
let warnCount = 0;
console.warn = () => { warnCount++; };

const load = f => JSON.parse(fs.readFileSync(path.join(REPO, 'src/data', f), 'utf8'));
const cards = load('cards.json'), pb = load('player_board.json'), sb = load('shared_board.json');
const { useGameStore } = await import(pathToFileURL(path.join(REPO, 'src/engine/gameStore.js')).href);
const S = () => useGameStore.getState();

const pick = a => a[Math.floor(rng() * a.length)];
const CI = Object.fromEntries(cards.map(c => [c.id, c]));

// ── Enumerate candidate actions for the active player ───────────────────────
function candidates(gs, pid, pending) {
  const p = gs.players[pid];
  const side = gs.phase === 'negotiate' ? 'N' : 'C';
  const out = [];
  for (const inst of p.tableau) {
    if (inst.exhaustState !== 'ready') continue;
    if (process.env.NOFF && inst.cardId === 'firefighter_a') continue;
    if (CI[inst.cardId].actions?.[side]) out.push({ k: 'card', f: () => S().playCardAction(pid, inst.cardId, side, { instanceId: inst.instanceId }), id: inst.cardId });
  }
  for (const cid of new Set(p.hand)) {
    if (CI[cid].actions?.[side]) out.push({ k: 'strat', f: () => S().playCardAction(pid, cid, side), id: cid });
  }
  gs.sharedBoard.lawyerMarket.forEach((cid, i) => { if (cid) out.push({ k: 'lawyer', f: () => S().acquireLawyer(pid, i), id: cid }); });
  for (const pt of ['law_firm', 'business', 'investment'])
    if (!p.partnerships[pt]) out.push({ k: 'partner', f: () => S().purchasePartnership(pid, pt), id: pt });
  if (gs.phase === 'consume' && p.waterClaims > 0 && gs.sharedBoard.waterSupply > 0) {
    for (const type of ['citizen', 'income'])
      for (const [prj, st] of Object.entries(p.projects[type]))
        if (st.watered < st.water_slots) out.push({ k: 'water', f: () => S().placeWaterOnProject(pid, type, prj), id: prj, type, st });
  }
  return out;
}

// Free actions (do not consume turn) — random bot sprinkles them in
function freeActions(gs, pid) {
  const p = gs.players[pid];
  const out = [];
  if (p.partnerships.investment && p.moneyTrack.value >= 2 && p.prTrack.value < 11) out.push(() => S().usePartnershipAbility(pid, 'investment'));
  if (p.partnerships.law_firm && p.moneyTrack.value >= 4) out.push(() => {
    S().usePartnershipAbility(pid, 'law_firm');
    const idx = gs.sharedBoard.lawyerMarket.map((c, i) => c ? i : -1).filter(i => i >= 0);
    if (idx.length) S().acquireLawyer(pid, pick(idx)); S().cancelPartnershipAcquire(pid);
  });
  if (p.partnerships.business && p.moneyTrack.value >= 3) out.push(() => {
    S().usePartnershipAbility(pid, 'business');
    const idx = gs.sharedBoard.activistMarket.map((c, i) => c ? i : -1).filter(i => i >= 0);
    if (idx.length) S().acquireActivist(pid, pick(idx)); S().cancelPartnershipAcquire(pid);
  });
  const active = gs.sharedBoard.docket[0];
  const cd = CI[active];
  if (p.waterCubes > 0 && cd && (cd.plaintiff.id === p.factionId || cd.defendant.id === p.factionId))
    out.push(() => S().placeScInfluence(pid, active, 1));
  return out;
}

// ── Choice resolution ────────────────────────────────────────────────────────
function resolveChoices() {
  let guard = 0;
  while (guard++ < 50) {
    const { pendingEffects, gameState: gs } = S();
    const e = pendingEffects.find(x => x.type === 'choice_required');
    if (!e) return;
    const pid = e.playerId;
    switch (e.subtype) {
      case 'protest_activation_round':
        for (const q of gs.playerOrder) {
          const acts = gs.players[q].tableau.filter(i => i.exhaustState === 'ready' && CI[i.cardId].type === 'activist' && CI[i.cardId].actions?.C?.icon === 'protest_influence');
          if (acts.length) S().activateProtestActivist(q, acts.sort((a, b) => CI[b.cardId].actions.C.text.localeCompare(CI[a.cardId].actions.C.text))[0].instanceId);
        }
        S().resolveChoice({ subtype: e.subtype, protestId: e.protestId }); break;
      case 'activist_a_water_direction':
        S().resolveChoice({ subtype: e.subtype, playerId: pid, cardId: e.cardId, direction: 1 }); break;
      case 'card_alternative_choice':
        S().resolveChoice({ subtype: e.subtype, playerId: pid, cardId: e.cardId, side: e.side, alternativeIdx: rng() < 0.5 ? 0 : 1 }); break;
      case 'red_herring_choose_lawyers': {
        const ls = gs.playerOrder.filter(q => q !== pid).flatMap(q => gs.players[q].tableau.filter(i => CI[i.cardId].type === 'lawyer').map(i => i.instanceId));
        S().resolveChoice({ subtype: e.subtype, playerId: pid, targetInstanceIds: ls.length >= 2 ? ls.slice(0, 2) : [] }); break;
      }
      case 'activist_c_look_and_draw':
        S().resolveChoice({ subtype: e.subtype, playerId: pid, chosenCardId: pick(e.options) }); break;
      case 'water_bribe_target':
        S().resolveChoice({ subtype: e.subtype, playerId: pid, targetPlayerId: pick(gs.playerOrder.filter(q => q !== pid)) }); break;
      case 'docket_swap': {
        const n = gs.sharedBoard.docket.length;
        S().resolveChoice({ subtype: e.subtype, playerId: pid, indexA: 0, indexB: n > 1 ? 1 + Math.floor(rng() * (n - 1)) : 0 }); break;
      }
      case 'rider_coattails_lawyer': {   // mirror UI filter (GameTable.jsx:1943)
        const own = gs.players[pid].tableau.filter(i => CI[i.cardId].type === 'lawyer' && i.exhaustState === 'exhausted' && (CI[i.cardId].cost ?? 0) > 1 && CI[i.cardId].actions?.N);
        S().resolveChoice({ subtype: e.subtype, playerId: pid, chosenCardId: own.length ? pick(own).cardId : null }); break;
      }
      case 'rider_coattails_case': {     // mirror UI filter (GameTable.jsx:1983)
        const f = gs.players[pid].factionId;
        const ok = (gs.sharedBoard.casesResolvedThisRound ?? []).map(r => r.caseId).filter(c => CI[c].plaintiff.id !== f && CI[c].defendant.id !== f);
        S().resolveChoice({ subtype: e.subtype, playerId: pid, caseId: ok.length ? pick(ok) : null }); break;
      }
      case 'negate_card_or_lawyer': {
        const t = gs.playerOrder.filter(q => q !== pid).flatMap(q => gs.players[q].tableau.map(i => i.instanceId));
        S().resolveChoice({ subtype: e.subtype, playerId: pid, targetInstanceId: t.length ? pick(t) : null }); break;
      }
      default: S().dismissChoiceEffect(e.subtype);
    }
  }
  throw new Error('choice loop');
}

// ── Bot turn ─────────────────────────────────────────────────────────────────
function botTurn(stats) {
  const gs = S().gameState;
  const pid = gs.playerOrder[gs.activePlayerIndex];
  // sprinkle free actions
  const fr = freeActions(gs, pid);
  if (fr.length && rng() < 0.3) { pick(fr)(); resolveChoices(); }
  const g2 = S().gameState;
  let cands = candidates(g2, pid);
  const passP = POLICY === 'random' ? 0.2 : 0.1;
  if (POLICY === 'waterfirst' && g2.phase === 'consume') {
    // finish the project with the most water first (avoid partial-project penalty), else start citizen projects
    const w = cands.filter(c => c.k === 'water');
    if (w.length && rng() < 0.85) {
      w.sort((a, b) => (b.st.watered - a.st.watered) || (a.type === 'citizen' ? -1 : 1));
      cands = [w[0]];
    }
  }
  if (!cands.length || rng() < passP) { S().passPlayerTurn(); stats.passes++; return; }
  // try up to 4 candidates; detect success by turn change / choice opening
  for (let t = 0; t < 4 && cands.length; t++) {
    const i = Math.floor(rng() * cands.length);
    const c = cands.splice(i, 1)[0];
    const before = S().gameState;
    c.f();
    const after = S().gameState;
    const opened = S().pendingEffects.some(e => e.type === 'choice_required');
    if (after.activePlayerIndex !== before.activePlayerIndex || after.phase !== before.phase || opened || S().isGameOver) {
      stats.actions[c.k] = (stats.actions[c.k] ?? 0) + 1;
      resolveChoices();
      return;
    }
    stats.rejects++;
  }
  S().passPlayerTurn(); stats.passes++;
}

function playGame(stats) {
  S().initGame(FACTIONS.map((f, i) => ({ id: 'p' + i, factionId: f, name: f })), cards, pb, sb);
  let steps = 0, phaseSteps = 0, lastPhaseKey = '';
  while (!S().isGameOver) {
    if (++steps > 20000) throw new Error('step cap');
    resolveChoices();
    const gs = S().gameState;
    const key = gs.round + gs.phase;
    if (key !== lastPhaseKey) { lastPhaseKey = key; phaseSteps = 0; }
    if (gs.phase === 'end_step') { S().advanceToNextPhase(); continue; }
    if (++phaseSteps > 300) { S().passPlayerTurn(); continue; } // runaway guard
    botTurn(stats);
    if (STRIP) useGameStore.setState(s => ({ gameState: { ...s.gameState, undoStack: [], redoStack: [] }, undoPending: [], redoPending: [] }));
  }
  stats.steps += steps;
}

// ── VP source attribution from the action log ────────────────────────────────
function vpSources(gs, finals) {
  const src = {};
  for (const pid of gs.playerOrder) src[pid] = {};
  for (const e of gs.actionLog) {
    let cat = null, amt = 0;
    if (e.type === 'vp_applied') { amt = e.amount; cat = 'milestone:' + (e.message.match(/\((\w+) milestone/)?.[1] ?? '?'); }
    else if (e.type === 'vp_grant') {
      amt = e.amount; const r = e.reason ?? '';
      cat = r.startsWith('SC win') ? 'sc_win' : r.includes('Rider') ? 'rider_case' : r.includes('passive') ? 'glory' :
            r.includes('Firefighter') ? 'firefighter_C' : r.includes('Farmer') ? 'farmer_C' : r.includes('Pro Bono') ? 'probono_C' : 'other:' + r;
    }
    if (cat) src[e.playerId][cat] = (src[e.playerId][cat] ?? 0) + amt;
  }
  for (const f of finals) for (const b of f.breakdown) if (b.source === 'card') src[f.playerId]['card:' + b.cardId] = (src[f.playerId]['card:' + b.cardId] ?? 0) + b.amount;
  return src;
}

const stats = { passes: 0, rejects: 0, actions: {}, steps: 0 };
const agg = {}; const wins = {}; const srcAgg = {}; const endTracks = {};
for (const f of FACTIONS) { agg[f] = []; wins[f] = 0; srcAgg[f] = {}; endTracks[f] = { w: 0, m: 0, pr: 0 }; }
let logLen = 0;
const t0 = performance.now();
for (let g = 0; g < N; g++) {
  rng = mulberry32(SEED0 + g * 7919);
  playGame(stats);
  const gs = S().gameState, fs_ = S().finalScores;
  logLen += gs.actionLog.length;
  const src = vpSources(gs, fs_);
  for (const f of fs_) {
    agg[f.factionId].push(f.total);
    if (f.rank === 1) wins[f.factionId]++;
    for (const [k, v] of Object.entries(src[f.playerId])) srcAgg[f.factionId][k] = (srcAgg[f.factionId][k] ?? 0) + v;
    const p = gs.players[f.playerId];
    endTracks[f.factionId].w += p.waterClaimTrack.value; endTracks[f.factionId].m += p.moneyTrack.value; endTracks[f.factionId].pr += p.prTrack.value;
  }
}
const dt = (performance.now() - t0) / 1000;
console.log(`policy=${POLICY} games=${N} strip=${STRIP} time=${dt.toFixed(2)}s  games/sec=${(N / dt).toFixed(1)}  avgSteps=${(stats.steps / N).toFixed(0)} avgLog=${(logLen / N).toFixed(0)} warns=${warnCount}`);
console.log('turn actions/game:', JSON.stringify(Object.fromEntries(Object.entries(stats.actions).map(([k, v]) => [k, +(v / N).toFixed(1)]))), 'passes/game', (stats.passes / N).toFixed(1), 'rejects/game', (stats.rejects / N).toFixed(1));
for (const f of FACTIONS) {
  const a = agg[f]; const mean = a.reduce((x, y) => x + y, 0) / N;
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / N);
  console.log(`${f.padEnd(12)} meanVP=${mean.toFixed(2)} sd=${sd.toFixed(2)} max=${Math.max(...a)} winRate=${(wins[f] / N * 100).toFixed(1)}%  end ◈=${(endTracks[f].w / N).toFixed(1)} $=${(endTracks[f].m / N).toFixed(1)} ★=${(endTracks[f].pr / N).toFixed(1)}`);
  console.log('   sources/game:', JSON.stringify(Object.fromEntries(Object.entries(srcAgg[f]).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, +(v / N).toFixed(2)]))));
}
