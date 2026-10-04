// Targeted exploit / rule probes against the real engine.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/[/]$/, '');
console.warn = () => {};
const load = f => JSON.parse(fs.readFileSync(path.join(REPO, 'src/data', f), 'utf8'));
const cards = load('cards.json'), pb = load('player_board.json'), sb = load('shared_board.json');
const { useGameStore } = await import(pathToFileURL(path.join(REPO, 'src/engine/gameStore.js')).href);
const S = () => useGameStore.getState();
const init = () => S().initGame([['p0','arizona'],['p1','california'],['p2','nevada']].map(([id,f]) => ({ id, factionId: f, name: f })), cards, pb, sb);
const P = id => S().gameState.players[id];
const patchP = (id, patch) => useGameStore.setState(s => ({ gameState: { ...s.gameState, players: { ...s.gameState.players, [id]: { ...s.gameState.players[id], ...patch } } } }));
const passAll = () => { const g = S().gameState; const ph = g.phase, r = g.round; let n = 0; while (S().gameState.phase === ph && S().gameState.round === r && n++ < 10) { S().passPlayerTurn(); const pe = S().pendingEffects.find(e => e.subtype === 'protest_activation_round'); if (pe && process.env.AUTOPROTEST) S().resolveChoice({ subtype: pe.subtype, protestId: pe.protestId }); } };
const inst = (cardId, i = 0) => ({ instanceId: `${cardId}_probe${i}`, cardId, exhaustState: 'ready' });

// 1. Money doubling with pure passing
init();
const money = [];
for (let r = 1; r <= 4; r++) {
  money.push(`R${r}: ` + ['p0','p1','p2'].map(p => `${P(p).factionId}=$${P(p).moneyTrack.value} vp${P(p).vp}`).join(' '));
  passAll(); passAll(); S().advanceToNextPhase();
}
console.log('1. MONEY (pass-only, value at start of Negotiate):\n   ' + money.join('\n   '));
console.log('   water track after R4 pass-only (penalty from R3 for unspent claims): ' + ['p0','p1','p2'].map(p => `${P(p).factionId}=${P(p).waterClaimTrack.value}`).join(' '));

// 2. Water bank self-deposit
init();
patchP('p0', { waterCubes: 3, moneyTrack: { ...P('p0').moneyTrack, value: 19 } });
S().unlockWaterBank('p0');
const b0 = `$${P('p0').moneyTrack.value} cubes=${P('p0').waterCubes} stored=${P('p0').waterBank.stored}`;
S().depositToWaterBank('p0', 'p0', 3);
const b1 = `$${P('p0').moneyTrack.value} cubes=${P('p0').waterCubes} stored=${P('p0').waterBank.stored}`;
S().withdrawFromWaterBank('p0', 3);
const b2 = `$${P('p0').moneyTrack.value} cubes=${P('p0').waterCubes} stored=${P('p0').waterBank.stored}`;
console.log(`2. WATER BANK self-deposit: after unlock ${b0} -> after deposit(self,3) ${b1} -> after withdraw ${b2}`);

// 3. Rider of Coat-tails N infinite loop (UI-legal target: own exhausted It's a Job, cost 2 > 1)
init();
patchP('p0', { tableau: [inst('its_a_job_lawyer'), inst('rider_of_coattails')] });
const w0 = P('p0').waterClaimTrack.value;
S().playCardAction('p0', 'its_a_job_lawyer', 'N');
for (let k = 0; k < 6; k++) {
  // cycle turn back to p0 via passes by others
  while (S().gameState.playerOrder[S().gameState.activePlayerIndex] !== 'p0') S().passPlayerTurn();
  S().playCardAction('p0', 'rider_of_coattails', 'N');
  S().resolveChoice({ subtype: 'rider_coattails_lawyer', playerId: 'p0', chosenCardId: 'its_a_job_lawyer' });
}
console.log(`3. RIDER N loop: water track ${w0} -> ${P('p0').waterClaimTrack.value} after It's-a-Job once + 6 Rider copies; money $${P('p0').moneyTrack.value}; vp ${P('p0').vp}`);

