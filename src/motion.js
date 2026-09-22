// Motion layer — scroll reveal + hero parallax, strictly reduced-motion aware.
//
// Two safety rules hold everywhere in this module:
//   1. Motion is *additive*. Content is fully visible with no JS at all; the
//      layer only plays animations that end in the visible state, so nothing
//      can get stuck hidden behind a missing class or observer.
//   2. `prefers-reduced-motion: reduce` disables everything (fail closed),
//      both here and behind the `html.motion` CSS gate set before first paint
//      (see the inline script in index.html).
//
// DOM objects are passed in as arguments so the layer is unit-testable
// without a browser.

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const REVEAL_SELECTOR = '[data-reveal]';
export const PARALLAX_SELECTOR = '[data-parallax]';
export const MOTION_CLASS = 'motion';
export const VISIBLE_CLASS = 'is-visible';

const toArray = (list) => Array.prototype.slice.call(list || []);

/** True when the user asked for reduced motion — or when we can't tell. */
export function prefersReducedMotion(win) {
  if (!win || typeof win.matchMedia !== 'function') return true;
  return win.matchMedia(REDUCED_MOTION_QUERY).matches === true;
}

/**
 * Toggle the `motion` class on <html>: the CSS gate for every entrance
 * animation and parallax transform. Returns whether motion is enabled.
 */
export function setMotionEnabled(doc, win) {
  const enabled = !prefersReducedMotion(win);
  const root = doc && doc.documentElement;
  if (root && root.classList) {
    if (enabled) root.classList.add(MOTION_CLASS);
    else root.classList.remove(MOTION_CLASS);
  }
  return enabled;
}

/**
 * How far a parallax layer should trail the scroll position. `speed` is the
 * layer's scroll ratio (0.35 = the layer moves 35 % as fast as the page).
 * Returns 0 for anything that is not a finite number.
 */
export function parallaxShift(scrollY, speed) {
  const y = Number(scrollY);
  const s = Number(speed);
  if (!Number.isFinite(y) || !Number.isFinite(s)) return 0;
  const shift = y * s;
  return shift ? -shift : 0;
}

/**
 * Start the motion layer on a document:
 *   - scroll reveal: a one-shot entrance animation for `[data-reveal]`
 *     elements as they enter the viewport (IntersectionObserver; a
 *     MutationObserver picks up content that mounts later — async lists,
 *     modals, route changes);
 *   - parallax: `[data-parallax]` layers get a `--parallax-y` custom property
 *     driven by the scroll position in a rAF-throttled listener.
 *
 * Returns a cleanup function that removes everything again.
 */
export function startMotionLayer(doc, win) {
  if (!doc || !win) return () => {};

  const revealEl = (el) => {
    if (el && el.classList) el.classList.add(VISIBLE_CLASS);
  };

  const cleanups = [];

  if (!setMotionEnabled(doc, win)) {
    // Reduced motion: reveal classes are inert behind the CSS gate and no
    // parallax listener is installed — leave the DOM alone.
    return () => {};
  }

  // --- scroll reveal ------------------------------------------------------
  const seen = new WeakSet();
  let io = null;
  if (typeof win.IntersectionObserver === 'function') {
    io = new win.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealEl(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    cleanups.push(() => io.disconnect());
  }

  const scanReveals = (root) => {
    const nodes = [];
    if (root && root.querySelectorAll) nodes.push(...toArray(root.querySelectorAll(REVEAL_SELECTOR)));
    if (root && typeof root.matches === 'function' && root.matches(REVEAL_SELECTOR)) nodes.push(root);
    nodes.forEach((el) => {
      if (!el || seen.has(el)) return;
      seen.add(el);
      if (io) io.observe(el);
      else revealEl(el); // no IntersectionObserver: skip the entrance animation
    });
  };

  // --- parallax -----------------------------------------------------------
  const layers = new Set(toArray(doc.querySelectorAll(PARALLAX_SELECTOR)));
  let frame = 0;

  const paintParallax = () => {
    const y = Number(win.scrollY) || 0;
    layers.forEach((el) => {
      if (!el || !el.style || typeof el.style.setProperty !== 'function') return;
      const speed = el.getAttribute ? el.getAttribute('data-parallax') : null;
      el.style.setProperty('--parallax-y', `${parallaxShift(y, speed).toFixed(1)}px`);
    });
  };

  const onScroll = () => {
    if (frame) return;
    if (typeof win.requestAnimationFrame !== 'function') {
      paintParallax();
      return;
    }
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      paintParallax();
    });
  };

  paintParallax();
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', onScroll, { passive: true });
  cleanups.push(() => {
    if (frame && typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(frame);
    frame = 0;
    win.removeEventListener('scroll', onScroll);
    win.removeEventListener('resize', onScroll);
  });

  scanReveals(doc);

  // Pick up elements that mount after the first scan (async lists, modals…).
  if (typeof win.MutationObserver === 'function') {
    const mo = new win.MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        toArray(mutation.addedNodes).forEach((node) => {
          if (node && node.querySelectorAll) {
            toArray(node.querySelectorAll(PARALLAX_SELECTOR)).forEach((el) => layers.add(el));
          }
          if (node && typeof node.matches === 'function' && node.matches(PARALLAX_SELECTOR)) layers.add(node);
          scanReveals(node);
        });
      });
    });
    mo.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
    cleanups.push(() => mo.disconnect());
  }

  // Honour preference flips without a reload: dropping the `motion` class
  // stops all animation and parallax CSS immediately.
  if (typeof win.matchMedia === 'function') {
    const mq = win.matchMedia(REDUCED_MOTION_QUERY);
    if (mq && typeof mq.addEventListener === 'function') {
      const onPreferenceChange = () => setMotionEnabled(doc, win);
      mq.addEventListener('change', onPreferenceChange);
      cleanups.push(() => mq.removeEventListener('change', onPreferenceChange));
    }
  }

  return () => cleanups.forEach((fn) => fn());
}
