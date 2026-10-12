import { useState, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Icon } from "@iconify/react";

const items = [
  { label: "About", color: "#f56c62", icon: "mdi:account" },
  { label: "Portfolio", color: "#508eeb", icon: "mdi:briefcase" },
  { label: "Fun", color: "#ace685", icon: "mdi:party-popper" },
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

const STAGGER_S = 0.15;
const ENTRANCE_DURATION = 1.4;
const EXIT_DURATION = 0.9;

export default function MenuBar({ onSelect, isExiting = false, hoveredIndex, setHoveredIndex }) {
  const rowControls = items.map(() => useAnimationControls());

  useEffect(() => {
    rowControls.forEach((c) => c.set({ x: "60vw" }));

    const runAnimation = () => {
      rowControls.forEach((c, i) => {
        c.start({
          x: "0px",
          transition: {
            duration: ENTRANCE_DURATION,
            delay: i * STAGGER_S,
            ease: easeOutBlend(18, 2.5, 0.85, 0.15),
          },
        });
      });
    };

    if (document.readyState === "complete") {
      runAnimation();
    } else {
      window.addEventListener("load", runAnimation);
      return () => window.removeEventListener("load", runAnimation);
    }
  }, []);

  useEffect(() => {
    if (isExiting) {
      rowControls.forEach((c, i) => {
        c.start({
          x: "60vw",
          transition: {
            duration: EXIT_DURATION,
            delay: i * STAGGER_S,
            ease: easeInBlend(18, 2.5, 0.85, 0.15),
          },
        });
      });
    }
  }, [isExiting]);

  return (
    <div
      className="site-menu-bar"
      style={{
        position: "fixed",
        right: "0px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "28px",
        zIndex: 10,
      }}
    >
      {/* top:50% + translateY(-180%) is measured against the menu's own
          height, which doesn't shrink with the viewport — on anything
          shorter than ~740px tall (basically every phone in portrait,
          and any browser window that isn't close to full-height) that
          pushes the top item ("About") above y:0, where it's permanently
          invisible (position:fixed doesn't scroll). Below that height,
          anchor near the top of the screen instead, where all three
          items are guaranteed to fit regardless of how tall the menu
          itself is. */}
      <style>{`
        .site-menu-bar {
          top: 50%;
          transform: translateY(-180%);
        }
        @media (max-height: 740px) {
          .site-menu-bar {
            top: 24px;
            transform: none;
          }
        }
      `}</style>
      {items.map((item, i) => {
        const isHovered = hoveredIndex === i;
        return (
          <motion.div
            key={item.label}
            animate={rowControls[i]}
            onHoverStart={() => setHoveredIndex(i)}
            onHoverEnd={() => setHoveredIndex(null)}
            onClick={() => onSelect(i)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "16px",
              padding: "10px 6px 10px 0px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              backgroundColor: isHovered ? hexToRgba(item.color, 0.16) : hexToRgba(item.color, 0),
              transition: "background-color 0.25s ease-out",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "24px",
                letterSpacing: "0.24em",
                color: "#4d4d4d",
              }}
            >
              {item.icon && <Icon icon={item.icon} width="22" />}
              {item.label}
            </span>
            <motion.span
              animate={{ width: isHovered ? "106px" : "56px" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                height: "12px",
                backgroundColor: item.color,
                borderRadius: "2px",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}