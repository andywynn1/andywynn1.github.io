import { useEffect } from "react";
import { motion, useAnimationControls, useMotionValue, useMotionTemplate, animate } from "framer-motion";
import { Icon } from "@iconify/react";

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
const WIDTH = 550;
const HEIGHT = 300;
const BOTTOM_OFFSET = 80;
const RIGHT_OFFSET = 100;
const START_Y_OFFSET = 120;

const BASE_COLOR = "172, 230, 133"; // matches #ace685

// How long the rectangle takes to finish sliding in (delay + duration from
// its own entrance animation below) — used as a baseline reference point.
const RECTANGLE_SETTLE_TIME = 0.6 + 2.5;

// Contact info fade — fully independent, tweak freely.
const CONTACT_FADE_IN_DELAY = 1.8; // seconds after page load
const CONTACT_FADE_IN_DURATION = 0.4;
const CONTACT_FADE_OUT_DURATION = 0.4;

export default function FloatingRectangle({ isZooming = false, isExiting = false, isHighlighted = false }) {
  const controls = useAnimationControls();
  const contactControls = useAnimationControls();
  const alpha = useMotionValue(0.75);

  useEffect(() => {
    controls.set({ x: "50vw", y: `${START_Y_OFFSET}px` });

    const runAnimation = () => {
      controls.start({
        x: "0px",
        y: "0px",
        transition: {
          duration: 2.5,
          delay: 0.6,
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

  // Contact info: pure fade, no position/movement tied to the rectangle.
  // It just waits for the rectangle to roughly finish settling, then fades in.
  useEffect(() => {
    contactControls.set({ opacity: 0 });

    const runFade = () => {
      contactControls.start({
        opacity: 1,
        transition: { duration: CONTACT_FADE_IN_DURATION, delay: CONTACT_FADE_IN_DELAY, ease: "easeOut" },
      });
    };

    if (document.readyState === "complete") {
      runFade();
    } else {
      window.addEventListener("load", runFade);
      return () => window.removeEventListener("load", runFade);
    }
  }, [contactControls]);

  useEffect(() => {
    if (isZooming) {
      controls.start({ scale: 12, transition: { duration: 0.7, ease: "easeIn" } });
      contactControls.start({ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } });
    }
  }, [isZooming, controls, contactControls]);

  useEffect(() => {
    if (isExiting) {
      controls.start({
        x: "50vw",
        y: `${START_Y_OFFSET}px`,
        transition: { duration: 0.8, ease: easeInBlend(18, 2.5, 0.85, 0.15) },
      });
      contactControls.start({ opacity: 0, transition: { duration: CONTACT_FADE_OUT_DURATION, ease: "easeIn" } });
    }
  }, [isExiting, controls, contactControls]);

  useEffect(() => {
    animate(alpha, isHighlighted ? 1 : 0.75, { duration: 0.3, ease: "easeOut" });
  }, [isHighlighted]);

  const backgroundImage = useMotionTemplate`
    radial-gradient(circle at top left, rgba(${BASE_COLOR}, ${alpha}), transparent 50%),
    radial-gradient(circle at top right, rgba(${BASE_COLOR}, ${alpha}), transparent 100%),
    radial-gradient(circle at bottom left, rgba(${BASE_COLOR}, ${alpha}), transparent 50%),
    radial-gradient(circle at bottom right, rgba(${BASE_COLOR}, ${alpha}), transparent 60%)
  `;

  return (
    <>
      {/* WIDTH (550px) + RIGHT_OFFSET (100px) only fits on viewports at
          least 650px wide — on any phone, the box (and the actual
          contact email + social links inside it) shifts off the left
          edge of the screen, since content is centered *within* the box
          rather than the box itself being constrained to the viewport.
          Below the breakpoint, both this rectangle and the contact
          overlay switch to a width that's always inset from both screen
          edges by a fixed margin, so neither can ever push content
          off-screen regardless of how narrow the phone is. */}
      <style>{`
        .site-floating-box {
          bottom: ${BOTTOM_OFFSET}px;
          right: ${RIGHT_OFFSET}px;
          width: ${WIDTH}px;
          height: ${HEIGHT}px;
        }
        @media (max-width: 700px) {
          .site-floating-box {
            right: 16px;
            width: calc(100vw - 32px);
          }
        }
      `}</style>

      <motion.div
        className="site-floating-box"
        animate={controls}
        style={{
          position: "fixed",
          borderRadius: "0px",
          zIndex: isZooming ? 500 : 2,
          filter: "blur(1.15px) brightness(1.15)",
          backgroundImage,
        }}
      />

      {/* Contact info overlay — anchored at the same spot as the rectangle's
          resting position, but never moves. It only ever fades in/out. */}
      <motion.div
        className="site-floating-box"
        animate={contactControls}
        initial={{ opacity: 0 }}
        style={{
          position: "fixed",
          zIndex: isZooming ? 501 : 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: isZooming || isExiting ? "none" : "auto",
        }}
      >
        <p style={{ color: "#4d4d4d", fontSize: "16px" }}>andrewnguyenedenprairie@gmail.com</p>
        <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
          <a
            href="https://www.linkedin.com/in/andrew-nguyenep"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4d4d4d" }}
          >
            <Icon icon="mdi:linkedin" width="36" color="#0A66C2" />
          </a>
          <a
            href="https://www.instagram.com/21andrewnguyen/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4d4d4d" }}
          >
            <Icon icon="mdi:instagram" width="36" color="#E4405F" />
          </a>
          <a
            href="https://www.tiktok.com/@andrew.nguyen17"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4d4d4d" }}
          >
            <Icon icon="simple-icons:tiktok" width="36" color="#000000" />
          </a>
        </div>
      </motion.div>
    </>
  );
}