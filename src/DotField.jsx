import { useMemo } from "react";

function pseudoRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

// ---- EASY TWEAK ZONE ----
const DOT_COUNT = 55;
const MIN_SIZE = 3;
const MAX_SIZE = 9;
const MIN_ALPHA = 0.2;
const MAX_ALPHA = 0.4;

// Orb look (glossy bubbles that drift slowly): fewer, larger, more opaque.
const ORB_COUNT = 26;
const ORB_MIN_SIZE = 7;
const ORB_MAX_SIZE = 15;
const ORB_MIN_ALPHA = 0.45;
const ORB_MAX_ALPHA = 0.75;
// --------------------------

export default function DotField({ colors, orbs = false }) {
  const dots = useMemo(() => {
    const nextRandom = pseudoRandom(20070604);
    const count = orbs ? ORB_COUNT : DOT_COUNT;
    return Array.from({ length: count }).map(() => ({
      x: nextRandom() * 100,
      y: nextRandom() * 100,
      size: orbs
        ? ORB_MIN_SIZE + nextRandom() * (ORB_MAX_SIZE - ORB_MIN_SIZE)
        : MIN_SIZE + nextRandom() * (MAX_SIZE - MIN_SIZE),
      alpha: orbs
        ? ORB_MIN_ALPHA + nextRandom() * (ORB_MAX_ALPHA - ORB_MIN_ALPHA)
        : MIN_ALPHA + nextRandom() * (MAX_ALPHA - MIN_ALPHA),
      color: colors[Math.floor(nextRandom() * colors.length)],
      driftSeconds: 9 + nextRandom() * 8,
      driftDelay: -nextRandom() * 12,
    }));
  }, [colors, orbs]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {orbs && (
        <style>{`
          @keyframes site-orb-drift {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(6px, -12px, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .site-orb { animation: none !important; }
          }
        `}</style>
      )}
      {dots.map((dot, i) => (
        <div
          key={i}
          className={orbs ? "site-orb" : undefined}
          style={{
            position: "absolute",
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            borderRadius: "50%",
            ...(orbs
              ? {
                  background: `radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.95), rgba(${dot.color}, ${dot.alpha}) 55%)`,
                  boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.7), 0 1px 3px rgba(${dot.color}, 0.25)`,
                  animation: `site-orb-drift ${dot.driftSeconds}s ease-in-out ${dot.driftDelay}s infinite alternate`,
                }
              : { backgroundColor: `rgba(${dot.color}, ${dot.alpha})` }),
          }}
        />
      ))}
    </div>
  );
}