import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import ConfettiBurst from "./Confetti";

// ---- EASY TWEAK ZONE ----
// iTunes album IDs, as strings. Open an album on Apple Music and copy the
// number at the end of the URL, e.g. music.apple.com/us/album/name/1440819347
const ALBUM_IDS = [
  1874784528,
  1812489371,
  96217801,
  6781834655,
  1695951888

];

const ACCENT = "#f5c542";
const TEXT = "#4d4d4d";
const CARD_BG = "#fdf9e8";
const REEL_STOP_TIMES = [2.0, 2.6, 3.2]; // seconds, left to right
const COVERS_PER_SECOND = 10; // how many covers fly past per second of spin
const POP_DELAY = 0.6; // wait for the scroll to land before the cover pops
// --------------------------

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// iTunes returns a 100x100 url. Swapping the size gives a bigger image.
const art = (url, px) => url.replace(/\d+x\d+bb/, `${px}x${px}bb`);

const formatTrack = (ms) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const formatTotal = (ms) => {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
};

// One reel's strip: starts on whatever the reel currently shows, ends on
// the winner, random covers in between (never the same cover twice in a row).
const buildStrip = (albums, start, winner, length) => {
  const strip = [start];
  while (strip.length < length - 1) {
    let next;
    do {
      next = pick(albums);
    } while (albums.length > 1 && next === strip[strip.length - 1]);
    strip.push(next);
  }
  strip.push(winner);
  return strip;
};

