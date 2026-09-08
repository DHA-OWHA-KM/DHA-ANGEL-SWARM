/* =========================================================================
   AFTER-ACTION REPORT — a briefing, not an essay.

   WHAT THIS PANE IS FOR. It is the one artefact this application produces
   that a commander reads after the run is over, and it is the thing a
   reviewer will be handed. Everything on it has to be readable standing up.

   THE DEFECT THIS REWRITE ANSWERS, in the operator's words: "After Action
   Report is nothing but chock full of shit text everywhere." It was. Six
   numbered sections, every one of them opening with two or three paragraphs
   of justification before it reached a figure, 493 visible words and a
   673-character paragraph. A commander looking for "how many died and how
   many sorties did it take" had to read an essay to find two numbers that
   would have fitted on one line.

   WHAT IT IS NOW, in order:

     1. THE RESULT, AS FIGURES. The difference, then a three-row scoreboard —
        dead of survivable wounds, dead of wounds in every triage category,
        sorties flown — for both arms. No prose except the one line that says
        every number is a person and the target is zero.
     2. WHAT DROVE IT. The three largest causes of death, each as a figure, a
        label and one short clause. Not paragraphs.
     3. WHAT TO CHANGE. A short numbered list, largest lever first, each row
        naming how many of the dead it addresses.
     4. EVERYTHING ELSE, behind disclosures that are SHUT when the page
        opens. The five causes in full, the cost table, the replication
        study, the re-runs, the source list and the method note. Nothing was
        deleted; all of it is one press away.

   THE DISCLOSURE IS THE SHARED ONE. `.disc` — a native <details>, shut on
   arrival, with the figure that matters carried on the summary line — is
   defined by js/page-kpi.js and reused here rather than reinvented. It is
   keyboard-operable and findable by the browser's own find-in-page.

   THE THREE RULES THIS PANE IS STILL HELD TO, unchanged by the cut:

   1. EVERY COUNTED NOUN COMES FROM `COUNT`. Not from `arm.stats`, not from a
      filter written inline that happens to agree today. "Died" has meant
      three different populations in this application before now, and this is
      the worst possible pane on which to reintroduce that. The one figure
      below that COUNT does not publish is airframes lost; it is read the way
      `buildRunReport()` reads it and the exception is marked at the call
      site rather than hidden.

   2. A DEATH COUNT IS NEVER GREEN AND NEVER "LIVES SAVED". The two colours a
      toll may take are --tollHi and --tollLo, and the better of the two is
      amber, because fewer dead is still dead. The phrase is "fewer dead".
      The target is zero and the page says so once, plainly, and does not say
      it again.

   3. NOTHING IS INVENTED, AND CUTTING TEXT CHANGED NO FIGURE. Every number
      on this page is the same number it was before the rewrite, read from
      the same accessor. Where a quantity has not been computed the page says
      so and offers the control that would compute it; it never prints a zero
      that reads as a measurement, and it never prints a distribution it has
      not sampled. An undeployed run has both arms tasking by Class VIII
      push — the same method twice — and the head says exactly that rather
      than reporting the gap between them as a result.

   HOW IT ATTACHES. `ANGEL.views.AFTERACTION`, the documented extension
   point, which `render()` consults after its own dispatch. The section in
   index.html carries `data-placeholder`, and that attribute is taken off
   here rather than in the markup. The stylesheet is app/css/aar.css, linked
   from index.html; there is no injected <style> any more.

   NAVIGATION IS THE HOST'S, NOT THIS FILE'S. The source list carries both
   `data-view` and `data-goto` on each control. `data-view` is bound by
   `bindUI()` in a single pass at start-up, which a renderer's own markup
   necessarily misses; `data-goto` is the delegated route app.js documents
   for exactly this case. Both call `goView()`. No handler is installed from
   here except the one that remembers which disclosures the reader opened.
   ========================================================================= */

