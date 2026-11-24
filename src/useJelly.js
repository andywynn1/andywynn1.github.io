import { useEffect, useRef } from "react";

// Anchored "jelly edge" effect for the large pastel rectangles.
//
// The rectangle never moves. Its outline is a ring of springs. The cursor
// brushing near an edge kicks the nearby springs inward, and the dent
// ripples along the edge and settles. Corners stay pinned.
//
// The gradient lives on an inner layer that is JELLY_PAD px larger than the
// rectangle on every side, clipped back to the rectangle's exact outline.
// That padding is what lets the edge overshoot outward while it wobbles.

export const JELLY_PAD = 18;

// ---- EASY TWEAK ZONE ----
const SPACING = 8;          // px between outline points
const INFLUENCE = 110;      // px radius around the cursor that gets kicked
const IMPULSE = 170;        // px/s kick at full strength (fast cursor, touching the edge)
const FULL_SPEED = 25;      // px of cursor travel per event that counts as "fast"
const STIFFNESS = 140;      // pull back to rest (higher = snappier)
const DAMPING = 6.5;        // lower = wobblier
const COUPLING = 4200;      // how fast the ripple travels along the edge
const CORNER_PIN = 28;      // px from each corner that is held in place
const MAX_IN = 26;          // px max inward dent
// -------------------------

const MAX_OUT = JELLY_PAD - 3;

export function cornerGradient(corner, color, alpha, stop, w, h) {
  const radius = Math.hypot(w, h); // same as the default "farthest-corner" circle
  const x = corner.includes("r") ? w + JELLY_PAD : JELLY_PAD;
  const y = corner.startsWith("b") ? h + JELLY_PAD : JELLY_PAD;
  return `radial-gradient(circle ${radius.toFixed(1)}px at ${x}px ${y}px, rgba(${color}, ${alpha}), transparent ${stop}%)`;
}

const smooth = (u) => (u >= 1 ? 1 : u <= 0 ? 0 : u * u * (3 - 2 * u));

function buildRing(w, h) {
  const x = [], y = [], nx = [], ny = [], mask = [];
  const edges = [
    [0, 0, w, 0, 0, 1],
    [w, 0, w, h, -1, 0],
    [w, h, 0, h, 0, -1],
    [0, h, 0, 0, 1, 0],
  ];
  for (const [x0, y0, x1, y1, ex, ey] of edges) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / SPACING));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const along = t * len;
      x.push(x0 + (x1 - x0) * t);
      y.push(y0 + (y1 - y0) * t);
      nx.push(ex);
      ny.push(ey);
      mask.push(smooth(Math.min(along, len - along) / CORNER_PIN));
    }
  }
  const n = x.length;
  return { n, x, y, nx, ny, mask, d: new Float32Array(n), v: new Float32Array(n), a: new Float32Array(n) };
}

export function useJelly(outerRef, { alpha, buildBackground, enabled, settleMs }) {
  const innerRef = useRef(null);
  const enabledRef = useRef(enabled);
  const resetRef = useRef(() => {});

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) resetRef.current();
  }, [enabled]);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = outer.offsetWidth;
    let h = outer.offsetHeight;
    let ring = buildRing(w, h);
    let settled = false;
    let raf = 0;
    let last = 0;
    let lastPointer = null;

    const rest = () => { inner.style.clipPath = `inset(${JELLY_PAD}px)`; };
    const paint = () => { inner.style.backgroundImage = buildBackground(alpha.get(), w, h); };

    const draw = () => {
      const { n, x, y, nx, ny, mask, d } = ring;
      const parts = new Array(n);
      for (let i = 0; i < n; i++) {
        const k = d[i] * mask[i];
        parts[i] = `${(x[i] + nx[i] * k + JELLY_PAD).toFixed(1)}px ${(y[i] + ny[i] * k + JELLY_PAD).toFixed(1)}px`;
      }
      inner.style.clipPath = `polygon(${parts.join(",")})`;
    };

    const substep = (dt) => {
      const { n, d, v, a } = ring;
      for (let i = 0; i < n; i++) {
        const lap = d[(i + n - 1) % n] + d[(i + 1) % n] - 2 * d[i];
        a[i] = -STIFFNESS * d[i] - DAMPING * v[i] + COUPLING * lap;
      }
      for (let i = 0; i < n; i++) {
        v[i] += a[i] * dt;
        d[i] += v[i] * dt;
        if (d[i] > MAX_IN) { d[i] = MAX_IN; v[i] = 0; }
        else if (d[i] < -MAX_OUT) { d[i] = -MAX_OUT; v[i] = 0; }
      }
    };

    const frame = (now) => {
      let dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let s = 0; s < steps; s++) substep(dt / steps);
      let energy = 0;
      for (let i = 0; i < ring.n; i++) energy += Math.abs(ring.d[i]) + Math.abs(ring.v[i]) * 0.05;
      if (energy < 1.2) {
        ring.d.fill(0); ring.v.fill(0);
        rest();
        raf = 0;
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };

    const reset = () => {
      ring.d.fill(0); ring.v.fill(0);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      rest();
    };
    resetRef.current = reset;

    const kick = (clientX, clientY, strength) => {
      if (reduced || !settled || !enabledRef.current || strength <= 0) return;
      const r = outer.getBoundingClientRect();
      const lx = clientX - r.left;
      const ly = clientY - r.top;
      if (lx < -INFLUENCE || lx > w + INFLUENCE || ly < -INFLUENCE || ly > h + INFLUENCE) return;
      const { n, x, y, v } = ring;
      let hit = false;
      for (let i = 0; i < n; i++) {
        const dist = Math.hypot(x[i] - lx, y[i] - ly);
        if (dist < INFLUENCE) {
          const f = 1 - dist / INFLUENCE;
          v[i] += IMPULSE * f * f * strength;
          hit = true;
        }
      }
      if (hit) wake();
    };

    const onMove = (e) => {
      const prev = lastPointer;
      lastPointer = { x: e.clientX, y: e.clientY };
      if (!prev) return;
      const speed = Math.min(Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / FULL_SPEED, 1);
      if (speed < 0.05) return;
      kick(e.clientX, e.clientY, speed);
    };
    const onDown = (e) => {
      lastPointer = { x: e.clientX, y: e.clientY };
      kick(e.clientX, e.clientY, 0.8);
    };

    const ro = new ResizeObserver(() => {
      const nw = outer.offsetWidth;
      const nh = outer.offsetHeight;
      if (nw === w && nh === h) return;
      w = nw; h = nh;
      ring = buildRing(w, h);
      reset();
      paint();
    });
    ro.observe(outer);

    const stopAlpha = alpha.on("change", paint);
    paint();
    rest();

    let timer = 0;
    const startSettle = () => { timer = setTimeout(() => { settled = true; }, settleMs); };
    if (document.readyState === "complete") startSettle();
    else window.addEventListener("load", startSettle, { once: true });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("load", startSettle);
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      stopAlpha();
      resetRef.current = () => {};
    };
    // buildBackground is a module-level function in each rectangle, so it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return innerRef;
}
