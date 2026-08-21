/* language, reveal, lazy video, crosshair, ticker, HUD */
(() => {
const coarse = matchMedia('(hover:none)').matches;
const root = document.documentElement, fi = document.getElementById('fi'), en = document.getElementById('en');
const set = l => { root.lang = l; fi.classList.toggle('on', l === 'fi'); en.classList.toggle('on', l === 'en'); try { localStorage.setItem('mp-lang', l); } catch (e) {} };
let saved = null; try { saved = localStorage.getItem('mp-lang'); } catch (e) {}
set(saved === 'en' ? 'en' : 'fi');
fi.onclick = () => set('fi'); en.onclick = () => set('en');

/* the hero tells desktop users to move the cursor — on touch that instruction is wrong */
if (coarse) {
  const a = document.querySelector('[data-input-fi]'), b = document.querySelector('[data-input-en]');
  if (a) a.textContent = 'Vedä sormella · kytke kamera';
  if (b) b.textContent = 'Drag a finger · enable camera';
}

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 40), { passive: true });

/* reveal + the class-based twin of every :hover state, so touch users see them too */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.rv').forEach(e => io.observe(e));

if (coarse) {
  const act = new IntersectionObserver(es => es.forEach(e => {
    e.target.classList.toggle('act', e.intersectionRatio > .3);
  }), { threshold: [0, .3, .6] });
  document.querySelectorAll('.proj,.cap,.step,.tl-item').forEach(e => act.observe(e));
}

/* video: iOS only decodes a couple of streams at once, so on touch we play the single
   most visible one and pause the rest */
const vids = [...document.querySelectorAll('video[data-src]')];
const ratio = new Map();
const load = v => { if (!v.src && v.dataset.src) v.src = v.dataset.src; };
if (coarse) {
  let current = null;
  const pick = () => {
    let best = null, bv = .45;
    vids.forEach(v => { const r = ratio.get(v) || 0; if (r > bv) { bv = r; best = v; } });
    if (best === current) return;
    if (current) current.pause();
    current = best;
    if (current) { load(current); current.play().catch(() => {}); }
  };
  const vio = new IntersectionObserver(es => {
    es.forEach(e => ratio.set(e.target, e.intersectionRatio));
    pick();
  }, { threshold: [0, .25, .5, .75, 1] });
  vids.forEach(v => vio.observe(v));
  addEventListener('visibilitychange', () => { if (document.hidden && current) current.pause(); else pick(); });
} else {
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { load(v); v.play().catch(() => {}); } else { v.pause(); }
  }), { rootMargin: '320px 0px' });
  vids.forEach(v => vio.observe(v));
}

/* crosshair is pointer-only */
const cx = document.getElementById('cx'), cy = document.getElementById('cy'), cl = document.getElementById('cl');
if (cx && !coarse) addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  document.body.classList.add('pointing');
  cx.style.left = e.clientX + 'px'; cy.style.top = e.clientY + 'px';
  cl.style.left = e.clientX + 'px'; cl.style.top = e.clientY + 'px';
  cl.textContent = String(e.clientX).padStart(4, '0') + ' / ' + String(e.clientY).padStart(4, '0');
}, { passive: true });

/* HUD collapses to a chip on small screens */
const panel = document.querySelector('.hud'), tog = document.getElementById('hud-t');
if (panel && tog) {
  const open = o => { panel.classList.toggle('open', o); tog.textContent = o ? '×' : '+'; tog.setAttribute('aria-expanded', String(o)); };
  if (!coarse && innerWidth > 900) open(true);
  tog.onclick = () => open(!panel.classList.contains('open'));
}

/* mobile menu */
const menu = document.getElementById('menu'), mt = document.getElementById('menu-t');
if (menu && mt) {
  const openMenu = o => {
    menu.hidden = !o;
    mt.setAttribute('aria-expanded', String(o));
    document.body.classList.toggle('locked', o);
  };
  mt.onclick = () => openMenu(menu.hidden);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => openMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) openMenu(false); });
  /* a rotation into desktop width leaves the panel stranded over the page */
  addEventListener('resize', () => { if (innerWidth > 900 && matchMedia('(hover:hover)').matches) openMenu(false); }, { passive: true });
}

const t = document.querySelector('.ticker div');
if (t) t.innerHTML += t.innerHTML;
})();
