import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

// ---- PUZZLES ----
// Add more entries here later — each card gets its own color + icon.
// `id` is what gets passed to onSelectPuzzle, and should match the page
// value App.jsx switches on (e.g. "binairo" -> page === "binairo").
// Exported so App.jsx can derive each puzzle page's vignette/dot-field
// color straight from this same list — one place to set a puzzle's
// color instead of two that can drift out of sync.
export const puzzles = [
  {
    id: "binairo",
    title: "Binairo/Tango",
    icon: "mdi:grid",
    color: "#c9c9c9",
    media: "/assets/binairo.png", // drop in an image/gif src here later
  },
];

export default function PuzzlePage({ onSelectPuzzle }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "80px 20px",
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontStyle: "italic",
          fontWeight: 700,
          color: "#4d4d4d",
          marginBottom: "40px",
        }}
      >
        Puzzles
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "24px",
          width: "100%",
          maxWidth: "900px",
        }}
      >
        {puzzles.map((puzzle) => (
          <PuzzleCard key={puzzle.id} puzzle={puzzle} onClick={() => onSelectPuzzle(puzzle.id)} />
        ))}
      </div>
    </div>
  );
}

function PuzzleCard({ puzzle, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
      style={{
        cursor: "pointer",
        borderRadius: "24px",
        border: `4px solid ${puzzle.color}`,
        backgroundColor: "#ffffff",
        padding: "14px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Name / symbol strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <Icon icon={puzzle.icon} width="20" height="20" color={puzzle.color} />
        <span
          style={{
            fontSize: "15px",
            fontWeight: 700,
            fontStyle: "italic",
            color: "#4d4d4d",
          }}
        >
          {puzzle.title}
        </span>
      </div>

      {/* Square image/gif area */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: puzzle.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {puzzle.media ? (
          <img
            src={puzzle.media}
            alt={puzzle.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Icon icon={puzzle.icon} width="48" height="48" color="#fff" style={{ opacity: 0.5 }} />
        )}
      </div>
    </motion.div>
  );
}
