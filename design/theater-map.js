// ANGEL SWARM — Theater Map.
// A self-contained GPU map. Basemap tiles are uploaded as textures and drawn as
// WebGL2 geometry through a real perspective camera; 3D extrusions are GPU
// triangles. Symbology and type are composited on a 2D layer using the same
// camera matrix. Every draw is synchronous — no animation-frame dependency — so
// the picture appears and pans immediately.
(function () {
  const TILES = ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                 'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'];
  const TS = 512;                                    // @2x tiles
  const ANCHOR = { lon: 120.52, lat: 18.78 };
  const KM_LAT = 110.7, KM_LON = 105.7;
  const LL = (x, y) => [ANCHOR.lon + x / KM_LON, ANCHOR.lat - y / KM_LAT];
  const CAS = { hold: '#7aa2ff', fall: '#f0a44a', crit: '#f2603c', treated: '#4fd39b', dead: '#8a8f99' };

  // ---- web mercator ---------------------------------------------------------
  const mercX = lon => (lon + 180) / 360;
  const mercY = lat => {
    const s = Math.sin(lat * Math.PI / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  };
  const invY = y => (2 * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 2) * 180 / Math.PI;

  // ---- mat4 ----------------------------------------------------------------
  const m4 = {
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) {                                     // column-major, like GL
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
      return o;
    },
    trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; },
    scale(x, y, z) { return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]; },
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    persp(fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2);
      return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
    },
    apply(m, p) {
      const [x, y, z] = p;
      return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
    },
    inv(m) {
      const i = new Array(16), a = m;
      const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
      const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
      const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
      const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1 / det;
      i[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; i[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
      i[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; i[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
      i[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; i[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
      i[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; i[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
      i[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; i[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
      i[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; i[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
      i[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; i[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
      i[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; i[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
      return i;
    }
  };

  const VS = `#version 300 es
  in vec3 a_pos; in vec2 a_uv; in vec4 a_col;
  uniform mat4 u_mvp;
  out vec2 v_uv; out vec4 v_col;
  void main(){ v_uv = a_uv; v_col = a_col; gl_Position = u_mvp * vec4(a_pos,1.0); }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec2 v_uv; in vec4 v_col;
  uniform sampler2D u_tex; uniform int u_mode;
  out vec4 o;
  void main(){
    if (u_mode == 1) { vec4 t = texture(u_tex, v_uv); o = vec4(t.rgb * 0.94, t.a); }
    else o = v_col;
  }`;

  const CSS = `
  .tmroot{position:relative;height:560px;border-radius:6px;overflow:hidden;background:#0d1016;border:1px solid #2b303a;font-family:'IBM Plex Mono',ui-monospace,monospace}
  .tmroot .panes{display:flex;height:100%;gap:1px;background:#2b303a}
  .tmroot .pane{position:relative;flex:1;min-width:0;overflow:hidden;background:#0d1016;cursor:grab;touch-action:none}
  .tmroot .pane.drag{cursor:grabbing}
  .tmroot canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  .tmroot .card{position:absolute;z-index:3;background:rgba(26,30,38,.94);border:1px solid #333a46;border-radius:5px;color:#d8dbe2}
  .tmroot .badge{left:14px;top:14px;display:flex;align-items:baseline;gap:11px;padding:12px 18px}
  .tmroot .badge b{font-size:22px;font-weight:700;letter-spacing:.09em;color:#e8f4f6}
  .tmroot .badge i{font-style:normal;font-size:11px;letter-spacing:.04em;color:#98a0ad}
  .tmroot .hint{left:14px;bottom:14px;padding:9px 12px;font-size:9.5px;line-height:1.6;letter-spacing:.03em;color:#a7aeb9;max-width:340px}
  .tmroot .hint b{display:block;font-weight:600;color:#dfe3ea}
  .tmroot .tag{left:14px;top:14px;padding:6px 10px;font-size:8.5px;font-weight:700;letter-spacing:.1em;color:#8fd6dd;white-space:nowrap}
  .tmroot .ll{right:14px;bottom:14px;padding:6px 10px;font-size:9px;letter-spacing:.06em;color:#a7aeb9;white-space:nowrap}
  .tmroot .att{right:14px;bottom:14px;padding:5px 9px;font-size:8px;letter-spacing:.06em;color:#7f8794;max-width:210px;text-align:right;line-height:1.5}
  .tmroot .counters{right:14px;top:14px;display:flex;gap:14px;padding:9px 13px}
  .tmroot .counters div{display:flex;flex-direction:column;gap:2px}
  .tmroot .counters span{font-size:8px;letter-spacing:.1em;color:#8b93a0}
  .tmroot .counters b{font-size:15px;font-weight:700;line-height:1}
  .tmroot .legend{left:14px;top:64px;width:194px;padding:11px 13px;display:flex;flex-direction:column;gap:7px}
  .tmroot .legend h5{margin:0;font-size:8.5px;font-weight:700;letter-spacing:.11em;color:#a7aeb9}
  .tmroot .legend p{margin:0;display:flex;align-items:center;gap:7px;font-size:9px;color:#ccd2da}
  .tmroot .legend em{width:9px;height:9px;border-radius:2px;flex:none;font-style:normal}
  .tmroot .transport{left:14px;right:14px;bottom:46px;display:flex;align-items:center;gap:11px;padding:8px 12px}
  .tmroot .transport button{font:600 9px 'IBM Plex Mono',monospace;letter-spacing:.07em;color:#d8dbe2;background:#272d38;border:1px solid #39414f;border-radius:3px;padding:5px 9px;cursor:pointer}
  .tmroot .transport button[aria-pressed=true]{background:#1f4a3c;border-color:#2f6d57;color:#9ef0cd}
  .tmroot .track{flex:1;height:5px;border-radius:3px;background:#2b313d;position:relative;min-width:60px}
  .tmroot .track i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#4fd39b}
  .tmroot .rate{display:flex;gap:3px}
  .tmroot .banner{left:0;right:0;top:44%;padding:11px 0;text-align:center;border-radius:0;border-left:none;border-right:none;background:rgba(84,28,24,.92);border-color:#8a3a30;color:#ffb8ab;font-size:10.5px;font-weight:700;letter-spacing:.1em}
  .tmroot .msg{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;text-align:center;padding:26px;font-size:10.5px;line-height:1.7;letter-spacing:.06em;color:#a7aeb9;background:rgba(13,16,22,.86)}`;

  class Surface {
    constructor(pane, host) {
      this.pane = pane; this.host = host;
      this.gl = null; this.tiles = new Map(); this.pending = 0;
      this.cam = { lon: ANCHOR.lon + 0.42, lat: ANCHOR.lat - 0.52, zoom: 7.6, pitch: 0, bearing: 0 };
      const glc = document.createElement('canvas'), ovc = document.createElement('canvas');
      pane.appendChild(glc); pane.appendChild(ovc);
      this.glc = glc; this.ovc = ovc; this.ctx = ovc.getContext('2d');
      this.initGL();
      this.bind();
    }
    initGL() {
      const gl = this.glc.getContext('webgl2', { antialias: true, premultipliedAlpha: true });
      if (!gl) return;
      this.gl = gl;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { this.gl = null; return; }
      gl.useProgram(p);
      this.prog = p;
      this.u = { mvp: gl.getUniformLocation(p, 'u_mvp'), tex: gl.getUniformLocation(p, 'u_tex'), mode: gl.getUniformLocation(p, 'u_mode') };
      this.buf = gl.createBuffer();
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      const stride = 9 * 4;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 20);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    }
    bind() {
      const pane = this.pane;
      let drag = null;
      pane.addEventListener('pointerdown', e => {
        pane.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, mode: e.button === 2 || e.shiftKey ? 'rot' : e.ctrlKey || e.metaKey ? 'pitch' : 'pan', cam: { ...this.cam } };
        pane.classList.add('drag');
      });
      pane.addEventListener('contextmenu', e => e.preventDefault());
      pane.addEventListener('pointermove', e => {
        if (!drag) { this.host.readout(this, e); return; }
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (drag.mode === 'pan') {
          const g = this.geom();
          const a = g.unproject(this.mx(drag.x), this.my(drag.y)), b = g.unproject(this.mx(e.clientX), this.my(e.clientY));
          if (a && b) { this.cam.lon = drag.cam.lon - (b[0] - a[0]); this.cam.lat = drag.cam.lat - (b[1] - a[1]); }
        } else if (drag.mode === 'rot') this.cam.bearing = drag.cam.bearing - dx * 0.4;
        else this.cam.pitch = Math.max(0, Math.min(72, drag.cam.pitch + dy * 0.28));
        this.draw();
      });
      const end = () => { drag = null; pane.classList.remove('drag'); };
      pane.addEventListener('pointerup', end);
      pane.addEventListener('pointercancel', end);
      pane.addEventListener('wheel', e => {
        e.preventDefault();
        const g = this.geom();
        const before = g.unproject(this.mx(e.clientX), this.my(e.clientY));
        this.cam.zoom = Math.max(1.6, Math.min(15.5, this.cam.zoom - e.deltaY * 0.0022));
        const after = this.geom().unproject(this.mx(e.clientX), this.my(e.clientY));
        if (before && after) { this.cam.lon += before[0] - after[0]; this.cam.lat += before[1] - after[1]; }
        this.draw();
      }, { passive: false });
      pane.addEventListener('dblclick', () => { this.host.frame(this, true); });
    }
    mx(cx) { return cx - this.pane.getBoundingClientRect().left; }
    my(cy) { return cy - this.pane.getBoundingClientRect().top; }

    size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.pane.clientWidth || 800, h = this.pane.clientHeight || 560;
      [this.glc, this.ovc].forEach(c => {
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        }
      });
      return { w, h, dpr };
    }
    // camera → matrices and the projection helpers the overlay uses
    geom() {
      const { w, h } = this.size();
      const scale = Math.pow(2, this.cam.zoom) * TS;
      const cx = mercX(this.cam.lon) * scale, cy = mercY(this.cam.lat) * scale;
      const fov = 0.72, dist = (h / 2) / Math.tan(fov / 2);
      const P = m4.persp(fov, w / h, 1, dist * 60);
      const V = m4.mul(m4.mul(m4.trans(0, 0, -dist), m4.rotX(this.cam.pitch * Math.PI / 180)),
        m4.mul(m4.rotZ(-this.cam.bearing * Math.PI / 180), m4.mul(m4.scale(1, -1, 1), m4.trans(-cx, -cy, 0))));
      const mvp = m4.mul(P, V);
      const inv = m4.inv(mvp);
      const toScreen = p => {
        const c = m4.apply(mvp, p);
        if (c[3] <= 0.0001) return null;
        return [(c[0] / c[3] * 0.5 + 0.5) * w, (0.5 - c[1] / c[3] * 0.5) * h, c[3]];
      };
      return {
        scale, cx, cy, w, h, mvp,
        world: (lon, lat) => [mercX(lon) * scale, mercY(lat) * scale, 0],
        pxPerKm: scale / (40075 * Math.cos(this.cam.lat * Math.PI / 180)),
        project: (lon, lat, hz) => toScreen([mercX(lon) * scale, mercY(lat) * scale, hz || 0]),
        unproject: (sx, sy) => {
          if (!inv) return null;
          const nx = sx / w * 2 - 1, ny = 1 - sy / h * 2;
          const a = m4.apply(inv, [nx, ny, -1]), b = m4.apply(inv, [nx, ny, 1]);
          const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
          const dz = p1[2] - p0[2];
          if (Math.abs(dz) < 1e-9) return null;
          const t = -p0[2] / dz;
          if (t < 0) return null;
          const x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t;
          return [x / scale * 360 - 180, invY(y / scale)];
        }
      };
    }
    tileUrl(z, x, y) { return TILES[(x + y) % TILES.length].replace('{z}', z).replace('{x}', x).replace('{y}', y); }
    tile(z, x, y) {
      const key = z + '/' + x + '/' + y;
      let t = this.tiles.get(key);
      if (t) return t;
      t = { tex: null, img: null };
      this.tiles.set(key, t);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const gl = this.gl; if (!gl) return;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        t.tex = tex;
        this.draw();
      };
      img.onerror = () => { t.failed = true; };
      img.src = this.tileUrl(z, x, y);
      return t;
    }
    draw() {
      if (this._busy) { this._again = true; return; }
      this._busy = true;
      try { this.paint(); } finally { this._busy = false; }
      if (this._again) { this._again = false; this.paint(); }
    }
    paint() {
      const gl = this.gl, g = this.geom(), { w, h, dpr } = this.size();
      const d = this.host._d; if (!d) return;
      if (gl) {
        gl.viewport(0, 0, this.glc.width, this.glc.height);
        gl.clearColor(0.051, 0.062, 0.086, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.prog);
        gl.bindVertexArray(this.vao);
        gl.uniformMatrix4fv(this.u.mvp, false, new Float32Array(g.mvp));
        this.drawTiles(g);
        this.drawExtrusions(g, d);
      }
      this.overlay(g, d, dpr, w, h);
    }
    drawTiles(g) {
      const gl = this.gl;
      const z = Math.max(1, Math.min(17, Math.round(this.cam.zoom)));
      const n = Math.pow(2, z), tsz = g.scale / n;
      const corners = [[0, 0], [g.w, 0], [0, g.h], [g.w, g.h], [g.w / 2, g.h * 0.62]];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = false;
      corners.forEach(([sx, sy]) => {
        const ll = g.unproject(sx, sy); if (!ll) return;
        ok = true;
        const tx = mercX(ll[0]) * n, ty = mercY(ll[1]) * n;
        x0 = Math.min(x0, tx); x1 = Math.max(x1, tx); y0 = Math.min(y0, ty); y1 = Math.max(y1, ty);
      });
      if (!ok) return;
      const pad = 1;
      x0 = Math.floor(x0) - pad; x1 = Math.ceil(x1) + pad; y0 = Math.floor(y0) - pad; y1 = Math.ceil(y1) + pad;
      if ((x1 - x0) * (y1 - y0) > 220) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; x0 = Math.floor(cx - 7); x1 = Math.ceil(cx + 7); y0 = Math.floor(cy - 7); y1 = Math.ceil(cy + 7); }
      gl.uniform1i(this.u.mode, 1);
      gl.uniform1i(this.u.tex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.depthMask(false);
      for (let ty = Math.max(0, y0); ty <= Math.min(n - 1, y1); ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const wx = ((tx % n) + n) % n;
          const t = this.tile(z, wx, ty);
          if (!t.tex) continue;
          const ox = tx * tsz, oy = ty * tsz;
          const v = new Float32Array([
            ox, oy, 0, 0, 0, 0, 0, 0, 0, ox + tsz, oy, 0, 1, 0, 0, 0, 0, 0, ox, oy + tsz, 0, 0, 1, 0, 0, 0, 0,
            ox + tsz, oy, 0, 1, 0, 0, 0, 0, 0, ox + tsz, oy + tsz, 0, 1, 1, 0, 0, 0, 0, ox, oy + tsz, 0, 0, 1, 0, 0, 0, 0
          ]);
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
          gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
          gl.bindTexture(gl.TEXTURE_2D, t.tex);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      gl.depthMask(true);
    }
    // 3D: casualty time columns and threat domes as real GPU geometry
    drawExtrusions(g, d) {
      if (d.scope !== '3d') return;
      const gl = this.gl, L = d.layers || {}, W = d.world;
      const tri = [];
      const push = (p, c) => tri.push(p[0], p[1], p[2], 0, 0, c[0], c[1], c[2], c[3]);
      const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
      const wp = (x, y, hz) => { const ll = LL(x, y); return [mercX(ll[0]) * g.scale, mercY(ll[1]) * g.scale, hz]; };
      const quad = (a, b, c2, dd, col) => { push(a, col); push(b, col); push(c2, col); push(a, col); push(c2, col); push(dd, col); };
      if (L.columns) (d.cas || []).forEach(c => {
        if (c.min == null || c.state === 'dead') return;
        const col = [...hex(CAS[c.state]), 0.9];
        const hgt = Math.max(6, Math.min(220, c.min * 2.4)) * (g.pxPerKm * 0.9);
        const r = 0.34 * g.pxPerKm;
        const p = (dx, dy, hz) => wp(c.x + dx, c.y + dy, hz);
        [[-r, -r, r, -r], [r, -r, r, r], [r, r, -r, r], [-r, r, -r, -r]].forEach(([ax, ay, bx, by]) => {
          quad(p(ax / g.pxPerKm * 1, ay / g.pxPerKm * 1, 0), p(bx / g.pxPerKm, by / g.pxPerKm, 0),
            p(bx / g.pxPerKm, by / g.pxPerKm, hgt), p(ax / g.pxPerKm, ay / g.pxPerKm, hgt), col);
        });
        const top = [...hex(CAS[c.state]), 1];
        quad(p(-r / g.pxPerKm, -r / g.pxPerKm, hgt), p(r / g.pxPerKm, -r / g.pxPerKm, hgt),
          p(r / g.pxPerKm, r / g.pxPerKm, hgt), p(-r / g.pxPerKm, r / g.pxPerKm, hgt), top);
      });
      if (L.threat) (W.threats || []).forEach(t => {
        const col = [0.95, 0.38, 0.24, 0.16], N = 26, M = 6;
        for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
          const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
          const e0 = j / M * Math.PI / 2, e1 = (j + 1) / M * Math.PI / 2;
          const P = (a, e) => wp(t.x + Math.cos(a) * Math.cos(e) * t.r, t.y + Math.sin(a) * Math.cos(e) * t.r, Math.sin(e) * t.r * g.pxPerKm * 0.7);
          quad(P(a0, e0), P(a1, e0), P(a1, e1), P(a0, e1), col);
        }
      });
      if (!tri.length) return;
      gl.uniform1i(this.u.mode, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tri), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, tri.length / 9);
    }
    // symbology and type, composited with the same camera
    overlay(g, d, dpr, w, h) {
      const c = this.ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const L = d.layers || {}, W = d.world, scope = d.scope;
      const P = (lon, lat, hz) => g.project(lon, lat, hz);
      const Pk = (x, y, hz) => { const ll = LL(x, y); return P(ll[0], ll[1], hz); };
      const path = (pts, close) => {
        c.beginPath();
        let started = false;
        pts.forEach(p => { if (!p) return; if (!started) { c.moveTo(p[0], p[1]); started = true; } else c.lineTo(p[0], p[1]); });
        if (close) c.closePath();
        return started;
      };
      const ringPts = (x, y, km) => {
        const out = [];
        for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; out.push(Pk(x + Math.cos(a) * km, y + Math.sin(a) * km)); }
        return out;
      };
      // Labels are placed against what is already on the surface: the first
      // candidate offset that clears every placed box wins, else the least bad.
      const placed = [];
      const CAND = [[1, 0], [1, -1], [1, 1], [-1, 0], [-1, -1], [-1, 1], [0, -1], [0, 1], [1.9, -0.6], [-1.9, -0.6], [0, -2], [0, 2]];
      const text = (str, p, o) => {
        if (!p || p[0] < -220 || p[1] < -220 || p[0] > w + 220 || p[1] > h + 220) return;
        c.font = (o.weight || 700) + ' ' + o.size + "px 'IBM Plex Mono', ui-monospace, monospace";
        const tw = c.measureText(str).width, th = o.size * 1.25;
        const gx = Math.abs(o.dx || 0) || 11, gy = Math.abs(o.dy || 0) || 11;
        const fixed = o.align === 'center' && o.dy;
        let best = null, score = Infinity;
        const cands = fixed ? [[0, (o.dy || 0) > 0 ? 1 : -1]] : CAND;
        for (let i = 0; i < cands.length; i++) {
          const [cx2, cy2] = cands[i];
          const align = fixed ? 'center' : cx2 > 0 ? 'left' : cx2 < 0 ? 'right' : 'center';
          const px = p[0] + cx2 * gx, py = p[1] + cy2 * gy;
          const x0 = align === 'left' ? px : align === 'right' ? px - tw : px - tw / 2;
          const r = { x0: x0 - 2, y0: py - th / 2, x1: x0 + tw + 2, y1: py + th / 2 };
          let hit = 0;
          for (const q of placed) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) hit++;
          if (hit * 100 + i < score) { score = hit * 100 + i; best = { px, py, align, r }; }
          if (!hit) break;
        }
        if (!best) return;
        if (score >= 100 && o.drop) return;                        // a crowded minor label is dropped, not stacked
        placed.push(best.r);
        c.textAlign = best.align; c.textBaseline = 'middle';
        c.lineWidth = 3.2; c.strokeStyle = 'rgba(13,16,22,.95)';
        c.strokeText(str, best.px, best.py);
        c.fillStyle = o.fill; c.fillText(str, best.px, best.py);
      };

      if (scope === 'theatre') {
        (d.joas || []).forEach(j => {
          const p = P(j.lon, j.lat); if (!p) return;
          const live = !!j.live, sel = d.sel === j.name;
          const edge = live ? '#8fe3e0' : '#8b93a0';
          const pip = j.cond === 'BLACK' || j.cond === 'RED' ? '#f2603c' : j.cond === 'AMBER' ? '#f0b04a' : '#4fd39b';
          const stat = j.cond === 'BLACK' || j.cond === 'RED' ? '#ffb0a2' : j.cond === 'AMBER' ? '#ffd79a' : '#9ef0cd';
          if (live) {
            c.beginPath(); c.arc(p[0], p[1], 40, 0, Math.PI * 2);
            c.fillStyle = 'rgba(242,96,60,.12)'; c.fill();
          }
          c.beginPath(); c.rect(p[0] - 17, p[1] - 12, 34, 24);
          c.fillStyle = 'rgba(20,24,31,.92)'; c.fill();
          c.strokeStyle = sel ? '#eaffff' : edge; c.lineWidth = sel ? 2.2 : 1.5; c.stroke();
          c.beginPath(); c.moveTo(p[0] - 17, p[1] - 12); c.lineTo(p[0] + 17, p[1] + 12);
          c.moveTo(p[0] + 17, p[1] - 12); c.lineTo(p[0] - 17, p[1] + 12);
          c.strokeStyle = edge; c.lineWidth = 1.2; c.stroke();
          c.beginPath(); c.arc(p[0] + 17, p[1] - 12, 4.6, 0, Math.PI * 2);
          c.fillStyle = pip; c.fill(); c.strokeStyle = '#0d1016'; c.lineWidth = 1.3; c.stroke();
          text(j.name, p, { size: 10.5, fill: '#f2f5f8', dy: -22, align: 'center' });
          text(j.wounded + ' WOUNDED · ' + j.down + ' DOWN · ' + j.dead + ' DEAD', p, { size: 9, fill: stat, dy: 24, align: 'center' });
          if (live) text('◉ LIVE — ANGEL SWARM TASKING', p, { size: 8.5, fill: '#8fe3e0', dy: 37, align: 'center', weight: 600 });
          j._hit = p;
        });
        return;
      }

      // JOA frame
      if (path([Pk(0, 0), Pk(W.widthKm, 0), Pk(W.widthKm, W.heightKm), Pk(0, W.heightKm)], true)) {
        c.strokeStyle = 'rgba(95,168,191,.85)'; c.lineWidth = 1.3; c.setLineDash([]); c.stroke();
      }
      if (scope === '2d') {
        c.save(); c.strokeStyle = 'rgba(120,150,180,.2)'; c.lineWidth = 0.7;
        for (let x = 10; x < W.widthKm; x += 10) { if (path([Pk(x, 0), Pk(x, W.heightKm)])) c.stroke(); }
        for (let y = 10; y < W.heightKm; y += 10) { if (path([Pk(0, y), Pk(W.widthKm, y)])) c.stroke(); }
        c.restore();
      }
      if (L.lp && (scope === '2d' || L.labels)) (W.bases || []).forEach(b => {
        text(b.name, Pk(b.x, b.y), { size: 11, fill: '#f2f5f8', dx: 12, dy: 12 });
      });
      if (L.threat && scope === '2d') (W.threats || []).forEach(t => {
        if (path(ringPts(t.x, t.y, t.r), true)) {
          c.fillStyle = 'rgba(242,96,60,.09)'; c.fill();
          c.strokeStyle = 'rgba(242,96,60,.55)'; c.lineWidth = 1.2; c.setLineDash([9, 6]); c.stroke(); c.setLineDash([]);
        }
        text(t.label, Pk(t.x, t.y), { size: 10, fill: '#ff9d8b', dx: 2, dy: 2, drop: true });
      });
      if (L.lp) (W.bases || []).forEach(b => {
        if (path(ringPts(b.x, b.y, b.reachKm || 33), true)) {
          c.strokeStyle = 'rgba(95,201,216,.36)'; c.lineWidth = 1; c.setLineDash([7, 6]); c.stroke(); c.setLineDash([]);
        }
      });
      (W.sites || []).forEach(s => {
        if (path(ringPts(s.x, s.y, s.r), true)) {
          c.strokeStyle = 'rgba(224,164,74,.4)'; c.lineWidth = 1; c.stroke();
        }
        if (scope === '2d' || L.labels) text(s.name.replace('SITE ', '') + (s.count ? ' · ' + s.count + ' ON GROUND' : ' · NONE ON GROUND'),
          Pk(s.x, s.y - s.r), { size: 9.5, fill: '#f0c68a', dx: 12, dy: 11 });
      });
      if (L.routes || L.arcs) (d.tracks || []).forEach(t => {
        const lift = scope === '3d' ? Math.hypot(t.x2 - t.x1, t.y2 - t.y1) * g.pxPerKm * 0.5 : 0;
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          pts.push(Pk(t.x1 + (t.x2 - t.x1) * u, t.y1 + (t.y2 - t.y1) * u, Math.sin(u * Math.PI) * lift));
        }
        if (path(pts)) {
          c.strokeStyle = t.ret ? 'rgba(127,135,148,.5)' : 'rgba(143,227,255,.8)';
          c.lineWidth = 1.4; c.setLineDash([5, 3]); c.stroke(); c.setLineDash([]);
        }
      });
      const cas = d.cas || [];
      cas.forEach(cu => {
        if (!(L[cu.state] || (scope === '3d' && L.cas))) return;
        const p = Pk(cu.x, cu.y); if (!p) return;
        const col = CAS[cu.state];
        if (cu.state === 'crit') {
          c.beginPath(); c.arc(p[0], p[1], 11, 0, Math.PI * 2);
          c.strokeStyle = 'rgba(242,96,60,.55)'; c.lineWidth = 1.2; c.stroke();
        }
        if (cu.hv && L.hv) {
          c.beginPath(); c.arc(p[0], p[1], 8.5, 0, Math.PI * 2);
          c.strokeStyle = '#f0c24a'; c.lineWidth = 1.3; c.stroke();
        }
        if (cu.state === 'dead') {
          c.beginPath(); c.moveTo(p[0] - 3.6, p[1] - 3.6); c.lineTo(p[0] + 3.6, p[1] + 3.6);
          c.moveTo(p[0] + 3.6, p[1] - 3.6); c.lineTo(p[0] - 3.6, p[1] + 3.6);
          c.strokeStyle = col; c.lineWidth = 1.6; c.stroke();
        } else {
          if (cu.frac != null && (cu.state === 'fall' || cu.state === 'crit')) {
            c.beginPath(); c.arc(p[0], p[1], 7.4, -Math.PI / 2, -Math.PI / 2 + Math.max(0.05, cu.frac) * Math.PI * 2);
            c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = 'round'; c.stroke(); c.lineCap = 'butt';
          }
          c.beginPath(); c.arc(p[0], p[1], cu.state === 'crit' ? 4.8 : cu.state === 'fall' ? 4.2 : 3.6, 0, Math.PI * 2);
          c.fillStyle = col; c.fill();
          c.strokeStyle = 'rgba(13,16,22,.9)'; c.lineWidth = 1.2; c.stroke();
        }
        if (cu.state === 'crit' && cu.min != null && scope === '2d') text(cu.min + ' MIN', p, { size: 8.5, fill: '#ffd9cf', dx: 12, dy: 10, weight: 600, drop: true });
      });
      if (L.air || L.trails) (d.air || []).forEach(a => {
        const p = Pk(a.x, a.y, scope === '3d' ? 26 * g.pxPerKm * 0.12 : 0); if (!p) return;
        c.save(); c.translate(p[0], p[1]); c.rotate(((a.hdg || 0) - this.cam.bearing) * Math.PI / 180);
        c.beginPath(); c.moveTo(0, -7); c.lineTo(4.8, 5.6); c.lineTo(0, 3); c.lineTo(-4.8, 5.6); c.closePath();
        c.fillStyle = '#8fe3ff'; c.fill(); c.strokeStyle = '#0d1016'; c.lineWidth = 1; c.stroke();
        c.restore();
        text(a.call, p, { size: 9.5, fill: '#d9f4ff', dx: 11, dy: 11, weight: 600 });
      });
      if (L.lp) (W.bases || []).forEach(b => {
        const p = Pk(b.x, b.y); if (!p) return;
        c.beginPath(); c.rect(p[0] - 5.5, p[1] - 5.5, 11, 11);
        c.fillStyle = '#f2f5f8'; c.fill(); c.strokeStyle = '#0d1016'; c.lineWidth = 1.5; c.stroke();
      });
    }
  }

  class TheaterMap extends HTMLElement {
    constructor() { super(); this._d = null; this._s = []; this._cmd = e => this.command(e.detail || {}); }
    static get observedAttributes() { return ['data']; }
    attributeChangedCallback(n, o, v) { if (n === 'data') this.data = v; }
    set data(v) { try { this._d = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return; } this.schedule(); }
    get data() { return this._d; }
    connectedCallback() {
      if (!document.getElementById('tm-style')) {
        const s = document.createElement('style'); s.id = 'tm-style'; s.textContent = CSS; document.head.appendChild(s);
      }
      this.innerHTML = '<div class="tmroot"><div class="panes"></div></div>';
      this.root = this.querySelector('.tmroot');
      window.addEventListener('angel-map-cmd', this._cmd);
      if (!this._d && this.getAttribute('data')) this.data = this.getAttribute('data');
      this.schedule();
      if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this._s.forEach(s => s.draw())); this._ro.observe(this); }
    }
    disconnectedCallback() { window.removeEventListener('angel-map-cmd', this._cmd); if (this._ro) this._ro.disconnect(); }
    schedule() { if (this._q) return; this._q = true; Promise.resolve().then(() => { this._q = false; this.render(); }); }
    emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

    command({ cmd }) {
      this._s.forEach(s => {
        if (cmd === 'in') s.cam.zoom = Math.min(15.5, s.cam.zoom + 0.7);
        else if (cmd === 'out') s.cam.zoom = Math.max(1.6, s.cam.zoom - 0.7);
        else if (cmd === 'fit') return this.frame(s, true);
        s.draw();
      });
    }
    frame(s, redraw) {
      const d = this._d, scope = d.scope || '2d', W = d.world;
      if (scope === 'theatre') {
        const pts = (d.joas || []).map(j => [j.lon, j.lat]);
        pts.push([139.67, 35.29]);                                  // PACFLT forward node
        if (!pts.length) pts.push([ANCHOR.lon, ANCHOR.lat]);
        const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
        const lon0 = Math.min(...lons), lon1 = Math.max(...lons);
        const my0 = mercY(Math.max(...lats)), my1 = mercY(Math.min(...lats));
        const w = s.pane.clientWidth || 800, h = s.pane.clientHeight || 560;
        const padX = 96 / w, padY = 104 / h;                        // room for the marker callouts
        const spanX = Math.max(1e-4, (lon1 - lon0) / 360) / Math.max(0.25, 1 - padX * 2);
        const spanY = Math.max(1e-4, my1 - my0) / Math.max(0.25, 1 - padY * 2);
        const zoom = Math.min(Math.log2(w / (spanX * TS)), Math.log2(h / (spanY * TS)));
        s.cam = {
          lon: (lon0 + lon1) / 2, lat: invY((my0 + my1) / 2),
          zoom: Math.max(1.6, Math.min(6, zoom)), pitch: 0, bearing: 0
        };
      }
      else {
        const mid = LL(W.widthKm / 2, W.heightKm / 2);
        const three = scope === '3d';
        const h = s.pane.clientHeight || 560;
        const zoomFor = km => Math.log2(h * 0.82 * (40075 * Math.cos(mid[1] * Math.PI / 180)) / (km * TS));
        s.cam = { lon: mid[0], lat: mid[1], zoom: zoomFor(W.heightKm * (three ? 1.5 : 1.06)), pitch: three ? 54 : 0, bearing: three ? -18 : 0 };
      }
      if (redraw !== false) s.draw();
    }
    readout(s, e) {
      const el = s.pane.querySelector('.ll'); if (!el) return;
      const ll = s.geom().unproject(s.mx(e.clientX), s.my(e.clientY));
      if (ll) el.textContent = ll[1].toFixed(3) + '°N  ' + ll[0].toFixed(3) + '°E';
    }
    render() {
      const d = this._d; if (!d || !this.root) return;
      const scope = d.scope || '2d';
      const want = scope === '2d' && d.side ? 2 : 1;
      const holder = this.root.querySelector('.panes');
      if (this._s.length !== want) {
        holder.innerHTML = '';
        this._s = [];
        for (let i = 0; i < want; i++) {
          const pane = document.createElement('div');
          pane.className = 'pane';
          holder.appendChild(pane);
          const s = new Surface(pane, this);
          s.arm = want === 2 ? (i ? 'B' : 'A') : 'A';
          if (!s.gl) { pane.innerHTML = '<div class="msg">THIS BROWSER GIVES NO GPU CONTEXT — NO PICTURE DRAWN</div>'; }
          this._s.push(s);
          this.frame(s, false);
          pane.addEventListener('click', ev => this.hit(s, ev));
        }
        this._scope = scope;
      } else if (this._scope !== scope) {
        this._scope = scope;
        this._s.forEach(s => this.frame(s, false));
      }
      this._s.forEach(s => { this.chrome(s); s.draw(); });
    }
    hit(s, ev) {
      const d = this._d; if (!d || d.scope !== 'theatre') return;
      const x = s.mx(ev.clientX), y = s.my(ev.clientY);
      let best = null, dist = 26;
      (d.joas || []).forEach(j => {
        if (!j._hit) return;
        const dd = Math.hypot(j._hit[0] - x, j._hit[1] - y);
        if (dd < dist) { dist = dd; best = j.name; }
      });
      if (best) this.emit('angel-map-select', { joa: best });
    }
    chrome(s) {
      const d = this._d, scope = d.scope || '2d', pane = s.pane;
      pane.querySelectorAll('.card').forEach(c => c.remove());
      const add = (cls, html) => { const el = document.createElement('div'); el.className = 'card ' + cls; el.innerHTML = html; pane.appendChild(el); return el; };
      if (scope === 'theatre') {
        add('badge', '<b>PACOM</b><i>Indo-Pacific</i>');
        add('hint', '<b>Click an operation to open it.</b>Drag to pan · scroll to zoom · right-drag to rotate.');
        add('att', '© OpenStreetMap · CARTO');
      } else if (scope === '2d') {
        add('tag', d.side ? (s.arm === 'A' ? 'ANGEL SWARM TASKING' : 'DOCTRINAL PUSH — SAME CASUALTIES, SAME MINUTE')
          : 'JOA ' + d.world.joa + ' · ' + d.world.widthKm + ' × ' + d.world.heightKm + ' KM');
        add('ll', 'DRAG TO PAN · SCROLL TO ZOOM');
        if (!d.side) add('hint', '<b>10 km grid on live imagery.</b>Right-drag rotates, ctrl-drag pitches, double-click fits.');
      } else {
        add('tag', d.gpuHead);
        add('counters', '<div><span>DIED OF WOUNDS</span><b style="color:#ff9d8b">' + d.fig.dead + '</b></div>' +
          '<div><span>STILL DOWN</span><b style="color:#eef1f5">' + d.fig.down + '</b></div>' +
          '<div><span>TREATED</span><b style="color:#7fe6b6">' + d.fig.treated + '</b></div>');
        if (d.panelOpen) add('legend', '<h5>WHAT IS ON THE MAP</h5>' +
          '<p><em style="background:#8fe3ff"></em>Route arcs, launch point to casualty</p>' +
          '<p><em style="background:#f0a44a"></em>Column height is time remaining</p>' +
          '<p><em style="background:#f2603c"></em>Threat envelopes as domes</p>' +
          '<h5 style="margin-top:3px">TRIAGE STATE</h5>' +
          [['RESERVE CRITICAL', CAS.crit], ['RESERVE FALLING', CAS.fall], ['RESERVE HOLDING', CAS.hold], ['TREATED', CAS.treated], ['DEAD', CAS.dead]]
            .map(([k, col]) => '<p><em style="background:' + col + '"></em>' + k + '</p>').join(''));
        const rates = [1, 2, 4, 10, 30].map(r => '<button data-rate="' + r + '" aria-pressed="' + (d.rate === r) + '">' + r + '×</button>').join('');
        const tr = add('transport', '<button data-play>' + (d.playing ? '⏸ PAUSE' : '▶ PLAY') + '</button>' +
          '<span class="track"><i style="width:' + Math.round((d.progress || 0) * 100) + '%"></i></span>' +
          '<span class="rate">' + rates + '</span>' +
          '<button data-follow aria-pressed="' + !!d.follow + '">FOLLOW CLOCK</button>');
        tr.querySelector('[data-play]').onclick = () => this.emit('angel-map-transport', { cmd: 'play' });
        tr.querySelector('[data-follow]').onclick = () => this.emit('angel-map-transport', { cmd: 'follow' });
        tr.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => this.emit('angel-map-transport', { cmd: 'rate', rate: +b.dataset.rate }));
        add('att', '© OpenStreetMap · CARTO · WEBGL2');
      }
      if (d.commsDown) add('banner', 'COMMS DEGRADED — HOLDING LAST-KNOWN-GOOD PLAN, AIRCRAFT STILL FLYING');
      if (d.emptyNote && scope !== 'theatre') add('hint', '<b>' + d.emptyNote + '</b>' + (d.emptySub || ''));
    }
  }
  if (!customElements.get('theater-map')) customElements.define('theater-map', TheaterMap);
})();