// Samples a 40x40 copy of the cover, groups similar colors, and returns the
// biggest group. Near-black and near-white pixels are skipped, and
// saturated pixels count more, so a grey background does not win.
const getDominantColor = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 40, 40);
        const { data } = ctx.getImageData(0, 0, 40, 40);

        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max < 40 || min > 220) continue;
          const weight = 0.2 + (max - min) / max;
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const bucket = buckets[key] || (buckets[key] = { score: 0, r: 0, g: 0, b: 0, n: 0 });
          bucket.score += weight;
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.n += 1;
        }

        const best = Object.values(buckets).sort((a, b) => b.score - a.score)[0];
        if (!best) return resolve(null);
        resolve(`rgb(${Math.round(best.r / best.n)}, ${Math.round(best.g / best.n)}, ${Math.round(best.b / best.n)})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export default function AlbumSpinner() {
  const [albums, setAlbums] = useState([]);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | empty | error
  const [strips, setStrips] = useState([[], [], []]);
  const [spinId, setSpinId] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | spinning | done
  const [winner, setWinner] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [reelSize, setReelSize] = useState(140);
  const [accent, setAccent] = useState(ACCENT);

  const revealRef = useRef(null);
  const finishedRef = useRef(0);
  const spinningRef = useRef(false);
  const busyRef = useRef(false);
  const trackTokenRef = useRef(0);

  // Reels shrink on narrow screens so all three always fit.
  useEffect(() => {
    const update = () => {
      setReelSize(Math.max(80, Math.min(150, Math.floor((window.innerWidth - 120) / 3))));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // One lookup call for every album's cover, title, artist and year.
  useEffect(() => {
    if (ALBUM_IDS.length === 0) {
      setLoadState("empty");
      return;
    }
    let cancelled = false;
    fetch(`https://itunes.apple.com/lookup?id=${ALBUM_IDS.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = data.results.filter((r) => r.wrapperType === "collection" && r.artworkUrl100);
        if (list.length === 0) throw new Error("no albums found");
        // Preload so reels never flash blank while spinning.
        list.forEach((a) => {
          const img = new Image();
          img.src = art(a.artworkUrl100, 300);
        });
        setAlbums(list);
        const starters = [...list].sort(() => Math.random() - 0.5);
setStrips([0, 1, 2].map((i) => [starters[i % starters.length]]));
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // After the spin lands: scroll down, then pop the cover and fire confetti.
  useEffect(() => {
    if (status !== "done") return;
    setShowConfetti(false);
    const scrollTimer = setTimeout(() => {
      revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    const confettiTimer = setTimeout(() => setShowConfetti(true), POP_DELAY * 1000 + 250);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(confettiTimer);
    };
  }, [status]);

  const fetchTracks = (album) => {
    const token = ++trackTokenRef.current;
    fetch(`https://itunes.apple.com/lookup?id=${album.collectionId}&entity=song&limit=200`)
      .then((res) => res.json())
      .then((data) => {
        if (token !== trackTokenRef.current) return;
        setTracks(data.results.filter((r) => r.wrapperType === "track"));
      })
      .catch(() => {
        if (token === trackTokenRef.current) setTracks([]);
      });
  };

  const handleSpin = async () => {
    if (busyRef.current || albums.length === 0) return;
    busyRef.current = true;

    // From the reveal section, scroll back up before the reels start.
    if (window.scrollY > 50) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    // Pick first, animate second. Every reel ends on the same album.
    const picked = pick(albums);
    finishedRef.current = 0;
    spinningRef.current = true;

    setTracks(null);
    setShowConfetti(false);
    setStrips((prev) =>
      prev.map((strip, i) =>
        buildStrip(
          albums,
          strip[strip.length - 1],
          picked,
          Math.round(REEL_STOP_TIMES[i] * COVERS_PER_SECOND) + 1
        )
      )
    );
    setSpinId((n) => n + 1);
    setWinner(picked);
    setAccent(ACCENT);
getDominantColor(art(picked.artworkUrl100, 300)).then((c) => setAccent(c || ACCENT));
    setStatus("spinning");
    fetchTracks(picked);
  };

  const handleReelDone = () => {
    if (!spinningRef.current) return;
    finishedRef.current += 1;
    if (finishedRef.current === 3) {
      spinningRef.current = false;
      busyRef.current = false;
      setStatus("done");
    }
  };

  const isSpinning = status === "spinning";
  const totalMs = tracks && tracks.length > 0 ? tracks.reduce((sum, t) => sum + (t.trackTimeMillis || 0), 0) : 0;
  const coverSize = "min(320px, 80vw)";

  return (
    <div style={{ width: "100%" }}>
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 20px",
          gap: "28px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontStyle: "italic", fontWeight: 700, color: TEXT, marginBottom: "8px" }}>
            Study album generator
          </h1>
          <p style={{ fontSize: "14px", color: TEXT }}>For when I can't decide what to listen to.</p>
        </div>

        {loadState === "loading" && <p style={{ color: TEXT }}>Loading albums...</p>}
        {loadState === "empty" && (
          <p style={{ color: TEXT, maxWidth: "320px", textAlign: "center" }}>
            No albums yet. Add iTunes album IDs to ALBUM_IDS in AlbumSpinner.jsx.
          </p>
        )}
        {loadState === "error" && (
          <p style={{ color: TEXT, maxWidth: "320px", textAlign: "center" }}>
            Could not load the albums. Check your connection and refresh.
          </p>
        )}

        {loadState === "ready" && (
          <>
            <div
              style={{
                display: "flex",
                gap: "12px",
                padding: "20px",
                borderRadius: "28px",
                border: `2px solid ${ACCENT}99`,
                backgroundColor: "#ffffff",
                boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
              }}
            >
              {strips.map((strip, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: reelSize,
                    height: reelSize,
                    overflow: "hidden",
                    borderRadius: "14px",
                    border: `2px solid ${ACCENT}99`,
                    backgroundColor: CARD_BG,
                  }}
                >
                  <motion.div
                    key={`${spinId}-${i}`}
                    initial={{ y: 0 }}
                    animate={{ y: -(strip.length - 1) * reelSize }}
                    transition={{ duration: spinId === 0 ? 0 : REEL_STOP_TIMES[i], ease: [0.2, 0.8, 0.25, 1] }}
                    onAnimationComplete={handleReelDone}
                  >
                    {strip.map((album, j) => (
                      <img
                        key={j}
                        src={art(album.artworkUrl100, 300)}
                        alt=""
                        draggable={false}
                        style={{ width: reelSize, height: reelSize, objectFit: "cover", display: "block" }}
                      />
                    ))}
                  </motion.div>
                  {/* Soft shade at the top and bottom edge, like a real reel window. */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      boxShadow: "inset 0 10px 14px -8px rgba(0,0,0,0.35), inset 0 -10px 14px -8px rgba(0,0,0,0.35)",
                    }}
                  />
                </div>
              ))}
            </div>

            <motion.button
              onClick={handleSpin}
              disabled={isSpinning}
              whileHover={isSpinning ? {} : { scale: 1.05 }}
              whileTap={isSpinning ? {} : { scale: 0.96 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 36px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: isSpinning ? "#e2e2e2" : ACCENT,
                color: isSpinning ? "#999" : TEXT,
                fontSize: "16px",
                fontWeight: 700,
                cursor: isSpinning ? "not-allowed" : "pointer",
              }}
            >
              <Icon icon="mdi:slot-machine" width="22" />
              {isSpinning ? "Spinning..." : winner ? "Spin again" : "Spin"}
            </motion.button>
          </>
        )}
      </section>

      {status === "done" && winner && (
        <section
          ref={revealRef}
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            gap: "28px",
          }}
        >
          <div style={{ position: "relative" }}>
            <motion.img
              src={art(winner.artworkUrl100, 600)}
              alt={winner.collectionName}
              draggable={false}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.7, delay: POP_DELAY, times: [0, 0.6, 1], ease: "easeOut" }}
              style={{
                width: coverSize,
                height: coverSize,
                objectFit: "cover",
                display: "block",
                borderRadius: "24px",
                border: `4px solid ${accent}`,
                boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              }}
            />
            {showConfetti && <ConfettiBurst count={48} spread={1.4} />}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: POP_DELAY + 0.4, duration: 0.4 }}
            style={{
              width: "min(420px, 90vw)",
              padding: "24px",
              borderRadius: "24px",
              border: `4px solid ${accent}`,
              backgroundColor: CARD_BG,
              color: TEXT,
            }}
          >
            <h2 style={{ fontSize: "24px", fontStyle: "italic", fontWeight: 700, marginBottom: "4px" }}>
              {winner.collectionName}
            </h2>
            <p style={{ fontSize: "16px", marginBottom: "10px" }}>{winner.artistName}</p>
            <p style={{ fontSize: "13px", marginBottom: "16px" }}>
              {[
                new Date(winner.releaseDate).getFullYear(),
                winner.primaryGenreName,
                `${winner.trackCount} tracks`,
                totalMs > 0 ? formatTotal(totalMs) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {tracks === null && <p style={{ fontSize: "13px" }}>Loading tracks...</p>}
            {tracks && tracks.length === 0 && <p style={{ fontSize: "13px" }}>Track list unavailable.</p>}
            {tracks && tracks.length > 0 && (
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {tracks.map((t, i) => (
                  <li
                    key={t.trackId}
                    style={{ display: "flex", gap: "10px", fontSize: "14px", lineHeight: 1.4 }}
                  >
                    <span style={{ width: "22px", textAlign: "right", opacity: 0.6, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{t.trackName}</span>
                    <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                      {formatTrack(t.trackTimeMillis || 0)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>

          <button
            onClick={handleSpin}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 28px",
              borderRadius: "999px",
              border: `2px solid ${accent}`,
              backgroundColor: "transparent",
              color: TEXT,
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Icon icon="mdi:refresh" width="18" />
            Spin again
          </button>
        </section>
      )}
    </div>
  );
}