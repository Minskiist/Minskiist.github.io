/* language, reveal, lazy video, crosshair, ticker */
(() => {
const root = document.documentElement, fi = document.getElementById('fi'), en = document.getElementById('en');
const set = l => { root.lang = l; fi.classList.toggle('on', l === 'fi'); en.classList.toggle('on', l === 'en'); try { localStorage.setItem('mp-lang', l); } catch (e) {} };
let saved = null; try { saved = localStorage.getItem('mp-lang'); } catch (e) {}
set(saved === 'en' ? 'en' : 'fi');
fi.onclick = () => set('fi'); en.onclick = () => set('en');

const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 40), { passive: true });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll('.rv').forEach(e => io.observe(e));

const vio = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else { v.pause(); }
}), { rootMargin: '320px 0px' });
document.querySelectorAll('video[data-src]').forEach(v => vio.observe(v));

const cx = document.getElementById('cx'), cy = document.getElementById('cy'), cl = document.getElementById('cl');
if (cx) addEventListener('pointermove', e => {
  document.body.classList.add('pointing');
  cx.style.left = e.clientX + 'px'; cy.style.top = e.clientY + 'px';
  cl.style.left = e.clientX + 'px'; cl.style.top = e.clientY + 'px';
  cl.textContent = String(e.clientX).padStart(4, '0') + ' / ' + String(e.clientY).padStart(4, '0');
}, { passive: true });

const t = document.querySelector('.ticker div');
if (t) t.innerHTML += t.innerHTML;
})();
