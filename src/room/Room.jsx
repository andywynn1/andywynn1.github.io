import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ART_W, ART_H, HOTSPOTS, CHEST_CENTER_X, PAPER, drawRoom, drawGlow } from "./roomArt";
import { PixelBack, RoomNav, SoundToggle, RoomChromeStyles } from "./RoomUI";
import { playTick } from "./sound";

const LABEL = "'Pixelify Sans', 'Quicksand', sans-serif";
const INK = "#1a1208";
const GOLD = "#f2c230";
const WHITE = "#f4efe6";

// Camera position survives opening an experience and coming back.
let savedScroll = 0;

// Whole-number scale keeps pixels square. Height sets it on landscape screens;
// width caps it on tall phones so a useful slice of the wall stays in view.
const calcScale = () => Math.max(4, Math.min(Math.floor(window.innerHeight / ART_H), Math.floor(window.innerWidth / 100)));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function Room({ focus, current, onOpen, onBack, onNavigate }) {
  const scroller = useRef(null);
  const wall = useRef(null);
  const glow = useRef(null);
  const firstFocus = useRef(true);
  const [isTouch] = useState(() => window.matchMedia("(hover: none)").matches);
  const [scale, setScale] = useState(calcScale);
  const [tip, setTip] = useState(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    drawRoom(wall.current);
    drawGlow(glow.current);
    const onResize = () => setScale(calcScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chestScroll = () => clamp(CHEST_CENTER_X * scale - scroller.current.clientWidth / 2, 0, ART_W * scale);

  // Start where the visitor left off, or on the chest when coming from Portfolio.
  useLayoutEffect(() => {
    scroller.current.scrollLeft = focus === "chest" ? chestScroll() : savedScroll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    if (focus === "chest") scroller.current.scrollTo({ left: chestScroll(), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Scroll, arrow keys, and vertical wheel all pan the room sideways.
  useEffect(() => {
    const el = scroller.current;
    let target = null;
    const onWheel = (e) => {
      target = null;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    // Arrow presses add up toward one target, so holding a key keeps moving.
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const max = el.scrollWidth - el.clientWidth;
      const step = (e.key === "ArrowLeft" ? -1 : 1) * window.innerWidth * 0.4;
      target = clamp((target ?? el.scrollLeft) + step, 0, max);
      el.scrollTo({ left: target, behavior: "smooth" });
      e.preventDefault();
    };
    const onScroll = () => {
      if (target !== null && Math.abs(el.scrollLeft - target) < 2) target = null;
      savedScroll = el.scrollLeft;
      setTip(null);
      if (el.scrollLeft > 20) setHint(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const showTip = (h, el) => {
    const r = el.getBoundingClientRect();
    setTip({ h, cx: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  };
  const click = (h, e) => {
    if (isTouch && tip?.h.id !== h.id) { showTip(h, e.currentTarget); return; }
    if (h.kind === "link") { playTick(); onOpen(h.id); } else showTip(h, e.currentTarget);
  };

  const w = ART_W * scale;
  const hgt = ART_H * scale;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;

  return (
    <>
      <RoomChromeStyles />
      <style>{`
        .room-scroll { scrollbar-width: none; touch-action: pan-x; }
        .room-scroll::-webkit-scrollbar { display: none; }
        .room-hot { position: absolute; background: none; border: 0; padding: 0; margin: 0; cursor: default; border-radius: 2px; }
        .room-hot.info:hover, .room-hot.info:focus-visible { box-shadow: 0 0 0 2px ${WHITE}, 0 0 0 4px ${INK}; outline: none; }
        .room-hot.link { cursor: pointer; box-shadow: 0 0 0 2px rgba(242,194,48,.6), 0 0 0 4px rgba(26,18,8,.5); }
        .room-hot.link:hover, .room-hot.link:focus-visible { box-shadow: 0 0 0 2px ${GOLD}, 0 0 0 4px ${INK}; outline: none; }
        .room-hot.link::after { content: "\\25B8"; position: absolute; top: -12px; right: -12px; width: 18px; height: 18px; line-height: 18px; text-align: center; font: 14px ${LABEL}; background: ${GOLD}; color: ${INK}; box-shadow: 0 0 0 2px ${INK}; }
        @keyframes room-breathe { from { opacity: .82; } to { opacity: 1; } }
        .room-glow { animation: room-breathe 5s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .room-glow { animation: none; } }
      `}</style>

      <div ref={scroller} className="room-scroll" onClick={(e) => { if (e.target === e.currentTarget || e.target.tagName === "CANVAS") setTip(null); }}
        style={{ position: "fixed", inset: 0, overflowX: "auto", overflowY: "hidden", background: PAPER, zIndex: 1 }}>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: w, height: hgt }}>
          <canvas ref={wall} style={{ position: "absolute", inset: 0, width: w, height: hgt, imageRendering: "pixelated" }} />
          <canvas ref={glow} className="room-glow" style={{ position: "absolute", inset: 0, width: w, height: hgt, imageRendering: "pixelated", pointerEvents: "none" }} />
          {HOTSPOTS.map((h) => (
            <button key={h.id} type="button" className={`room-hot ${h.kind}`}
              aria-label={h.kind === "link" ? `${h.label}. Opens` : h.label}
              style={{ left: h.x * scale, top: h.y * scale, width: h.w * scale, height: h.h * scale }}
              onPointerEnter={(e) => { if (e.pointerType === "mouse") showTip(h, e.currentTarget); }}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") setTip(null); }}
              onFocus={(e) => showTip(h, e.currentTarget)}
              onBlur={() => setTip(null)}
              onClick={(e) => click(h, e)} />
          ))}
        </div>
      </div>

      {tip && (
        <div role="tooltip" style={{
          position: "fixed", zIndex: 1001, pointerEvents: "none", maxWidth: 260,
          left: clamp(tip.cx, 140, vw - 140),
          top: tip.top > 120 ? tip.top - 14 : tip.bottom + 14,
          transform: tip.top > 120 ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          background: "#1d140d", color: "#f1e6cf", padding: "8px 12px",
          border: `2px solid ${tip.h.kind === "link" ? GOLD : WHITE}`, boxShadow: `0 0 0 2px ${INK}`,
        }}>
          <div style={{ fontFamily: LABEL, fontSize: 16 }}>{tip.h.label}</div>
          <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: 2 }}>{tip.h.desc}</div>
          <div style={{ fontFamily: LABEL, fontSize: 13, marginTop: 6, color: tip.h.kind === "link" ? GOLD : "#c9b99a" }}>
            {tip.h.kind === "link" ? (isTouch ? "▸ Tap again to open" : "▸ Click to open") : "Info only"}
          </div>
        </div>
      )}

      {hint && (
        <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", zIndex: 1000, pointerEvents: "none",
          fontFamily: LABEL, fontSize: 15, color: "#f1e6cf", background: "rgba(29,20,13,.85)", border: "2px solid #c9b99a", padding: "6px 12px" }}>
          Scroll, swipe, or use the arrow keys
        </div>
      )}

      <PixelBack onBack={onBack} />
      <RoomNav current={current} onNavigate={onNavigate} />
      <SoundToggle />
    </>
  );
}
