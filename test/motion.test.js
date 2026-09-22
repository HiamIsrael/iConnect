import { beforeEach, describe, expect, it } from 'vitest';
import {
  MOTION_CLASS,
  REDUCED_MOTION_QUERY,
  VISIBLE_CLASS,
  parallaxShift,
  prefersReducedMotion,
  setMotionEnabled,
  startMotionLayer,
} from '../src/motion.js';

// --- test doubles ----------------------------------------------------------

function fakeClassList() {
  const set = new Set();
  return {
    add: (cls) => set.add(cls),
    remove: (cls) => set.delete(cls),
    contains: (cls) => set.has(cls),
  };
}

function fakeElement({ parallax = null, children = {} } = {}) {
  const styles = new Map();
  const attrs = {};
  if (parallax != null) attrs['data-parallax'] = String(parallax);
  return {
    classList: fakeClassList(),
    attrs,
    styles,
    style: {
      setProperty: (name, value) => styles.set(name, value),
    },
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    matches: (selector) =>
      (selector === '[data-parallax]' && 'data-parallax' in attrs) ||
      (selector === '[data-reveal]' && 'data-reveal' in attrs),
    querySelectorAll: (selector) => children[selector] || [],
  };
}

function fakeDoc({ reveals = [], parallax = [] } = {}) {
  return {
    documentElement: { classList: fakeClassList() },
    body: {},
    querySelectorAll: (selector) => {
      if (selector === '[data-reveal]') return reveals;
      if (selector === '[data-parallax]') return parallax;
      return [];
    },
  };
}

class FakeIntersectionObserver {
  static instances = [];
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.disconnected = false;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el) {
    this.observed.push(el);
  }
  unobserve(el) {
    this.observed = this.observed.filter((node) => node !== el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }
  trigger(entries) {
    this.callback(entries, this);
  }
}

class FakeMutationObserver {
  static instances = [];
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    FakeMutationObserver.instances.push(this);
  }
  observe() {}
  disconnect() {
    this.disconnected = true;
  }
  emit(mutations) {
    this.callback(mutations, this);
  }
}

