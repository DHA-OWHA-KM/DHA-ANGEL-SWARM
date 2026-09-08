// ANGEL SWARM — deterministic run engine.
// One casualty stream, two allocators, common random numbers on outcomes.
// Everything any screen shows is derived from buildRun() + snapshot().
// UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

const rng = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const norm = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const pick = (r, arr, w) => { let x = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };

export const PLATFORMS = {
  HEAVY: { key: 'HEAVY', label: 'TRV-150C', call: 'TRV', speed: 92, radius: 12, ferry: 34, payloadKg: 30, slots: 10, tau: 210, release: 'HOVER AND LOWER', overhead: 1.5 },
  LIGHT: { key: 'LIGHT', label: 'Soaring M25', call: 'M25', speed: 60, radius: 5, ferry: 14, payloadKg: 6.8, slots: 4, tau: 62, release: 'HOVER RELEASE', overhead: 1.3 },
  LONG: { key: 'LONG', label: 'FVR-90', call: 'FVR', speed: 83, radius: 90, ferry: 200, payloadKg: 9.1, slots: 8, tau: 260, release: 'CHUTE DROP', overhead: 2.0 }
};
export const PAYLOADS = {
  BLOOD: { key: 'BLOOD', label: 'Whole blood', short: 'LTOWB', kg: 1.45, cold: true, tier: 'T3', admin: 4.0 },
  PLASMA: { key: 'PLASMA', label: 'Freeze-dried plasma', short: 'FDP', kg: 0.62, cold: false, tier: 'T3', admin: 3.2 },
  TXA: { key: 'TXA', label: 'TXA 2g', short: 'TXA', kg: 0.06, cold: false, tier: 'T3', admin: 1.2 },
  TQ_KIT: { key: 'TQ_KIT', label: 'Haemorrhage kit', short: 'HK', kg: 0.34, cold: false, tier: 'T1', admin: 0.8 },
  CHEST_SEAL: { key: 'CHEST_SEAL', label: 'Chest seal / NPA', short: 'CS', kg: 0.12, cold: false, tier: 'T2', admin: 1.0 }
};
const CAP = { T1: ['TQ_KIT'], T2: ['TQ_KIT', 'CHEST_SEAL'], T3: ['TQ_KIT', 'CHEST_SEAL', 'PLASMA', 'TXA', 'BLOOD'] };
const TELEMENTOR_ADDS = ['PLASMA', 'TXA', 'BLOOD'];
const NEEDS = {
  TRUNCAL_HEM: ['BLOOD', 'PLASMA', 'TXA'], JUNCTIONAL_HEM: ['TQ_KIT', 'BLOOD', 'PLASMA'],
  EXTREMITY_HEM: ['TQ_KIT', 'TXA', 'PLASMA'], AIRWAY: ['CHEST_SEAL', 'PLASMA'], MINOR: ['TQ_KIT']
};
export const INJURY_LABEL = { TRUNCAL_HEM: 'non-compressible torso', JUNCTIONAL_HEM: 'junctional haemorrhage', EXTREMITY_HEM: 'extremity haemorrhage', AIRWAY: 'airway / thoracic', MINOR: 'minor wound' };
const STOCK0 = { BLOOD: 5, PLASMA: 4, TXA: 9, TQ_KIT: 20, CHEST_SEAL: 9 };
const RESUP = { BLOOD: 2, PLASMA: 2, TXA: 4, TQ_KIT: 10, CHEST_SEAL: 4 };
const STOCK_CAP = { BLOOD: 8, PLASMA: 7, TXA: 14, TQ_KIT: 30, CHEST_SEAL: 14 };

export const WORLD = {
  joa: 'CORAL', name: 'First Island Chain', theater: 'PACOM', widthKm: 92, heightKm: 118, ambientC: 31, durationMin: 180,
  bases: [
    { name: 'FLP ALPHA', x: 20, y: 30, afloat: false, fleet: ['LIGHT', 'HEAVY'] },
    { name: 'LHA BOXER', x: 52, y: 74, afloat: true, fleet: ['HEAVY', 'HEAVY', 'LONG'] },
    { name: 'FLP CHARLIE', x: 28, y: 100, afloat: false, fleet: ['LIGHT', 'HEAVY'] }
  ],
  sites: [
    { name: 'SITE BRAVO', x: 26, y: 38, r: 9, unit: 'A/1-27 IN', assigned: 34, w: 1.2 },
    { name: 'SITE DELTA', x: 56, y: 64, r: 10, unit: 'B/2-14 IN', assigned: 41, w: 1.35 },
    { name: 'SITE ECHO', x: 36, y: 96, r: 8, unit: 'C/3-7 CAV', assigned: 37, w: 1.0 },
    { name: 'SITE KILO', x: 68, y: 34, r: 10, unit: 'D/1-11 FA', assigned: 44, w: 0.45 }
  ],
  threats: [{ x: 72, y: 50, r: 22, loss: 0.009, label: 'A2/AD ENVELOPE' }, { x: 36, y: 74, r: 16, loss: 0.006, label: 'C-UAS PICKET' }],
  mascal: [{ at: 18, n: 10 }, { at: 62, n: 14 }, { at: 116, n: 12 }, { at: 154, n: 9 }],
  comms: [{ at: 88, dur: 12, label: 'SATCOM DENIED' }],
  baseRate: 0.28
};

