/* Live particle field.
   Signal source: pointer (desktop), finger drag + slow drift (touch), webcam motion when enabled. */
(() => {
const cv = document.getElementById('field');
if (!cv) return;
const gl = cv.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
const coarse = matchMedia('(hover:none)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hud = {
  src: document.getElementById('h-src'), x: document.getElementById('h-x'), y: document.getElementById('h-y'),
  e: document.getElementById('h-e'), fps: document.getElementById('h-fps'), scroll: document.getElementById('h-scroll'),
  bar: document.getElementById('h-bar'), btn: document.getElementById('h-cam'), mon: document.getElementById('mon')
};
const state = { px: .5, py: .45, tx: .5, ty: .45, energy: 0, tEnergy: 0, cam: false, scroll: 0, touch: false, vis: true, src: 'pointer' };

/* ---------- input ---------- */
function aim(clientX, clientY, gain) {
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  state.tx = (clientX - r.left) / r.width;
  state.ty = (clientY - r.top) / r.height;
  state.tEnergy = Math.min(1, state.tEnergy + gain);
}
addEventListener('pointermove', e => {
  if (state.cam || e.pointerType === 'touch') return;
  state.src = 'pointer';
  aim(e.clientX, e.clientY, .06);
}, { passive: true });

/* touch: a drag anywhere on the page steers the field */
function onTouch(e) {
  if (state.cam) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  state.touch = true;
  state.src = 'touch';
  aim(t.clientX, t.clientY, .14);
}
addEventListener('touchstart', onTouch, { passive: true });
addEventListener('touchmove', onTouch, { passive: true });
addEventListener('touchend', () => { state.touch = false; }, { passive: true });
addEventListener('touchcancel', () => { state.touch = false; }, { passive: true });

addEventListener('scroll', () => {
  state.scroll = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
}, { passive: true });

/* ---------- webcam motion ---------- */
let vid, mctx, prev = null, mw = coarse ? 48 : 64, mh = coarse ? 36 : 48, monctx;
if (hud.mon) { hud.mon.width = mw; hud.mon.height = mh; monctx = hud.mon.getContext('2d'); }
async function enableCam() {
  try {
    hud.btn.textContent = 'requesting…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: coarse ? 240 : 320 }, height: { ideal: coarse ? 180 : 240 } },
      audio: false
    });
    vid = document.createElement('video');
    vid.srcObject = stream; vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
    await vid.play();
    const c = document.createElement('canvas'); c.width = mw; c.height = mh; mctx = c.getContext('2d', { willReadFrequently: true });
    state.cam = true; state.src = 'camera';
    hud.btn.textContent = 'camera live · disable';
    hud.btn.onclick = () => {
      stream.getTracks().forEach(t => t.stop());
      state.cam = false; prev = null; state.src = coarse ? 'touch' : 'pointer';
      hud.btn.textContent = 'enable camera'; hud.btn.onclick = enableCam;
      if (monctx) monctx.clearRect(0, 0, mw, mh);
    };
  } catch (err) {
    hud.btn.textContent = 'camera denied';
    setTimeout(() => { hud.btn.textContent = 'enable camera'; }, 2600);
  }
}
if (hud.btn) hud.btn.onclick = enableCam;

function readMotion() {
  if (!state.cam || !vid || vid.readyState < 2) return;
  mctx.drawImage(vid, 0, 0, mw, mh);
  const cur = mctx.getImageData(0, 0, mw, mh);
  if (prev) {
    let sum = 0, wx = 0, wy = 0, wsum = 0;
    const out = monctx ? monctx.createImageData(mw, mh) : null;
    for (let i = 0, p = 0; i < cur.data.length; i += 4, p++) {
      const d = Math.abs(cur.data[i] - prev[i]) + Math.abs(cur.data[i + 1] - prev[i + 1]) + Math.abs(cur.data[i + 2] - prev[i + 2]);
      const m = d > 46 ? 1 : 0;
      sum += m;
      if (m) { const x = p % mw, y = (p / mw) | 0; wx += x; wy += y; wsum++; }
      if (out) { out.data[i] = m ? 232 : 12; out.data[i + 1] = m ? 255 : 12; out.data[i + 2] = m ? 58 : 16; out.data[i + 3] = 255; }
    }
    if (out) monctx.putImageData(out, 0, 0);
    state.tEnergy = Math.min(1, (sum / (mw * mh)) * 5.5);
    if (wsum > 24) { state.tx = 1 - (wx / wsum) / mw; state.ty = (wy / wsum) / mh; }
  }
  prev = cur.data.slice(0);
}

