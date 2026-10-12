import { useMemo } from "react";
import { motion } from "framer-motion";

const CONFETTI_COLORS = ["#F56C62", "#508eeb", "#ace685", "#f5c542", "#c77dff"];

// One-shot burst from the center of its parent. The parent needs
// position: relative. Mount it to fire it, unmount it to reset it.
export default function ConfettiBurst({ count = 36, spread = 1 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = (80 + Math.random() * 160) * spread;
        return {
          id: i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: Math.random() * 360,
          delay: Math.random() * 0.15,
          duration: 1.6 + Math.random() * 0.6,
          width: 6 + Math.random() * 6,
        };
      }),
    [count, spread]
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y + 220, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${p.width}px`,
            height: `${p.width * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
          }}
        />
      ))}
    </div>
  );
}