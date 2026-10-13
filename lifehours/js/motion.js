/* motion.js — animation helpers. Every one of these does nothing when the person
 * has asked their device for reduced motion.
 */
(function (root) {
  const doc = root.document;
  const reduced = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ink ripple from the exact point you pressed, on every tappable thing
  const TAPPABLE = '.btn, .choice, .chip, .rate-btn, .stepper-ctrl button';
  doc.addEventListener('pointerdown', e => {
    const el = e.target.closest(TAPPABLE);
    if (!el || el.disabled || reduced()) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const ink = doc.createElement('span');
    ink.className = 'ripple';
    ink.style.width = ink.style.height = size + 'px';
    ink.style.left = (e.clientX - r.left - size / 2) + 'px';
    ink.style.top = (e.clientY - r.top - size / 2) + 'px';
    el.appendChild(ink);
    ink.addEventListener('animationend', () => ink.remove());
  });

  // Restart a CSS animation class on an element
  function play(el, cls) {
    if (!el || reduced()) return;
    el.classList.remove(cls);
    void el.offsetWidth;          // force a reflow so the animation runs again
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  // A number that rolls up or down when it changes (steppers, totals)
  function bump(el, direction) {
    play(el, direction < 0 ? 'bump-down' : 'bump-up');
  }

  // Count a number from one value to another
  function countTo(el, from, to, format, ms = 700) {
    if (!el) return;
    if (reduced() || from === to) { el.textContent = format(to); return; }
    const start = performance.now();
    (function tick(t) {
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = format(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(tick);
    })(start);
  }

  // Whole-screen colour wash: 'regret' flashes red, 'worth' glows green
  function flash(kind) {
    if (reduced()) return;
    const f = doc.createElement('div');
    f.className = 'flash flash-' + kind;
    doc.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
  }

  // Shake an element, for regret
  function shake(el) { play(el, 'shake'); }

  // Little dots bursting out of a point, in the app's dot style
  function burst(x, y, kind, count = 14) {
    if (reduced()) return;
    for (let i = 0; i < count; i++) {
      const d = doc.createElement('span');
      d.className = 'burst-dot burst-' + kind;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 60 + Math.random() * 70;
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      d.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      d.style.animationDelay = Math.random() * 60 + 'ms';
      doc.body.appendChild(d);
      d.addEventListener('animationend', () => d.remove());
    }
  }

  // A short buzz on phones that support it (Android; iPhones ignore this)
  function buzz(pattern) {
    if (navigator.vibrate && !reduced()) navigator.vibrate(pattern);
  }

  root.LH = root.LH || {};
  root.LH.motion = { play, bump, countTo, flash, shake, burst, buzz, reduced };
})(typeof window !== 'undefined' ? window : globalThis);
