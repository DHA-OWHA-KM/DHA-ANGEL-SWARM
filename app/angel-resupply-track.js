(function () {
  'use strict';

  var R = window.ResupplyTrack;
  var CSS = `
:host{display:block;min-height:100%;background:oklch(.17 .01 250);color:oklch(.92 .005 250);font:13px/1.5 'IBM Plex Sans',system-ui,sans-serif}
*{box-sizing:border-box}button,input{font:inherit}.wrap{max-width:1300px;margin:0 auto;padding:18px 18px 56px}
.lab,.lab2,.chip,.ctl,.phase,th,td,.clock{font-family:'IBM Plex Mono',ui-monospace,monospace}
.lab{font-size:8.5px;font-weight:700;line-height:1;letter-spacing:.16em;color:oklch(.57 .008 250);text-transform:uppercase}
.lab2{font-size:8.5px;font-weight:600;line-height:1.3;letter-spacing:.12em;color:oklch(.57 .008 250);text-transform:uppercase}
.top{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:12px}.title{font-size:22px;font-weight:650}.sub{color:oklch(.62 .008 250);margin-top:2px}
.tag{flex:none;font:700 8.5px 'IBM Plex Mono',monospace;letter-spacing:.1em;padding:6px 9px;border:1px solid oklch(.48 .1 165);color:oklch(.85 .13 165);border-radius:4px}
.boundary{display:flex;align-items:flex-start;gap:14px;padding:10px 13px;margin-bottom:12px;border:1px solid oklch(.38 .04 75);background:oklch(.2 .02 75);color:oklch(.74 .01 250);font-size:11px;line-height:1.5}
.boundary b{flex:none;font:700 8.5px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:oklch(.84 .12 75)}
.demo{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:14px}
.demo .lab{margin:0 5px 0 2px}.ctl{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 9px;border:1px solid oklch(.34 .012 250);background:oklch(.22 .012 250);color:oklch(.72 .008 250);border-radius:4px;cursor:pointer;font-size:8.5px;font-weight:700;letter-spacing:.06em}
.controlGroup{display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap}.controlGroup+.controlGroup{padding-left:9px;border-left:1px solid oklch(.32 .012 250)}
.demoCard{grid-area:controls}.demoCard .demo{align-items:flex-start}.demoCard .controlGroup{width:100%}.demoCard .controlGroup+.controlGroup{padding:10px 0 0;border-left:0;border-top:1px solid oklch(.29 .012 250)}.demoCard .scrub{flex-basis:100%;width:100%;padding-top:10px;border-top:1px solid oklch(.29 .012 250)}
.ctlIcon{width:13px;height:13px;flex:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;fill:none;filter:drop-shadow(0 0 3px currentColor)}
.demo [data-play] .ctlIcon{color:oklch(.84 .16 165)}
.demo [data-speed] .ctlIcon{color:oklch(.82 .17 330)}
.demo [data-reset] .ctlIcon{color:oklch(.78 .14 300)}
.demo [data-arm="A"] .ctlIcon{color:oklch(.86 .17 155)}
.demo [data-arm="B"] .ctlIcon{color:oklch(.87 .15 75)}
.demo [data-rerouted] .ctlIcon{color:oklch(.84 .14 220)}
.demo [data-cold] .ctlIcon{color:oklch(.88 .12 235)}
.demo [data-exception="DIVERTED"] .ctlIcon{color:oklch(.86 .16 65)}
.demo [data-exception="ABORTED"] .ctlIcon{color:oklch(.82 .18 35)}
.demo [data-exception="LOST"] .ctlIcon{color:oklch(.78 .22 25)}
.ctl:hover{color:oklch(.92 .005 250);border-color:oklch(.46 .012 250)}.ctl:focus-visible,.send:focus-visible{outline:2px solid oklch(.78 .1 210);outline-offset:2px}
.ctl[aria-pressed=true]{border-color:oklch(.68 .12 165);color:oklch(.88 .1 165);background:oklch(.25 .04 165)}.ctl.event[aria-pressed=true]{border-color:oklch(.66 .15 25);color:oklch(.9 .13 25);background:oklch(.25 .05 25)}
.scrub{display:flex;align-items:center;gap:8px;flex:1;min-width:210px}.scrub input{width:100%;min-width:130px;accent-color:oklch(.72 .13 165)}.clock{font-size:9px;color:oklch(.67 .008 250);white-space:nowrap}
.ladder{display:grid;grid-template-columns:repeat(6,1fr);background:oklch(.2 .012 250);border:1px solid oklch(.3 .012 250);border-radius:10px;overflow:hidden;margin-bottom:14px}
.phase{min-width:0;padding:12px 8px 11px;text-align:center;border-right:1px solid oklch(.3 .012 250);position:relative;font-size:9px;font-weight:700;letter-spacing:.12em;color:oklch(.57 .008 250)}.phase:last-child{border:0}
.phase span{display:block;height:10px;margin-top:6px;font-size:8.5px;font-weight:600;letter-spacing:.06em;opacity:.75}.phase.done,.phase.now{background:oklch(.24 .04 165);color:oklch(.86 .12 165)}.phase.now{background:oklch(.27 .055 165);color:oklch(.95 .02 165)}
.phase.done:after,.phase.now:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:oklch(.72 .14 165)}
.exception{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;margin-bottom:14px;border:1px solid oklch(.55 .14 25);border-radius:10px;background:oklch(.23 .05 25)}
.exception strong{font:700 13px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:oklch(.85 .16 25)}.exception span{font:600 9.5px/1.4 'IBM Plex Mono',monospace;color:oklch(.7 .02 250)}
.mainGrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);grid-template-areas:"phase phase" "primary details" "primary controls" "queue queue";gap:14px;align-items:start}.mainGrid>[data-content]{display:contents}.mainGrid .ladder,.mainGrid .exception{grid-area:phase;margin-bottom:0}.mainGrid .primary{grid-area:primary}.mainGrid .details{grid-area:details}.mainGrid .queue{grid-area:queue;margin-top:0}.mainGrid .armBEmpty{grid-area:primary}.mainGrid.armB{grid-template-areas:"primary controls"}.col{display:flex;flex-direction:column;gap:14px}
.card{background:oklch(.2 .012 250);border:1px solid oklch(.3 .012 250);border-radius:10px;overflow:hidden}.head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid oklch(.28 .01 250)}
.chip{font-size:9px;font-weight:700;line-height:1;letter-spacing:.11em;padding:5px 8px;border-radius:4px;border:1px solid oklch(.35 .012 250);color:oklch(.57 .008 250);white-space:nowrap}.chip.on{color:oklch(.84 .13 165);border-color:oklch(.55 .11 165)}.chip.bad{color:oklch(.84 .15 25);border-color:oklch(.58 .15 25)}
.time{text-align:center;padding:20px 16px 18px}.big{font:700 38px/1 'IBM Plex Mono',monospace;letter-spacing:-.02em;color:oklch(.85 .13 165);margin:9px 0 0;font-variant-numeric:tabular-nums}.big.bad,.bad{color:oklch(.82 .15 25)!important}.good{color:oklch(.85 .13 165)!important}
.pair{display:grid;grid-template-columns:1fr 1px 1fr;margin-top:16px;padding-top:14px;border-top:1px solid oklch(.29 .01 250)}.pair .vs{background:oklch(.29 .01 250)}.pair .cell{padding:0 10px}.val{font:500 22px/1 'IBM Plex Mono',monospace;margin-top:7px;font-variant-numeric:tabular-nums}
.note{min-height:12px;margin-top:11px;font:600 8.5px/1.4 'IBM Plex Mono',monospace;letter-spacing:.1em;color:oklch(.86 .13 75)}
.trust{margin-top:11px;padding:8px 10px;border:1px solid oklch(.38 .07 165);border-radius:4px;background:oklch(.23 .035 165);font:700 8.5px 'IBM Plex Mono',monospace;letter-spacing:.08em}.trust.bad{border-color:oklch(.48 .11 25);background:oklch(.23 .04 25)}
.actions{border-top:1px solid oklch(.28 .01 250);background:oklch(.22 .012 250);padding:13px 14px 12px}.send{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;padding:15px 18px;border:0;border-radius:7px;background:oklch(.72 .14 210);color:oklch(.16 .04 210);font-weight:700;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;box-shadow:0 0 0 1px oklch(.72 .14 210/.3),0 6px 20px oklch(.6 .13 210/.22)}
.send:hover{filter:brightness(1.08)}.actions small{display:block;margin-top:8px;text-align:center;font:600 8.5px/1.5 'IBM Plex Mono',monospace;letter-spacing:.12em;color:oklch(.57 .008 250);text-transform:uppercase}
.mapWrap{position:relative;background:#05131f;aspect-ratio:640/330}.mapWrap canvas{display:block;width:100%;height:100%}.foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid oklch(.28 .01 250)}
.rows{padding:3px 0}.row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:7px 14px;align-items:baseline;font:500 11.5px/1.45 'IBM Plex Mono',monospace}.row+.row{border-top:1px solid oklch(.26 .01 250)}.row b{font-size:8.5px;letter-spacing:.12em;color:oklch(.57 .008 250);text-transform:uppercase}.row.alert{background:oklch(.23 .04 75)}.row.alert span,.row.alert b{color:oklch(.87 .12 75)}
.manifest{display:flex;gap:8px;padding:12px 14px;flex-wrap:wrap}.unit{flex:1;min-width:104px;padding:9px 11px;background:oklch(.23 .012 250);border:1px solid oklch(.31 .012 250);border-radius:8px}.unit strong{display:block;font:700 19px/1 'IBM Plex Mono',monospace;color:oklch(.84 .12 165)}.unit b{display:block;margin-top:6px;font:700 8.5px 'IBM Plex Mono',monospace;letter-spacing:.1em}.unit span{display:block;margin-top:4px;font:600 8px/1.3 'IBM Plex Mono',monospace;color:oklch(.58 .008 250);letter-spacing:.07em}.unit.short{border-color:oklch(.66 .12 75)}.unit.short strong{color:oklch(.86 .13 75)}
.queue{margin-top:14px;overflow:hidden}.tableWrap{overflow:auto}.queue table{border-collapse:collapse;width:100%;min-width:700px}th,td{text-align:left;padding:9px 14px;border-bottom:1px solid oklch(.27 .01 250);font-size:10.5px;white-space:nowrap;font-variant-numeric:tabular-nums}th{font-size:8px;letter-spacing:.14em;color:oklch(.57 .008 250)}td.num,th.num{text-align:right}tbody tr{cursor:pointer}tbody tr:hover td{background:oklch(.23 .03 165)}tbody tr[aria-selected=true] td{background:oklch(.26 .045 165)}tbody tr[aria-selected=true] td:first-child{box-shadow:inset 3px 0 0 oklch(.72 .14 165)}tbody tr:focus-visible td{outline:1px solid oklch(.72 .14 210);outline-offset:-1px}
.pill{display:inline-block;padding:4px 7px;border:1px solid currentColor;border-radius:4px;font-size:8.5px;font-weight:700;letter-spacing:.1em}.pill.nom{color:oklch(.84 .13 165)}.pill.rig{color:oklch(.86 .13 75)}.pill.off{color:oklch(.84 .15 25)}
.empty{min-height:430px;display:grid;place-items:center;text-align:center;border:1px solid oklch(.58 .13 50);border-radius:10px;background:oklch(.2 .03 50);padding:40px 22px}.empty .big{color:oklch(.86 .12 50);margin:16px 0 9px}.empty p{max-width:60ch;margin:20px auto 0;padding-top:16px;border-top:1px solid oklch(.3 .03 50);font-size:12.5px;color:oklch(.67 .01 250)}.empty p b{color:oklch(.86 .12 50)}
.overlay{position:fixed;inset:0;z-index:99;background:oklch(.05 .01 250/.84);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}.modal{width:min(780px,100%);max-height:calc(100dvh - 56px);overflow:auto;background:oklch(.19 .012 250);border:1px solid oklch(.4 .05 210);border-radius:10px;box-shadow:0 24px 70px #000a}
.mhead{display:flex;justify-content:space-between;gap:14px;padding:16px 18px 14px;border-bottom:1px solid oklch(.3 .01 250)}.modal h2{margin:0;font-size:16px}.modal .msub{margin-top:5px;font:600 8.5px 'IBM Plex Mono',monospace;letter-spacing:.11em;color:oklch(.57 .008 250)}
.status{padding:11px 18px;background:oklch(.23 .04 75);color:oklch(.84 .13 75);font:700 9px/1.6 'IBM Plex Mono',monospace;letter-spacing:.1em}.status strong{display:block;color:oklch(.9 .11 75);font-size:10px}.body{padding:16px 18px 20px}.body section+section{margin-top:16px}.body h3{font:700 8.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;color:oklch(.57 .008 250);margin:0 0 6px}.body p,.body li{font-size:12.5px;line-height:1.62;color:oklch(.7 .008 250)}.body p{margin:0}.body ul{margin:0;padding-left:18px}.body b{color:oklch(.9 .005 250)}
.transport{display:grid;grid-template-columns:170px 1fr;gap:12px;padding:9px 0}.transport+.transport{border-top:1px solid oklch(.28 .01 250)}.transport strong{font:600 10.5px/1.5 'IBM Plex Mono',monospace;color:oklch(.84 .12 165)}.transport span{font-size:11.5px;color:oklch(.67 .008 250)}
pre{overflow:auto;padding:12px 13px;background:oklch(.15 .01 250);border:1px solid oklch(.28 .01 250);border-radius:8px;font:10.5px/1.65 'IBM Plex Mono',monospace;color:oklch(.86 .02 250);white-space:pre}
@media(max-width:920px){.mainGrid{grid-template-columns:1fr;grid-template-areas:"phase" "primary" "details" "controls" "queue"}.mainGrid.armB{grid-template-areas:"primary" "controls"}.top{align-items:start}.ladder{overflow:auto;grid-template-columns:repeat(6,minmax(110px,1fr))}}
@media(max-width:560px){.top{flex-direction:column}.tag{align-self:flex-start}.boundary{flex-direction:column;gap:5px}.transport{grid-template-columns:1fr;gap:4px}.wrap{padding:14px 12px 40px}.demo{align-items:stretch}.scrub{flex-basis:100%}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function deadline(value) {
    return value < 0 ? R.duration(value, true) : R.duration(value);
  }
  function margin(value, mission) {
    if (value != null) return R.duration(value, true);
    return mission && mission.key === '076' ? 'OUTRANKED' : 'NO DELIVERY';
  }
  function controlIcon(name) {
    var paths = {
      play: '<path d="M5 3.2 12.3 8 5 12.8Z" fill="currentColor" stroke="none"/>',
      pause: '<path d="M4.2 3h2.6v10H4.2zM9.2 3h2.6v10H9.2z" fill="currentColor" stroke="none"/>',
      speed: '<path d="M2.1 12.8a6.2 6.2 0 1 1 11.8 0"/><path d="M8 4.3v1.2M4.6 5.7l.9.9M11.4 5.7l-.9.9M12.9 9.1h-1.2M4.3 9.1H3.1"/><path d="m8 10.5 3.1-2.3"/><circle cx="8" cy="10.5" r=".8" fill="currentColor" stroke="none"/>',
      reset: '<path d="M4.1 5.1H1.8V2.8"/><path d="M2.2 5a6 6 0 1 1-.1 5.8"/>',
      angel: '<path d="M8 1.8 9.4 6l4.2 1.5-4.2 1.1-.7 5.6H7.3l-.7-5.6-4.2-1.1L6.6 6Z"/>',
      current: '<rect x="2.3" y="4.2" width="11.4" height="9.1" rx="1.2"/><path d="M5.2 4.2V2.6h5.6v1.6M5.2 7.4h5.6M8 7.4v5.9"/>',
      reroute: '<path d="M2.2 3.2h3.2c3.8 0 2.1 9.6 6.3 9.6h2.1"/><path d="m11.7 10.7 2.1 2.1-2.1 2.1"/><path d="M2.2 12.8h2.5c2.7 0 3.1-3.8 3.6-6.3"/>',
      cold: '<path d="M8 1.5v13M2.4 4.8l11.2 6.4M13.6 4.8 2.4 11.2"/><path d="m6.4 2.7 1.6 1 1.6-1M6.4 13.3 8 12.3l1.6 1M2.7 6.5l1.7-.1.8-1.5M13.3 9.5l-1.7.1-.8 1.5M13.3 6.5l-1.7-.1-.8-1.5M2.7 9.5l1.7.1.8 1.5"/>',
      divert: '<path d="M13.8 4.2H8.1a5.8 5.8 0 0 0-5.8 5.8v2.6"/><path d="m10.9 1.4 2.9 2.8-2.9 2.9"/>',
      abort: '<path d="m5.1 1.8 5.8 0 3.3 3.3v5.8l-3.3 3.3H5.1l-3.3-3.3V5.1Z"/><path d="M5.4 5.4 10.6 10.6M10.6 5.4 5.4 10.6"/>',
      loss: '<path d="M8 1.5 9.1 5l3.7 1.3-3.7 1-.5 3.1H7.4l-.5-3.1-3.7-1.3L6.9 5Z"/><path d="m10.8 10.8 3.1 3.1M13.9 10.8l-3.1 3.1"/>'
    };
    return '<svg class="ctlIcon" data-control-icon="' + name + '" viewBox="0 0 16 16" aria-hidden="true">' + paths[name] + '</svg>';
  }

  class AngelResupplyTrack extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.state = {
        t: 268, playing: false, speed: 1, arm: 'A', selected: '084',
        rerouted: false, cold: false, exception: null, exceptionAt: null, modal: false
      };
      this.tick = this.tick.bind(this);
    }
    connectedCallback() {
      if (!this.keyboardIsolated) {
        ['keydown', 'keypress', 'keyup'].forEach(function (type) {
          this.shadowRoot.addEventListener(type, function (event) {
            if (type === 'keydown' && typeof this.onkeydown === 'function') {
              this.onkeydown(event);
            }
            event.stopPropagation();
          }.bind(this));
        }, this);
        this.keyboardIsolated = true;
      }
      this.render();
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.draw());
        this.resizeObserver.observe(this);
      }
    }
    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }
    focusToken() {
      var active = this.shadowRoot.activeElement;
      if (!active) return null;
      if (active.dataset && active.dataset.key) return '[data-key="' + active.dataset.key + '"]';
      if (active.dataset && active.dataset.focus) return '[data-focus="' + active.dataset.focus + '"]';
      return null;
    }
    setState(change, focus) {
      var token = focus === undefined ? this.focusToken() : focus;
      Object.assign(this.state, change);
      this.render(token);
    }
    seek(seconds) {
      this.setState({ t: Math.max(0, Math.min(R.durationSeconds, Number(seconds) || 0)), playing: false }, '[data-focus="scrub"]');
    }
    setDemoState(options) {
      options = options || {};
      var next = {};
      ['t', 'speed', 'arm', 'selected', 'rerouted', 'cold', 'exception', 'exceptionAt'].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(options, key)) next[key] = options[key];
      });
      next.playing = false;
      this.setState(next);
    }
    currentSnapshot() {
      return R.snapshot(this.state.t, this.state);
    }
    tick(now) {
      if (!this.lastTick) this.lastTick = now;
      var elapsed = (now - this.lastTick) / 1000;
      this.lastTick = now;
      if (this.state.playing) {
        this.state.t = Math.min(R.durationSeconds, this.state.t + elapsed * this.state.speed);
        if (this.state.t >= R.durationSeconds) this.state.playing = false;
        if (!this.lastPaint || now - this.lastPaint >= 100 || !this.state.playing) {
          this.lastPaint = now;
          this.render(this.focusToken());
        }
      }
      if (this.state.playing) this.raf = requestAnimationFrame(this.tick);
    }
    draw() {
      var canvas = this.shadowRoot.querySelector('canvas');
      if (canvas && this.data && this.data.mission) R.draw(canvas, this.data.mission, this.state.t);
    }
    bind() {
      var q = this.shadowRoot.querySelector.bind(this.shadowRoot);
      var self = this;
      if (!this.controlsBound) {
        var play = q('[data-play]');
        play.onclick = function () {
          if (self.state.t >= R.durationSeconds) self.state.t = 0;
          self.state.playing = !self.state.playing;
          self.lastTick = 0;
          self.render('[data-play]');
          if (self.state.playing) self.raf = requestAnimationFrame(self.tick);
        };
        q('[data-speed]').onclick = function () {
          var nextSpeed = self.state.speed === 1 ? 8 : self.state.speed === 8 ? 14 : 1;
          self.setState({ speed: nextSpeed }, '[data-speed]');
        };
        q('[data-reset]').onclick = function () {
          self.setState({
            t: 0, playing: false, speed: 1, arm: 'A', selected: '084',
            rerouted: false, cold: false, exception: null, exceptionAt: null
          }, '[data-reset]');
        };
        q('[data-focus="scrub"]').oninput = function (event) { self.seek(event.target.value); };
        this.shadowRoot.querySelectorAll('[data-arm]').forEach(function (button) {
          button.onclick = function () { self.setState({ arm: button.dataset.arm }, '[data-arm="' + button.dataset.arm + '"]'); };
        });
        q('[data-rerouted]').onclick = function () {
          self.setState({ rerouted: !self.state.rerouted }, '[data-rerouted]');
        };
        q('[data-cold]').onclick = function () {
          self.setState({ cold: !self.state.cold }, '[data-cold]');
        };
        this.shadowRoot.querySelectorAll('[data-exception]').forEach(function (button) {
          button.onclick = function () {
            var value = button.dataset.exception;
            var active = self.state.exception === value;
            self.setState({
              exception: active ? null : value,
              exceptionAt: active ? null : self.state.t
            }, '[data-exception="' + value + '"]');
          };
        });
        this.controlsBound = true;
      }
      this.shadowRoot.querySelectorAll('tbody tr').forEach(function (row) {
        var choose = function () {
          self.setState({
            selected: row.dataset.key, rerouted: false, cold: false,
            exception: null, exceptionAt: null
          }, '[data-key="' + row.dataset.key + '"]');
        };
        row.onclick = choose;
        row.onkeydown = function (event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
        };
      });
      var send = q('.send');
      if (send) {
        var openModal = function () {
          cancelAnimationFrame(self.raf);
          self.setState({ modal: true, playing: false }, '[data-close]');
        };
        /* The live panel repaints during playback. Pointer-down fires before a
           repaint can replace the button between press and click; click keeps
           keyboard activation working. */
        send.onpointerdown = openModal;
        send.onclick = openModal;
      }
      var close = q('[data-close]');
      if (close) close.onclick = function () { self.closeModal(); };
      var overlay = q('.overlay');
      if (overlay) overlay.onclick = function (event) { if (event.target === overlay) self.closeModal(); };
      this.onkeydown = function (event) {
        if (!self.state.modal) return;
        if (event.key === 'Escape') { event.preventDefault(); self.closeModal(); return; }
        if (event.key !== 'Tab') return;
        var dialog = q('[role="dialog"]');
        var focusable = dialog ? Array.from(dialog.querySelectorAll('button,[href],[tabindex="0"]')).filter(function (el) { return !el.disabled; }) : [];
        if (!focusable.length) return;
        var active = self.shadowRoot.activeElement, first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      };
    }
    closeModal() {
      this.setState({ modal: false }, '.send');
    }
    phaseLadder(mission) {
      if (R.OFF_NOMINAL.indexOf(mission.phase) >= 0) {
        return '<div class="exception"><strong>' + esc(mission.phase) + '</strong><span>' + esc(mission.reason) + '</span></div>';
      }
      var current = R.NOMINAL.indexOf(mission.phase);
      return '<div class="ladder">' + R.NOMINAL.map(function (phase, index) {
        var className = index < current ? 'done' : index === current ? 'now' : '';
        var stamp = index < current && mission.stamps[index] ? mission.stamps[index].label : index === current ? 'ACTIVE' : '—';
        return '<div class="phase ' + className + '">' + phase + '<span>' + stamp + '</span></div>';
      }).join('') + '</div>';
    }
    missionRows(m) {
      var remaining = (22.3 * (1 - m.progress)).toFixed(1);
      var flown = (22.3 * m.progress).toFixed(1);
      var phaseIndex = R.NOMINAL.indexOf(m.phase);
      var distance = m.phase === 'LOST'
        ? 'AIRFRAME LOST · ' + flown + ' KM FLOWN'
        : R.OFF_NOMINAL.indexOf(m.phase) >= 0
          ? m.phase + ' · HOLDING · ' + flown + ' KM FLOWN'
          : phaseIndex < 2
            ? '22.3 KM ROUTED · ON THE GROUND AT ' + m.launch
            : remaining + ' KM REMAINING · ' + flown + ' KM FLOWN';
      var rows = [
        ['MISSION', m.mission], ['AIRFRAME', m.airframeDetail],
        ['CASUALTY', m.casualty + ' · ' + m.casualtyDetail], ['ON SCENE', m.responder],
        ['LAUNCH PT', m.launch], ['DISTANCE', distance],
        ['COLD CHAIN', m.coldFailed ? 'OUT OF LIMITS · 11.8 °C · CONTAINER BREACHED' : 'IN LIMITS · 04.2 °C · 00:41:18 REMAINING'],
        ['DEADLINE', 'CRI-NET · TRUST GATE: ACT'], ['DECISION', m.decision], ['DTG', m.dtg]
      ];
      return rows.map(function (row) {
        return '<div class="row ' + (row[0] === 'COLD CHAIN' && m.coldFailed ? 'alert' : '') + '"><b>' + row[0] + '</b><span>' + esc(row[1]) + '</span></div>';
      }).join('');
    }
    manifest(m) {
      if (m.key === '112') {
        return '<div class="unit"><strong>2 / 2</strong><b>FDP</b><span>LYOPHILIZED · AMBIENT</span></div><div class="unit"><strong>1 / 1</strong><b>TXA 2G</b><span>AMBIENT</span></div>';
      }
      if (m.key === '091') {
        return '<div class="unit"><strong>1 / 1</strong><b>WHOLE BLOOD</b><span>1 U · COLD CHAIN</span></div><div class="unit short"><strong>0 / 1</strong><b>HEMORRHAGE KIT</b><span>NO STOCK AT LP-1</span></div>';
      }
      if (m.key === '076') {
        return '<div class="unit short"><strong>0 / 1</strong><b>COMMITTED LOAD</b><span>TASKING DIVERTED</span></div>';
      }
      return '<div class="unit"><strong>2 / 2</strong><b>WHOLE BLOOD</b><span>1 U EACH · COLD CHAIN</span></div><div class="unit"><strong>1 / 1</strong><b>TXA 2G</b><span>AMBIENT</span></div><div class="unit short"><strong>0 / 1</strong><b>HEMORRHAGE KIT</b><span>NO STOCK AT LP-2</span></div>';
    }
    queueRows(selected) {
      return this.data.missions.map(function (mission) {
        var pillClass = R.OFF_NOMINAL.indexOf(mission.phase) >= 0 ? 'off' : mission.phase === 'RIGGING' ? 'rig' : 'nom';
        var marginClass = mission.margin != null && mission.margin >= 0 ? 'good' : 'bad';
        return '<tr tabindex="0" data-key="' + mission.key + '" aria-selected="' + (mission.key === selected.key) + '">' +
          '<td>' + mission.casualty + '</td><td><span class="pill ' + pillClass + '">' + mission.phase + '</span></td>' +
          '<td class="num">' + R.duration(mission.tMinus) + '</td><td class="num ' + (mission.deadlineRemaining < 0 ? 'bad' : '') + '">' + deadline(mission.deadlineRemaining) + '</td>' +
          '<td class="num ' + marginClass + '">' + margin(mission.margin, mission) + '</td><td>' + mission.airframe + '</td><td>' + mission.payload + '</td></tr>';
      }).join('');
    }
    armA(m) {
      var bad = m.margin == null || m.margin < 0 || m.coldFailed;
      var note = m.rerouted ? 'RE-ROUTED AROUND FPV SATURATION ZONE · +00:01:58'
        : m.phase === 'TASKED' ? 'COMMITTED · DRAWING PAYLOAD FROM LAUNCH-POINT STOCK'
          : m.phase === 'RIGGING' ? 'CONTAINER SEALED · COLD CHAIN CLOCK RUNNING'
            : m.phase === 'LAUNCHED' ? 'WHEELS UP' : '';
      return this.phaseLadder(m) +
        '<div class="col primary"><section class="card"><div class="head"><span class="lab">Mission ' + m.mission + ' · Casualty ' + m.casualty + '</span><span class="chip ' + (R.OFF_NOMINAL.indexOf(m.phase) >= 0 ? 'bad' : 'on') + '">' + m.phase + '</span></div>' +
        '<div class="time"><div class="lab">Time to delivery</div><div class="big ' + (m.tMinus == null ? 'bad' : '') + '">' + R.duration(m.tMinus) + '</div><div class="pair"><div class="cell"><div class="lab2">Physiological deadline</div><div class="val ' + (m.deadlineRemaining < 0 ? 'bad' : '') + '">' + deadline(m.deadlineRemaining) + '</div></div><div class="vs"></div><div class="cell"><div class="lab2">Margin</div><div class="val ' + (m.margin != null && m.margin >= 0 ? 'good' : 'bad') + '">' + margin(m.margin, m) + '</div></div></div><div class="note">' + esc(note) + '</div><div class="trust ' + (bad ? 'bad' : '') + '">TASKING OUTPUT · NO MODEL ON THIS PATH · ' + esc(m.deliveryState) + '</div></div>' +
        '<div class="actions"><button class="send" data-focus="send"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="2.5" width="12" height="19" rx="2.4" stroke="currentColor" stroke-width="1.9"/><path d="M7 7.5h5M7 11h5M13.5 16.5h7m0 0-2.6-2.6m2.6 2.6-2.6 2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Send to medic’s ATAK</button><small>Interface proposed · not implemented in this build</small></div></section>' +
        '<section class="card"><div class="head"><span class="lab">Theatre track · PACOM CORAL</span><span class="chip">SCHEMATIC · NO TERRAIN</span></div><div class="mapWrap"><canvas role="img" aria-label="Standalone schematic theatre track with launch point, route, aircraft, threat zone and casualty deadline marker"></canvas></div><div class="foot"><span class="lab2">Solid · flown &nbsp; Dashed · remaining</span><span class="lab2">Pulse period encodes time to deadline</span></div></section></div>' +
        '<div class="col details"><section class="card"><div class="head"><span class="lab">Mission</span><span class="chip on">ARM A · ANGEL SWARM</span></div><div class="rows">' + this.missionRows(m) + '</div></section><section class="card"><div class="head"><span class="lab">Manifest</span><span class="chip">ABOARD / REQUIRED</span></div><div class="manifest">' + this.manifest(m) + '</div></section></div>' +
        '<section class="card queue"><div class="head"><span class="lab">Commitment queue</span><span class="chip">SORTED BY MARGIN ASCENDING</span></div><div class="tableWrap"><table><thead><tr><th>Casualty</th><th>Phase</th><th class="num">T-minus</th><th class="num">Deadline</th><th class="num">Margin</th><th>Airframe</th><th>Payload</th></tr></thead><tbody>' + this.queueRows(m) + '</tbody></table></div></section>';
    }
    armB() {
      return '<div class="empty armBEmpty"><div><div class="lab" style="color:oklch(.86 .12 50)">No commitment to this casualty</div><div class="big">' + R.duration(this.data.nextPush) + '</div><div class="lab">Until next scheduled Class VIII push</div><p>This standalone synthetic comparison fixture demonstrates fixed-interval Class VIII movement to launch points, not a commitment against an individual casualty. It does not describe or modify the engine’s CURRENT — TRIAGE &amp; PROXIMITY comparator. No arrival time is computed because no mission exists. The tracker has nothing to track.</p></div></div>';
    }
    modal() {
      var m = this.data.mission;
      return '<div class="overlay"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="atak-title" aria-describedby="atak-status"><div class="mhead"><div><h2 id="atak-title">How ANGEL SWARM sends it</h2><div class="msub">' + m.mission + ' → ' + m.casualty + '’S MEDIC</div></div><button class="ctl" data-close data-focus="close" aria-label="Close proposed ATAK interface explanation">ESC ×</button></div>' +
        '<div class="status" id="atak-status"><strong>EMSEC ASSESSMENT IS REQUIRED BEFORE FIELDING.</strong>DESIGNED · NOT BUILT IN THIS RELEASE · THIS DEMONSTRATION TRANSMITS NOTHING</div><div class="body">' +
        '<section><h3>Out of the program</h3><p>A future operational implementation could serialize an approved assignment, route, ETA, and deadline as Cursor on Target. This standalone capability demonstration has no launcher, emitter, socket, credential, or integration and does not read the simulation.</p></section>' +
        '<section><h3>Onto the network</h3><div class="transport"><strong>TAK SERVER<br>MUTUAL TLS :8089</strong><span>Proposed machine-client certificate path. Field configuration and accreditation would be required.</span></div><div class="transport"><strong>SA MULTICAST<br>239.2.3.1:6969</strong><span>Potential local-mesh path for disconnected forward elements.</span></div><div class="transport"><strong>MARTI REST<br>:8443</strong><span>Potential certificate-authenticated injection when a broker is present.</span></div></section>' +
        '<section><h3>The proposed event</h3><pre tabindex="0">&lt;event uid="ANGELSWARM.DLV.' + m.casualty + '" type="b-r-f-h-c"&gt;\n  &lt;detail&gt;\n    &lt;remarks&gt;INBOUND · ETA ' + R.duration(m.tMinus) + ' · MARGIN ' + margin(m.margin, m) + '&lt;/remarks&gt;\n    &lt;_angelswarm_delivery state="' + m.phase.replace(/ /g, '_') + '"\n      casualty="' + m.key + '" margin_s="' + (m.margin == null ? 'null' : Math.round(m.margin)) + '"/&gt;\n  &lt;/detail&gt;\n&lt;/event&gt;</pre></section>' +
        '<section><h3>Cadence</h3><ul><li>Proposed on state change and every <b>5 seconds</b> while airborne; re-route immediately.</li><li>Proposed stale time is now plus 30 seconds so a disconnected marker ages out.</li><li>Future interface would remain send-only and dark unless explicitly enabled.</li></ul></section></div></div></div>';
    }
    render(focusSelector) {
      this.data = R.snapshot(this.state.t, this.state);
      var body = this.state.arm === 'B' ? this.armB() : this.armA(this.data.mission);
      if (!this.shadowRoot.querySelector('[data-content]')) {
        this.shadowRoot.innerHTML = '<style>' + CSS + '</style><div class="wrap"><div class="top"><div><div class="title">Resupply Tracking</div><div class="sub">Standalone tactical medical-logistics capability demonstration</div></div><div class="tag">CAPABILITY DEMO · SYNTHETIC · DISCONNECTED</div></div>' +
          '<div class="boundary"><b>BOUNDARY</b><span>This self-contained demonstration does not read or modify simulation, scenario, casualty, tasking, or host-playback state. It makes no network request and transmits nothing.</span></div>' +
          '<div class="mainGrid"><div data-content></div><section class="card demoCard"><div class="head"><span class="lab">Demonstration controls</span><span class="chip">LOCAL FIXTURE</span></div><div class="demo"><div class="controlGroup"><button class="ctl" data-reset data-focus="reset">' + controlIcon('reset') + '<span>RESET</span></button><button class="ctl" data-play data-focus="play">' + controlIcon('play') + '<span>PLAY</span></button><button class="ctl" data-speed data-focus="speed">' + controlIcon('speed') + '<span>SPEED ×1</span></button><button class="ctl event" data-exception="ABORTED" data-focus="aborted">' + controlIcon('abort') + '<span>ABORT</span></button></div>' +
          '<div class="controlGroup"><button class="ctl" data-arm="A" data-focus="arm-a">' + controlIcon('angel') + '<span>ARM A · ANGEL SWARM</span></button><button class="ctl" data-arm="B" data-focus="arm-b">' + controlIcon('current') + '<span>ARM B · CURRENT</span></button></div>' +
          '<div class="controlGroup"><button class="ctl event" data-exception="LOST" data-focus="lost">' + controlIcon('loss') + '<span>AIRCRAFT LOSS</span></button><button class="ctl" data-cold data-focus="cold">' + controlIcon('cold') + '<span>COLD BREACH</span></button><button class="ctl event" data-exception="DIVERTED" data-focus="diverted">' + controlIcon('divert') + '<span>DIVERT</span></button><button class="ctl" data-rerouted data-focus="reroute">' + controlIcon('reroute') + '<span>RE-ROUTE</span></button></div>' +
          '<label class="scrub"><span class="lab">Timeline</span><input data-focus="scrub" aria-label="Standalone demonstration timeline" type="range" min="0" step=".1"><span class="clock"></span></label></div></section></div></div><div data-modal></div>';
      }
      var play = this.shadowRoot.querySelector('[data-play]');
      var playLabel = this.state.playing ? 'PAUSE' : 'PLAY';
      var playIcon = this.state.playing ? 'pause' : 'play';
      if (play.querySelector('span').textContent !== playLabel) play.querySelector('span').textContent = playLabel;
      if (play.querySelector('.ctlIcon').dataset.controlIcon !== playIcon) {
        play.querySelector('.ctlIcon').outerHTML = controlIcon(playIcon);
      }
      var speed = this.shadowRoot.querySelector('[data-speed]');
      var nextSpeed = this.state.speed === 1 ? 8 : this.state.speed === 8 ? 14 : 1;
      var speedAria = 'Demonstration playback speed times ' + this.state.speed +
        '; activate to set times ' + nextSpeed;
      var speedLabel = 'SPEED ×' + this.state.speed;
      if (speed.getAttribute('aria-label') !== speedAria) speed.setAttribute('aria-label', speedAria);
      if (speed.querySelector('span').textContent !== speedLabel) speed.querySelector('span').textContent = speedLabel;
      this.shadowRoot.querySelectorAll('[data-arm]').forEach(function (button) {
        var pressed = String(button.dataset.arm === this.state.arm);
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      }, this);
      var rerouted = this.shadowRoot.querySelector('[data-rerouted]');
      var cold = this.shadowRoot.querySelector('[data-cold]');
      if (rerouted.getAttribute('aria-pressed') !== String(this.state.rerouted)) {
        rerouted.setAttribute('aria-pressed', String(this.state.rerouted));
      }
      if (cold.getAttribute('aria-pressed') !== String(this.state.cold)) {
        cold.setAttribute('aria-pressed', String(this.state.cold));
      }
      this.shadowRoot.querySelectorAll('[data-exception]').forEach(function (button) {
        var pressed = String(button.dataset.exception === this.state.exception);
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      }, this);
      var scrub = this.shadowRoot.querySelector('[data-focus="scrub"]');
      scrub.max = R.durationSeconds;
      scrub.value = this.state.t;
      this.shadowRoot.querySelector('.clock').textContent = 'T+' + R.duration(this.state.t);
      var content = this.shadowRoot.querySelector('[data-content]');
      content.innerHTML = body;
      this.shadowRoot.querySelector('.mainGrid').classList.toggle('armB', this.state.arm === 'B');
      this.shadowRoot.querySelector('[data-modal]').innerHTML = this.state.modal ? this.modal() : '';
      this.bind();
      this.draw();
      var focus = focusSelector && this.shadowRoot.querySelector(focusSelector);
      if (focus && focus !== this.shadowRoot.activeElement) focus.focus();
      else if (this.state.modal) {
        var close = this.shadowRoot.querySelector('[data-close]');
        if (close) close.focus();
      }
    }
  }

  if (!customElements.get('angel-resupply-track')) {
    customElements.define('angel-resupply-track', AngelResupplyTrack);
  }
})();