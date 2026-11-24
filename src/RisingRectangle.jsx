import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useMotionValue, animate } from "framer-motion";

import { useJelly, cornerGradient, JELLY_PAD } from "./useJelly";

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

const BASE_COLOR = "80, 142, 235"; // matches #508eeb

const buildBackground = (a, w, h) =>
  [
    cornerGradient("tl", BASE_COLOR, a, 40, w, h),
    cornerGradient("tr", BASE_COLOR, a, 50, w, h),
    cornerGradient("bl", "255, 255, 255", a, 20, w, h),
    cornerGradient("br", BASE_COLOR, a, 90, w, h),
  ].join(", ");

export default function RisingRectangle({ isZooming = false, isExiting = false, isHighlighted = false }) {
  const controls = useAnimationControls();
  const alpha = useMotionValue(0.75);

  useEffect(() => {
    controls.set({ y: "150vh", x: "0px" });

    const runAnimation = () => {
      controls.start({
        y: "0vh",
        x: "-50px",
        transition: {
          duration: 2.5,
          ease: easeOutBlend(18, 2.5, 0.85, 0.15),
        },
      });
    };

    if (document.readyState === "complete") {
      runAnimation();
    } else {
      window.addEventListener("load", runAnimation);
      return () => window.removeEventListener("load", runAnimation);
    }
  }, [controls]);

  useEffect(() => {
    if (isZooming) {
      controls.start({ scale: 12, transition: { duration: 0.7, ease: "easeIn" } });
    }
  }, [isZooming, controls]);

  useEffect(() => {
    if (isExiting) {
      controls.start({
        y: "150vh",
        x: "0px",
        transition: { duration: 0.8, ease: easeInBlend(18, 2.5, 0.85, 0.15) },
      });
    }
  }, [isExiting, controls]);

  useEffect(() => {
    animate(alpha, isHighlighted ? 1 : 0.75, { duration: 0.3, ease: "easeOut" });
  }, [isHighlighted]);
  const outerRef = useRef(null);
  const innerRef = useJelly(outerRef, {
    alpha,
    buildBackground,
    enabled: !isZooming && !isExiting,
    settleMs: 2800,
  });

  return (
    <motion.div
      ref={outerRef}
      animate={controls}
      style={{
        position: "absolute",
        bottom: 0,
        left: "0%",
        transform: "translateX(-50%)",
        width: "350px",
        height: "600px",
        zIndex: isZooming ? 500 : 1,
        filter: "blur(1.15px) brightness(1.15)",
      }}
    >
      <div
        ref={innerRef}
        style={{ position: "absolute", inset: -JELLY_PAD, pointerEvents: "none", clipPath: `inset(${JELLY_PAD}px)` }}
      />
    </motion.div>
  );
}