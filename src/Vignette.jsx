import { useEffect } from "react";
import { motion, useMotionValue, useMotionTemplate, animate } from "framer-motion";

function parseRgb(str) {
  return str.split(",").map((n) => parseFloat(n.trim()));
}

export default function Vignette({ color = "0, 0, 0", intensity = 0.45, size = 180, duration = 1.5 }) {
  const [r0, g0, b0] = parseRgb(color);
  const r = useMotionValue(r0);
  const g = useMotionValue(g0);
  const b = useMotionValue(b0);
  const a = useMotionValue(intensity);

  useEffect(() => {
    const [r1, g1, b1] = parseRgb(color);
    const controls = [
      animate(r, r1, { duration, ease: "easeInOut" }),
      animate(g, g1, { duration, ease: "easeInOut" }),
      animate(b, b1, { duration, ease: "easeInOut" }),
      animate(a, intensity, { duration, ease: "easeInOut" }),
    ];
    return () => controls.forEach((c) => c.stop());
  }, [color, intensity, duration]);

  const boxShadow = useMotionTemplate`inset 0 0 ${size}px rgba(${r}, ${g}, ${b}, ${a})`;

  return (
    <motion.div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999,
        boxShadow,
      }}
    />
  );
}