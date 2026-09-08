/* Re-measure win probability per theatre on the SHIPPED v5.9 engine, in the
   EXACT configuration angel-engine.js:runEngine() uses for the application —
   mode 'fair', telementoring and human-in-the-loop on for ARM A, rngA =
   seed*3+1 and rngB = seed*3+2, autoApproveAbove 0.10, hvaWeight 1.6.
   The 19 Aug table was measured on the v2.2 engine and is stale. */
import fs from 'fs'; import vm from 'vm';
const SCN = process.argv[2];
const N   = Number(process.argv[3] || 200);
const ctx = vm.createContext({ performance:{now:()=>Date.now()}, console, JSON, Math });
ctx.self = ctx; ctx.CALLSIGN = { HEAVY:'TRV', LIGHT:'M25', LONG:'FVR' };
vm.runInContext(fs.readFileSync('app/js/sim.js','utf8'), ctx, {filename:'sim.js'});
vm.runInContext(fs.readFileSync('app/js/optimizer.js','utf8'), ctx, {filename:'optimizer.js'});
const rep = vm.runInContext(`(function(scn, seed){
  const world = createWorld(scn, seed);
  const A = createArm(world, 'ANGEL SWARM', 'ANGEL', 'fair');
  A.telementor = true; A.hitl = true; A.autoApproveAbove = 0.10; A.hvaWeight = 1.6;
  const B = createArm(world, 'CURRENT — TRIAGE & PROXIMITY', 'CURRENT', 'fair');
  B.telementor = false;
  const rA = makeRNG(seed*3+1), rB = makeRNG(seed*3+2);
  const T = world.scn.durationMin, DT = 0.25;
  for (let t=0; t<=T; t+=DT) { stepArm(A, world, t, DT, rA); stepArm(B, world, t, DT, rB); }
  finalize(A, T); finalize(B, T);
  return { a: A.stats.survivableDeaths, b: B.stats.survivableDeaths,
           sa: A.stats.sorties, sb: B.stats.sorties, cas: world.stream.length };
})`, ctx);
const d=[]; let worse=0, tie=0, better=0, sa=0, sb=0, aa=0, bb=0;
for (let s=1; s<=N; s++) {
  const r = rep(SCN, s);
  const diff = r.a - r.b;                 // negative = fewer dead under ANGEL
  d.push(diff); aa+=r.a; bb+=r.b; sa+=r.sa; sb+=r.sb;
  if (diff > 0) worse++; else if (diff === 0) tie++; else better++;
}
const mean = d.reduce((x,y)=>x+y,0)/N;
const sd   = Math.sqrt(d.reduce((x,y)=>x+(y-mean)**2,0)/(N-1));
const se   = sd/Math.sqrt(N);
const lo = mean-1.96*se, hi = mean+1.96*se;
console.log(JSON.stringify({ scn: SCN, n: N,
  angelMean: +(aa/N).toFixed(2), currentMean: +(bb/N).toFixed(2),
  mean: +mean.toFixed(3), lo: +lo.toFixed(3), hi: +hi.toFixed(3),
  dz: +(mean/sd).toFixed(3), worse, tie, better,
  worstSeedDiff: Math.max(...d), bestSeedDiff: Math.min(...d),
  sortiesA: +(sa/N).toFixed(1), sortiesB: +(sb/N).toFixed(1) }));