function fakeWin({ reduce = false, withObservers = true } = {}) {
  const listeners = { scroll: [], resize: [] };
  const frames = new Map();
  let nextFrame = 1;
  const win = {
    scrollY: 0,
    matchMedia: (query) => ({
      matches: query === REDUCED_MOTION_QUERY ? reduce : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    requestAnimationFrame: (fn) => {
      const id = nextFrame;
      nextFrame += 1;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    pendingFrames: () => frames.size,
    flushFrames: () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
    addEventListener: (type, fn) => listeners[type] && listeners[type].push(fn),
    removeEventListener: (type, fn) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((f) => f !== fn);
    },
    listeners,
  };
  if (withObservers) {
    win.IntersectionObserver = FakeIntersectionObserver;
    win.MutationObserver = FakeMutationObserver;
  }
  return win;
}

beforeEach(() => {
  FakeIntersectionObserver.instances.length = 0;
  FakeMutationObserver.instances.length = 0;
});

// --- prefersReducedMotion / setMotionEnabled --------------------------------

describe('prefersReducedMotion', () => {
  it('is true when the user asks for reduced motion', () => {
    expect(prefersReducedMotion(fakeWin({ reduce: true }))).toBe(true);
  });

  it('is false when motion is allowed', () => {
    expect(prefersReducedMotion(fakeWin({ reduce: false }))).toBe(false);
  });

  it('fails closed without a usable window', () => {
    expect(prefersReducedMotion(undefined)).toBe(true);
    expect(prefersReducedMotion({})).toBe(true);
  });
});

describe('setMotionEnabled', () => {
  it('adds the html.motion gate only when motion is allowed', () => {
    const on = fakeDoc();
    expect(setMotionEnabled(on, fakeWin({ reduce: false }))).toBe(true);
    expect(on.documentElement.classList.contains(MOTION_CLASS)).toBe(true);

    const off = fakeDoc();
    expect(setMotionEnabled(off, fakeWin({ reduce: true }))).toBe(false);
    expect(off.documentElement.classList.contains(MOTION_CLASS)).toBe(false);
  });
});

// --- parallaxShift ----------------------------------------------------------

describe('parallaxShift', () => {
  it('trails the scroll by the layer speed', () => {
    expect(parallaxShift(300, 0.2)).toBe(-60);
    expect(parallaxShift('300', '0.2')).toBe(-60);
    expect(parallaxShift(0, 0.2)).toBe(0);
  });

  it('returns 0 for anything that is not a finite number', () => {
    expect(parallaxShift('a lot', 0.2)).toBe(0);
    expect(parallaxShift(300, 'fast')).toBe(0);
    expect(parallaxShift(undefined, undefined)).toBe(0);
  });
});

// --- startMotionLayer -------------------------------------------------------

describe('startMotionLayer', () => {
  it('does nothing when the user prefers reduced motion', () => {
    const el = fakeElement();
    el.attrs['data-reveal'] = '';
    const doc = fakeDoc({ reveals: [el] });
    const win = fakeWin({ reduce: true });

    const cleanup = startMotionLayer(doc, win);
    cleanup();

    expect(doc.documentElement.classList.contains(MOTION_CLASS)).toBe(false);
    expect(el.classList.contains(VISIBLE_CLASS)).toBe(false);
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(win.listeners.scroll).toHaveLength(0);
  });

  it('reveals everything immediately when IntersectionObserver is missing', () => {
    const a = fakeElement();
    a.attrs['data-reveal'] = '';
    const b = fakeElement();
    b.attrs['data-reveal'] = '';
    const doc = fakeDoc({ reveals: [a, b] });
    const win = fakeWin({ withObservers: false });

    startMotionLayer(doc, win);

    expect(doc.documentElement.classList.contains(MOTION_CLASS)).toBe(true);
    expect(a.classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(b.classList.contains(VISIBLE_CLASS)).toBe(true);
  });

  it('reveals [data-reveal] elements as they intersect — exactly once', () => {
    const el = fakeElement();
    el.attrs['data-reveal'] = '';
    const doc = fakeDoc({ reveals: [el] });
    const win = fakeWin();

    const cleanup = startMotionLayer(doc, win);
    const io = FakeIntersectionObserver.instances[0];
    expect(io.observed).toContain(el);
    expect(el.classList.contains(VISIBLE_CLASS)).toBe(false);

    io.trigger([{ isIntersecting: false, target: el }]);
    expect(el.classList.contains(VISIBLE_CLASS)).toBe(false);

    io.trigger([{ isIntersecting: true, target: el }]);
    expect(el.classList.contains(VISIBLE_CLASS)).toBe(true);
    expect(io.observed).not.toContain(el); // one-shot: unobserved after reveal

    cleanup();
    expect(io.disconnected).toBe(true);
  });

  it('drives [data-parallax] layers from the scroll position (rAF-throttled)', () => {
    const orb = fakeElement({ parallax: 0.35 });
    const doc = fakeDoc({ parallax: [orb] });
    const win = fakeWin();

    const cleanup = startMotionLayer(doc, win);
    expect(orb.styles.get('--parallax-y')).toBe('0.0px');

    win.scrollY = 500;
    win.listeners.scroll[0]();
    win.listeners.scroll[0](); // second call must coalesce into one frame
    expect(win.pendingFrames()).toBe(1);

    win.flushFrames();
    expect(orb.styles.get('--parallax-y')).toBe('-175.0px');

    cleanup();
    expect(win.listeners.scroll).toHaveLength(0);
    expect(win.listeners.resize).toHaveLength(0);
  });

  it('picks up elements that mount later via the mutation observer', () => {
    const doc = fakeDoc();
    const win = fakeWin();
    const cleanup = startMotionLayer(doc, win);
    const io = FakeIntersectionObserver.instances[0];
    const mo = FakeMutationObserver.instances[0];

    const lateReveal = fakeElement();
    lateReveal.attrs['data-reveal'] = '';
    const lateOrb = fakeElement({ parallax: 0.5 });
    const wrapper = fakeElement({
      children: {
        '[data-reveal]': [lateReveal],
        '[data-parallax]': [lateOrb],
      },
    });

    mo.emit([{ addedNodes: [wrapper] }]);

    expect(io.observed).toContain(lateReveal);

    win.scrollY = 200;
    win.listeners.scroll[0]();
    win.flushFrames();
    expect(lateOrb.styles.get('--parallax-y')).toBe('-100.0px');

    cleanup();
    expect(mo.disconnected).toBe(true);
  });
});
