import { motion } from "framer-motion";

export default function TransitionOverlay({ controls, color = "#ffffff" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={controls}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: color,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    />
  );
}