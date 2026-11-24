// Code-drawn pixel art for the shared room wall (About + Portfolio).
// Everything is drawn once onto a 480 x 90 canvas and scaled up with
// image-rendering: pixelated. All objects are PLACEHOLDERS until real
// reference material arrives (see HOTSPOTS for what each one stands for).

export const ART_W = 480;
export const ART_H = 90;

// Window tooltip text. Set this by hand; the site never tracks location.
export const WINDOW_CITY = "[City]";

export const PAPER = "#a2554f"; // wallpaper color, also fills any space above the art

const P = {
  paper: "#a2554f", stripe: "#aa5d57", pat: "#b26660",
  plank: ["#3b2c1e", "#352819", "#42301f"], seam: "#1e150c", speck: "#2c2014",
  rail: "#2a1d12", railtop: "#52402c", bbtop: "#3a2a1a", bb: "#1c110a",
  floor: ["#2b2119", "#30241b"], fseam: "#18110b",
  back: "#1f1d18", wood: "#2a1d12", woodHi: "#52402c",
  glow: "255, 196, 107", moon: "150, 175, 230",
  books: ["#d9c7a0", "#4f7fcf", "#8fb87a", "#3f5a52", "#3b2c1e", "#e8d9b0", "#4f7fcf", "#c9a24a"],
};

// x, y, w, h are in art pixels. kind "link" = gold (opens an experience),
// "info" = white (hover only). Positions follow the objects drawn below.
export const HOTSPOTS = [
  { id: "snowboard", kind: "info", x: 11, y: 10, w: 18, h: 74, label: "Snowboard", desc: "Placeholder board. The real one comes from your reference PDF." },
  { id: "window", kind: "info", x: 47, y: 10, w: 32, h: 35, label: "Window", desc: `Currently in ${WINDOW_CITY}` },
  { id: "bookshelf", kind: "info", x: 95, y: 11, w: 40, h: 36, label: "Bookshelf", desc: "Placeholder shelf for books and other meaningful objects." },
  { id: "records", kind: "link", x: 100, y: 46, w: 32, h: 15, label: "Record player", desc: "Spins up and reveals your top three artists." },
  { id: "cabinet", kind: "info", x: 95, y: 61, w: 40, h: 16, label: "Cabinet", desc: "Placeholder storage." },
  { id: "vinyl", kind: "link", x: 139, y: 58, w: 31, h: 26, label: "Vinyl crate", desc: "Your album collection." },
  { id: "projector", kind: "link", x: 178, y: 3, w: 94, h: 46, label: "Projector", desc: "Lights up the wall with your favorite movies." },
  { id: "lab", kind: "link", x: 279, y: 15, w: 19, h: 40, label: "Lab coat", desc: "Opens the research archive." },
  { id: "polaroids", kind: "info", x: 312, y: 12, w: 46, h: 32, label: "Polaroids", desc: "Placeholder snapshots. Real memories go here." },
  { id: "frames", kind: "info", x: 360, y: 14, w: 30, h: 26, label: "Framed photos", desc: "Placeholder frames." },
  { id: "desk", kind: "info", x: 394, y: 35, w: 56, h: 47, label: "Desk", desc: "Placeholder setup. Real desk details come later." },
  { id: "chest", kind: "link", x: 452, y: 62, w: 28, h: 21, label: "Chest", desc: "Open it to see projects." },
];
export const CHEST_CENTER_X = 466;

function hsh(x, y, s = 0) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) & 0xffff;
}
const rnd = (x, y, s = 0) => hsh(x, y, s) / 65535;

