import { useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

const easeOutBlend = (k1, k2, w1 = 0.7, w2 = 0.3) => {
  const norm = w1 * (1 - Math.exp(-k1)) + w2 * (1 - Math.exp(-k2));
  return (t) => {
    const val = w1 * (1 - Math.exp(-k1 * t)) + w2 * (1 - Math.exp(-k2 * t));
    return val / norm;
  };
};

const easeInBlend = (k1, k2, w1, w2) => {
  const outFn = easeOutBlend(k1, k2, w1, w2);
  return (t) => 1 - outFn(1 - t);
};

// ---- EASY TWEAK ZONE ----
const TOP_OFFSET = 40;
const RIGHT_OFFSET = 40;
const SIZE = 32;
const EXIT_DURATION_MS = 700; // must match what App.jsx waits before navigating home
// --------------------------

export default function BackButton({ onBack }) {
  const controls = useAnimationControls();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    controls.set({ y: "-100vh", rotate: -720 });
    controls.start({
      y: "0vh",
      rotate: 0,
      transition: { duration: 1.4, ease: easeOutBlend(18, 2.5, 0.85, 0.15) },
    });
  }, [controls]);

  const handleClick = () => {
    if (isExiting) return;
    setIsExiting(true);


    
    controls.start({
      y: "-100vh",
      rotate: 720,
      transition: {
        duration: EXIT_DURATION_MS / 1000,
        ease: easeInBlend(18, 2.5, 0.85, 0.15),
      },
    });

    setTimeout(() => {
      onBack();
    }, EXIT_DURATION_MS);
  };

  return (
    <motion.div
      animate={controls}
      onClick={handleClick}
      style={{
        position: "fixed",
        top: `${TOP_OFFSET}px`,
        right: `${RIGHT_OFFSET}px`,
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        cursor: "pointer",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
        <line x1="4" y1="4" x2="20" y2="20" stroke="#4d4d4d" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="4" x2="4" y2="20" stroke="#4d4d4d" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}