/**
 * Headless engine regression suite. Run with: npm test
 * Exercises the real Zustand store; each section sets up the state it needs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { useGameStore } = await import(new URL('../src/engine/gameStore.js', import.meta.url));
const load = f => JSON.parse(readFileSync(`${ROOT}src/data/${f}`, 'utf8'));
const cards = load('cards.json'), playerBoard = load('player_board.json'), sharedBoard = load('shared_board.json');

console.warn = () => {};   // engine rejections log warnings; tests assert on state instead

let failures = 0, section = '';
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  [${section}] ${name} ${detail}`); }
};
const S  = () => useGameStore.getState();
const gs = () => S().gameState;
const P  = pid => gs().players[pid];
const active = () => gs().playerOrder[gs().activePlayerIndex];
const patchPlayer = (pid, patch) => useGameStore.setState(s => ({ gameState: { ...s.gameState,
  players: { ...s.gameState.players, [pid]: { ...s.gameState.players[pid], ...patch } } } }));
const patchGame = patch => useGameStore.setState(s => ({ gameState: { ...s.gameState, ...patch } }));
const patchShared = patch => useGameStore.setState(s => ({ gameState: { ...s.gameState,
  sharedBoard: { ...s.gameState.sharedBoard, ...patch } } }));
// Events can open blocking choices (protests) that stop passing; settle them.
const settleChoices = () => {
  for (const e of [...S().pendingEffects]) {
    if (e.subtype === 'protest_activation_round') S().resolveChoice({ subtype: e.subtype, protestId: e.protestId });
  }
};
const passUntilPhaseChanges = () => {
  const ph = gs().phase;
  for (let i = 0; i < 12 && gs().phase === ph; i++) { settleChoices(); S().passPlayerTurn(); }
  if (gs().phase === ph) throw new Error(`stuck in ${ph}: ${JSON.stringify(S().pendingEffects.map(e => e.subtype ?? e.type))}`);
};
const toNextRound = () => {           // from any action phase to the next round's Negotiate
  for (let i = 0; i < 4 && gs().phase !== 'end_step'; i++) passUntilPhaseChanges();
  S().advanceToNextPhase();
};
const card = (cardId, instanceId, exhaustState = 'ready') => ({ instanceId, cardId, exhaustState });
const newGame = () => S().initGame([
  { id: 'p1', factionId: 'arizona',    name: 'Ann' },
  { id: 'p2', factionId: 'california', name: 'Bob' },
  { id: 'p3', factionId: 'nevada',     name: 'Cee' },
], cards, playerBoard, sharedBoard);

// ── Money model: income track + cash ───────────────────────────────────────
section = 'money';
newGame();
check('round 1: cash = income track (AZ $3)', P('p1').cash === 3, `cash ${P('p1').cash}`);
check('round 1: income track unchanged at 3', P('p1').moneyTrack.value === 3);
toNextRound();
check('round 2: unspent cash carries over (3+3)', P('p1').cash === 6, `cash ${P('p1').cash}`);
check('round 2: income track does not double', P('p1').moneyTrack.value === 3);
toNextRound(); toNextRound();
check('passing alone never reaches the $19 milestone', P('p1').vp === 0 && P('p1').moneyTrack.value === 3,
  `vp ${P('p1').vp}, income ${P('p1').moneyTrack.value}`);

newGame();
patchPlayer('p1', { hand: ['lobby_federal_government'], cash: 2 });
S().playCardAction('p1', 'lobby_federal_government', 'N');
check('cost paid from cash: $2 cannot pay $3 (card kept)', P('p1').hand.includes('lobby_federal_government'));
patchPlayer('p1', { cash: 5 });
S().playCardAction('p1', 'lobby_federal_government', 'N');
check('cost paid from cash: $5 → $2', P('p1').cash === 2, `cash ${P('p1').cash}`);
check('strategy card discarded after play', gs().sharedBoard.strategyDiscard.includes('lobby_federal_government'));

// Income project raises the income track
newGame();
passUntilPhaseChanges();                                   // → consume
patchPlayer(active(), { projects: { ...P(active()).projects,
  income: { ...P(active()).projects.income, factory: { watered: 6, water_slots: 6 } } } });
const fp = active(), incomeBefore = P(fp).moneyTrack.value, prBefore = P(fp).prTrack.value;
passUntilPhaseChanges();                                   // → end step
check('factory raises income track by 5', P(fp).moneyTrack.value === incomeBefore + 5,
  `${incomeBefore} → ${P(fp).moneyTrack.value}`);
check('factory still costs 3 PR', P(fp).prTrack.value === Math.max(-8, prBefore - 3));
S().advanceToNextPhase();
check('next round pays the new income as cash', P(fp).cash >= incomeBefore + 5);

// ── Water bank: own-bank deposits are free and earn nothing ────────────────
section = 'water bank';
newGame();
patchPlayer('p1', { cash: 10, waterCubes: 3 });
S().unlockWaterBank('p1');
check('unlock costs $8 cash', P('p1').cash === 2 && P('p1').waterBank.unlocked);
S().depositToWaterBank('p1', 'p1', 1);
check('own deposit: cube moves into bank', P('p1').waterCubes === 2 && P('p1').waterBank.stored === 1);
check('own deposit: no fee and no income', P('p1').cash === 2, `cash ${P('p1').cash}`);
S().depositToWaterBank('p1', 'p1', 1);
check('second deposit in the same turn rejected', P('p1').waterBank.stored === 1 && P('p1').waterCubes === 2);
S().withdrawFromWaterBank('p1', 1);
check('withdraw returns the cube (no duplication)', P('p1').waterCubes === 3 && P('p1').waterBank.stored === 0);

newGame();
patchPlayer('p2', { waterBank: { unlocked: true, stored: 0 }, cash: 0 });
patchPlayer('p1', { waterCubes: 2, cash: 4 });
S().depositToWaterBank('p1', 'p2', 1);
check("deposit into a rival's bank pays them $1", P('p1').cash === 3 && P('p2').cash === 1
  && P('p2').waterBank.stored === 1 && P('p1').waterCubes === 1);
S().depositToWaterBank('p2', 'p2', 1);
check('free actions only on your own turn', P('p2').waterBank.stored === 1);

// ── Once per turn: Investment (and other free actions) ─────────────────────
section = 'once per turn';
newGame();
patchPlayer('p1', { partnerships: { law_firm: false, business: false, investment: true }, cash: 10 });
const pr0 = P('p1').prTrack.value;
S().usePartnershipAbility('p1', 'investment');
S().usePartnershipAbility('p1', 'investment');
check('Investment twice in one turn → only +1 PR, $2', P('p1').prTrack.value === pr0 + 1 && P('p1').cash === 8,
  `pr ${pr0}→${P('p1').prTrack.value}, cash ${P('p1').cash}`);
// Investment is free, so p1 still holds the turn; cycle a full table of turns
for (let i = 0; i < 3; i++) S()._advanceTurn();
check('back to p1 on a later turn', active() === 'p1', `active ${active()}`);
S().usePartnershipAbility('p1', 'investment');
check('Investment usable again on a later turn', P('p1').prTrack.value === pr0 + 2);

// ── Rider of Coat-tails: exhausts, validates targets ───────────────────────
section = 'rider';
newGame();
patchPlayer('p1', { cash: 10, tableau: [card('its_a_job_lawyer', 'job1', 'exhausted'), card('rider_of_coattails', 'rider1')] });
const wr0 = P('p1').waterClaimTrack.value;
S().playCardAction('p1', 'rider_of_coattails', 'N');
check('Rider N opens the copy choice', S().pendingEffects.some(e => e.subtype === 'rider_coattails_lawyer'));
S().resolveChoice({ subtype: 'rider_coattails_lawyer', playerId: 'p1', chosenCardId: 'its_a_job_lawyer' });
check('Rider N copies It\'s a Job: +1 Water Rights, no payment', P('p1').waterClaimTrack.value === wr0 + 1 && P('p1').cash === 10);
check('Rider exhausts after use', P('p1').tableau.find(c => c.instanceId === 'rider1').exhaustState === 'exhausted');
check('turn advanced after the choice', active() === 'p2');
S().passPlayerTurn(); S().passPlayerTurn();                // back to p1
S().playCardAction('p1', 'rider_of_coattails', 'N');
check('exhausted Rider cannot be used again this round', !S().pendingEffects.some(e => e.subtype === 'rider_coattails_lawyer'));

newGame();
patchPlayer('p1', { tableau: [card('rider_of_coattails', 'rider1')] });
patchPlayer('p2', { tableau: [card('its_a_job_lawyer', 'jobB', 'exhausted')] });
const wr1 = P('p1').waterClaimTrack.value;
S().playCardAction('p1', 'rider_of_coattails', 'N');
S().resolveChoice({ subtype: 'rider_coattails_lawyer', playerId: 'p1', chosenCardId: 'its_a_job_lawyer' });
check("Rider N cannot copy a RIVAL's lawyer (fizzles)", P('p1').waterClaimTrack.value === wr1);

newGame();
passUntilPhaseChanges();                                   // → consume
const rp = active();
const rpFaction = P(rp).factionId;
const otherCase = cards.find(c => c.type === 'sc_case' && c.plaintiff.id !== rpFaction && c.defendant.id !== rpFaction);
patchPlayer(rp, { tableau: [card('rider_of_coattails', 'riderC')] });
patchShared({ casesResolvedThisRound: [{ caseId: otherCase.id, winnerId: null }] });
const vp0 = P(rp).vp;
S().playCardAction(rp, 'rider_of_coattails', 'C');
S().resolveChoice({ subtype: 'rider_coattails_case', playerId: rp, caseId: otherCase.id });
check('Rider C pays nothing for a tied case', P(rp).vp === vp0, `vp ${vp0}→${P(rp).vp}`);

// ── Firefighter A: replaces the firefighting bonus, no k² loop ─────────────
section = 'firefighter';
newGame();
passUntilPhaseChanges();                                   // → consume
const ff = active();
patchPlayer(ff, {
  tableau: [card('firefighter_a', 'f1'), card('firefighter_a', 'f2'), card('firefighter_a', 'f3')],
  projects: { ...P(ff).projects, citizen: { ...P(ff).projects.citizen, firefighting: { watered: 2, water_slots: 2 } } },
});
const ffVp = P(ff).vp, ffPr = P(ff).prTrack.value;
S().playCardAction(ff, 'firefighter_a', 'C', { instanceId: 'f1' });
check('using Firefighter A grants no VP immediately', P(ff).vp === ffVp);
for (let i = 0; i < gs().playerOrder.length - 1; i++) S().passPlayerTurn();   // back to ff
S().playCardAction(ff, 'firefighter_a', 'C', { instanceId: 'f2' });
check('a second copy does not stack the modifier',
  (gs().pendingIncomeModifiers ?? []).filter(m => m.playerId === ff && m.subtype === 'firefighter_a_vp').length === 1);
passUntilPhaseChanges();                                   // → end step
check('End Step: +1 VP per Firefighter (3)', P(ff).vp === ffVp + 3, `vp ${ffVp}→${P(ff).vp}`);
check('…instead of the usual +1 PR', P(ff).prTrack.value === ffPr, `pr ${ffPr}→${P(ff).prTrack.value}`);
check('…and no new Firefighter card', P(ff).tableau.filter(c => c.cardId === 'firefighter_a').length === 3);
check('income modifiers cleared after End Step', (gs().pendingIncomeModifiers ?? []).length === 0);

// ── Citizen supply: finite piles ───────────────────────────────────────────
section = 'citizen supply';
newGame();
const sup = gs().sharedBoard.citizenSupply;
check('6 Farmers, 10 Firefighters', sup.farmer.length === 6 && sup.firefighter.length === 10);
check('Service Worker pile mixes 6 A + 6 B', sup.service_worker.length === 12
  && sup.service_worker.filter(id => id === 'service_worker_b').length === 6);
passUntilPhaseChanges();
const fm = active();
patchPlayer(fm, { projects: { ...P(fm).projects, citizen: { ...P(fm).projects.citizen, farm: { watered: 6, water_slots: 6 } } } });
passUntilPhaseChanges();
check('farm completion draws a Farmer from the supply',
  P(fm).tableau.some(c => c.cardId === 'farmer_a') && gs().sharedBoard.citizenSupply.farmer.length === 5);
S().advanceToNextPhase();
passUntilPhaseChanges();
patchShared({ citizenSupply: { ...gs().sharedBoard.citizenSupply, farmer: [] } });
const fm2 = active();
patchPlayer(fm2, { projects: { ...P(fm2).projects, citizen: { ...P(fm2).projects.citizen, farm: { watered: 6, water_slots: 6 } } } });
const farmersBefore = P(fm2).tableau.filter(c => c.cardId === 'farmer_a').length;
passUntilPhaseChanges();
check('empty supply: no card granted', P(fm2).tableau.filter(c => c.cardId === 'farmer_a').length === farmersBefore);

// ── Core rules still hold (guards against regressions from PR #1 fixes) ───
section = 'core';
newGame();
patchShared({ eventDeck: ['severe_drought', 'protest_a', 'supreme_court_session'] });
patchGame({ round: 2 });
passUntilPhaseChanges();
const base = gs().playerOrder.reduce((n, pid) => n + P(pid).waterClaimTrack.value, 0);
check('drought subtracts its roll from the base supply',
  gs().sharedBoard.waterSupply === Math.max(0, base - gs().sharedBoard.droughtRoll));
toNextRound();
passUntilPhaseChanges();
const protest = S().pendingEffects.find(e => e.subtype === 'protest_activation_round');
check('protest opens a choice', !!protest);
S().resolveChoice({ subtype: 'protest_activation_round', protestId: protest?.protestId });
check('protest resolves and clears', S().pendingEffects.length === 0);
toNextRound();
const tieCase = gs().sharedBoard.docket[0];
const vps = gs().playerOrder.map(pid => P(pid).vp);
passUntilPhaseChanges();                                   // SC session at 0–0
check('SC tie: no VP awarded', gs().playerOrder.every((pid, i) => P(pid).vp === vps[i]));
check('SC tie: recorded with no winner', gs().sharedBoard.casesResolvedThisRound.some(r => r.caseId === tieCase && r.winnerId === null));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