/* ---------- GL ---------- */
if (!gl) { cv.style.display = 'none'; return; }
const vs = `attribute vec2 a_uv;uniform float u_t;uniform vec2 u_p;uniform float u_e;uniform float u_sc;uniform float u_asp;uniform float u_ps;varying float v_i;
float h(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=a_uv;
  float rnd=h(uv);
  vec2 pos=uv*2.0-1.0;
  float wave=sin(uv.x*9.0+u_t*.55)*cos(uv.y*7.0-u_t*.42);
  pos.y+=wave*0.055*(0.35+u_e);
  pos.x+=sin(uv.y*12.0+u_t*.7+rnd*6.28)*0.03*(0.25+u_e);
  vec2 pc=u_p*2.0-1.0; pc.y*=-1.0;
  vec2 d=pos-pc; d.x*=u_asp;
  float r=length(d);
  float force=exp(-r*2.6)*(0.34+u_e*1.25);
  pos+=normalize(d+0.0001)*force*0.42;
  pos.y+=u_sc*0.16*(rnd-0.5);
  v_i=force*1.5+u_e*0.35+rnd*0.22;
  gl_Position=vec4(pos.x,pos.y,0.0,1.0);
  gl_PointSize=(1.0+v_i*3.4)*u_ps;
}`;
const fs = `precision mediump float;varying float v_i;
void main(){
  vec3 acc=vec3(0.910,1.0,0.227);
  vec3 c=mix(vec3(0.42,0.42,0.48),acc,clamp(v_i*1.25,0.0,1.0));
  float a=clamp(0.10+v_i*0.62,0.0,0.72);
  gl_FragColor=vec4(c*a,a);
}`;
function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog); gl.useProgram(prog);

/* grid density scales with the device: ~8.5k points on phones, ~22k on desktop */
const narrow = Math.min(innerWidth, innerHeight) < 520;
const COLS = coarse ? (narrow ? 104 : 128) : 190;
const ROWS = coarse ? (narrow ? 66 : 80) : 118;
const pts = new Float32Array(COLS * ROWS * 2);
let k = 0;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { pts[k++] = x / (COLS - 1); pts[k++] = y / (ROWS - 1); }
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'a_uv');
gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
const U = n => gl.getUniformLocation(prog, n);
const u_t = U('u_t'), u_p = U('u_p'), u_e = U('u_e'), u_sc = U('u_sc'), u_asp = U('u_asp'), u_ps = U('u_ps');
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

/* fewer points means slightly bigger points, so the field keeps its density */
let ps = 1;

/* resize: ignore the small height jumps a mobile URL bar causes — they reallocate the
   drawing buffer mid-scroll and cause a visible stall */
let lw = 0, lh = 0;
function resize(force) {
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (!force && w === lw && Math.abs(h - lh) < 130) return;
  lw = w; lh = h;
  const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  gl.viewport(0, 0, cv.width, cv.height);
  ps = dpr * (coarse ? 1.5 : 1);
}
addEventListener('resize', () => resize(false), { passive: true });
addEventListener('orientationchange', () => setTimeout(() => resize(true), 320));
resize(true);

/* don't burn GPU while the hero is off screen or the tab is hidden */
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => { state.vis = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(cv);
}
addEventListener('visibilitychange', () => { if (document.hidden) state.vis = false; });

let last = performance.now(), fps = 60, acc = 0, frames = 0, tick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(64, now - last); last = now;
  frames++; acc += dt;
  if (acc > 420) { fps = Math.round(1000 / (acc / frames)); acc = 0; frames = 0; }
  tick++;
  if (!state.vis && !document.hidden) { /* hero off screen: keep state, skip the draw */ }
  if (!state.vis) return;

  /* camera diffing is the expensive part — halve its rate on phones */
  if (!coarse || tick % 2 === 0) readMotion();

  /* touch devices have no resting cursor, so the field drifts on its own between drags */
  if (coarse && !state.cam && !state.touch && !reduce) {
    const t = now / 1000;
    state.tx = .5 + Math.sin(t * .21) * .26;
    state.ty = .46 + Math.cos(t * .17) * .18;
    state.tEnergy = Math.max(state.tEnergy * .99, .3 + Math.sin(t * .43) * .07);
  } else if (!state.cam) {
    state.tEnergy *= .965;
  }

  const ease = state.touch ? .12 : .07;
  state.px += (state.tx - state.px) * ease;
  state.py += (state.ty - state.py) * ease;
  state.energy += (state.tEnergy - state.energy) * .08;

  gl.uniform1f(u_t, now / 1000);
  gl.uniform2f(u_p, state.px, state.py);
  gl.uniform1f(u_e, state.energy);
  gl.uniform1f(u_sc, state.scroll);
  gl.uniform1f(u_asp, cv.clientWidth / Math.max(1, cv.clientHeight));
  gl.uniform1f(u_ps, ps);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, COLS * ROWS);

  /* HUD text is DOM work — only when the panel can actually be seen */
  if (hud.src && (!coarse || document.querySelector('.hud.open')) && tick % 3 === 0) {
    hud.src.textContent = state.cam ? 'camera' : state.src;
    hud.x.textContent = state.px.toFixed(3);
    hud.y.textContent = state.py.toFixed(3);
    hud.e.textContent = state.energy.toFixed(3);
    hud.fps.textContent = fps;
    hud.scroll.textContent = state.scroll.toFixed(3);
    hud.bar.style.width = (state.energy * 100).toFixed(1) + '%';
  }
}
requestAnimationFrame(frame);
})();