// 4. Firefighter k^2: 3 firefighters, consume phase
init();
passAll(); // -> consume
patchP('p0', { tableau: [inst('firefighter_a', 1), inst('firefighter_a', 2), inst('firefighter_a', 3)] });
const v0 = P('p0').vp;
for (let k = 1; k <= 3; k++) {
  while (S().gameState.playerOrder[S().gameState.activePlayerIndex] !== 'p0') S().passPlayerTurn();
  S().playCardAction('p0', 'firefighter_a', 'C', { instanceId: `firefighter_a_probe${k}` });
}
console.log(`4. FIREFIGHTER: 3 firefighters, 3 C-uses in one Consume (no firefighting project watered): VP ${v0} -> ${P('p0').vp}`);

// 5. Citizen grant mapping: complete housing and farm, see which card is granted
init();
passAll();
patchP('p0', { projects: { ...P('p0').projects, citizen: { farm: { watered: 6, water_slots: 6 }, housing: { watered: 4, water_slots: 4 }, firefighting: { watered: 2, water_slots: 2 } } } });
passAll(); // -> end step
console.log('5. CITIZEN GRANTS (farm+housing+firefighting full):', P('p0').tableau.map(t => t.cardId).join(', '), `| PR ${P('p0').prTrack.value}`);

// 6. Rider C on a case you're not party to (force a resolved case), repeat
init();
passAll();
const cid = S().gameState.sharedBoard.docket.find(c => !c.includes('arizona')) ;
useGameStore.setState(s => ({ gameState: { ...s.gameState, sharedBoard: { ...s.gameState.sharedBoard, casesResolvedThisRound: [{ caseId: cid, winnerId: null }] } } }));
patchP('p0', { tableau: [inst('rider_of_coattails')] });
const r0 = { vp: P('p0').vp, w: P('p0').waterClaimTrack.value };
for (let k = 0; k < 5; k++) {
  while (S().gameState.playerOrder[S().gameState.activePlayerIndex] !== 'p0') S().passPlayerTurn();
  S().playCardAction('p0', 'rider_of_coattails', 'C');
  S().resolveChoice({ subtype: 'rider_coattails_case', playerId: 'p0', caseId: cid });
}
console.log(`6. RIDER C x5 on tied/non-party case ${cid}: vp ${r0.vp} -> ${P('p0').vp}, ◈ ${r0.w} -> ${P('p0').waterClaimTrack.value}`);

// 7. Odd-claim penalty: CA (5) in R3 places all 5 claims -> partial project
init();
for (let r = 1; r <= 2; r++) { passAll(); passAll(); S().advanceToNextPhase(); }
passAll(); // R3 consume
const ca = 'p1';
const cl = P(ca).waterClaims;
let placed = 0;
for (const prj of ['farm']) for (let k = 0; k < cl; k++) {
  while (S().gameState.playerOrder[S().gameState.activePlayerIndex] !== ca) S().passPlayerTurn();
  S().placeWaterOnProject(ca, 'citizen', 'farm'); placed++;
}
const wb = P(ca).waterClaimTrack.value;
passAll(); // end step
console.log(`7. ODD CLAIMS: CA R3 claims=${cl}, placed ${placed} on farm (6 slots) -> ◈ ${wb} -> ${P(ca).waterClaimTrack.value}`);

// 8. Protest with nobody holding activists: everyone penalised?
init();
passAll();
useGameStore.setState(s => ({ gameState: { ...s.gameState, round: 2 } }));
passAll(); S().advanceToNextPhase(); // R? -> next round negotiate
useGameStore.setState(s => ({ gameState: { ...s.gameState, sharedBoard: { ...s.gameState.sharedBoard, eventDeck: ['protest_a', ...s.gameState.sharedBoard.eventDeck] } } }));
const pr0 = ['p0','p1','p2'].map(p => P(p).prTrack.value);
passAll(); // -> consume, protest opens
const pe = S().pendingEffects.find(e => e.subtype === 'protest_activation_round');
if (pe) S().resolveChoice({ subtype: pe.subtype, protestId: pe.protestId });
console.log(`8. PROTEST A, no activists: PR ${pr0.join(',')} -> ${['p0','p1','p2'].map(p => P(p).prTrack.value).join(',')}`);