(function () {
  'use strict';

  /* ------------------------------------------------------------ plumbing */
  /* APP and COUNT are top-level `const` declarations in a classic script, so
     they live in the global declarative record and are NOT properties of the
     global object: `window.APP` cannot be relied on, and a bare reference to
     a name still in its temporal dead zone throws even under `typeof`. Hence
     the try/catch on each. This module must be able to load in a document
     where sim.js or app.js failed and fail by rendering nothing, rather than
     by taking the render loop down with it. */
  function theApp() {
    try { if (typeof APP !== 'undefined' && APP) return APP; } catch (e) { /* not declared */ }
    return (typeof window !== 'undefined' && window.APP) ? window.APP : null;
  }
  function theCount() {
    try { if (typeof COUNT !== 'undefined' && COUNT) return COUNT; } catch (e) { /* not declared */ }
    return (typeof window !== 'undefined' && window.COUNT) ? window.COUNT : null;
  }

  /* Function declarations in a classic script DO land on the global object,
     so the shell's helpers are reachable this way — asked for rather than
     assumed, with a local fallback only where one is honest. */
  const G = k => (typeof window[k] === 'function' ? window[k] : null);
  const esc = G('esc') || (s => String(s).replace(/[&<>]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));

  const n0 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Math.round(v).toLocaleString();
  const n1 = v => (v === null || v === undefined || !isFinite(v)) ? '—' : Number(v).toFixed(1);
  const plural = (n, one, many) => n === 1 ? one : (many || one + 's');

  /* ------------------------------------------- which disclosures are open
     This pane is rebuilt on the shell's own render tick while the clock is
     running, and a <details> whose markup is replaced snaps shut. The open
     set is keyed to the block, not to the node, so it survives the rebuild.
     `toggle` does not bubble, so the listener is a capturing one. */
  const OPEN = new Set();
  function bindOpen() {
    if (document._aarOpenBound) return;
    document._aarOpenBound = true;
    document.addEventListener('toggle', function (e) {
      const d = e.target;
      if (!d || d.tagName !== 'DETAILS' || !d.dataset || !d.dataset.aark) return;
      if (d.open) OPEN.add(d.dataset.aark); else OPEN.delete(d.dataset.aark);
    }, true);
  }

  /* A disclosure. `label` is what it is; `fig` is the single figure that
     matters, carried on the summary line so the reader does not have to open
     it to learn the size of what is inside. */
  function disc(key, label, fig, inner) {
    return `<details class="disc" data-aark="${key}"${OPEN.has(key) ? ' open' : ''}>` +
      `<summary>${label}${fig ? `<b>${fig}</b>` : ''}</summary>` +
      `<div class="discBody">${inner}</div></details>`;
  }

  /* Write only if it changed. This pane is re-rendered at the 3 Hz table
     cadence and replacing identical markup churns the DOM under the reader's
     cursor for nothing — and takes the scroll position of the page with it. */
  function paint(el, html) {
    if (!el) return;
    if (el._aarH === html) return;
    el._aarH = html; el.innerHTML = html;
  }

  /* A cross-link to one of the underlying destinations. Both attributes are
     the host's own — see the header note on navigation. */
  function link(view, label) {
    return `<button class="mini" data-view="${view}" data-goto="${view}">${label} &rarr;</button>`;
  }

  /* ----------------------------------------------------------- the facts */
  /* ONE read of the run, shared by every block below, so the blocks cannot
     disagree with each other about what happened. */
  function survey() {
    const APP = theApp(), COUNT = theCount();
    if (!APP || !COUNT || !APP.world || !APP.armA || !APP.armB) return null;
    const A = APP.armA, B = APP.armB;

    const dep = (G('deployState') || (() => ({ k: 'NOT_DEPLOYED' })))();

    /* The two death populations, both from COUNT, both arms. */
    const survA = COUNT.deathsSurvivable(A), survB = COUNT.deathsSurvivable(B);
    const allA = COUNT.deathsAll(A), allB = COUNT.deathsAll(B);
    const delta = survB - survA;                     // positive = fewer dead with ANGEL SWARM

    /* Attribution comes out of optimizer.js. If that module is not present
       the causes are genuinely unknown, and an unknown is left null rather
       than filled in with the shape of a plausible answer. */
    let cz = null;
    const causes = G('deathCauses');
    if (causes && A.casualties.length) { try { cz = causes(A); } catch (e) { cz = null; } }

    return {
      APP, COUNT, A, B, dep, cz,
      deployed: dep.k === 'DEPLOYED',
      deploying: dep.k === 'DEPLOYING',
      /* "Has anything happened" is a fact about casualties and the clock, not
         about the finished flag: a run stopped at T+40 has plenty to report
         and a run at T+0 has nothing, whatever the flag says. */
      started: A.casualties.length > 0 || APP.tView > 0,
      finished: !!APP.finished,
      scn: APP.world.scn,
      cas: A.casualties.length,
      survA, survB, allA, allB, delta,
      sortA: COUNT.sorties(A), sortB: COUNT.sorties(B)
    };
  }

  /* ================== 1 · THE RESULT, AS FIGURES ======================= */
  /* The scoreboard both states use. Three rows, both arms, no sentence in
     it. The toll row is the only one that takes an ink; sorties are workload
     and workload has no better and no worse. */
  function scoreboard(S, neutral) {
    const cls = neutral ? ' flat' : (S.delta < 0 ? ' up' : S.delta === 0 ? ' flat' : '');
    return `<table class="aarScore"><thead><tr>
        <th></th><th>ANGEL SWARM</th><th>current triage and proximity</th>
      </tr></thead><tbody>
      <tr class="toll${cls}"><td>${esc(S.COUNT.LABEL.DIED_SURVIVABLE)}</td>
        <td class="a">${n0(S.survA)}</td><td class="b">${n0(S.survB)}</td></tr>
      <tr><td>${esc(S.COUNT.LABEL.DIED_ALL)}</td>
        <td>${n0(S.allA)}</td><td>${n0(S.allB)}</td></tr>
      <tr><td>${esc(S.COUNT.LABEL.SORTIES)}</td>
        <td>${n0(S.sortA)}</td><td>${n0(S.sortB)}</td></tr>
    </tbody></table>`;
  }

  function blockResult(S) {
    const SHORT = S.COUNT.LABEL.DIED_SURVIVABLE_SHORT.toUpperCase();

    /* NOT DEPLOYED. Not a loss, not a tie, and not a result: both arms
       tasked by current triage and proximity, so the gap between the columns is the arms'
       own random draws. The scoreboard still prints — those soldiers died —
       but nothing on it is marked better or worse. */
    if (!S.deployed) {
      return `<div class="aarTop">
        <div class="aarDelta"><span class="aarNot">${S.deploying
          ? 'DEPLOYING &mdash; NOT YET COMPARED' : 'NOT DEPLOYED &mdash; NOTHING COMPARED'}</span></div>
        <span class="aarTopRule"></span>
        <div class="aarRight">
          <p class="aarSay"><b>Both arms tasked by current triage and proximity.</b> Deploy, then run it again.</p>
          ${scoreboard(S, true)}
          <p class="aarZero">Every number is a person. The target is zero.</p>
        </div></div>`;
    }

    const up = S.delta < 0;                          // more dead under ANGEL SWARM
    const level = S.delta === 0;
    return `<div class="aarTop">
      <div class="aarDelta ${level ? 'flat' : up ? 'up' : ''}">
        <b>${level ? 'LEVEL' : n0(Math.abs(S.delta))}</b>
        <span>${level ? 'ON ' + SHORT : (up ? 'MORE ' : 'FEWER ') + SHORT}</span></div>
      <span class="aarTopRule"></span>
      <div class="aarRight">
        ${scoreboard(S, false)}
        <p class="aarZero">Every number is a person. The target is zero.</p>
      </div></div>`;
  }

  /* ===================== 2 · WHAT DROVE IT ============================= */
  /* The five causes `deathCauses()` attributes, as findings rather than as a
     paragraph. Largest first, top three only; the whole decomposition is one
     press away below. The labels and clauses are short by contract — no
     visible line on this pane runs past 140 characters. */
  const DRIVER = {
    noLaunchPoint: ['No launch point in reach', 'A launch point forward reaches them.'],
    noResponder:   ['Nobody on scene qualified', 'A responder problem, not an airframe.'],
    busy:          ['Every aircraft committed', 'The only cause more aircraft touch.'],
    tooFast:       ['Collapsed too fast to fly', 'Below the floor of the treatment.'],
    treatedDied:   ['Reached in time, died anyway', 'The ceiling of the treatment, not the tasking.']
  };
  /* Only three of the five have a lever a resourcing conversation can pull.
     The other two are the floor and the ceiling of the treatment and are
     said as such in the method note, not offered as an action. */
  const ACTION = {
    noLaunchPoint: 'Move a launch point forward',
    busy:          'Buy airframes',
    noResponder:   'Qualify responders forward'
  };

  function drivers(S) {
    if (!S.cz || !S.cz.total) return [];
    return Object.keys(DRIVER)
      .map(k => ({ k, v: S.cz[k] || 0 }))
      .filter(r => r.v > 0)
      .sort((a, b) => b.v - a.v);
  }

  function blockDrivers(S) {
    const d = drivers(S);
    if (!d.length) {
      /* Zero here is a measurement and is said as one. If attribution is
         simply unavailable the pane says that instead — it does not fill the
         block with the shape of a plausible answer. */
      const say = S.cz
        ? 'Nobody died of a wound that could have been survived.'
        : 'Cause attribution is not available in this session.';
      return `<div class="aarBlock"><h3>What drove it</h3>
        <p class="aarSay">${say}</p></div>`;
    }
    const rows = d.slice(0, 3).map(r => `<li><b>${n0(r.v)}</b><span>
      <em>${DRIVER[r.k][0]}</em><i>${DRIVER[r.k][1]}</i></span></li>`).join('');
    return `<div class="aarBlock"><h3>What drove it</h3>
      <ul class="aarFind">${rows}</ul></div>`;
  }

  /* ===================== 3 · WHAT TO CHANGE ============================ */
  /* Largest lever first, each row naming how many of the dead it addresses.
     "Addresses" is `buildRunReport()`'s own word for this and it is not
     upgraded to "saves": nothing on this page claims a life back. */
  function blockChange(S) {
    const d = drivers(S).filter(r => ACTION[r.k]);
    const total = S.cz ? S.cz.total : 0;
    if (!d.length || !total) {
      return `<div class="aarBlock"><h3>What to change</h3>
        <p class="aarSay">Nothing measured on this run points at a lever. Re-fly it with a
          constraint relaxed.</p>
        <div class="aarTools"><button class="mini" data-goreq="1">Re-fly it &rarr;</button></div>
      </div>`;
    }
    const rows = d.map((r, i) => `<li><u>${i + 1}</u><span><b>${ACTION[r.k]}.</b>
      <i>Addresses ${n0(r.v)} of ${n0(total)}.</i></span></li>`).join('');
    return `<div class="aarBlock"><h3>What to change</h3>
      <ol class="aarDo">${rows}</ol></div>`;
  }

  /* ============= 4 · EVERYTHING ELSE, BEHIND DISCLOSURES =============== */

  /* ---- the five causes, in full, and the coverage figure --------------- */
  function discCauses(S) {
    const strip = G('causeStrip');
    const C = S.COUNT;
    const covA = C.deathsFromCoverage(S.A), covB = C.deathsFromCoverage(S.B);

    let inner;
    if (S.cz && S.cz.total && strip) inner = strip(S.cz);
    else if (S.cz && !S.cz.total) inner = `<p>Nobody in this operation died of a wound that could
      have been survived. There is nothing to decompose.</p>`;
    else inner = `<p>Cause attribution is not available in this session, so the ${n0(S.survA)}
      ${esc(C.LABEL.DIED_SURVIVABLE_SHORT)} are shown undecomposed. The coverage figure below is
      counted by the simulation itself, not attributed after the fact.</p>`;

    /* Zero here is a measurement, not a blank: the simulation counts this
       cohort directly, so "nobody" is a fact and is said as one. */
    const covSay = covA === 0 && covB === 0
      ? `<b>Nobody died of a survivable wound out of reach of the force, in either arm.</b>
         Where the launch points are sited was not binding on this operation, against this casualty
         distribution. It does not generalise.`
      : `<b>${covA === 1 ? 'One soldier' : n0(covA) + ' soldiers'} died of a survivable wound with one
         aircraft or none in reach under ANGEL SWARM, and ${covB === 1 ? 'one' : n0(covB)} under
         current triage and proximity.</b> No tasking decision could have reached them in either arm, which is why
         this is the figure that bears on a laydown conversation rather than on a tasking one.`;

    const qual = S.deployed ? '' : `<p>ANGEL SWARM was not deployed, so the attribution above is of
      the deaths under <b>current triage and proximity</b> in both columns.</p>`;

    return disc('causes', 'The five causes, in full',
      `${n0(S.survA)} ${esc(C.LABEL.DIED_SURVIVABLE_SHORT)}`,
      inner + `<p>${covSay}</p>` + qual +
      `<div class="aarTools">${link('ANALYSIS', 'Evidence')}</div>`);
  }

  /* ---- what it cost ---------------------------------------------------- */
  /* Six quantities, five of them straight from COUNT under COUNT's own
     labels. Airframes lost is the exception and is marked as one: COUNT does
     not publish it, and `buildRunReport()` reads `stats.dronesLost` directly
     for the same row. */
  function discCost(S) {
    const C = S.COUNT, A = S.A, B = S.B;
    const rows = [
      [C.LABEL.SORTIES, C.sorties(A), C.sorties(B), null],
      [C.LABEL.SORTIES_WASTED, C.sortiesWasted(A), C.sortiesWasted(B), false],
      [C.LABEL.ADMINISTERED, C.administered(A), C.administered(B), true],
      [C.LABEL.BLOOD_FORWARD, C.bloodForward(A), C.bloodForward(B), true],
      [C.LABEL.BLOOD_DESTROYED, C.bloodDestroyed(A), C.bloodDestroyed(B), false],
      /* COUNT exception, marked above. */
      ['Aircraft lost', A.stats.dronesLost, B.stats.dronesLost, false]
    ];

    const body = rows.map(([label, av, bv, higherIsBetter]) => {
      /* Which of a pair is the better number depends on the row: more
         payloads administered is better, more blood destroyed is worse, and
         more sorties flown is neither — it is workload, and `null` says so.
         The worse of the pair is dimmed; nothing is coloured. And when
         nothing was deployed, neither column is better than the other under
         any rule: they are the same method twice. */
      const aBetter = !S.deployed ? null
        : higherIsBetter === true ? av > bv
        : higherIsBetter === false ? av < bv : null;
      const cls = who => (aBetter === null || aBetter === who) ? '' : ' class="q"';
      return `<tr><td>${esc(label)}</td>
        <td class="num"><b${cls(true)}>${n0(av)}</b></td>
        <td class="num"><b${cls(false)}>${n0(bv)}</b></td></tr>`;
    }).join('');

    return disc('cost', 'What it cost', `${n0(S.sortA)} v ${n0(S.sortB)} sorties`,
      `<div class="aarScroll"><table class="grid aarCost"><thead><tr>
        <th>${n0(S.cas)} ${plural(S.cas, 'casualty', 'casualties')} &middot; ${esc(S.scn.name)}</th>
        <th class="num">ANGEL SWARM<span class="thSub">the live arm</span></th>
        <th class="num">CURRENT — TRIAGE & PROXIMITY<span class="thSub">the control arm</span></th>
      </tr></thead><tbody>${body}</tbody></table></div>` +
      (S.deployed ? '' : `<p>Nothing was deployed, so both columns are the same method and this table
        is a record of what the current method cost, twice.</p>`));
  }

  /* ---- how much of this is the seed ------------------------------------ */
  /* One run is an anecdote. This block reports the replication study if one
     has been run and says so plainly if one has not — it never draws a
     distribution it has not sampled, and it never reports a mean over fewer
     than two replications, because there is no such thing.

     SIGN. The engine reports the paired difference as ANGEL SWARM minus the
     way it is done today, so a negative mean is FEWER dead. It is flipped
     once, here, where the flip is visible, rather than downstream. */
  function discSeed(S) {
    const mc = (window.ANGEL && ANGEL.get) ? ANGEL.get('montecarlo') : null;
    const st = (mc && typeof mc.state === 'function') ? mc.state() : null;

    if (!mc || !st) {
      return disc('seed', 'How much of this is the seed', 'not loaded',
        `<p>The replication engine is not loaded in this session, so the sampling question
          <b>has not been measured</b> and this page will not answer it.</p>`);
    }

    const stats = st.stats;
    /* The replication engine can be set to either population, so the
       sentence has to name the one it was actually run on. */
    const pop = st.metric === 'total'
      ? 'dead of wounds, counting every triage category'
      : 'dead of wounds that could have been survived';

    if (st.running) {
      return disc('seed', 'How much of this is the seed',
        `${n0(st.done)} of ${n0(st.total)}`,
        `<p>Running now. The interval is not reported until it finishes, because a partial interval
          is a narrower claim than the data supports.</p>
         <div class="aarTools">${link('CONFIDENCE', 'Watch it run')}</div>`);
    }

    if (!stats || !(stats.n >= 2)) {
      return disc('seed', 'How much of this is the seed', 'not yet measured',
        `<p><b>Not yet measured.</b> The figure at the top of this page is a single draw &mdash; seed
          ${n0(S.APP.seed)}, ${esc(S.scn.name)}.</p>
         <p>Re-running the same operation a few hundred times with a different seed each time, holding
          everything else fixed, is what separates the tasking from the weather and the arrival order.
          That is what Scenarios does.</p>
         <div class="aarTools">${link('CONFIDENCE', 'Run the replications')}</div>`);
    }

    /* Flipped to "fewer dead". A confidence interval flips end for end with
       the sign, so the upper bound on the difference becomes the lower bound
       on how many fewer died. */
    const fewer = -stats.mean;
    const fLo = -stats.hi, fHi = -stats.lo;
    const crosses = fLo <= 0 && fHi >= 0;
    const n = stats.n;
    const w = Math.max(1, n);
    const seg = v => (v / w * 100).toFixed(2) + '%';
    /* A signed "fewer dead" reads as a double negative the moment it goes
       below zero. Every bound is spelled with the word that belongs to its
       sign. */
    const fewerTxt = v => v >= 0 ? n1(v) + ' fewer' : n1(-v) + ' more';

    return disc('seed', 'How much of this is the seed',
      `${n0(n)} replications, ${fewerTxt(fewer)} on the mean`,
      `<div class="aarSplit">
        <i class="better" style="width:${seg(stats.better)}"></i>
        <i class="tie" style="width:${seg(stats.tie)}"></i>
        <i class="worse" style="width:${seg(stats.worse)}"></i>
      </div>
      <div class="aarKey">
        <span><i class="better"></i>FEWER DEAD ${n0(stats.better)}</span>
        <span><i class="tie"></i>LEVEL ${n0(stats.tie)}</span>
        <span><i class="worse"></i>MORE DEAD ${n0(stats.worse)}</span>
      </div>
      <p>Across <b>${n0(n)}</b> replications, each with its own seed and each paired against a
        current triage and proximity arm drawing the same casualties, the mean difference was
        <b>${n1(Math.abs(fewer))} ${fewer >= 0 ? 'fewer' : 'more'}</b> ${esc(pop)}, and the 95%
        interval runs from <b>${fewerTxt(fLo)}</b> to <b>${fewerTxt(fHi)}</b>.
        ${crosses
          ? `<b>That interval includes zero</b>, which means these replications do not establish a
             difference at all. It is the honest reading and it is printed rather than buried.`
          : `The interval does not include zero.`}</p>
      <p>The replications always task their live arm by ANGEL SWARM, whatever the run on screen is
        doing, so this is a property of the two methods and not of the deployment decision taken in
        this session. The interval is paired &mdash; each replication compares two arms that drew the
        same casualties &mdash; which is narrower and more honest than treating them as independent
        samples.</p>
      <div class="aarTools">${link('CONFIDENCE', 'The distribution, and how it was sampled')}</div>`);
  }

  /* ---- the re-runs, where any have been flown -------------------------- */
  /* Each row here is a full re-run of the same casualties from the same
     seed, not a projection, and the block is absent when none has been run
     rather than estimated. */
  function discReruns(S) {
    const APP = S.APP;
    const parts = [];

    const req = (APP.req && APP.req.rows && APP.req.rows.length >= 2) ? APP.req : null;
    if (req) {
      const base = req.rows[0];
      const row = lbl => req.rows.find(r => r.label === lbl);
      const say = r => {
        if (!r) return null;
        const d = r.deaths - base.deaths;
        /* The direction is stated, not left to the sign. "Moved it by nine"
           is ambiguous in front of an audience being asked to spend money on
           the difference between up and down. */
        return `<b>${esc(r.label.toLowerCase())}</b> ${d === 0 ? 'changed it by nothing at all'
          : d < 0 ? 'brought it down by ' + n0(-d) : 'put it up by ' + n0(d)}`;
      };
      const bits = [say(row('Twice the aircraft, same launch points')),
                    say(row('Four times the aircraft')),
                    say(row('One more launch point, forward'))].filter(Boolean);
      if (bits.length) {
        parts.push(`<p>Re-flown against the same casualties from the same seed, counting the dead of
          wounds they could have survived and starting from <b>${n0(base.deaths)}</b> as it is
          fielded today: ${bits.join('; ')}.</p>`);
      }
      parts.push(`<div class="aarTools">${link('ANALYSIS', 'The full requirement analysis')}</div>`);
    }

    /* The sweep, if one has been run: the same lever, moved across its
       range, with the toll measured at each point. */
    const mc = (window.ANGEL && ANGEL.get) ? ANGEL.get('montecarlo') : null;
    const st = (mc && typeof mc.state === 'function') ? mc.state() : null;
    const sweep = (st && st.sweep && st.sweep.points && st.sweep.points.some(p => p.stats))
      ? st.sweep : null;
    if (sweep) {
      const pts = sweep.points.filter(p => p.stats);
      const lo = pts[0], hi = pts[pts.length - 1];
      const fewerAt = p => -p.stats.mean;
      const names = { fleet: 'fleet size', launch: 'launch points', comms: 'datalink outage' };
      const span = Math.abs(fewerAt(hi) - fewerAt(lo));
      parts.push(`<p>Re-run <b>${n0(st.sweepReps || 0)}</b> times at each point while sweeping
        <b>${esc(names[sweep.lever] || sweep.lever)}</b>: at ${n1(lo.value)} ${esc(sweep.unit || '')}
        the mean was ${n1(fewerAt(lo))} fewer dead of survivable wounds; at ${n1(hi.value)} it was
        ${n1(fewerAt(hi))}.
        ${span < 1 ? '<b>The entire swept range moves the toll by less than one soldier.</b>'
                   : 'That is a span of ' + n1(span) + ' across the whole range tested.'}</p>`);
    }

    if (!parts.length) {
      /* data-goreq is the shell's own delegated control: it navigates to the
         evidence pane and starts the requirement analysis if it has not been
         run. Nothing is asserted here about what the answer will be. */
      return disc('reruns', 'Re-flown with a constraint relaxed', 'not yet run',
        `<p><b>Not yet measured.</b> No constraint has been relaxed and re-flown. Re-flying this
          operation with twice the aircraft, with four times the aircraft, and with one more launch
          point sited forward is what answers it &mdash; each of those a full re-run, not a
          projection.</p>
         <div class="aarTools">
           <button class="mini" data-goreq="1">Re-fly it with more aircraft &rarr;</button>
         </div>`);
    }

    const rows = (req && req.rows) ? req.rows.length : 0;
    return disc('reruns', 'Re-flown with a constraint relaxed',
      rows ? `${n0(rows)} ${plural(rows, 'row')}` : 'swept', parts.join(''));
  }

  /* ---- where each figure came from ------------------------------------- */
  /* The destinations this page compresses. Nothing is hidden behind this
     list — every one of them is reachable — but a reader who wants the
     working for one figure should not have to guess which one holds it. */
  const SOURCES = [
    ['The two death counts, and the reconciliation between them',
     'the survivable cohort and every triage category, side by side, with the divergence chart',
     'COMPARE', 'The difference'],
    ['Why a resupply decision is a survival decision at all',
     'what bleeding out looks like on a clock, and where the current method loses time',
     'STANDARD', 'Why this exists'],
    ['The five causes, and the re-runs with one constraint relaxed',
     'the requirement analysis, the coverage table and the funnel',
     'ANALYSIS', 'Evidence'],
    ['Blood, sorties and flying hours turned into money',
     'the resource argument with its published rates and its citations',
     'ROI', 'The case beyond lives'],
    ['What the capability costs against what it returns',
     'the same figures normalised per 1 000 casualties, with the limits stated',
     'COST', 'What it costs'],
    ['The replication study and the interval around the difference',
     'the distribution, the sweep, and how many replications it rests on',
     'CONFIDENCE', 'Scenarios'],
    ['Every dispatch, approval, rejection and expiry, with the time it happened',
     'the hash-chained decision log — the record a family or a board would be read back from',
     'AUDIT', 'Decision log']
  ];

  function discSources(S) {
    const rows = SOURCES.map(([what, where, view, label]) => `
      <div class="aarSrcRow">
        <span class="aarWhat">${esc(what)}</span>
        <span class="aarWhere">${esc(where)}</span>
        ${link(view, esc(label))}
      </div>`).join('');
    return disc('sources', 'Where each figure came from',
      `${SOURCES.length} destinations`, `<div class="aarSrc">${rows}</div>`);
  }

  /* ---- the method note ------------------------------------------------- */
  /* The two caveats that used to be a paragraph under every block: what makes
     the comparison attributable, and why fleet size is not what this model is
     short of. Said once, here, and not repeated. */
  function discMethod(S) {
    const floorSay = (S.cz && (S.cz.tooFast || S.cz.treatedDied))
      ? `<p><b>There is a floor and a ceiling.</b> ${n0(S.cz.tooFast)} collapsed faster than any
          aircraft could fly and ${n0(S.cz.treatedDied)} were reached in time and died anyway. Those
          are properties of the treatment, not of the tasking, and this system does not claim
          zero.</p>`
      : '';
    return disc('method', 'Method, and what it does not claim', '',
      `<p>Both arms drew the same casualties from the same seed, flew the same fleet from the same
        launch points and carried the same forward stock. Outcomes use common random numbers &mdash;
        the same draw decided each casualty's fate in both arms &mdash; so a difference between the
        columns is attributable to the tasking decision and not to sampling luck.</p>
      <p><b>Fleet size is the easy thing to buy and it is not what this model is short of.</b> Combat
        radius falls as payload rises, so a casualty outside every launch point's radius stays outside
        it however many aircraft are bought; the same casualty comes inside it the moment one launch
        point moves forward. The tasking decides an order, and an order only matters while the force
        is short of something.</p>` + floorSay);
  }

  function blockMore(S) {
    return `<div class="aarMore">` +
      discCauses(S) + discCost(S) + discSeed(S) + discReruns(S) +
      discSources(S) + discMethod(S) + `</div>`;
  }

  /* =============== BEFORE ANYTHING HAS HAPPENED ======================== */
  /* An empty scoreboard on arrival is a defect this application has been
     audited for. Before the clock moves there is no run to report, so the
     page says so in two lines and offers what is answerable without a run. */
  function blockStanding(S) {
    return `<div class="aarStand">
      <h3>Nothing has happened yet.</h3>
      <p>The clock is at zero and no soldier has been wounded in ${esc(S.scn.name)}.</p>
      <p>${S.deployed
        ? 'ANGEL SWARM is deployed. Press play on the command bar.'
        : '<b>ANGEL SWARM is not deployed.</b> Deploy first, then press play.'}</p>
    </div>`;
  }

  /* =============================== RENDER =============================== */
  function build() {
    const S = survey();
    /* No world, no arms, no pane. The section head in index.html carries an
       honest standing line of its own, so leaving the body empty is the right
       thing to do rather than inventing a sentence about a run that may be
       one frame away from existing. */
    if (!S) return '';

    if (!S.started) {
      return `<div data-nofold>` + blockStanding(S) +
        `<div class="aarMore" style="margin-top:14px">` + discSeed(S) + discSources(S) + `</div></div>`;
    }

    /* data-nofold is the shell's own opt-out (js/page-kpi.js): this pane
       folds itself, deliberately, block by block, and a second folding pass
       inserting "why this matters" buttons inside a disclosure that is
       already shut would be two mechanisms fighting over the same text. */
    return `<div data-nofold>` + [
      blockResult(S),
      blockDrivers(S),
      blockChange(S),
      blockMore(S)
    ].join('') + `</div>`;
  }

  function renderAfterAction() {
    const host = document.getElementById('aarBody');
    if (!host) return;
    paint(host, build());
  }

  /* ----------------------------------------------------------- bootstrap */
  if (window.ANGEL && typeof ANGEL.ready === 'function') {
    ANGEL.ready('page-afteraction', async () => {
      if (!theApp() || !theCount()) {
        if (ANGEL.setStatus)
          ANGEL.setStatus('page-afteraction', 'withheld',
            'application shell or the counted nouns not present');
        return null;
      }
      ANGEL.views = ANGEL.views || {};
      bindOpen();
      ANGEL.views.AFTERACTION = () => {
        try { renderAfterAction(); } catch (err) { console.warn('AFTERACTION', err); }
      };
      /* The contract in app.js: a section marked data-placeholder is a mount
         point waiting for a module, and roleUnbuilt() keeps an operator from
         being dropped on one. Registering the renderer already answers that
         test, but the attribute is also read as documentation by anyone
         grepping the markup, and leaving it on a pane that is now built is a
         lie in the source. */
      const sec = document.querySelector('[data-pane="AFTERACTION"]');
      if (sec) sec.removeAttribute('data-placeholder');

      if (ANGEL.mark) ANGEL.mark('page-afteraction ready', { views: ['AFTERACTION'] });
      return true;
    });
  }
})();
