import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const easeOutBlend = (k1, k2, w1 = 0.7, w2 = 0.3) => {
  const norm = w1 * (1 - Math.exp(-k1)) + w2 * (1 - Math.exp(-k2));
  return (t) => {
    const val = w1 * (1 - Math.exp(-k1 * t)) + w2 * (1 - Math.exp(-k2 * t));
    return val / norm;
  };
};

// ---- EASY TWEAK ZONE ----
const TEXT = "Andrew Nguyen";
const TOP_OFFSET = "62%";       // 70% up the screen = 30% down from top
const STAGGER_S = 0.1;         // delay between each letter starting
const DROP_DURATION = 2.4;      // how long each letter's drop+fade takes
const SCRAMBLE_DURATION = 300;  // ms each letter spends scrambling before locking
const SCRAMBLE_INTERVAL = 50;   // ms between each random character swap
const FONT_SIZE = "36px";
const LETTER_COLOR = "#4d4d4d";
const LETTER_SPACING = "0.31em";
// --------------------------

const SCRAMBLE_CHARS = "andrewguyANDREWGUY1234567890";

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function Letter({ char, index }) {
  const [display, setDisplay] = useState(char === " " ? " " : randomChar());
  const [locked, setLocked] = useState(char === " ");

  useEffect(() => {
    if (char === " ") return;

    const startDelay = index * STAGGER_S * 1000;

    const startTimeout = setTimeout(() => {
      const scrambleInterval = setInterval(() => {
        setDisplay(randomChar());
      }, SCRAMBLE_INTERVAL);

      const lockTimeout = setTimeout(() => {
        clearInterval(scrambleInterval);
        setDisplay(char);
        setLocked(true);
      }, SCRAMBLE_DURATION);

      return () => {
        clearInterval(scrambleInterval);
        clearTimeout(lockTimeout);
      };
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [char, index]);

  return (
    <motion.span
      className="site-title-letter"
      initial={{ opacity: 0, y: "-60px" }}
      animate={{ opacity: 1, y: "0px" }}
      transition={{
        duration: DROP_DURATION,
        delay: index * STAGGER_S,
        ease: easeOutBlend(18, 2.5, 0.85, 0.15),
      }}
      style={{
        display: "inline-block",
        fontWeight: 500,
        letterSpacing: LETTER_SPACING,
        color: LETTER_COLOR,
        opacity: locked ? undefined : 0.6,
        width: char === " " ? "0.4em" : undefined,
      }}
    >
      {display}
    </motion.span>
  );
}

export default function Title() {
  const letters = TEXT.split("");


  return (
    <div
      style={{
        position: "fixed",
        top: TOP_OFFSET,
        left: "37%",
        transform: "translate(-50%, -50%)",
        whiteSpace: "nowrap",
        zIndex: 6,
      }}
    >
      {/* Fixed 36px + wide letter-spacing was wider than the viewport on
          phones, clipping the left side of the name off-screen (nowrap
          means it can't wrap to a second line to compensate). Scales
          down at the same width breakpoints AboutPage already uses, so
          it stays legible and fully on-screen without touching the
          desktop size. */}
      <style>{`
        .site-title-letter {
          font-size: ${FONT_SIZE};
        }
        @media (max-width: 640px) {
          .site-title-letter {
            font-size: 30px;
          }
        }
        @media (max-width: 400px) {
          .site-title-letter {
            font-size: 24px;
          }
        }
      `}</style>
      {letters.map((char, i) => (
        <Letter key={i} char={char} index={i} />
      ))}
    </div>
  );
}