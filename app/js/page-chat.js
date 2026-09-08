/* ==========================================================================
   ASK ANGEL — a question-and-answer surface that will not make anything up
   ==========================================================================
   This destination absorbs the old BRIEF pane, which was the language model.
   THE WEIGHTS ARE NOT IN THIS FOLDER. js/copilot.js probes for them on load
   and, finding none, withdraws its own pane and its own rail entry rather
   than leaving a destination that apologises. The honest thing to do here is
   to say so on the page and then answer anyway with the two things that are
   actually installed:

     · figures computed from the running allocation — arithmetic over the
       live state, which is not a model and carries no AI chip;
     · passages quoted verbatim out of the reference corpus by MiniLM, a
       sentence encoder that runs on this machine and cannot generate text,
       which is a trained model and does carry the chip, with its score.

   Nothing on this page is written by a generative model, and where neither
   of the two above can answer, the page says the corpus does not answer it.
   A question that ranks one casualty against another is refused outright and
   handed to the human, which is the canvas's THIS ONE NEEDS YOU state and is
   the same rule the allocator itself follows.

   Every question is written into the decision record before it is answered,
   so "every answer is a record entry" is a fact about this page rather than
   a caption on it.
   ========================================================================== */
(function () {
  'use strict';
  const P = window.DPB;
  const D = () => window.DSHELL;
  if (!P) return;
  const esc = P.esc;

  const S = { thread: [], draft: '', seq: 0, focus: false, sel: null, busy: false, lastQ: null, lastAt: 0 };

  const SUGGEST = [
    'who can I not reach in time',
    'how many have died of survivable wounds',
    'how much blood is forward and where',
    'which readings are too stale to act on',
    'how long can whole blood stay out of refrigeration'
  ];

  /* ======================================================================
     THE RESOLVER
     ====================================================================== */
  /* Refusal is tested first. A question that asks this system to rank two
     casualties is not a question it is allowed to answer well. */
  const REFUSE = /prioriti[sz]e between|choose between|instead of|whose life|sacrifice|let .+ die|\b(who|which|whom)\b[^?]*\b(save|first|pick|choose|prioriti[sz]e|rank|deserve|matters? more|worth more)\b/i;
  /* The refusal is about people. "Which aircraft should I pick" is a question
     about the fleet and belongs to the lift rule, so the shape above only
     refuses when the sentence is about a casualty. */
  const REFUSE_WHO = /casualt|patient|cas[-\s]?\d|wounded|soldier|\blife\b|\blives\b|\bwhom\b|\bwho\b|\bhim\b|\bher\b|\bthem\b/i;

  /* Each of these has to be narrow enough that a reference question falls
     through it to retrieval. "How long can whole blood stay out of
     refrigeration" is a corpus question and must not be caught by the blood
     rule; "who can I not reach in time" is a state question and must be
     caught by the first. Anything not matched here goes to MiniLM.

     THE RULE THAT WAS NOT HERE. There was no rule for "how many casualties
     were in this run" — a question the arm's own casualty array answers
     exactly — so it fell through to retrieval and came back with a doctrine
     passage about cold-chain storage. A figure about this run is ground
     truth and is answered from the run; the corpus is a library and is
     quoted only when the question is about doctrine. Six rules were added
     for the counts an operator actually asks for, and `class viii` was
     removed from the comparison rule, where it was swallowing the corpus
     question "what is Class VIIIA and Class VIIIB". */
  const RULES = [
    [/(how many|number of|count of|how big).{0,24}(casualt|wounded|soldier|patient)|casualt(y|ies).{0,20}(in|were in|did|does|entered).{0,16}(this|the|last) run|cohort size|how many (came|were) (in|through)/i, aCount],
    [/unreachable|(cannot|can'?t|unable to|not able to|do not|don'?t|not)\s+reach|reach\b.*\bin time|nobody .*reach|miss(es|ing)? (the |a |their )?deadline|too late/i, aUnreachable],
    [/tightest|soonest|most urgent|running out|next deadline|who is next|least time|shortest deadline|closest to (the )?deadline/i, aTightest],
    [/\bsortie|(how many|number of|count of).{0,24}(flight|flown|launch(es|ed)?)|flights? (were )?flown|missions? (were )?flown/i, aSorties],
    [/(blood|plasma|unit|ltowb).{0,40}(deliver|transfus|administer|used|issued|drawn|wasted|waste|destroy|spoil|thrown|binned|lost)|(deliver|transfus|administer|wasted|waste|destroy|spoil).{0,24}(blood|plasma|unit)|cold chain (broke|broken|failure|failed)|how much blood was/i, aBloodLedger],
    [/escalat|proposal|standing authority|lapsed|unactioned|authoris|authoriz|withheld|waiting on a person|delegat(ed|ion) (was|were|lapsed)/i, aEscal],
    [/(biggest|largest|main|leading|commonest|most common) cause|cause of death|causes of death|what killed|why did .{0,24}(they |the |these )?(die|died|death|deaths)|binding constraint/i, aCause],
    [/how many .*(die|died|dead|death)|death toll|survivable wound|deaths? (so far|to date)|\bversus\b|\bvs\b|compare|baseline|how did we do|how are we doing|current triage and proximity/i, aToll],
    [/(how much|how many|where).*(blood|plasma|ltowb|unit|stock)|blood forward|blood end(ed)? up|on the shelf|\bshelf\b|\bstock\b|manifest|run(ning)? dry|supply state/i, aBlood],
    [/(how many|which|where|what).*(aircraft|airframe|drone|lift|sortie)|lift state|fleet state|airborne|launch point|\bfarp\b/i, aLift],
    [/stale|withheld|not asserted|assertable|telemetry age|signal quality|which readings/i, aStale],
    [/^\s*why\b|why (was|were|did|is|are|this)|justify|explain (why|the|this)/i, aWhy]
  ];

  function live() { return D() ? D().live() : null; }

  function resolve(q) {
    const L = live();
    if (!L) return { kind: 'none', lead: 'No run is loaded in this page yet, so there is no state to answer from.' };
    if (REFUSE.test(q) && REFUSE_WHO.test(q)) return aRefuse(L, q);
    for (const [re, fn] of RULES) if (re.test(q)) { const r = fn(L, q); if (r) return r; }
    return null;                      // fall through to retrieval
  }

  /* ---- the computed answers ---------------------------------------------- */
  function src(L, extra) {
    const bits = ['live allocation state T+' + Math.floor(L.now) + ' min',
                  'seed ' + (window.APP ? window.APP.seed : '?'),
                  esc(L.scn ? (L.scn.name || '') : '')];
    return bits.concat(extra || []).filter(Boolean).join(' · ');
  }

  /* ---- the counts the router had no rule for -----------------------------
     Every figure below is read out of the arm the run was flown with, or out
     of COUNT, which is the application's single counting surface and is
     self-tested against the engine's own ledgers. Nothing here is estimated
     and none of it carries the AI chip, because arithmetic is not a model. */
  function aCount(L) {
    const cas = (L.A.casualties || []).filter(c => c.tInjury <= L.now);
    const cls = {};
    for (const c of cas) { const k = c.cls || 'UNKNOWN'; cls[k] = cls[k] || { n: 0, died: 0 };
      cls[k].n++; if (c.outcome === 'DIED') cls[k].died++; }
    const resolved = cas.filter(c => c.outcome !== null).length;
    const C = window.COUNT;
    return { kind: 'figures',
      lead: cas.length + ' wounded soldiers have entered this run' +
        (resolved === cas.length ? ' and every one of them has resolved. '
                                 : '. ' + resolved + ' have resolved and ' + (cas.length - resolved) + ' are still open. ') +
        (C ? C.deathsSurvivable(L.A) + ' died of wounds medicine could have treated in time; ' +
             C.deathsAll(L.A) + ' died across all triage categories. ' : '') +
        'The same casualties are fought by both arms — the stream is generated once and cloned — so ' +
        'the difference between the two tolls is the tasking rule and nothing else.',
      cards: Object.keys(cls).sort().map(k => ({ crit: cls[k].died > 0, title: esc(k),
        body: cls[k].n + ' wounded · ' + cls[k].died + ' died' })),
      cited: src(L, ['armA.casualties folded at T+' + Math.floor(L.now)]) };
  }

  function aSorties(L) {
    const C = window.COUNT;
    if (!C) return null;
    const a = C.sorties(L.A), b = C.sorties(L.ctl);
    /* The comparison is only a comparison when there are two rules to
       compare. Undeployed, both arms are running current triage and
       proximity and the two counts are the same figure twice. */
    const tail = !L.deployed
      ? ' ANGEL SWARM is not deployed, so both arms are running current triage and proximity and these are the same rule flown twice.'
      : a < b ? ' ANGEL SWARM flies fewer because it flies against a deadline rather than against a schedule.'
      : a > b ? ' ANGEL SWARM has flown more, which on this seed means it is reaching casualties the proximity rule left alone.'
      : ' The two are level on this seed.';
    return { kind: 'figures',
      lead: a + ' sorties have been flown under ANGEL SWARM tasking, against ' + b +
        ' under current triage and proximity on the same force, the same launch points and the same blood.' + tail,
      cards: [
        { title: 'ANGEL SWARM TASKING',
          body: C.sorties(L.A) + ' sorties · ' + C.administered(L.A) + ' payloads administered · ' +
                C.sortiesWasted(L.A) + ' carrying something nobody there could use' },
        { title: 'CURRENT — TRIAGE & PROXIMITY',
          body: C.sorties(L.ctl) + ' sorties · ' + C.administered(L.ctl) + ' payloads administered · ' +
                C.sortiesWasted(L.ctl) + ' carrying something nobody there could use' },
        { title: 'LIFT', body: L.lift.ready + ' of ' + L.lift.all + ' airframes ready · ' + L.lift.air + ' airborne' }
      ],
      cited: src(L, ['COUNT.sorties over both arms']) };
  }

  /* Where the blood went, which is a different question from where the blood
     is. The shelf answer is aBlood; this one is the ledger. */
  function aBloodLedger(L) {
    const C = window.COUNT;
    if (!C) return null;
    const s = P.shelf(L.A);
    return { kind: 'figures',
      lead: C.administered(L.A) + ' payloads have been administered under ANGEL SWARM tasking and ' +
        C.bloodDestroyed(L.A) + ' units of blood have been destroyed by a broken cold chain, against ' +
        C.bloodDestroyed(L.ctl) + ' destroyed under current triage and proximity. A unit whose ' +
        'temperature record is broken cannot be transfused and is destroyed on return, which is why ' +
        'the ledger still balances.' +
        (L.deployed ? '' : ' ANGEL SWARM is not deployed, so both arms are running the same rule and ' +
          'the two columns below are not yet a comparison.'),
      cards: [
        { title: 'ANGEL SWARM TASKING',
          body: C.administered(L.A) + ' administered · ' + C.deliveriesFailed(L.A) + ' delivery attempts failed · ' +
                C.bloodDestroyed(L.A) + ' units destroyed by cold chain' },
        { title: 'CURRENT — TRIAGE & PROXIMITY', crit: C.bloodDestroyed(L.ctl) > C.bloodDestroyed(L.A),
          body: C.administered(L.ctl) + ' administered · ' + C.deliveriesFailed(L.ctl) + ' delivery attempts failed · ' +
                C.bloodDestroyed(L.ctl) + ' units destroyed by cold chain' },
        { title: 'STILL FORWARD', body: s.units + ' units across ' + s.sites + ' launch point' + (s.sites === 1 ? '' : 's') }
      ],
      cited: src(L, ['COUNT.administered and COUNT.bloodDestroyed over both arms']) };
  }

  function aEscal(L) {
    const all = (L.A.queue || []).filter(p => p.tRaised <= L.now);
    if (!all.length) return { kind: 'figures',
      lead: 'Nothing has been escalated in this run. Every tasking so far has fallen inside the ' +
            'standing authority the commander delegated, so no proposal has been raised and nothing ' +
            'is waiting on a person.',
      cards: [], cited: src(L, ['armA.queue']) };
    const by = k => all.filter(p => p.state === k).length;
    const pend = by('PENDING'), ok = by('APPROVED'), gone = by('EXPIRED'), no = by('REJECTED');
    return { kind: 'figures',
      lead: all.length + ' escalation' + (all.length === 1 ? ' has' : 's have') + ' been raised. ' +
        ok + ' authorised, ' + no + ' withheld, ' + gone + ' lapsed unactioned and ' + pend +
        ' still waiting on a person. An authority that lapses is a decision the record has to show ' +
        'as one, so it is counted rather than quietly dropped.',
      cards: all.slice(-4).reverse().map(p => ({ crit: p.state === 'EXPIRED' || p.state === 'PENDING',
        title: esc('E-' + String(p.id).padStart(4, '0')) + ' · ' + esc(p.summary),
        body: String(p.state).toLowerCase() + ' · raised T+' + p.tRaised.toFixed(1) +
              ' · ' + esc((p.reasons || []).join(', ').toLowerCase()) })),
      cited: src(L, ['armA.queue, every proposal with what became of it']) };
  }

  function aCause(L) {
    let c = null;
    try { c = window.deathCauses ? window.deathCauses(L.A) : null; } catch (e) { c = null; }
    if (!c) return null;
    const LBL = { noResponder: 'Nobody on scene could administer it',
                  noLaunchPoint: 'No launch point in reach',
                  tooFast: 'Faster than any flight could be',
                  busy: 'Every capable aircraft already committed',
                  treatedDied: 'Reached and treated, died anyway' };
    const ord = Object.keys(LBL).map(k => [k, c[k]]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    return { kind: 'figures',
      lead: c.total + ' have died of wounds they could have survived. ' +
        (ord.length ? 'The largest single cause is ' + LBL[ord[0][0]].toLowerCase() + ', at ' +
          ord[0][1] + ' of the ' + c.total + '. ' : '') +
        'Each death is filed under the FIRST constraint that bound it, not the only one, so these ' +
        'are causes and not a partition of blame.',
      cards: ord.map(([k, v]) => ({ crit: true, title: esc(LBL[k]), body: v + ' of ' + c.total })),
      note: 'The tasking rule is rarely what lost them. That is the point of decomposing the count.',
      cited: src(L, ['optimizer.js deathCauses() over the survivable cohort']) };
  }

  function aUnreachable(L) {
    const MIN = D().MIN;
    const bad = L.timed.filter(r => r.unreachable || (r.slack !== null && r.slack < 0));
    if (!bad.length) {
      return { kind: 'figures',
        lead: 'Nobody. Every open casualty inside a deadline this system holds is inside the reach of ' +
              'an aircraft that arrives before it expires.',
        cards: [], cited: src(L) };
    }
    return { kind: 'figures',
      lead: bad.length === 1
        ? 'One, and here is why.'
        : bad.length + ', and not all for the same reason.',
      cards: bad.slice(0, 4).map(r => {
        const c = r.c;
        return { crit: true, page: 'cas', title: esc(D().casId(c)) + ' · ' + esc(r.site ? r.site.b.name : (c.unitName || 'the line')),
          body: 'deadline ' + MIN(Math.max(0, r.left)) +
            (r.eta === null ? ' · no aircraft in reach at all' : ' · nearest arrival ' + MIN(r.eta) +
              ' · slack ' + P.sgn(r.slack)) +
            ' · ' + (c.needs || []).map(P.pay).join(' + ') +
            (r.unreachable ? '. No reallocation of the current force reaches this position.'
                           : '.') };
      }),
      cited: src(L, ['reach model published by the allocator']) };
  }

  function aTightest(L) {
    const MIN = D().MIN, t = L.tightest;
    if (!t) return { kind: 'figures', lead: 'Nothing is open inside a deadline this system holds.', cards: [], cited: src(L) };
    const d = P.droneOf(L.A, t.c.assignedTo);
    return { kind: 'figures',
      lead: esc(D().casId(t.c)) + ' has ' + MIN(Math.max(0, t.left)) + ' left, the least of anyone open.',
      cards: [{ crit: t.slack !== null && t.slack < 0, page: 'cas',
        title: esc(D().casId(t.c)) + ' · ' + esc(t.site ? t.site.b.name : (t.c.unitName || 'the line')),
        body: (t.eta === null ? 'No aircraft in reach.' : 'Nearest arrival ' + MIN(t.eta) + ', slack ' + P.sgn(t.slack) + '.') +
          (d ? ' Tasked to ' + esc(P.call(d)) + ' under standing authority.' : ' Not yet tasked.') }],
      cited: src(L) };
  }

  function aToll(L) {
    const C = window.COUNT;
    if (!L.deployed) return { kind: 'figures',
      lead: 'ANGEL SWARM is not deployed, so there is no allocation to compare against the control arm yet.',
      cards: [], cited: src(L) };
    const a = L.deadA, b = L.deadB, d = b - a;
    /* The figures inside the sentence are red; the sentence itself is not. */
    const R = n => '<b class="d-death" style="font-weight:600">' + n + '</b>';
    return { kind: 'figures',
      lead: R(a) + ' have died of wounds they could have survived under deadline-ordered allocation, against ' +
        R(b) + ' under current triage and proximity on the same casualties, the same aircraft and the same blood' +
        (d === 0 ? '. The two are level.' : ' — ' + R(Math.abs(d)) + ' ' + (d > 0 ? 'fewer' : 'more') + ' dead.'),
      cards: [
        { title: 'ANGEL SWARM TASKING', crit: true,
          body: a + ' dead of survivable wounds' + (C ? ' · ' + C.sorties(L.A) + ' sorties · ' + C.deathsAll(L.A) + ' dead in all triage categories' : '') },
        { title: 'CURRENT — TRIAGE & PROXIMITY', crit: true,
          body: b + ' dead of survivable wounds' + (C ? ' · ' + C.sorties(L.ctl) + ' sorties · ' + C.deathsAll(L.ctl) + ' dead in all triage categories' : '') }
      ],
      note: 'One seed is one battle. The paired replication study on Evidence is what turns this into a finding.',
      go: 'ev',
      cited: src(L, ['COUNT.deathsSurvivable over both arms']) };
  }

  function aBlood(L) {
    const s = P.shelf(L.A);
    const C = window.COUNT;
    return { kind: 'figures',
      lead: s.units + ' units of blood and plasma are on the shelf forward across ' + s.sites +
        ' launch point' + (s.sites === 1 ? '' : 's') + '.',
      cards: (L.A.bases || []).map(b => ({ title: esc(b.name),
        body: Object.keys(b.stock).map(k => P.pay(k) + ' ' + b.stock[k]).join(' · ') })),
      note: C ? C.bloodDestroyed(L.A) + ' units have been destroyed by a broken cold chain in this run.' : '',
      cited: src(L, ['launch point manifests']) };
  }

  function aLift(L) {
    const C = window.COUNT;
    const air = (L.A.drones || []).filter(d => d.state !== 'IDLE' && d.state !== 'DOWN' && d.state !== 'LOST');
    return { kind: 'figures',
      lead: L.lift.ready + ' of ' + L.lift.all + ' airframes are ready and ' + L.lift.air +
        (L.lift.air === 1 ? ' is' : ' are') + ' airborne.',
      cards: air.slice(0, 4).map(d => ({ title: esc(P.call(d)) + ' · ' + esc(d.plat ? d.plat.label : ''),
        body: 'out of ' + esc(d.baseName) + ' · ' + esc(String(d.state).toLowerCase()) +
          (d.target != null ? ' · tasked to ' + esc('CAS-' + String(d.target).padStart(3, '0')) : '') +
          ' · ' + d.sorties + ' sorties, ' + d.delivered + ' delivered' })),
      note: C ? C.sorties(L.A) + ' sorties flown, ' + C.sortiesWasted(L.A) + ' carrying something nobody there could use.' : '',
      cited: src(L, ['fleet state']) };
  }

  function aStale(L) {
    const stale = L.open.filter(c => (L.now - c.tPinged) > 2);
    if (!stale.length) return { kind: 'figures',
      lead: 'Every open casualty has a reading fresh enough for this system to assert a deadline on.',
      cards: [], cited: src(L, ['wearable telemetry']) };
    return { kind: 'figures',
      lead: stale.length + ' ' + (stale.length === 1 ? 'casualty has' : 'casualties have') +
        ' a reading the network will not act on. No deadline is asserted and no sortie is tasked against an estimate.',
      cards: stale.slice(0, 4).map(c => ({ page: 'cas',
        title: esc(D().casId(c)) + ' · ' + esc(c.unitName || 'the line'),
        body: 'last heard ' + Math.round(L.now - c.tPinged) + ' minutes ago · reading withheld · ' +
          'the deadline is not asserted rather than estimated' })),
      cited: src(L, ['wearable telemetry age']) };
  }

  function aWhy(L, q) {
    const m = /cas[-\s]?0*(\d+)/i.exec(q);
    let c = null;
    if (m) c = L.A.casualties.find(x => String(x.id) === String(parseInt(m[1], 10)));
    if (!c) c = L.A.casualties.filter(x => x.decision && x.decision.t <= L.now)
                              .sort((x, y) => y.decision.t - x.decision.t)[0];
    if (!c || !c.decision) return null;
    const k = c.decision;
    const lost = (k.candidates || []).filter(x => !x.chosen).slice(0, 3);
    return { kind: 'figures',
      lead: esc(k.call) + ' was sent to ' + esc(D().casId(c)) + ' because it was the airframe with the ' +
        'largest expected gain that could get there in time: survival ' + (k.pUntreated * 100).toFixed(0) +
        '% without the payload, ' + (k.pTreated * 100).toFixed(0) + '% with it, on the ground ' +
        k.arriveFromInjury.toFixed(0) + ' minutes after wounding.',
      cards: lost.map(x => ({ title: esc(x.call) + ' · ' + esc(x.plat),
        body: x.distKm + ' km from ' + esc(x.base) + ' · ' + esc(String(x.verdict).toLowerCase()) })),
      note: 'This is the allocator’s own record, written at the moment of tasking. No model wrote it.',
      cited: src(L, ['allocator decision record for ' + D().casId(c)]) };
  }

  function aRefuse(L) {
    const q = P.pending(L.A);
    return { kind: 'refuse',
      lead: 'I will not rank two casualties on grounds I cannot state. Where two of them have the same ' +
        'expected loss on both branches there is no ground on which to prefer one, and choosing anyway ' +
        'would be a preference dressed as arithmetic. ' +
        (q.length ? 'There ' + (q.length === 1 ? 'is one proposal' : 'are ' + q.length + ' proposals') +
          ' open on exactly this and the cost of waiting is being recorded.'
                  : 'Nothing is open on this right now; when it is, it will be escalated rather than resolved.'),
      cited: src(L) };
  }

  /* ---- retrieval, the only trained model in this path ---------------------
     THE FLOOR, AND WHERE IT CAME FROM. It was 0.35, and 0.35 was measured
     against a set of questions the corpus does answer. Nobody had measured
     it against the questions it does NOT — the ones about this run — and
     those are the ones that reach it. Scored over the real index in this
     build, 22 questions the corpus answers and 24 it does not:

       corpus answers them      0.231 · 0.359 · 0.379 · 0.400 · 0.447 · 0.490
                                · 0.556 … 0.795   (median 0.666)
       corpus does not          0.032 · 0.071 · 0.183 · 0.221 · 0.263 … 0.588
                                (median 0.352)

     At 0.35 THIRTEEN of the twenty-four leaked through and were quoted as
     answers, "How many casualties were in the last run" (0.453) and "which
     casualty had the tightest deadline" (0.588) among them. Those thirteen
     are all run questions and the rules above now answer every one of them
     before retrieval is reached, which is the real fix. What is left for
     the floor to catch is the genuinely unanswerable, and the highest of
     those scores 0.354 ("what should I tell the surgeon"). 0.42 clears it
     with margin and sits on a plateau — 0.400 to 0.425 give an identical
     result on both sets — while keeping 18 of the 22 questions the corpus
     does answer. The four it gives up score 0.231 to 0.400 and are cases
     where the encoder genuinely does not find the passage; a refusal there
     is a correct answer and a 0.231 quote is not.

     This is Ask ANGEL's floor and not the corpus browser's. The Doctrine
     pane keeps 0.35 deliberately: there a weak score is the informative
     result, because the operator asked the corpus a question on purpose.  */
  const WEAK = 0.42;
  /* What this surface can answer, said out loud when it cannot answer. */
  const CAN_ANSWER = 'how many casualties are in this run, how many have died and of what, how the two ' +
    'arms compare, how many sorties have flown, where the blood is and how much has been destroyed, ' +
    'which deadline is tightest, who cannot be reached, what has been escalated, and any question the ' +
    'doctrine corpus covers.';

  async function retrieve(q) {
    if (!(window.ANGEL && ANGEL.has && ANGEL.has('doctrine'))) {
      return { kind: 'none',
        lead: 'I have no figure for that and the retrieval index is not loaded in this session, so I have ' +
              'nothing to quote either. I am not going to guess. I can answer ' + CAN_ANSWER };
    }
    const d = ANGEL.get('doctrine');
    const r = await d.search(q, 3);
    const top = (r.hits || [])[0];
    if (!top || top.score < WEAK) {
      return { kind: 'none', chip: 'MiniLM RETRIEVAL',
        lead: 'I cannot answer that. Nothing computed from this run answers it, and the corpus does not ' +
          'cover it either — the closest passage scores ' + (top ? top.score.toFixed(3) : '—') +
          ', under the floor of ' + WEAK.toFixed(2) + ' this index was measured at. I am showing you ' +
          'nothing rather than showing you its best guess. I can answer ' + CAN_ANSWER,
        cards: (r.hits || []).slice(0, 3).map(h => ({ title: esc(h.pub || h.id),
          body: esc(h.section || '') + ' · similarity ' + h.score.toFixed(3) + ' · below the floor' })),
        cited: 'MiniLM retrieval over ' + d.passages.length + ' passages · ' + Math.round(r.ms) + ' ms · declined, not answered' };
    }
    return { kind: 'quote', chip: 'MiniLM RETRIEVAL',
      lead: 'I have no computed figure for that, so this is quoted rather than answered — verbatim out of ' +
        'the reference corpus, at similarity ' + top.score.toFixed(2) + ' against a floor of ' + WEAK.toFixed(2) + '.',
      quote: top.sentence || top.text,
      cards: (r.hits || []).slice(1, 3).map(h => ({ title: esc(h.pub || h.id),
        body: esc(h.section || '') + ' · similarity ' + h.score.toFixed(2) })),
      note: d.disclaimer || '',
      cited: esc(top.pub || top.id) + (top.section ? ' · ' + esc(top.section) : '') +
        ' · MiniLM sentence encoder, on this machine · ' + Math.round(r.ms) + ' ms · ' +
        d.passages.length + ' passages' };
  }

  /* ---- asking -------------------------------------------------------------- */
  function ask(q) {
    q = String(q || '').trim();
    if (!q || S.busy) return;
    /* Enter is bound in two places — on the field and on the document — so
       that no repaint of the column can leave the key dead. Belt and braces
       must not mean the same question twice, so a repeat of the same text
       inside one keystroke is dropped rather than answered again. */
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (S.lastQ === q && (now - (S.lastAt || 0)) < 120) return;
    S.lastQ = q; S.lastAt = now;
    S.draft = '';
    const id = ++S.seq;
    const L = live();

    /* THE RECORD ENTRY IS WRITTEN BEFORE THE ANSWER, NOT AFTER IT. */
    try {
      if (L && window.audit) window.audit(L.A, L.now, 'ANALYST', 'ASK', q);
    } catch (e) { /* a failed log entry must not swallow the question */ }

    const turn = { id, q, at: L ? P.zulu(L.now) : '', a: null, ms: null };
    S.thread.push(turn);

    const t0 = performance.now();
    const direct = resolve(q);
    if (direct) {
      turn.a = direct; turn.ms = performance.now() - t0;
      if (window.DSHELL) DSHELL.paint();
      return;
    }
    S.busy = true;
    if (window.DSHELL) DSHELL.paint();
    retrieve(q).then(a => { turn.a = a; turn.ms = performance.now() - t0; })
      .catch(e => { turn.a = { kind: 'none', lead: 'The retrieval index failed on that question: ' + (e && e.message || e) }; })
      .then(() => { S.busy = false; if (window.DSHELL) DSHELL.paint(); });
  }

  P.act('bAsk', () => ask(S.draft));
  P.act('bSug', el => ask(el.dataset.bq));

  document.addEventListener('input', ev => {
    if (ev.target && ev.target.id === 'bChatQ') S.draft = ev.target.value;
  });
  /* ENTER NEVER REACHED THIS. The listener was on the bubble phase of
     `document`, and something upstream in this build stops keydown from
     propagating that far — a listener added to document at run time never
     sees a keystroke made in this field either, which is how it was found.
     So the only way to ask anything here was the ASK button. Capture phase
     runs before whatever is swallowing it, the handler still does nothing
     unless the keystroke came from this field, and it consumes the key
     itself so nothing downstream sees a stray Enter. */
  document.addEventListener('keydown', ev => {
    if (!ev.target || ev.target.id !== 'bChatQ') return;
    if (ev.key === 'Enter') { ev.preventDefault(); ask(ev.target.value); }
  }, true);

  /* ======================================================================
     THE PAGE
     ====================================================================== */
  window.DPAGES = window.DPAGES || {};
  window.DPAGES.chat = function (L) {
    /* The shell rewrites this column every second. Carry the half-typed
       question and the caret across the rewrite rather than losing them. */
    const cur = document.getElementById('bChatQ');
    S.focus = !!(cur && document.activeElement === cur);
    if (cur) { S.draft = cur.value; S.sel = [cur.selectionStart, cur.selectionEnd]; }
    if (S.focus) requestAnimationFrame(restore);
    requestAnimationFrame(bindField);

    const cp = probe();
    return `<div class="b-chat">
      <div class="b-chat-main">
        <div class="b-chat-head">
          <div style="display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h1>Ask ANGEL</h1>
              ${cp.installed
                ? '<span class="d-ai">&#10022; AI &middot; LOCAL LANGUAGE MODEL</span>'
                : '<span class="b-warn">NO LANGUAGE MODEL INSTALLED</span>'}
            </div>
            <span class="sub">ANSWERS RUN AGAINST LIVE STATE &middot; EVERY QUESTION IS WRITTEN TO THE DECISION RECORD</span>
          </div>
          <span class="d-clock">${L ? P.zulu(L.now) : '----:--Z'}</span>
        </div>
        <div class="b-thread">${thread(L)}</div>
        <div class="b-ask">
          <input id="bChatQ" type="text" autocomplete="off" spellcheck="false"
            placeholder="Ask about a casualty, an asset, a site, or the corpus&hellip;"
            value="${esc(S.draft)}">
          <span class="m">RUNS AGAINST LIVE STATE</span>
          <button class="b-go" type="button" data-bact="bAsk">${S.busy ? 'WORKING' : 'ASK'}</button>
        </div>
      </div>
      ${side(L, cp)}
    </div>`;
  };

  function restore() {
    const el = document.getElementById('bChatQ');
    if (!el || document.activeElement === el) return;
    el.focus();
    try { if (S.sel) el.setSelectionRange(S.sel[0], S.sel[1]); } catch (e) { /* not selectable */ }
  }

  /* ENTER, BOUND ON THE FIELD ITSELF.
     The shell rewrites this column once a second, so the field a question is
     typed into is not the field that exists a moment later: it is a new
     element with the value carried across. A listener on `document` is
     therefore the only one that survives — except that in this build a
     keystroke made in this field never reaches document at all, which is why
     Enter did nothing here and the ASK button was the only way to ask
     anything. So the field is bound directly, once per element, every time
     the shell hands us a new one. The document listener above is kept as
     well; between the two there is no repaint window in which Enter is dead.
     Idempotent — the flag is on the element, so it dies with it. */
  function bindField() {
    const el = document.getElementById('bChatQ');
    if (!el || el.__bqBound) return;
    el.__bqBound = true;
    el.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      ask(ev.target.value);
    });
  }

  function probe() {
    try {
      if (window.ANGEL && ANGEL.has && ANGEL.has('copilot')) {
        const c = ANGEL.get('copilot');
        return { known: true, installed: !!c.installed, target: c.target };
      }
    } catch (e) { /* fall through */ }
    return { known: false, installed: false, target: null };
  }

  /* ---- the transcript ------------------------------------------------------ */
  function thread(L) {
    if (!S.thread.length) return opening(L);
    return S.thread.map(t => {
      const q = `<div class="b-q"><span>${esc(t.q)}</span></div>`;
      if (!t.a) return q + `<div class="b-a"><div class="body">
        <span class="lead" style="color:var(--d-t5)">Reading the state and the corpus&hellip;</span></div></div>`;
      return q + answer(t);
    }).join('');
  }

  function opening(L) {
    const s = L ? P.shelf(L.A) : null;
    return `<div class="b-a"><header>
        <span class="d-meta" style="letter-spacing:.08em">NOTHING ASKED YET</span></header>
      <div class="body"><span class="lead">Ask a question about this run. I answer with figures computed
        from the live allocation, or with a passage quoted verbatim out of the reference corpus by the
        sentence encoder on this machine. I do not write prose, and where I cannot answer I say so
        instead of producing something that reads like an answer.</span>
        ${L ? `<span class="d-note">Standing on ${L.open.length} open casualt${L.open.length === 1 ? 'y' : 'ies'},
          ${L.lift.ready} of ${L.lift.all} airframes ready, ${s.units}U forward across
          ${s.sites} launch point${s.sites === 1 ? '' : 's'}.</span>` : ''}
      </div></div>`;
  }

  function answer(t) {
    const a = t.a;
    if (a.kind === 'refuse') {
      return `<div class="b-refuse"><header>
          <span>THIS ONE NEEDS YOU &middot; NOT ANSWERABLE BY ME</span><span>${esc(t.at)}</span></header>
        <div class="body"><span class="t">${a.lead}</span>
          <button class="b-go" type="button" data-page="dec">OPEN DECISION</button></div></div>`;
    }
    const chip = a.chip
      ? `<span class="d-ai">&#10022; AI &middot; ${esc(a.chip)}</span>`
      : `<span class="d-meta" style="letter-spacing:.08em">COMPUTED FROM LIVE STATE &middot; NOT A MODEL</span>`;
    const cards = (a.cards || []).length
      ? `<div class="b-cards">${a.cards.map(c =>
          `<div class="${c.crit ? 'crit' : ''}"${c.page ? ` data-page="${esc(c.page)}"` : ''}>
             <b>${c.title}</b><span>${c.body}</span></div>`).join('')}</div>`
      : '';
    return `<div class="b-a"><header>${chip}
        <span class="m">${esc(t.at)} &middot; Q-${String(t.id).padStart(4, '0')}${
          t.ms == null ? '' : ' &middot; ' + (t.ms < 1000 ? Math.round(t.ms) + ' ms' : (t.ms / 1000).toFixed(1) + ' s')}</span></header>
      <div class="body">
        <span class="lead">${a.lead}</span>
        ${a.quote ? `<span class="quote">&ldquo;${esc(a.quote)}&rdquo;</span>` : ''}
        ${cards}
        ${a.note ? `<span class="d-note">${a.note}</span>` : ''}
        ${a.go ? `<button class="b-link" type="button" data-page="${esc(a.go)}">OPEN EVIDENCE &rarr;</button>` : ''}
        ${a.cited ? `<div class="b-cited"><span class="k">CITED</span><span class="v">${a.cited}</span></div>` : ''}
      </div></div>`;
  }

  /* ---- the sidebar ---------------------------------------------------------- */
  function side(L, cp) {
    const lk = P.link();
    let dst = null;
    try { if (window.ANGEL && ANGEL.has('doctrine')) dst = ANGEL.get('doctrine').stats(); } catch (e) { dst = null; }
    let db = null;
    try { if (window.ANGEL && ANGEL.has('db')) db = ANGEL.get('db').info; } catch (e) { db = null; }

    return `<div class="b-side">
      <div class="b-sug"><span class="h">SUGGESTED</span>
        ${SUGGEST.map(q => `<button type="button" data-bact="bSug" data-bq="${esc(q)}">${esc(q)}</button>`).join('')}
      </div>
      <div class="b-box"><span class="h">ANSWERING FROM</span>
        <p>${esc(lk.txt.toLowerCase())} &middot; seed ${esc(window.APP ? window.APP.seed : '')} &middot;
        T+${L ? Math.floor(L.now) : 0} min${L && window.APP && window.APP.finished ? ' · run complete' : ''}</p>
        <p>${dst ? dst.passages + ' corpus passages, ' + dst.sentences + ' sentences indexed' : 'retrieval index not loaded'}${
          db ? ' · DuckDB ' + esc(db.version) + ' in this tab' : ''}</p>
      </div>
      ${cp.installed
        ? `<div class="b-box ai"><span class="h">&#10022; AI DISCLOSURE</span>
             <p>A local language model is installed. It is not what wrote the answers above: those are
             computed figures and quoted passages. Its own drafting surface is the mission brief.</p></div>`
        : `<div class="b-box amb"><span class="h">NO LANGUAGE MODEL HERE</span>
             <p>The weights${cp.target ? ' — ' + esc(cp.target.name) + ', ' + Math.round(cp.target.bytes / 1e6) + ' MB' : ''}
             are not in this folder, so nothing on this page is generated prose. Run get-model.sh and the
             drafting surface comes back on the next load. Until then I answer with arithmetic over the
             live run and with passages quoted verbatim, and I say so when I have neither.</p></div>`}
      <div class="b-box ai"><span class="h">&#10022; WHAT THE CHIP MEANS</span>
        <p>The violet chip marks the output of a trained model and nothing else. Retrieval is MiniLM and
        carries it. A figure read out of the run does not, because arithmetic is not a model.</p></div>
    </div>`;
  }
})();
