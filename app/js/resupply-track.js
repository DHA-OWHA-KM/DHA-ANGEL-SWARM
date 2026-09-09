(function (root) {
  'use strict';

  var NOMINAL = Object.freeze(['TASKED', 'RIGGING', 'LAUNCHED', 'IN TRANSIT', 'TERMINAL', 'DELIVERED']);
  var OFF_NOMINAL = Object.freeze(['DIVERTED', 'ABORTED', 'LOST']);
  var ROUTE = Object.freeze([[74, 236], [168, 228], [262, 206], [344, 192], [430, 196], [512, 220], [566, 238]].map(Object.freeze));
  var DETOUR = Object.freeze([[74, 236], [168, 228], [262, 214], [344, 236], [430, 252], [512, 248], [566, 238]].map(Object.freeze));
  var PHASE_ENDS = Object.freeze([39, 88, 96]);
  var REROUTE_DELAY = 118;

  /* These are deliberately synthetic demonstration records. They are not
     scenario fixtures and do not share identifiers, objects, or clocks with
     the simulation. The default instant reproduces the supplied reference. */
  var COMMITMENTS = Object.freeze([
    Object.freeze({
      key: '091', mission: 'ANGEL-0421', casualty: 'CAS-091', casualtyDetail: 'IMMEDIATE · GRENADIER',
      airframe: 'M25-07', airframeDetail: 'M25 · TAIL 07', payload: '1× WHOLE BLOOD',
      total: 510, timelineStart: 0, deadlineEnd: 458, launch: 'LP-1 ALPHA',
      responder: 'COMBAT MEDIC · TCCC TIER 3', decision: 'D-0421 · 4b8d23c7…', dtg: '091434ZSEP26'
    }),
    Object.freeze({
      key: '084', mission: 'ANGEL-0417', casualty: 'CAS-084', casualtyDetail: 'IMMEDIATE · RIFLEMAN',
      airframe: 'TRV-150C-03', airframeDetail: 'TRV-150C · TAIL 03', payload: '2× WHOLE BLOOD · TXA',
      total: 640, timelineStart: 0, deadlineEnd: 808, launch: 'LP-2 BRAVO',
      responder: 'COMBAT MEDIC · TCCC TIER 3', decision: 'D-0417 · 9f2c7a41…', dtg: '091432ZSEP26'
    }),
    Object.freeze({
      key: '112', mission: 'ANGEL-0430', casualty: 'CAS-112', casualtyDetail: 'DELAYED · ENGINEER',
      airframe: 'FVR-90', airframeDetail: 'FVR-90 · TAIL 02', payload: '2× FDP',
      total: 770, timelineStart: -198, deadlineEnd: 1438, launch: 'LP-3 CHARLIE',
      responder: 'COMBAT LIFESAVER · TCCC TIER 2', decision: 'D-0430 · 12fd834a…', dtg: '091438ZSEP26'
    }),
    Object.freeze({
      key: '076', mission: 'ANGEL-0409', casualty: 'CAS-076', casualtyDetail: 'IMMEDIATE · SCOUT',
      airframe: '—', airframeDetail: 'NO SUBSTITUTE IN RANGE', payload: '—',
      total: 0, timelineStart: 0, deadlineEnd: 993, launch: 'LP-1 ALPHA',
      responder: 'COMBAT MEDIC · TCCC TIER 3', decision: 'D-0409 · c3182e05…', dtg: '091426ZSEP26',
      fixedPhase: 'DIVERTED', fixedReason: 'HIGHER-PRIORITY COMMITMENT OUTRANKED THIS TASKING'
    })
  ]);
  var DEMO_END = COMMITMENTS.reduce(function (latest, commitment) {
    if (!commitment.total) return latest;
    return Math.max(latest, commitment.total - commitment.timelineStart + REROUTE_DELAY);
  }, 0);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pad(n) { return String(Math.floor(Math.max(0, n))).padStart(2, '0'); }
  function duration(seconds, signed) {
    if (seconds == null || !Number.isFinite(seconds)) return '——:——:——';
    var sign = signed ? (seconds < 0 ? '−' : '+') : '';
    var s = Math.abs(seconds);
    return sign + pad(s / 3600) + ':' + pad((s % 3600) / 60) + ':' + pad(s % 60);
  }
  function phaseIndex(local, total) {
    if (local < PHASE_ENDS[0]) return 0;
    if (local < PHASE_ENDS[1]) return 1;
    if (local < PHASE_ENDS[2]) return 2;
    if (local < total - 60) return 3;
    if (local < total) return 4;
    return 5;
  }
  function pointAt(route, progress) {
    var lengths = [], total = 0, i;
    for (i = 0; i < route.length - 1; i++) {
      var length = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
      lengths.push(length); total += length;
    }
    var distance = clamp(progress, 0, 1) * total, run = 0;
    for (i = 0; i < lengths.length; i++) {
      if (distance <= run + lengths[i] || i === lengths.length - 1) {
        var q = lengths[i] ? (distance - run) / lengths[i] : 0;
        return {
          x: route[i][0] + (route[i + 1][0] - route[i][0]) * q,
          y: route[i][1] + (route[i + 1][1] - route[i][1]) * q,
          h: Math.atan2(route[i + 1][1] - route[i][1], route[i + 1][0] - route[i][0])
        };
      }
      run += lengths[i];
    }
    return { x: route[route.length - 1][0], y: route[route.length - 1][1], h: 0 };
  }
  function stampAt(c, phase, total) {
    var threshold = [39, 88, 96, total - 60, total, total][phase];
    return Math.max(0, threshold - c.timelineStart);
  }
  function stateLabel(m) {
    if (m.phase === 'LOST') return 'NO DELIVERY · AIRFRAME LOST';
    if (m.phase === 'DIVERTED') return 'NO DELIVERY · DIVERTED';
    if (m.phase === 'ABORTED') return 'NO DELIVERY · MISSION ABORTED';
    if (m.coldFailed) return m.phase === 'DELIVERED' ? 'DELIVERED · COLD-CHAIN FAILED' : 'COMMITMENT AT RISK · COLD-CHAIN FAILED';
    if (m.phase === 'DELIVERED') return m.margin < 0 ? 'DELIVERED AFTER DEADLINE' : 'DELIVERY CONFIRMED';
    return m.margin < 0 ? 'PAST THE DEADLINE' : 'DELIVERY · COMMITTED';
  }
  function missionAt(c, t, options) {
    var selected = c.key === options.selected;
    var exception = selected ? options.exception : null;
    var rerouted = selected && !!options.rerouted;
    var route = rerouted ? DETOUR : ROUTE;
    var effectiveTotal = c.total + (rerouted ? REROUTE_DELAY : 0);
    var local = clamp(t + c.timelineStart, 0, effectiveTotal || 1);
    var exceptionAt = exception == null ? null : clamp(
      Number.isFinite(options.exceptionAt) ? options.exceptionAt : 268,
      0,
      DEMO_END
    );
    var exceptionReached = exception != null && t >= exceptionAt;
    var stoppedLocal = exceptionReached
      ? clamp(exceptionAt + c.timelineStart, 0, effectiveTotal || 1)
      : local;
    var projectedLocal = c.fixedPhase ? 0 : stoppedLocal;
    /* Tasking and rigging happen at the launch point. Route progress begins
       only when LAUNCHED begins, so the aircraft materializes on the base
       symbol instead of inheriting pre-flight elapsed time as distance. */
    var flightStart = PHASE_ENDS[1];
    var flightDuration = Math.max(1, effectiveTotal - flightStart);
    var progress = effectiveTotal
      ? clamp((projectedLocal - flightStart) / flightDuration, 0, 1)
      : 0;
    var phase = c.fixedPhase || NOMINAL[phaseIndex(local, effectiveTotal)];
    var reason = c.fixedReason || '';
    if (exceptionReached) {
      phase = exception;
      reason = {
        DIVERTED: 'THREAT RING EXPANDED · AIRCRAFT HOLDING · SUBSTITUTE ROUTE REQUIRED',
        ABORTED: 'MISSION ABORTED AT AUTHORITY GATE · AIRCRAFT HOLDING POSITION',
        LOST: 'AIRFRAME LOST IN FPV SATURATION ZONE · NO SUBSTITUTE IN RANGE'
      }[exception];
    }
    var stopped = OFF_NOMINAL.indexOf(phase) >= 0;
    var arrivalAt = Math.max(0, effectiveTotal - c.timelineStart);
    var tMinus = stopped ? null : Math.max(0, arrivalAt - t);
    var deadlineRemaining = c.deadlineEnd - t;
    var margin = stopped ? null : c.deadlineEnd - arrivalAt;
    var stamps = NOMINAL.map(function (_, index) {
      var at = stampAt(c, index, effectiveTotal);
      var reached = t >= at && (!stopped || (exceptionAt != null && at <= exceptionAt));
      return { at: at, done: reached, label: reached ? 'T+' + duration(at) : '' };
    });
    var m = Object.assign({}, c, {
      phase: phase, reason: reason, tMinus: tMinus, deadlineRemaining: deadlineRemaining,
      margin: margin, progress: progress, position: pointAt(route, progress), route: route,
      rerouted: rerouted, effectiveTotal: effectiveTotal, arrivalAt: arrivalAt, exceptionAt: exceptionAt,
      coldFailed: selected && !!options.cold, stamps: stamps
    });
    m.deliveryState = stateLabel(m);
    return m;
  }
  function snapshot(t, options) {
    options = options || {};
    t = clamp(Number(t) || 0, 0, DEMO_END);
    if (options.arm === 'B') {
      return { arm: 'B', t: t, nextPush: 840 - (t % 840), missions: [], mission: null, selected: null };
    }
    var selected = COMMITMENTS.some(function (c) { return c.key === options.selected; }) ? options.selected : '084';
    var opts = {
      selected: selected, rerouted: !!options.rerouted, cold: !!options.cold,
      exception: OFF_NOMINAL.indexOf(options.exception) >= 0 ? options.exception : null,
      exceptionAt: Number.isFinite(options.exceptionAt) ? options.exceptionAt : null
    };
    var missions = COMMITMENTS.map(function (c) { return missionAt(c, t, opts); })
      .sort(function (a, b) {
        var am = a.margin == null ? Number.POSITIVE_INFINITY : a.margin;
        var bm = b.margin == null ? Number.POSITIVE_INFINITY : b.margin;
        return am - bm || a.key.localeCompare(b.key);
      });
    var mission = missions.find(function (m) { return m.key === selected; }) || missions[0];
    return {
      arm: 'A', t: t, missions: missions, mission: mission, selected: mission.key,
      rerouted: opts.rerouted, cold: opts.cold, exception: opts.exception
    };
  }

  function strokeRoute(ctx, route, progress, color, remaining) {
    var pos = pointAt(route, progress), passed = false;
    ctx.beginPath();
    if (remaining) {
      ctx.moveTo(pos.x, pos.y);
      var closest = 0, best = Infinity;
      route.forEach(function (p, i) {
        var d = Math.hypot(p[0] - pos.x, p[1] - pos.y);
        if (d < best) { best = d; closest = i; }
      });
      for (var r = Math.max(1, closest); r < route.length; r++) ctx.lineTo(route[r][0], route[r][1]);
    } else {
      ctx.moveTo(route[0][0], route[0][1]);
      for (var i = 1; i < route.length; i++) {
        var endpointProgress = i / (route.length - 1);
        if (endpointProgress <= progress) ctx.lineTo(route[i][0], route[i][1]);
        else if (!passed) { ctx.lineTo(pos.x, pos.y); passed = true; }
      }
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  function draw(canvas, mission, t) {
    if (!canvas || !mission) return;
    var box = canvas.getBoundingClientRect();
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var width = Math.max(480, box.width || 640), height = width * 330 / 640;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr * width / 640, 0, 0, dpr * height / 330, 0, 0);
    var gradient = ctx.createLinearGradient(0, 0, 0, 330);
    gradient.addColorStop(0, '#071b2c'); gradient.addColorStop(1, '#04101c');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 640, 330);
    ctx.font = '9px IBM Plex Mono'; ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(150,185,215,.14)'; ctx.fillStyle = 'rgba(170,200,225,.45)';
    [64, 220, 376, 532].forEach(function (x, i) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 330); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText((120 + i) + '°E', x, 12);
    });
    [58, 162, 266].forEach(function (y, i) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillText((19 + i) + '°N', 4, y - 3);
    });
    ctx.fillStyle = 'rgba(38,52,46,.92)'; ctx.strokeStyle = 'rgba(150,205,240,.55)';
    ctx.beginPath(); ctx.moveTo(-10, 300); ctx.lineTo(70, 286); ctx.lineTo(140, 296);
    ctx.lineTo(210, 282); ctx.lineTo(268, 300); ctx.lineTo(300, 330); ctx.lineTo(-10, 330);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.setLineDash([12, 7]); ctx.strokeStyle = 'rgba(150,195,230,.3)';
    ctx.strokeRect(26, 30, 588, 266); ctx.restore();
    ctx.font = 'bold 9px IBM Plex Mono'; ctx.fillStyle = 'rgba(160,200,232,.62)';
    ctx.fillText('PACOM CORAL AREA OF OPERATIONS', 33, 24);
    var zone = ctx.createRadialGradient(372, 96, 4, 372, 96, 74);
    zone.addColorStop(0, 'rgba(255,66,90,.18)'); zone.addColorStop(1, 'rgba(255,66,90,.02)');
    ctx.fillStyle = zone; ctx.beginPath(); ctx.arc(372, 96, 74, 0, 7); ctx.fill();
    ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(255,66,90,.55)'; ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,130,150,.9)';
    ctx.fillText('FPV SATURATION ZONE', 372, 160);
    ctx.lineWidth = 2.3;
    strokeRoute(ctx, mission.route, mission.progress, mission.phase === 'LOST' ? '#ff4257' : '#60e1be', false);
    if (mission.phase !== 'LOST') {
      ctx.save(); ctx.setLineDash([2, 6]); ctx.lineWidth = 1.8;
      strokeRoute(ctx, mission.route, mission.progress, 'rgba(96,225,190,.48)', true); ctx.restore();
    }
    ctx.save(); ctx.translate(74, 236); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#06101a'; ctx.strokeStyle = '#60e1be'; ctx.lineWidth = 2;
    ctx.fillRect(-9, -9, 18, 18); ctx.strokeRect(-9, -9, 18, 18); ctx.restore();
    ctx.fillStyle = '#60e1be'; ctx.fillRect(68, 234, 12, 4); ctx.fillRect(72, 230, 4, 12);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(215,230,245,.85)';
    ctx.fillText(mission.launch, 74, 266);
    var pulse = .35 + .45 * Math.abs(Math.sin(t / 9));
    ctx.strokeStyle = 'rgba(255,66,87,' + pulse + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(566, 238, 14, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(561, 233); ctx.lineTo(571, 243); ctx.moveTo(571, 233); ctx.lineTo(561, 243); ctx.stroke();
    ctx.fillStyle = 'rgba(215,230,245,.85)'; ctx.fillText(mission.casualty, 566, 268);
    var p = mission.position;
    if (mission.phase === 'LOST') {
      ctx.strokeStyle = '#ff4257'; ctx.lineWidth = 2.6; ctx.beginPath();
      ctx.moveTo(p.x - 9, p.y - 9); ctx.lineTo(p.x + 9, p.y + 9);
      ctx.moveTo(p.x + 9, p.y - 9); ctx.lineTo(p.x - 9, p.y + 9); ctx.stroke();
    } else if (NOMINAL.indexOf(mission.phase) >= 2) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h + Math.PI / 2);
      ctx.fillStyle = '#06101a'; ctx.strokeStyle = '#78ebcd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 9); ctx.lineTo(0, 4.5); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#78ebcd'; ctx.fillText(mission.airframe, p.x, p.y - 24);
      ctx.fillText(duration(mission.tMinus), p.x, p.y + 30);
    }
    ctx.strokeStyle = 'rgba(170,200,225,.5)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(34, 314); ctx.lineTo(126, 314); ctx.moveTo(34, 310); ctx.lineTo(34, 318);
    ctx.moveTo(80, 311); ctx.lineTo(80, 317); ctx.moveTo(126, 310); ctx.lineTo(126, 318); ctx.stroke();
    ctx.fillStyle = 'rgba(170,200,225,.5)'; ctx.fillText('5 KM', 80, 306);
  }

  root.ResupplyTrack = Object.freeze({
    NOMINAL: NOMINAL, OFF_NOMINAL: OFF_NOMINAL, ALL_PHASES: Object.freeze(NOMINAL.concat(OFF_NOMINAL)),
    duration: duration, snapshot: snapshot, pointAt: pointAt, draw: draw, durationSeconds: DEMO_END
  });
})(typeof window !== 'undefined' ? window : globalThis);