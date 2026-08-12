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
// --------------------------

export default function DotField({ colors }) {
  const dots = useMemo(() => {
    const nextRandom = pseudoRandom(20070604);
    return Array.from({ length: DOT_COUNT }).map(() => ({
      x: nextRandom() * 100,
      y: nextRandom() * 100,
      size: MIN_SIZE + nextRandom() * (MAX_SIZE - MIN_SIZE),
      alpha: MIN_ALPHA + nextRandom() * (MAX_ALPHA - MIN_ALPHA),
      color: colors[Math.floor(nextRandom() * colors.length)],
    }));
  }, [colors]);

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
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            borderRadius: "50%",
            backgroundColor: `rgba(${dot.color}, ${dot.alpha})`,
          }}
        />
      ))}
    </div>
  );
}