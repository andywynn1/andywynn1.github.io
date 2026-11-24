// Soft pastel glow along the page edges, painted behind everything.
// Replaces the black vignette on the homepage: it adds color instead of grey.
export default function Haze() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: [
          "radial-gradient(ellipse 65% 55% at 0% 100%, rgba(80, 142, 235, 0.22), transparent 70%)",
          "radial-gradient(ellipse 55% 50% at 100% 100%, rgba(172, 230, 133, 0.26), transparent 70%)",
          "radial-gradient(ellipse 60% 45% at 28% 0%, rgba(245, 108, 98, 0.16), transparent 70%)",
          "radial-gradient(ellipse 40% 40% at 100% 0%, rgba(255, 255, 255, 0.0), transparent 70%)",
        ].join(", "),
      }}
    />
  );
}