const NAMES = ['R. OKAFOR', 'A. VÁSQUEZ', 'M. LINDQVIST', 'D. NAKAMURA', 'J. HALLORAN', 'T. MBEKI', 'S. PARK', 'L. ROSSI', 'K. AHMADI', 'B. CASTELLANOS', 'N. FORTIER', 'P. SUNDBERG', 'G. ADEYEMI', 'C. WHITEFEATHER', 'V. KOWALSKI', 'H. TRAN', 'E. BARRIENTOS', 'F. ODUYA', 'R. MAGNUSSON', 'A. DELACRUZ', 'W. HOLBROOK', 'I. NAZAROV', 'Q. BOATENG', 'Y. SALINAS'];
const RANKS = ['PFC', 'SPC', 'CPL', 'SGT', 'SSG'];
const ROLES = [['RIFLEMAN', 'RFLMN', .40], ['TEAM_LEADER', 'TL', .13], ['ENGINEER', 'ENGR', .09], ['SIGNALS', 'SIG', .08], ['COMBAT_MEDIC', 'MEDIC', .06], ['UAS_OPERATOR', 'UAS', .06], ['JTAC', 'JTAC', .05], ['SNIPER', 'RECON', .05], ['EOD_TECH', 'EOD', .04], ['AIRCREW', 'AIR', .02], ['LINGUIST', 'LING', .02]];

const effRadius = (p, kg) => p.ferry - (p.ferry - p.radius) * Math.min(1, kg / p.payloadKg);
const coldAfter = (min, tau) => WORLD.ambientC - (WORLD.ambientC - 3) * Math.exp(-min / tau);
const survUntreated = c => ({ MINIMAL: .995, DELAYED: .42, EXPECTANT: .02, IMMEDIATE: .06 }[c.cls]);
function survTreated(c, delay, pk) {
  const idx = c.needs.indexOf(pk); if (idx < 0) return survUntreated(c);
  const eff = [1, .74, .5, .35][Math.min(idx, 3)];
  const pu = survUntreated(c), p0 = c.p0;
  const orPer = c.penetrating ? 1.055 : 1.012;
  const cap = c.penetrating ? 45 : 180;
  let odds = (p0 / (1 - p0)) * Math.pow(orPer, -Math.min(delay, cap));
  let pt = odds / (1 + odds);
  const over = delay - c.deadlineMin;
  const decomp = over > 0 ? Math.exp(-over / 6) : 1;
  return pu + (pt - pu) * eff * decomp;
}

function makeStream(seed) {
  const r = rng(seed), out = [];
  let id = 0, nameI = 0;
  const add = t => {
    const site = pick(r, WORLD.sites, WORLD.sites.map(s => s.w));
    const ang = r() * 6.283, rad = Math.sqrt(r()) * site.r;
    const cls = pick(r, ['IMMEDIATE', 'DELAYED', 'MINIMAL', 'EXPECTANT'], [.30, .34, .28, .08]);
    const injury = cls === 'MINIMAL' ? 'MINOR' : pick(r, ['TRUNCAL_HEM', 'JUNCTIONAL_HEM', 'EXTREMITY_HEM', 'AIRWAY'], cls === 'IMMEDIATE' ? [.34, .28, .18, .20] : [.14, .26, .44, .16]);
    const responder = pick(r, ['T1', 'T2', 'T3'], [.45, .35, .20]);
    const role = pick(r, ROLES, ROLES.map(x => x[2]));
    let dl = cls === 'MINIMAL' ? 9999 : Math.max(4, 18.3 + norm(r) * 7.94);
    if (cls === 'EXPECTANT') dl = Math.max(3, dl * .55);
    out.push({
      id: ++id, x: site.x + Math.cos(ang) * rad, y: site.y + Math.sin(ang) * rad,
      site: site.name, unit: site.unit, tInjury: t, cls, injury, responder, role: role[1],
      name: RANKS[Math.floor(r() * 5)] + ' ' + NAMES[(nameI++) % NAMES.length],
      needs: NEEDS[injury], deadlineMin: dl, penetrating: injury === 'TRUNCAL_HEM' || injury === 'JUNCTIONAL_HEM',
      p0: { IMMEDIATE: .93, DELAYED: .97, MINIMAL: .998, EXPECTANT: .22 }[cls],
      si: +(0.7 + r() * 1.2).toFixed(1), staleAt: null
    });
  };
  for (let t = 0; t < WORLD.durationMin; t += 0.25) if (r() < WORLD.baseRate * 0.25) add(+t.toFixed(2));
  WORLD.mascal.forEach(m => { for (let i = 0; i < m.n; i++) add(+(m.at + r() * 3.5).toFixed(2)); });
  out.sort((a, b) => a.tInjury - b.tInjury);
  out.forEach((c, i) => { c.id = i + 1; c.cid = 'CAS-' + String(i + 1).padStart(3, '0'); });
  return out;
}

