import { setSound, useSoundOn } from "./sound";

const LABEL = "'Pixelify Sans', 'Quicksand', sans-serif";
const INK = "#1a1208";
const CREAM = "#f1e6cf";
const GOLD = "#f2c230";

const chrome = {
  background: "#2a1d12",
  color: CREAM,
  border: `3px solid #c9b99a`,
  boxShadow: `0 0 0 2px ${INK}`,
  fontFamily: LABEL,
  cursor: "pointer",
};

function Pixels({ rects, size = 20, color = CREAM, viewBox = 10 }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={color} />)}
    </svg>
  );
}

const ARROW = [[4, 1, 1, 1], [3, 2, 2, 1], [2, 3, 3, 1], [1, 4, 8, 2], [2, 6, 3, 1], [3, 7, 2, 1], [4, 8, 1, 1]];
const SPEAKER = [[1, 4, 2, 2], [3, 3, 1, 4], [4, 2, 1, 6]];
const WAVES = [[6, 3, 1, 4], [8, 2, 1, 6]];
const MUTE_X = [[6, 3, 1, 1], [7, 4, 1, 1], [8, 5, 1, 1], [8, 3, 1, 1], [6, 5, 1, 1]];

export function PixelBack({ onBack }) {
  return (
    <button type="button" aria-label="Back" onClick={onBack} className="room-ui"
      style={{ ...chrome, position: "fixed", top: 16, left: 16, width: 44, height: 44, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
      <Pixels rects={ARROW} />
    </button>
  );
}

export function SoundToggle() {
  const on = useSoundOn();
  return (
    <button type="button" aria-pressed={on} aria-label={on ? "Sound on. Click to mute" : "Sound off. Click to turn on"}
      onClick={() => setSound(!on)} className="room-ui"
      style={{ ...chrome, position: "fixed", bottom: 16, left: 16, minWidth: 44, height: 44, zIndex: 1000, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", fontSize: 14 }}>
      <Pixels rects={on ? [...SPEAKER, ...WAVES] : [...SPEAKER, ...MUTE_X]} />
      <span>{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}

const NAV = [
  { id: "page1", label: "About" },
  { id: "page2", label: "Portfolio" },
  { id: "thirty", label: "30 for 30" },
];

export function RoomNav({ current, onNavigate }) {
  return (
    <nav aria-label="Main" style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", gap: 8 }}>
      {NAV.map((item) => {
        const active = item.id === current;
        return (
          <button key={item.id} type="button" className="room-ui" aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
            style={{ ...chrome, height: 44, padding: "0 14px", fontSize: 15, borderColor: active ? GOLD : "#c9b99a" }}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function RoomChromeStyles() {
  return (
    <style>{`
      .room-ui:hover { filter: brightness(1.25); }
      .room-ui:focus-visible { outline: 3px solid ${GOLD}; outline-offset: 3px; }
      @media (max-width: 560px) {
        nav[aria-label="Main"] button { padding: 0 8px !important; font-size: 13px !important; }
      }
    `}</style>
  );
}

// Stand-in for any experience that is built in a later phase.
export function Placeholder({ title, note }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#1d140d", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, border: "3px solid #c9b99a", boxShadow: `0 0 0 2px ${INK}`, background: "#2a1d12", color: CREAM, padding: "28px 32px" }}>
        <div style={{ fontFamily: LABEL, fontSize: 28, marginBottom: 12, color: GOLD }}>{title}</div>
        <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>{note ?? "Placeholder. This experience is built in a later phase."}</p>
      </div>
    </div>
  );
}