export function drawRoom(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = ART_W;
  canvas.height = ART_H;
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const px = (x, y, c) => rect(x, y, 1, 1, c);
  const veil = (x, y, w, h, rgba) => rect(x, y, w, h, rgba);

  // --- wall: wallpaper above, wainscot below ---
  const diamond = new Set(["3,2", "4,2", "2,3", "3,3", "4,3", "5,3", "2,4", "3,4", "4,4", "5,4", "3,5", "4,5"]);
  for (let y = 0; y < 47; y++) {
    for (let x = 0; x < ART_W; x++) {
      let c = P.paper;
      if (x % 16 < 2) c = P.stripe;
      const tx = (x + ((y >> 3) % 2) * 4) % 8;
      if (diamond.has(`${tx},${y % 8}`)) c = P.pat;
      px(x, y, c);
    }
  }
  rect(0, 47, ART_W, 1, P.railtop);
  rect(0, 48, ART_W, 2, P.rail);
  for (let y = 50; y < 73; y++) {
    for (let x = 0; x < ART_W; x++) {
      let c = P.plank[hsh(Math.floor(x / 6), 3) % 3];
      if (x % 6 === 0) c = P.seam;
      else if (rnd(x, y, 5) < 0.03) c = P.speck;
      px(x, y, c);
    }
  }
  rect(0, 73, ART_W, 1, P.bbtop);
  rect(0, 74, ART_W, 2, P.bb);
  for (let y = 76; y < ART_H; y++) {
    for (let x = 0; x < ART_W; x++) {
      let c = P.floor[hsh(Math.floor(x / 20) + Math.floor(y / 5) * 3, 1) % 2];
      if (y === 80 || y === 85 || (x + Math.floor(y / 5) * 13) % 40 === 0) c = P.fseam;
      px(x, y, c);
    }
  }

  // --- snowboard (leaning) ---
  for (let y = 12; y < 82; y++) {
    const x0 = 14 + Math.round((82 - y) * 0.1);
    const inset = y >= 15 ? 0 : y === 12 ? 2 : 1;
    const w = 8 - 2 * inset;
    const xs = x0 + inset;
    rect(xs, y, w, 1, "#cfd6d9");
    px(xs, y, "#3a4048"); px(xs + w - 1, y, "#3a4048");
    if (y >= 30 && y <= 60) rect(xs + 2, y, w - 4, 1, "#5f8f8b");
    if (y === 44 || y === 56) rect(xs - 1, y, w + 2, 2, "#2a2d31");
  }
  rect(12, 82, 14, 2, "rgba(0,0,0,0.3)");

  // --- window with a night mountain ---
  rect(50, 12, 26, 30, "#1b1109");
  const sky = ["#101a2e", "#16233f", "#1d2d50", "#26396a"];
  for (let j = 0; j < 26; j++) rect(52, 14 + j, 22, 1, sky[Math.min(3, Math.floor((j * 4) / 26))]);
  const prof = [3, 4, 6, 8, 10, 12, 10, 8, 7, 9, 11, 14, 11, 9, 6, 5, 6, 8, 7, 5, 4, 3];
  prof.forEach((h, i) => { for (let t = 0; t < h; t++) px(52 + i, 39 - t, h >= 9 && t >= h - 2 ? "#8fa3c4" : "#0c1424"); });
  rect(68, 18, 3, 3, "#e9e2c8"); px(58, 17, "#cfd6e8"); px(64, 20, "#cfd6e8"); px(56, 23, "#cfd6e8");
  rect(62, 14, 2, 26, "#1b1109"); rect(52, 26, 22, 2, "#1b1109");
  rect(48, 42, 30, 2, "#3a2515"); rect(48, 42, 30, 1, P.woodHi);

  // --- bookshelf, cabinet, record player (one column at x = 95) ---
  const bx = 95;
  rect(bx, 12, 37, 38, P.back);
  for (const [sy] of [[28], [46]]) {
    let x = bx + 2;
    while (x < bx + 34) {
      const w = 2 + (hsh(x, sy) % 2), h = 8 + (hsh(x, sy, 2) % 3);
      if (sy === 46 && x >= bx + 9 && x <= bx + 29) { x += 1; continue; }
      rect(x, sy - h, w, h, P.books[hsh(x, sy, 5) % P.books.length]);
      rect(x, sy - h, 1, h, "#2a1a12"); px(x + w - 1, sy - h + 2, "#e0c78a");
      x += w;
    }
  }
  for (const fx of [bx + 9, bx + 21]) {
    rect(fx, 35, 8, 10, "#2a1a0e");
    rect(fx + 1, 36, 6, 8, fx === bx + 9 ? "#8a8f7c" : "#7a8a95");
    rect(fx + 2, 41, 4, 3, "#4a5a48");
  }
  rect(bx, 12, 2, 38, P.wood); rect(bx + 35, 12, 2, 38, P.wood); rect(bx, 12, 37, 2, P.wood);
  rect(bx, 28, 37, 2, P.wood); rect(bx, 46, 37, 3, P.wood); rect(bx, 46, 37, 1, P.woodHi);
  rect(bx, 60, 37, 16, P.wood); rect(bx, 60, 37, 1, P.woodHi); rect(bx + 18, 61, 1, 15, P.seam);
  px(bx + 16, 68, "#e8b73a"); px(bx + 20, 68, "#e8b73a");
  rect(bx + 5, 56, 26, 4, "#2a2118"); rect(bx + 5, 56, 26, 1, "#4a3a2a");
  rect(bx + 7, 54, 14, 2, "#161110"); rect(bx + 8, 53, 12, 1, "#2b2724");
  [[25, 48], [24, 49], [23, 50], [22, 51], [21, 52], [20, 53]].forEach(([dx, y]) => px(bx + dx, y, "#b8b2a4"));
  rect(bx + 25, 47, 3, 2, "#b8b2a4");

  // --- vinyl crate (floor) ---
  rect(140, 82, 30, 2, "rgba(0,0,0,0.3)");
  ["#a8873e", "#3f66a8", "#bba982", "#6f9660", "#a8873e"].forEach((c, i) => {
    rect(144 + i * 5, 60, 4, 10, c); px(145 + i * 5, 63, "#161110");
  });
  rect(142, 70, 26, 12, "#4a3322"); rect(141, 69, 28, 2, "#5a3f2a");
  rect(142, 74, 26, 1, "#2e2014"); rect(142, 78, 26, 1, "#2e2014");
  rect(141, 69, 1, 13, "#2e2014"); rect(168, 69, 1, 13, "#2e2014");

  // --- projector (ceiling mount) and the lit wall area ---
  rect(189, 0, 2, 6, "#1a1410");
  rect(182, 6, 16, 8, "#2a2622"); rect(182, 6, 16, 1, "#4a423a");
  rect(194, 8, 4, 4, "#0d0d10"); rect(195, 9, 2, 2, "#6a7aa0");
  for (let y = 10; y < 45; y++) veil(198, y, 6 + Math.round((y - 10) * 1.8), 1, "rgba(255,233,184,0.04)");
  veil(214, 14, 54, 31, "rgba(255,233,184,0.13)");
  rect(214, 14, 54, 1, "rgba(255,233,184,0.22)"); rect(214, 44, 54, 1, "rgba(255,233,184,0.22)");
  rect(214, 14, 1, 31, "rgba(255,233,184,0.22)"); rect(267, 14, 1, 31, "rgba(255,233,184,0.22)");

  // --- lab coat on a hook ---
  const cx = 288;
  px(cx, 17, "#2a2a28"); px(cx, 18, "#2a2a28"); rect(cx - 3, 19, 7, 1, "#2a2a28");
  for (let y = 22; y < 27; y++) rect(cx - 7, y, 15, 1, "#dcd8cc");
  for (let y = 27; y < 53; y++) rect(cx - 5, y, 11, 1, "#dcd8cc");
  for (let y = 27; y < 47; y++) { rect(cx - 7, y, 2, 1, "#dcd8cc"); rect(cx + 5, y, 2, 1, "#dcd8cc"); px(cx - 7, y, "#b0ad9f"); px(cx + 6, y, "#b0ad9f"); }
  for (let y = 27; y < 53; y++) px(cx + 5, y, "#b0ad9f");
  for (let i = 0; i < 5; i++) { px(cx - i, 22 + i, "#9a978a"); px(cx + i, 22 + i, "#9a978a"); }
  rect(cx + 1, 40, 4, 1, "#b0ad9f"); rect(cx, 28, 1, 24, "#b0ad9f");

  // --- polaroids and frames ---
  const tones = ["#6f7f6a", "#7a6a7f", "#6a7a8a", "#8a7a5a", "#6a8a7a", "#8a6a6a", "#7a7f8a", "#6f8a6a"];
  [[314, 14], [324, 18], [334, 13], [344, 17], [318, 28], [329, 31], [339, 27], [349, 32]].forEach(([x, y], i) => {
    rect(x, y, 8, 9, "#d8d2c0"); rect(x + 1, y + 1, 6, 6, tones[i]); px(x + 3, y + 3, "#e6dcc0");
  });
  rect(362, 16, 11, 14, "#2a1a0e"); rect(363, 17, 9, 12, "#8a8f7c"); rect(365, 23, 5, 5, "#4a5a48");
  rect(376, 22, 10, 12, "#2a1a0e"); rect(377, 23, 8, 10, "#7a8a95"); rect(379, 28, 4, 4, "#4a5a48");

  // --- desk with a monitor ---
  const dx = 396;
  rect(dx + 2, 59, 3, 21, "#2a1a0e"); rect(dx + 47, 59, 3, 21, "#2a1a0e");
  rect(dx, 56, 52, 3, "#3a2616"); rect(dx, 56, 52, 1, "#5a3b22");
  rect(dx + 28, 59, 16, 8, "#2e1d10"); px(dx + 36, 63, "#e8b73a");
  rect(dx + 14, 36, 26, 17, "#14110e"); rect(dx + 16, 38, 22, 13, "#2a3f5a");
  rect(dx + 18, 41, 12, 1, "#6f93c0"); rect(dx + 18, 44, 16, 1, "#4f6f96"); rect(dx + 18, 47, 9, 1, "#6f93c0");
  rect(dx + 25, 53, 4, 3, "#14110e"); rect(dx + 16, 55, 18, 1, "#3a3430");
  rect(dx + 3, 52, 4, 4, "#c8c0b0");
  rect(dx + 44, 48, 1, 8, "#14110e"); rect(dx + 40, 44, 9, 4, "#d9a54a"); rect(dx + 40, 44, 9, 1, "#f0c878");

  // --- chest (floor) ---
  const chx = 454, chy = 64;
  rect(chx - 2, chy + 17, 28, 2, "rgba(0,0,0,0.35)");
  rect(chx - 1, chy - 1, 26, 19, "#140b05");
  rect(chx, chy, 24, 6, "#7a4d28"); rect(chx, chy, 24, 1, "#94623a");
  rect(chx, chy + 6, 24, 11, "#6a4222");
  [4, 8, 12, 16, 20].forEach((i) => { rect(chx + i, chy + 1, 1, 5, "#5a3818"); rect(chx + i, chy + 7, 1, 10, "#58361a"); });
  rect(chx + 3, chy, 2, 17, "#2d2a28"); rect(chx + 19, chy, 2, 17, "#2d2a28"); rect(chx, chy + 6, 24, 1, "#2d2a28");
  rect(chx + 10, chy + 4, 4, 5, "#e8b73a"); px(chx + 11, chy + 6, "#3a2a08"); px(chx + 12, chy + 6, "#3a2a08");

  // --- wall sconces (the glow itself lives on the glow layer) ---
  rect(84, 34, 3, 6, "#1b1109"); rect(84, 30, 3, 4, "#ffd27a"); px(85, 31, "#fff1c4");
  rect(300, 34, 3, 6, "#1b1109"); rect(300, 30, 3, 4, "#ffd27a"); px(301, 31, "#fff1c4");
}

// Stepped (banded) light pools, drawn on their own canvas so they can breathe.
export function drawGlow(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = ART_W;
  canvas.height = ART_H;
  const pool = (cx, cy, r, rgb, step) => {
    for (let k = r; k > 0; k--) {
      ctx.fillStyle = `rgba(${rgb}, ${step})`;
      for (let dy = -k; dy <= k; dy++) {
        const half = Math.floor(Math.sqrt(k * k - dy * dy));
        ctx.fillRect(cx - half, cy + dy, 2 * half + 1, 1);
      }
    }
  };
  pool(85, 32, 26, P.glow, 0.02);
  pool(301, 32, 24, P.glow, 0.02);
  pool(444, 46, 20, P.glow, 0.02);
  pool(63, 27, 18, P.moon, 0.015);
}