const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };

function runArm(stream, label, angel, seed) {
  const cas = stream.map(c => ({ ...c, treated: false, tTreated: null, treatedWith: null, outcome: null, tResolved: null, tasking: null, sortie: null, proposal: null, missedBy: null }));
  const byId = new Map(cas.map(c => [c.id, c]));
  const bases = WORLD.bases.map((b, i) => ({ ...b, idx: i, stock: { ...STOCK0 }, spent: { BLOOD: 0, PLASMA: 0, TXA: 0, TQ_KIT: 0, CHEST_SEAL: 0 }, wasted: { BLOOD: 0, PLASMA: 0 }, sorties: 0 }));
  const drones = []; let did = 0;
  bases.forEach(b => b.fleet.forEach(t => { const p = PLATFORMS[t]; did++; drones.push({ id: did, type: t, plat: p, call: p.call + '-' + String(did).padStart(2, '0'), base: b, free: 0, sorties: 0, delivered: 0, wasted: 0, lost: false, tLost: null, timeline: [] }); }));
  const sorties = [], events = [], audit = [], proposals = [], stockLog = [];
  const deathsByMin = new Array(WORLD.durationMin + 1).fill(0);
  const stats = { survivableDeaths: 0, survivableTotal: 0, allDeaths: 0, saved: 0, treated: 0, sorties: 0, wastedDeliveries: 0, overtaken: 0, inTransit: 0, inTransitCold: 0, bloodWasted: 0, bloodUsed: 0, coldSwaps: 0, escalated: 0, autoDispatch: 0, approved: 0, lapsed: 0, dronesLost: 0, causes: { treatedDied: 0, noResponder: 0, noLaunchPoint: 0, tooFast: 0, busy: 0 } };
  const A = (t, actor, action, detail, meta) => {
    const prev = audit.length ? audit[audit.length - 1].hash : 'GENESIS';
    const payload = [t.toFixed(2), actor, action, detail].join('|');
    audit.push({ seq: audit.length + 1, t, actor, action, detail, meta: meta || null, prev, hash: fnv(prev + '|' + payload) });
  };
  A(0, 'SYSTEM', 'RUN-START', `JOA ${WORLD.joa} — ${WORLD.name} · seed ${seed} · control fair · telementoring ${angel ? 'on' : 'off'} · EXERCISE`);

  const caps = c => { const base = CAP[c.responder].slice(); if (angel && c.responder === 'T2') TELEMENTOR_ADDS.forEach(k => base.push(k)); if (angel && c.responder === 'T1') base.push('TXA'); return base; };
  const usable = c => c.needs.filter(n => caps(c).includes(n));
  const lpInRange = c => bases.filter(b => b.fleet.some(t => dist(b.x, b.y, c.x, c.y) <= effRadius(PLATFORMS[t], 1.45))).length;

  const resolveDeath = (c, t, cause) => {
    const r = rng(c.id * 6151);
    c.outcome = r() < survUntreated(c) ? 'SAVED' : 'DIED'; c.tResolved = t;
    if (c.outcome === 'DIED') {
      stats.allDeaths++;
      if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') {
        stats.survivableDeaths++; deathsByMin[Math.min(WORLD.durationMin, Math.floor(t))]++;
        const k = c.treated ? 'treatedDied' : usable(c).length === 0 ? 'noResponder' : lpInRange(c) <= 1 ? 'noLaunchPoint' : c.deadlineMin < 10 ? 'tooFast' : 'busy';
        stats.causes[k]++; c.cause = k;
        events.push({ t, kind: 'DEATH', casId: c.id, cause: k });
        A(t, 'SYSTEM', 'NOT-PREVENTED', `${c.cid} · ${c.cls} · ${c.unit} · died of a survivable wound · ${c.deadlineMin < 9000 ? Math.round(c.deadlineMin) + ' min deadline' : 'no deadline'}`, { casId: c.id, cause: k });
      }
    } else stats.saved++;
  };

  for (let t = 0; t <= WORLD.durationMin; t += 0.5) {
    const tn = +t.toFixed(2);
    if (tn > 0 && tn % 45 < 0.5) bases.forEach(b => Object.keys(RESUP).forEach(k => { const add = Math.min(RESUP[k], STOCK_CAP[k] - b.stock[k]); if (add > 0) { b.stock[k] += add; stockLog.push({ t: tn, base: b.idx, item: k, d: add, reason: 'RESUPPLY' }); } }));
    cas.forEach(c => { if (c.tInjury <= tn && !c._adm) { c._adm = true; if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') stats.survivableTotal++; } });
    // deliveries landing now
    sorties.forEach(s => s.stops.forEach(st => {
      if (st.done || st.tAdmin > tn) return; st.done = true;
      const c = byId.get(st.casId); if (!c) return;
      if (c.outcome) {
        // the casualty resolved before the aircraft arrived — the payload is still gone
        stats.overtaken++;
        if (PAYLOADS[st.payload].cold) { stats.bloodWasted++; s.drone.wasted++; }
        c.tasking = null;
        events.push({ t: tn, kind: 'WASTE', casId: c.id, call: s.drone.call, payload: st.payload, reason: OVERTAKEN });
        A(tn, 'SYSTEM', 'WASTE', `${s.drone.call} → ${c.cid} · ${PAYLOADS[st.payload].label} not administered · casualty resolved ${(tn - c.tResolved).toFixed(1)} min before arrival`, { casId: c.id });
        return;
      }
      if (st.fail) { stats.wastedDeliveries++; if (PAYLOADS[st.payload].cold) { stats.bloodWasted++; s.drone.wasted++; }
        events.push({ t: tn, kind: 'WASTE', casId: c.id, call: s.drone.call, payload: st.payload, reason: st.fail });
        A(tn, 'SYSTEM', 'WASTE', `${s.drone.call} → ${c.cid} · ${PAYLOADS[st.payload].label} not administered · ${st.fail}`, { casId: c.id }); c.tasking = null; return; }
      c.treated = true; c.tTreated = st.tAdmin; c.treatedWith = st.payload; stats.treated++; s.drone.delivered++;
      if (PAYLOADS[st.payload].cold) stats.bloodUsed++;
      const r = rng(c.id * 6151);
      const p = survTreated(c, st.tAdmin - c.tInjury, st.payload);
      c.outcome = r() < p ? 'SAVED' : 'DIED'; c.tResolved = st.tAdmin;
      if (c.outcome === 'DIED') { stats.allDeaths++; if (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') { stats.survivableDeaths++; deathsByMin[Math.min(WORLD.durationMin, Math.floor(tn))]++; stats.causes.treatedDied++; c.cause = 'treatedDied'; events.push({ t: tn, kind: 'DEATH', casId: c.id, cause: 'treatedDied' }); A(tn, 'SYSTEM', 'NOT-PREVENTED', `${c.cid} · ${c.cls} · reached at T+${st.tAdmin.toFixed(1)} and died anyway`, { casId: c.id, cause: 'treatedDied' }); } }
      else { stats.saved++; events.push({ t: tn, kind: 'DELIVERED', casId: c.id, call: s.drone.call, payload: st.payload }); A(tn, 'SYSTEM', 'TREAT', `${s.drone.call} → ${c.cid} · ${PAYLOADS[st.payload].label} administered at T+${st.tAdmin.toFixed(1)} · ${Math.round(st.tAdmin - c.tInjury)} min from wounding`, { casId: c.id }); }
    }));
    // deaths past deadline; MINIMAL casualties resolve to their own responder
    cas.forEach(c => {
      if (c.outcome || !c._adm) return;
      if (c.deadlineMin >= 9000) { if (tn - c.tInjury > 25) { c.outcome = 'SAVED'; c.tResolved = tn; c.selfCare = true; stats.saved++; } return; }
      if (tn - c.tInjury > c.deadlineMin + 8) resolveDeath(c, tn, 'deadline');
    });
    // proposals lapse / approve
    proposals.forEach(p => {
      if (p.state !== 'PENDING') return;
      if (tn - p.tRaised >= 2.5 && p.autoAct) { p.state = 'APPROVED'; p.tActed = tn; stats.approved++; A(tn, 'OPERATOR', 'APPROVE', `E-${String(p.id).padStart(4, '0')} authorised · ${p.summary}`, { propId: p.id }); launch(p.drone, p.route, tn, 'AUTHORISED AFTER ESCALATION', p.id); }
      else if (tn - p.tRaised > 8) { p.state = 'EXPIRED'; p.tActed = tn; stats.lapsed++; A(tn, 'SYSTEM', 'EXPIRE', `E-${String(p.id).padStart(4, '0')} lapsed unactioned · ${p.summary}`, { propId: p.id }); p.route.forEach(l => { const c = byId.get(l.casId); if (c && c.tasking === 'PROPOSAL') c.tasking = null; }); }
    });
    if (tn % 1 !== 0) continue;
    const commsDown = WORLD.comms.some(w => tn >= w.at && tn < w.at + w.dur);
    if (commsDown) continue;
    // threat attrition
    drones.forEach(d => { if (d.lost) return; const s = sorties.find(s => s.drone === d && s.tLaunch <= tn && s.tHome > tn); if (!s) return; const pos = posOf(s, tn); WORLD.threats.forEach(z => { if (dist(pos.x, pos.y, z.x, z.y) <= z.r && rng(d.id * 7919 + Math.floor(tn))() < z.loss) { d.lost = true; d.tLost = tn; stats.dronesLost++; s.tHome = tn; s.lost = true; s.stops.forEach(st => { if (!st.done) { st.done = true; const c = byId.get(st.casId); if (c) c.tasking = null; if (PAYLOADS[st.payload].cold) stats.bloodWasted++; } }); A(tn, 'SYSTEM', 'LOSS', `${d.call} lost in ${z.label}`, {}); } }); });

    const idle = drones.filter(d => !d.lost && d.free <= tn);
    if (!idle.length) continue;
    let open = cas.filter(c => c._adm && !c.outcome && !c.tasking);
    if (angel) open = open.filter(c => c.deadlineMin < 9000).sort((a, b) => (a.tInjury + a.deadlineMin) - (b.tInjury + b.deadlineMin));
    else open.sort((a, b) => ({ IMMEDIATE: 0, DELAYED: 1, MINIMAL: 2, EXPECTANT: 3 }[a.cls] - { IMMEDIATE: 0, DELAYED: 1, MINIMAL: 2, EXPECTANT: 3 }[b.cls]) || (a.tInjury - b.tInjury));

    for (const c of open) {
      const free = idle.filter(d => d.free <= tn && !d.lost);
      if (!free.length) break;
      const want = angel ? usable(c) : c.needs;
      let best = null;
      for (const d of free) {
        for (const pk of want) {
          const P = PAYLOADS[pk];
          if (d.base.stock[pk] < 1) continue;
          const dkm = dist(d.base.x, d.base.y, c.x, c.y);
          if (dkm > effRadius(d.plat, angel ? P.kg : 3)) continue;
          const fly = dkm / d.plat.speed * 60;
          const arrive = tn + fly + d.plat.overhead;
          const admin = arrive + P.admin * ({ T1: 1.5, T2: 1.2, T3: 1 }[c.responder]);
          if (angel) {
            if (P.cold && coldAfter(fly, d.plat.tau) > 10) { stats.coldSwaps++; continue; }
            if (pk === 'TXA' && admin - c.tInjury > 180) continue;
          }
          const val = survTreated(c, admin - c.tInjury, pk) - survUntreated(c);
          if (angel && val <= 0.003) continue;
          const score = angel ? val : -dkm;
          if (!best || score > best.score) best = { d, pk, fly, arrive, admin, val, score, dkm, coldC: P.cold ? coldAfter(fly, d.plat.tau) : null };
        }
      }
      if (!best) continue;
      const { d, pk } = best;
      let fail = null;
      if (!caps(c).includes(pk)) fail = `responder is ${c.responder} and cannot administer`;
      else if (PAYLOADS[pk].cold && best.coldC > 10) fail = `cold chain broken — ${best.coldC.toFixed(1)}°C on arrival`;
      else if (rng(c.id * 7919)() < ({ HEAVY: .015, LIGHT: .03, LONG: .06 }[d.type])) fail = 'package not recovered on the ground';
      const route = [{ casId: c.id, payload: pk, arrive: best.arrive, tAdmin: best.admin, fail, coldC: best.coldC, dkm: best.dkm }];
      // multi-stop: chain nearby casualties onto the same airframe
      const maxStops = angel ? Math.min(3, d.plat.slots) : Math.min(2, d.plat.slots);
      let lastC = c, lastArr = best.arrive, loadKg = PAYLOADS[pk].kg, drawn = { [pk]: 1 };
      while (route.length < maxStops) {
        const cands = cas.filter(o => o._adm && !o.outcome && !o.tasking && o.id !== c.id && !route.some(r => r.casId === o.id) && dist(o.x, o.y, lastC.x, lastC.y) <= 9);
        let add = null;
        for (const o of cands) {
          if (!angel && ({ IMMEDIATE: 0, DELAYED: 1, MINIMAL: 2, EXPECTANT: 3 }[o.cls] - { IMMEDIATE: 0, DELAYED: 1, MINIMAL: 2, EXPECTANT: 3 }[c.cls]) > 1) continue;
          for (const qk of (angel ? usable(o) : o.needs)) {
            const Q = PAYLOADS[qk];
            if (d.base.stock[qk] - (drawn[qk] || 0) < 1) continue;
            if (loadKg + Q.kg > d.plat.payloadKg) continue;
            const leg = dist(lastC.x, lastC.y, o.x, o.y) / d.plat.speed * 60;
            const arr = lastArr + 1.2 + leg;
            const adm = arr + Q.admin * ({ T1: 1.5, T2: 1.2, T3: 1 }[o.responder]);
            if (angel) {
              if (Q.cold && coldAfter(arr - tn, d.plat.tau) > 10) continue;
              if (qk === 'TXA' && adm - o.tInjury > 180) continue;
            }
            const v = (survTreated(o, adm - o.tInjury, qk) - survUntreated(o)) * Math.exp(-leg / 55);
            if (angel && v <= 0.003) continue;
            if (!add || v > add.v) add = { o, qk, arr, adm, v, dkm: dist(d.base.x, d.base.y, o.x, o.y), coldC: Q.cold ? coldAfter(arr - tn, d.plat.tau) : null };
          }
        }
        if (!add) break;
        let f2 = null;
        if (!caps(add.o).includes(add.qk)) f2 = `responder is ${add.o.responder} and cannot administer`;
        else if (PAYLOADS[add.qk].cold && add.coldC > 10) f2 = `cold chain broken — ${add.coldC.toFixed(1)}°C on arrival`;
        else if (rng(add.o.id * 7919)() < ({ HEAVY: .015, LIGHT: .03, LONG: .06 }[d.type])) f2 = 'package not recovered on the ground';
        route.push({ casId: add.o.id, payload: add.qk, arrive: add.arr, tAdmin: add.adm, fail: f2, coldC: add.coldC, dkm: add.dkm });
        drawn[add.qk] = (drawn[add.qk] || 0) + 1; loadKg += PAYLOADS[add.qk].kg; lastArr = add.arr; lastC = add.o;
      }
      // grounds for escalation (ANGEL only)
      const grounds = [];
      if (angel) {
        if (d.base.stock[pk] - 1 <= 0 && (pk === 'BLOOD' || pk === 'PLASMA')) grounds.push('LAST ' + PAYLOADS[pk].label.toUpperCase());
        const mid = { x: (d.base.x + c.x) / 2, y: (d.base.y + c.y) / 2 };
        const z = WORLD.threats.find(z => dist(mid.x, mid.y, z.x, z.y) <= z.r);
        if (z) grounds.push('THREAT TRANSIT ' + Math.round(z.loss * best.fly * 100) + '%');
        if (best.val < 0.10) grounds.push('LOW CONFIDENCE');
        if ((c.cls === 'MINIMAL' || c.cls === 'EXPECTANT') && cas.some(o => o._adm && !o.outcome && !o.tasking && o.cls === 'IMMEDIATE')) grounds.push('IMMEDIATE UNASSIGNED');
      }
      if (angel && grounds.length) {
        const alt = cas.find(o => o._adm && !o.outcome && !o.tasking && o.id !== c.id && o.deadlineMin < 9000);
        const p = { id: proposals.length + 1, tRaised: tn, tActed: null, state: 'PENDING', drone: d, call: d.call, route, casId: c.id, altId: alt ? alt.id : null, value: best.val, gain: Math.round(best.val * 100), grounds, eta: best.arrive - c.tInjury, deadline: c.deadlineMin, summary: `${d.call} → ${c.cid}`, autoAct: true };
        proposals.push(p); stats.escalated++; c.tasking = 'PROPOSAL'; c.proposal = p.id; d.free = tn + 0.25;
        A(tn, 'ANGEL SWARM', 'ESCALATE', `E-${String(p.id).padStart(4, '0')} · ${d.call} → ${c.cid} · expected benefit ${p.gain} · ${grounds.join(' · ')}`, { propId: p.id, casId: c.id });
      } else {
        launch(d, route, tn, angel ? 'STANDING AUTHORITY' : 'DOCTRINAL PUSH', null);
        if (angel) { stats.autoDispatch++; A(tn, 'ANGEL SWARM', 'AUTO-DISPATCH', `${d.call} → ${c.cid} · ${PAYLOADS[pk].label} · arrives T+${best.arrive.toFixed(1)} · ${Math.round(c.tInjury + c.deadlineMin - best.admin)} min inside deadline · benefit ${Math.round(best.val * 100)}`, { casId: c.id, droneId: d.id }); }
      }
    }
  }

  function launch(d, route, tn, actor, propId) {
    const last = route[route.length - 1];
    const home = last.arrive + 0.6 + (last.dkm / d.plat.speed * 60) + 3;
    const s = { id: sorties.length + 1, drone: d, tLaunch: tn, tHome: home, stops: route.map(r => ({ ...r, done: false })), actor, propId };
    route.forEach(r => { const c = byId.get(r.casId); if (c) { c.tasking = d.call; c.sortie = s.id; } d.base.stock[r.payload]--; d.base.spent[r.payload]++; stockLog.push({ t: tn, base: d.base.idx, item: r.payload, d: -1, reason: 'ISSUE' }); });
    d.free = home; d.sorties++; d.base.sorties++; stats.sorties++; sorties.push(s);
    events.push({ t: tn, kind: 'LAUNCH', call: d.call, casId: route[0].casId, payload: route[0].payload, actor });
  }
  function posOf(s, t) {
    const st = s.stops[0], b = s.drone.base, c = byId.get(st.casId);
    if (!c) return { x: b.x, y: b.y };
    const outFrac = Math.min(1, Math.max(0, (t - s.tLaunch) / Math.max(0.1, st.arrive - s.tLaunch)));
    if (t <= st.arrive) return { x: b.x + (c.x - b.x) * outFrac, y: b.y + (c.y - b.y) * outFrac };
    const back = Math.min(1, (t - st.arrive) / Math.max(0.1, s.tHome - st.arrive));
    return { x: c.x + (b.x - c.x) * back, y: c.y + (b.y - c.y) * back };
  }
  sorties.forEach(s => s.stops.forEach(st => { if (!st.done) { stats.inTransit++; if (PAYLOADS[st.payload].cold) stats.inTransitCold++; } }));
  cas.forEach(c => { if (!c.outcome) resolveDeath(c, WORLD.durationMin, 'finalize'); });
  A(WORLD.durationMin, 'SYSTEM', 'RUN-COMPLETE', `${stats.survivableDeaths} died of survivable wounds of ${stats.allDeaths} dead in all categories`);
  return { label, angel, cas, byId, bases, drones, sorties, events, audit, proposals, stats, deathsByMin, posOf, stockLog };
}

export function buildRun({ seed = 42, deployed = true } = {}) {
  const stream = makeStream(seed * 7919 + 13);
  const A = runArm(stream, 'ANGEL SWARM', deployed, seed);
  const B = runArm(stream, 'DOCTRINAL PUSH', false, seed + 1);
  return { seed, deployed, stream, A, B };
}

const OVERTAKEN = 'casualty resolved before the aircraft arrived';

// Every after-action figure, derived at time t by replaying the arm's own logs.
// Issued = transfused + destroyed + aboard, by construction, at every t.
export function tally(arm, t) {
  const waste = arm.events.filter(e => e.kind === 'WASTE' && e.t <= t);
  const bloodIssued = arm.stockLog.filter(e => e.reason === 'ISSUE' && e.item === 'BLOOD' && e.t <= t).length;
  const bloodUsed = arm.cas.filter(c => c.treated && c.treatedWith === 'BLOOD' && c.tTreated <= t).length;
  const bloodDestroyed = waste.filter(e => e.payload === 'BLOOD').length;
  return {
    allDeaths: arm.cas.filter(c => c.outcome === 'DIED' && c.tResolved <= t).length,
    treated: arm.cas.filter(c => c.treated && c.tTreated <= t).length,
    sorties: arm.sorties.filter(s => s.tLaunch <= t).length,
    unusable: waste.filter(e => e.reason !== OVERTAKEN).length,
    overtaken: waste.filter(e => e.reason === OVERTAKEN).length,
    bloodIssued, bloodUsed, bloodDestroyed,
    bloodAboard: Math.max(0, bloodIssued - bloodUsed - bloodDestroyed)
  };
}

export function snapshot(run, t) {
  const A = run.A, B = run.B;
  const cum = (arr, t) => arr.slice(0, Math.floor(t) + 1).reduce((a, b) => a + b, 0);
  const open = A.cas.filter(c => c._adm && c.tInjury <= t && !c.outcome).filter(c => !c.tResolved || c.tResolved > t);
  const live = A.cas.filter(c => c.tInjury <= t);
  const resolvedNow = live.filter(c => c.tResolved != null && c.tResolved <= t);
  const openNow = live.filter(c => c.tResolved == null || c.tResolved > t);
  const rows = openNow.map(c => {
    const tRem = c.deadlineMin >= 9000 ? null : c.tInjury + c.deadlineMin - t;
    const s = A.sorties.find(s => s.stops.some(st => st.casId === c.id) && s.tLaunch <= t && s.tHome > t && !s.lost);
    const st = s && s.stops.find(st => st.casId === c.id);
    const arrival = st ? st.arrive - t : null;
    const prop = A.proposals.find(p => p.casId === c.id && p.tRaised <= t && (!p.tActed || p.tActed > t));
    const reach = A.bases.filter(b => b.fleet.some(ty => dist(b.x, b.y, c.x, c.y) <= effRadius(PLATFORMS[ty], 1.45))).length;
    return {
      id: c.id, cid: c.cid, name: c.name, site: c.site, unit: c.unit, cls: c.cls, responder: c.responder, role: c.role,
      injury: INJURY_LABEL[c.injury], si: c.si, needs: c.needs.map(n => PAYLOADS[n].short).join(' + '),
      tRem, arrival, slack: tRem != null && arrival != null ? tRem - arrival : null,
      tasking: prop ? 'ESCALATED' : s ? s.drone.call : null, reach, prop: prop ? prop.id : null,
      staleMin: +(((c.id * 37) % 11) * 0.4).toFixed(1), deadlineMin: c.deadlineMin
    };
  }).sort((a, b) => (a.tRem == null ? 1e9 : a.tRem) - (b.tRem == null ? 1e9 : b.tRem));
  const pending = A.proposals.filter(p => p.tRaised <= t && (!p.tActed || p.tActed > t));
  const dA = cum(A.deathsByMin, t), dB = cum(B.deathsByMin, t);
  const resolvedSurv = live.filter(c => (c.cls === 'IMMEDIATE' || c.cls === 'DELAYED') && c.tResolved != null && c.tResolved <= t).length;
  const stock = A.bases.map(b => {
    const on = { ...STOCK0 };
    A.stockLog.forEach(e => { if (e.base === b.idx && e.t <= t) on[e.item] += e.d; });
    const issued = A.stockLog.filter(e => e.base === b.idx && e.t <= t && e.reason === 'ISSUE').length;
    return { name: b.name, afloat: b.afloat, blood: Math.max(0, on.BLOOD), plasma: Math.max(0, on.PLASMA), txa: Math.max(0, on.TXA), tq: Math.max(0, on.TQ_KIT), seal: Math.max(0, on.CHEST_SEAL), issued, x: b.x, y: b.y };
  });
  const fleet = A.drones.map(d => {
    const s = A.sorties.find(s => s.drone === d && s.tLaunch <= t && s.tHome > t);
    const lost = d.lost && d.tLost <= t;
    const st = s && s.stops[0];
    return { call: d.call, plat: d.plat.label, base: d.base.name, state: lost ? 'LOST' : s ? (st.arrive > t ? 'OUTBOUND' : 'RETURNING') : 'IDLE', carrying: s ? PAYLOADS[st.payload].short : null, target: s ? A.byId.get(st.casId).cid : null, sorties: A.sorties.filter(x => x.drone === d && x.tLaunch <= t).length, eta: s && st.arrive > t ? +(st.arrive - t).toFixed(1) : null, x: s ? A.posOf(s, t).x : d.base.x, y: s ? A.posOf(s, t).y : d.base.y, type: d.type };
  });
  const airborne = fleet.filter(f => f.state === 'OUTBOUND' || f.state === 'RETURNING').length;
  const feed = A.audit.filter(e => e.t <= t).slice().reverse();
  const commsDown = WORLD.comms.some(w => t >= w.at && t < w.at + w.dur);
  const causes = { treatedDied: 0, noResponder: 0, noLaunchPoint: 0, tooFast: 0, busy: 0 };
  A.cas.forEach(c => { if (c.cause && c.tResolved <= t) causes[c.cause]++; });
  const unreachable = rows.filter(r => r.reach === 0 || (r.tRem != null && r.arrival == null && r.tRem < 12)).length;
  const missed = rows.filter(r => r.slack != null ? r.slack < 0 : r.tRem != null && r.arrival == null).length;
  const inside = rows.filter(r => r.slack != null && r.slack >= 0).length;
  const notAssertable = rows.filter(r => r.tRem == null).length;
  return {
    t, rows, open: openNow.length, resolved: resolvedNow.length, admitted: live.length,
    tA: tally(A, t), tB: tally(B, t),
    pending, dA, dB, delta: dB - dA, resolvedSurv, readable: resolvedSurv >= 10,
    stock, fleet, airborne, feed, commsDown, causes, unreachable, missed, inside, notAssertable,
    tightest: rows.find(r => r.tRem != null && r.tRem > 0) || null,
    pastDeadline: rows.filter(r => r.tRem != null && r.tRem <= 0).length,
    bloodU: stock.reduce((a, b) => a + b.blood, 0), plasmaU: stock.reduce((a, b) => a + b.plasma, 0),
    sitesWithBlood: stock.filter(s => s.blood > 0).length,
    ready: fleet.filter(f => f.state === 'IDLE').length, total: fleet.filter(f => f.state !== 'LOST').length,
    sortiesFlown: A.sorties.filter(s => s.tLaunch <= t).length,
    administered: A.cas.filter(c => c.treated && c.tTreated <= t).length,
    escalated: A.proposals.filter(p => p.tRaised <= t).length,
    approved: A.proposals.filter(p => p.state === 'APPROVED' && p.tActed <= t).length,
    lapsed: A.proposals.filter(p => p.state === 'EXPIRED' && p.tActed <= t).length,
    auditN: A.audit.filter(e => e.t <= t).length,
    stream: A.events.filter(e => e.t <= t && (e.kind === 'DELIVERED' || e.kind === 'WASTE' || e.kind === 'LAUNCH')).slice().reverse()
  };
}
export { effRadius, dist, STOCK0 };
