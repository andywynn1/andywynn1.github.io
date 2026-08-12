import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

// A fixed, theme-independent "you've gone over the limit" color — errors
// should always read the same regardless of which theme is active.
const ERROR_COLOR = "#F56C62";

// ---- EASY TWEAK ZONE — THEME COLORS ----
// Edit any of these per theme. Six roles per theme:
//   accent  -> the theme color (borders, buttons, active/pressed states)
//   boardBg -> background color (big square panel + dropdown background)
//   cellBg  -> tile color (grid square fill) — the "|" in "0|0" always
//              matches this automatically, don't set it separately
//   number  -> color of the 0/1 count digits (not the "|") and the A/B
//              letters placed in cells
//   text    -> title / instructions / dropdown label text color
//   given   -> border color around "starting" tiles (pre-filled, locked
//              cells) — keep this soft/faded, not a bold highlight
const THEMES = {
  Classic: {
accent: "#000000",
    boardBg: "#ffffff",
    cellBg: "#c9c9c9",
    number: "#000000",
    text: "#4d4d4d",
    given: "#333333",
  },
  Dark: {
    accent: "#bfbfbf",
    boardBg: "#1e1e29",
    cellBg: "#37353E",
    number: "#ffffff",
    text: "#e8e8f0",
    given: "#bfbfbf",
  },
  
};


// ------------------------------------------

// ---- EASY TWEAK ZONE — GRID SPACING ----
// Width of the thin seam between every pair of adjacent cells (also
// between the last cell and the count-label row/column, just for even
// spacing).
const GRID_GAP_TRACK = "4px";

// The =/X hint sits in a small circular badge, deliberately bigger than
// GRID_GAP_TRACK so it overlaps the edges of the two cells it sits
// between — combined with its box-shadow below, that overlap plus shadow
// is what reads as "floating above the board" rather than flush with it.
const HINT_MARK_SIZE = "20px";
const HINT_MARK_SHADOW = "0 2px 4px rgba(0, 0, 0, 0.3)";
// -----------------------------------------

const SIZE_OPTIONS = ["6 x 6", "8 x 8", "10 x 10"];
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Complex"];
const THEME_OPTIONS = Object.keys(THEMES);

// ---- EASY TWEAK ZONE — SYMBOLS ----
// What A/B render as on the board, in the tool selector, and in the
// dropdown. Add more sets here later the same way — the key doubles as
// both the dropdown option text and the lookup key, so for emoji-based
// sets it's written as the actual glyphs (e.g. "☀️ / ☾") rather than a
// word label, and the dropdown shows exactly that. (Native <select>
// options are text-only, so an image-based set still needs a plain-text
// key here — e.g. "Sun / Moon (photo)" — there's just no way to preview
// the image itself inside the dropdown.)
//
// A/B can ALSO be an image path/URL instead of a character — anything
// ending in .png/.jpg/.jpeg/.gif/.webp/.svg (see isImageSymbol below)
// renders as an <img> everywhere a glyph normally would (board tiles,
// tool selector). Drop the file in src/assets/ like every other image
// on the site and point to it the same way, e.g.:
//   "Sun / Moon (photo)": { A: "src/assets/sun.png", B: "src/assets/moon.png" }
//
// The moon uses the plain-text ☾ glyph rather than the 🌙 emoji: color
// emoji ignore CSS `color` entirely and render in their own fixed colors
// (a golden crescent, same family as the sun), so there'd be no way to
// tell them apart at a glance. ☾ is a normal character, so it picks up
// whatever color is set below — used to make it read as distinctly white
// against the sun's gold. (This trick is text-only — an image's colors
// are whatever the file itself has; SYMBOL_COLOR_OVERRIDES below has no
// effect on an image symbol.)
const SYMBOL_SETS = {
  "X / O": { A: "X", B: "O" },
  "Sun / Moon": { A: "/assets/sun.png", B: "/assets/moon.png" },
  "🐶 / 🐱": { A: "🐶", B: "🐱" },
};
const SYMBOL_OPTIONS = Object.keys(SYMBOL_SETS);

// Whether a symbol value should render as an <img> instead of as text.
const IMAGE_SYMBOL_PATTERN = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;
const isImageSymbol = (value) => typeof value === "string" && IMAGE_SYMBOL_PATTERN.test(value);

// Per-glyph color override, applied wherever that exact symbol is
// rendered (board cells, tool selector) instead of the surrounding
// text/number color. Only glyphs that need to look a specific way
// regardless of theme belong here — everything else just inherits.
const SYMBOL_COLOR_OVERRIDES = {
  "☾": "#ffffff",
};
// ------------------------------------

// Left-side tool selector. "regular" and "erase" are generic actions (no
// specific symbol), so they keep fixed iconify icons; "symbolA"/"symbolB"
// instead render whatever the current SYMBOL_SETS choice maps A/B to —
// see ToolSelector below.
const SYMBOL_TOOLS = [
  { id: "regular", label: "Both (cycle)", icon: "mdi:autorenew" },
  { id: "symbolA", label: "Symbol A only" },
  { id: "symbolB", label: "Symbol B only" },
  { id: "erase", label: "Erase", icon: "mdi:eraser" },
];

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// count < max -> theme.number, count === max -> matches the square color
// (cellBg, a neutral "line's full" cue rather than a mistake), count >
// max -> the fixed error red, but only when showViolations is true — in
// Manual Check mode an over-count is a live mistake signal same as a
// triple or a broken hint, so it's suppressed the same way until checked.
const getCountColor = (count, max, theme, showViolations) => {
  if (count > max) return showViolations ? ERROR_COLOR : theme.number;
  if (count === max) return theme.cellBg;
  return theme.number;
};

// Regular tool cycles empty -> A -> B -> empty. Single-symbol tools toggle
// that symbol on/off. Erase always clears.
const getNextValue = (current, tool) => {
  if (tool === "erase") return null;
  if (tool === "symbolA") return current === "A" ? null : "A";
  if (tool === "symbolB") return current === "B" ? null : "B";
  if (current === null) return "A";
  if (current === "A") return "B";
  return null;
};

// Is position `idx` part of a run of 3 consecutive equal, non-null values,
// somewhere in the line [0, size)? `getValue(i)` reads position i of that
// line (a row or a column, doesn't matter which — caller decides). Only
// the 3 possible triples that could contain `idx` are ever checked
// (idx-2..idx, idx-1..idx+1, idx..idx+2), so this is O(1).
const isInTriple = (getValue, idx, size) => {
  for (let start = idx - 2; start <= idx; start++) {
    if (start < 0 || start + 2 > size - 1) continue;
    const a = getValue(start);
    const b = getValue(start + 1);
    const c = getValue(start + 2);
    if (a !== null && a === b && b === c) return true;
  }
  return false;
};

// After a single cell (r,c) changes — to any value, including null/erase —
// only cells within 2 steps of it in its row and 2 steps in its column
// could possibly have gained OR lost a triple violation. Everything else
// on the board is untouched by this edit, so we never rescan the board.
// (Erase still needs this pass: it can't create a new violation, but it
// can resolve one for a neighbor that was flagged because of this cell.)
const updateViolationsAroundCell = (grid, r, c, size) => {
  const next = grid.map((row) => row.map((cell) => ({ ...cell })));

  const rowStart = Math.max(0, c - 2);
  const rowEnd = Math.min(size - 1, c + 2);
  for (let x = rowStart; x <= rowEnd; x++) {
    next[r][x].rowViolation = isInTriple((i) => next[r][i].value, x, size);
  }

  const colStart = Math.max(0, r - 2);
  const colEnd = Math.min(size - 1, r + 2);
  for (let y = colStart; y <= colEnd; y++) {
    next[y][c].colViolation = isInTriple((i) => next[i][c].value, y, size);
  }

  return next;
};

// ---- EASY TWEAK ZONE — DIFFICULTY ----
// Each difficulty maps to a maximum solving-technique level (see
// solveWithTechniques below). Puzzles are carved out clue-by-clue and
// verified solvable using ONLY that level's techniques — no guessing
// required to actually finish the puzzle, unlike a flat removal percent.
//   1 = edge hints + triple deduction + line balance
//   2 = + line uniqueness (a near-complete line vs. a completed twin line)
//   3 = + a single hypothesis-and-contradiction step (no nested guessing)
//   4 = + nested hypotheses (a guess inside a guess)
const MAX_LEVEL_BY_DIFFICULTY = { Easy: 1, Medium: 2, Hard: 3, Complex: 4 };

// The carve loop keeps removing clues (numbers AND =/X hints, shuffled
// together into one pool) until, separately for each type, it hits
// whichever of these comes first:
//   - remaining givens/edges for that type drop to its own floor share
//   - the whole loop has spent this long carving, total
//   - a single removal test itself runs past its own slice of that budget
// Number-givens and edge-hints get their own floor (rather than one
// shared clue budget) so each can be tuned independently — edges read as
// much noisier per-clue than a numbered cell, so easier difficulties keep
// noticeably fewer of them relative to numbers than this might suggest.
// Without a time budget, "keep removing until nothing more can go" is
// correct but unbounded — a maximally-hard puzzle on a big board can take
// a very long time to prove, since ruling out a deduction costs more than
// finding one.
const MIN_GIVEN_PERCENT_BY_DIFFICULTY = { Easy: 0.40, Medium: 0.30, Hard: 0.20, Complex: 0.12 };
const MIN_EDGE_PERCENT_BY_DIFFICULTY = { Easy: 0.18, Medium: 0.12, Hard: 0.08, Complex: 0.06 };
const CARVE_TIME_BUDGET_MS = 3000;
const PER_CALL_TIME_BUDGET_MS = 400;
// ---------------------------------------

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Counts of A/B among the first `upTo` positions of a line, via the same
// getValue(i) convention as isInTriple.
const countInLine = (getValue, upTo) => {
  let a = 0;
  let b = 0;
  for (let i = 0; i < upTo; i++) {
    if (getValue(i) === "A") a++;
    if (getValue(i) === "B") b++;
  }
  return { a, b };
};

// Randomized backtracking solved-board generator. Fills row-major, trying
// A/B in random order per cell, and backtracks the instant a placement
// breaks a rule — no triple, no more than size/2 of a symbol in a
// row/column, and no two rows or two columns identical once complete.
// Reuses isInTriple so "what counts as a violation" only lives in one place.
const generateSolvedBoard = (size) => {
  const max = size / 2;
  const grid = Array.from({ length: size }, () => Array(size).fill(null));

  const rowSoFarValid = (r, c) => {
    if (isInTriple((i) => grid[r][i], c, size)) return false;
    const { a, b } = countInLine((i) => grid[r][i], c + 1);
    return a <= max && b <= max;
  };

  const colSoFarValid = (r, c) => {
    if (isInTriple((i) => grid[i][c], r, size)) return false;
    const { a, b } = countInLine((i) => grid[i][c], r + 1);
    return a <= max && b <= max;
  };

  const rowIsUnique = (r) => {
    const thisRow = grid[r].join("");
    for (let i = 0; i < r; i++) {
      if (grid[i].join("") === thisRow) return false;
    }
    return true;
  };

  const colIsUnique = (c) => {
    const thisCol = grid.map((row) => row[c]).join("");
    for (let i = 0; i < c; i++) {
      if (grid.map((row) => row[i]).join("") === thisCol) return false;
    }
    return true;
  };

  const fill = (r, c) => {
    if (r === size) return true; // every cell placed

    const [nextR, nextC] = c === size - 1 ? [r + 1, 0] : [r, c + 1];

    for (const symbol of shuffle(["A", "B"])) {
      grid[r][c] = symbol;

      if (!rowSoFarValid(r, c) || !colSoFarValid(r, c)) continue;
      if (c === size - 1 && !rowIsUnique(r)) continue;
      if (r === size - 1 && !colIsUnique(c)) continue;

      if (fill(nextR, nextC)) return true;
    }

    grid[r][c] = null; // dead end — undo and let the caller try the next option
    return false;
  };

  fill(0, 0);
  return grid;
};

// Every =/X relationship between two adjacent cells, derived straight from
// the solved board — "eq" if they match, "neq" if they don't. There's
// always a definite answer here since the solved board has real values
// everywhere, regardless of which of these get revealed as hints later.
// Keyed "h-r-c" (cell (r,c) and the cell to its right) or "v-r-c" (cell
// (r,c) and the cell below it).
const allEdgesFor = (solved, size) => {
  const edges = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      edges.push([`h-${r}-${c}`, solved[r][c] === solved[r][c + 1] ? "eq" : "neq"]);
    }
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      edges.push([`v-${r}-${c}`, solved[r][c] === solved[r + 1][c] ? "eq" : "neq"]);
    }
  }
  return edges;
};

// ---- Logic solver (levels 1-4) ----
// Works on a plain `values[r][c]` grid ('A' | 'B' | null) — separate from
// the UI `cells` structure (which also carries given/violation flags).
// Used only during generation, to verify a candidate puzzle is solvable
// by pure logic at a given technique level, never during play.

const OPPOSITE = { A: "B", B: "A" };

const makeEmptyValues = (size) => Array.from({ length: size }, () => Array(size).fill(null));

const cloneValues = (values) => values.map((row) => row.slice());

// "h-r-c" -> the two cells straddling that edge: (r,c) and (r,c+1).
// "v-r-c" -> (r,c) and (r+1,c).
const edgeEndpoints = (key) => {
  const [kind, rStr, cStr] = key.split("-");
  const r = Number(rStr);
  const c = Number(cStr);
  return kind === "h" ? [r, c, r, c + 1] : [r, c, r + 1, c];
};

// One pass of level-1 techniques: triple deduction, line balance, and
// =/X edge propagation. Mutates `values` in place. A forced move is only
// ever the single logically-valid option, so if this stalls with the
// board still incomplete, level 1 alone can't finish the puzzle — it
// never fills in a guess.
const propagateLevel1 = (values, size, edgeHints) => {
  const max = size / 2;
  let changed = false;

  for (const isRow of [true, false]) {
    for (let line = 0; line < size; line++) {
      const get = (i) => (isRow ? values[line][i] : values[i][line]);
      const set = (i, v) => {
        if (isRow) values[line][i] = v;
        else values[i][line] = v;
      };
      for (let i = 0; i + 2 < size; i++) {
        const a = get(i);
        const b = get(i + 1);
        const c = get(i + 2);

        if (a !== null && a === b) {
          if (c === a) return { contradiction: true };
          if (c === null) {
            set(i + 2, OPPOSITE[a]);
            changed = true;
          }
        }
        if (b !== null && b === c) {
          if (a === b) return { contradiction: true };
          if (a === null) {
            set(i, OPPOSITE[b]);
            changed = true;
          }
        }
        if (a !== null && a === c) {
          if (b === a) return { contradiction: true };
          if (b === null) {
            set(i + 1, OPPOSITE[a]);
            changed = true;
          }
        }
      }
    }
  }

  for (const isRow of [true, false]) {
    for (let line = 0; line < size; line++) {
      const get = (i) => (isRow ? values[line][i] : values[i][line]);
      const set = (i, v) => {
        if (isRow) values[line][i] = v;
        else values[i][line] = v;
      };
      let countA = 0;
      let countB = 0;
      for (let i = 0; i < size; i++) {
        const v = get(i);
        if (v === "A") countA++;
        else if (v === "B") countB++;
      }
      if (countA > max || countB > max) return { contradiction: true };
      if (countA === max || countB === max) {
        const forced = countA === max ? "B" : "A";
        for (let i = 0; i < size; i++) {
          if (get(i) === null) {
            set(i, forced);
            changed = true;
          }
        }
      }
    }
  }

  for (const key of Object.keys(edgeHints)) {
    const type = edgeHints[key];
    const [r1, c1, r2, c2] = edgeEndpoints(key);
    const v1 = values[r1][c1];
    const v2 = values[r2][c2];
    if (v1 !== null && v2 !== null) {
      if (type === "eq" && v1 !== v2) return { contradiction: true };
      if (type === "neq" && v1 === v2) return { contradiction: true };
    } else if (v1 !== null && v2 === null) {
      values[r2][c2] = type === "eq" ? v1 : OPPOSITE[v1];
      changed = true;
    } else if (v2 !== null && v1 === null) {
      values[r1][c1] = type === "eq" ? v2 : OPPOSITE[v2];
      changed = true;
    }
  }

  return { contradiction: false, changed };
};

const propagateLevel1ToFixpoint = (values, size, edgeHints) => {
  for (;;) {
    const result = propagateLevel1(values, size, edgeHints);
    if (result.contradiction) return { contradiction: true };
    if (!result.changed) return { contradiction: false };
  }
};

// Level 2: line uniqueness. A line with exactly 2 empty cells and tied
// counts (max-1 each symbol) must place complementary values there; if a
// fully-filled twin line of the same orientation matches this line
// everywhere else, the assignment that would duplicate the twin is
// forbidden, forcing the other arrangement.
const applyLineUniqueness = (values, size) => {
  const max = size / 2;
  let changed = false;

  for (const isRow of [true, false]) {
    const complete = [];
    for (let line = 0; line < size; line++) {
      const arr = Array.from({ length: size }, (_, i) => (isRow ? values[line][i] : values[i][line]));
      if (arr.every((v) => v !== null)) complete.push(arr);
    }

    for (let line = 0; line < size; line++) {
      const get = (i) => (isRow ? values[line][i] : values[i][line]);
      const set = (i, v) => {
        if (isRow) values[line][i] = v;
        else values[i][line] = v;
      };

      const emptyIdx = [];
      let countA = 0;
      let countB = 0;
      for (let i = 0; i < size; i++) {
        const v = get(i);
        if (v === "A") countA++;
        else if (v === "B") countB++;
        else emptyIdx.push(i);
      }
      if (emptyIdx.length !== 2) continue;
      if (countA !== max - 1 || countB !== max - 1) continue;

      const [i, j] = emptyIdx;
      for (const twin of complete) {
        let matches = true;
        for (let k = 0; k < size; k++) {
          if (k === i || k === j) continue;
          if (twin[k] !== get(k)) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        const twinI = twin[i];
        const twinJ = twin[j];
        if (twinI === twinJ) continue; // guard; shouldn't happen for a valid twin

        set(i, OPPOSITE[twinI]);
        set(j, OPPOSITE[twinJ]);
        changed = true;
        break;
      }
    }
  }

  return { changed };
};

// Levels 3-4: single (or nested) hypothesis-and-contradiction. Tries every
// empty cell in turn; the first one where hypothesizing a value leads to a
// contradiction under `innerLevel` techniques forces the other value.
// Level N's hypothesis test uses level N-1 internally (see
// deduceToFixpoint below), so nested hypotheses fall out of the recursion.
const tryForcedHypotheses = (values, size, edgeHints, innerLevel, deadline) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (values[r][c] !== null) continue;
      if (deadline && Date.now() > deadline) return { timedOut: true };

      const testValue = (val) => {
        const clone = cloneValues(values);
        clone[r][c] = val;
        return deduceToFixpoint(clone, size, edgeHints, innerLevel, deadline);
      };

      const resA = testValue("A");
      if (resA.timedOut) return { timedOut: true };
      if (resA.contradiction) {
        values[r][c] = "B";
        return { changed: true };
      }

      const resB = testValue("B");
      if (resB.timedOut) return { timedOut: true };
      if (resB.contradiction) {
        values[r][c] = "A";
        return { changed: true };
      }
    }
  }
  return { changed: false };
};

// Runs deduction to fixpoint on `values` in place, using techniques up to
// `maxLevel`. `deadline` (a Date.now() timestamp, or falsy for no limit)
// is checked before every hypothesis branch so a single call can never
// run away — a timeout is reported distinctly from a genuine contradiction
// so callers never mistake "ran out of time" for "proven impossible".
const deduceToFixpoint = (values, size, edgeHints, maxLevel, deadline) => {
  for (;;) {
    if (deadline && Date.now() > deadline) return { timedOut: true };

    const lvl1 = propagateLevel1ToFixpoint(values, size, edgeHints);
    if (lvl1.contradiction) return { contradiction: true };

    if (maxLevel >= 2) {
      const lvl2 = applyLineUniqueness(values, size);
      if (lvl2.changed) continue;
    }

    if (maxLevel >= 3) {
      if (deadline && Date.now() > deadline) return { timedOut: true };
      const hyp = tryForcedHypotheses(values, size, edgeHints, maxLevel - 1, deadline);
      if (hyp.timedOut) return { timedOut: true };
      if (hyp.contradiction) return { contradiction: true };
      if (hyp.changed) continue;
    }

    break;
  }
  return { contradiction: false };
};

// Top-level entry point: clones `values`, deduces as far as this technique
// level allows, and reports whether the puzzle is fully (and therefore
// uniquely — see notes above) solved by it.
const solveWithTechniques = (values, size, edgeHints, maxLevel, deadline) => {
  const v = cloneValues(values);
  const result = deduceToFixpoint(v, size, edgeHints, maxLevel, deadline);
  if (result.timedOut) return { solved: false, timedOut: true };
  if (result.contradiction) return { solved: false, contradiction: true };
  const full = v.every((row) => row.every((x) => x !== null));
  if (!full) return { solved: false };
  return { solved: true, grid: v };
};

// Lets the carve loop below hand control back to the browser between
// batches of work, so the "generating…" spinner can actually paint and
// animate instead of the whole thing running as one blocking call.
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

// Carve-and-verify puzzle generation. Starts from a fully solved board
// with EVERY cell given and EVERY =/X relationship revealed, then shuffles
// a single combined pool of removable clues (cell-givens AND edge-hints
// together) and tries removing each in turn: after each tentative removal,
// re-solve the puzzle using ONLY `difficulty`'s technique level; keep the
// removal if it still solves, revert it if not. This guarantees the final
// puzzle is solvable by exactly the claimed technique level — never by
// luck or guessing — unlike picking a flat percentage of clues up front.
//
// Bounded by three things (whichever comes first), since "keep removing
// until nothing more can go" is correct but unbounded in the worst case:
//   - remaining givens/edges hit MIN_GIVEN_PERCENT_BY_DIFFICULTY or
//     MIN_EDGE_PERCENT_BY_DIFFICULTY's floor (checked separately per type)
//   - the whole loop exceeds CARVE_TIME_BUDGET_MS
//   - a single removal's solve check exceeds PER_CALL_TIME_BUDGET_MS
//     (checked before every hypothesis branch inside the solver, not just
//     between clue tests — a timed-out check is treated as "can't prove
//     it", so the clue is safely kept, never incorrectly removed)
const generatePuzzleForDifficulty = async (size, difficulty) => {
  const solved = generateSolvedBoard(size);
  const maxLevel = MAX_LEVEL_BY_DIFFICULTY[difficulty] ?? 1;
  const minGivenPercent = MIN_GIVEN_PERCENT_BY_DIFFICULTY[difficulty] ?? 0.3;
  const minEdgePercent = MIN_EDGE_PERCENT_BY_DIFFICULTY[difficulty] ?? 0.1;

  const givenSet = new Set();
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) givenSet.add(`${r}-${c}`);

  const allEdges = allEdgesFor(solved, size);
  const edgeHints = {};
  for (const [key, type] of allEdges) edgeHints[key] = type;

  const pool = shuffle([
    ...Array.from(givenSet, (key) => ({ kind: "cell", key })),
    ...allEdges.map(([key]) => ({ kind: "edge", key })),
  ]);

  const totalCells = size * size;
  const totalEdges = allEdges.length;
  const minGivenCells = Math.ceil(totalCells * minGivenPercent);
  const minEdgeCount = Math.ceil(totalEdges * minEdgePercent);
  const deadlineOuter = Date.now() + CARVE_TIME_BUDGET_MS;

  let givenCount = totalCells;
  let edgeCount = totalEdges;

  for (let i = 0; i < pool.length; i++) {
    if (Date.now() > deadlineOuter) break;
    if (givenCount <= minGivenCells && edgeCount <= minEdgeCount) break;

    const clue = pool[i];
    // Each type stops getting tested once IT hits its own floor, but the
    // other type keeps going until the loop as a whole runs out of pool
    // or time — this is what lets, say, edges carve down further than
    // cells even though they're shuffled into one combined order.
    if (clue.kind === "cell" && givenCount <= minGivenCells) continue;
    if (clue.kind === "edge" && edgeCount <= minEdgeCount) continue;

    let removedGivenKey = null;
    let removedEdgeKey = null;
    let removedEdgeType = null;

    if (clue.kind === "cell") {
      if (!givenSet.has(clue.key)) continue;
      givenSet.delete(clue.key);
      removedGivenKey = clue.key;
    } else {
      if (!(clue.key in edgeHints)) continue;
      removedEdgeType = edgeHints[clue.key];
      delete edgeHints[clue.key];
      removedEdgeKey = clue.key;
    }

    const values = makeEmptyValues(size);
    for (const key of givenSet) {
      const [r, c] = key.split("-").map(Number);
      values[r][c] = solved[r][c];
    }

    const perCallDeadline = Math.min(deadlineOuter, Date.now() + PER_CALL_TIME_BUDGET_MS);
    const result = solveWithTechniques(values, size, edgeHints, maxLevel, perCallDeadline);

    if (result.solved) {
      if (clue.kind === "cell") givenCount--;
      else edgeCount--;
    } else {
      // Not solvable at this level (or we couldn't prove it in time) —
      // put the clue back rather than risk an unsolvable/guess-requiring
      // puzzle.
      if (removedGivenKey) givenSet.add(removedGivenKey);
      if (removedEdgeKey) edgeHints[removedEdgeKey] = removedEdgeType;
    }

    if (i % 15 === 0) await yieldToBrowser();
  }

  const cells = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const given = givenSet.has(`${r}-${c}`);
      return {
        value: given ? solved[r][c] : null,
        given,
        rowViolation: false,
        colViolation: false,
      };
    })
  );

  // Final pass: a hint between two cells that are BOTH already given is
  // dead weight (the player can't edit either one), so it never stays
  // revealed even if it happened to survive the carve.
  const isGiven = (r, c) => givenSet.has(`${r}-${c}`);
  const filteredEdgeHints = {};
  for (const [key, type] of Object.entries(edgeHints)) {
    const [r1, c1, r2, c2] = edgeEndpoints(key);
    if (isGiven(r1, c1) && isGiven(r2, c2)) continue;
    filteredEdgeHints[key] = type;
  }

  return { cells, edgeHints: filteredEdgeHints };
};

// ---- Win checking ----
// Cheapest check goes first: most moves during play don't even have a
// full board yet, so this bails out immediately without touching the
// heavier checks below. Only once every cell is filled do we bother
// checking violations, balance, and uniqueness — each an O(size^2) pass,
// which only ever runs once per completed board, not once per move.
const isBoardFull = (cells) => cells.every((row) => row.every((cell) => cell.value !== null));

const hasNoViolations = (cells) =>
  cells.every((row) => row.every((cell) => !cell.rowViolation && !cell.colViolation));

const countsAreBalanced = (cells, size) => {
  const max = size / 2;
  for (let r = 0; r < size; r++) {
    const { a, b } = countInLine((c) => cells[r][c].value, size);
    if (a !== max || b !== max) return false;
  }
  for (let c = 0; c < size; c++) {
    const { a, b } = countInLine((r) => cells[r][c].value, size);
    if (a !== max || b !== max) return false;
  }
  return true;
};

const rowsAndColsAreUnique = (cells, size) => {
  const rowKeys = cells.map((row) => row.map((cell) => cell.value).join(""));
  if (new Set(rowKeys).size !== size) return false;

  const colKeys = Array.from({ length: size }, (_, c) => cells.map((row) => row[c].value).join(""));
  if (new Set(colKeys).size !== size) return false;

  return true;
};

// A revealed =/X hint is a real clue, not just decoration — a completed
// board that contradicts one shouldn't count as a win, even if it happens
// to satisfy the 3 base rules.
const edgeHintsSatisfied = (cells, edgeHints) =>
  Object.entries(edgeHints).every(([key, type]) => edgeIsSatisfied(cells, key, type));

// Reads both cells on either side of an edge key and checks them against
// the hint's type. Not-yet-filled cells never count as a violation — only
// once both sides have a value can the hint actually be broken.
const edgeIsSatisfied = (cells, key, type) => {
  const [kind, rStr, cStr] = key.split("-");
  const r = Number(rStr);
  const c = Number(cStr);
  const a = cells[r][c].value;
  const b = kind === "h" ? cells[r][c + 1].value : cells[r + 1][c].value;
  if (a === null || b === null) return true;
  return type === "eq" ? a === b : a !== b;
};

// The revealed-hint keys that touch cell (r,c) — at most 4 (left, right,
// up, down). Same idea as the triple check: a single cell edit can only
// ever affect the hints directly touching it, nothing further out.
const edgeKeysTouching = (r, c, size) => {
  const keys = [];
  if (c > 0) keys.push(`h-${r}-${c - 1}`);
  if (c < size - 1) keys.push(`h-${r}-${c}`);
  if (r > 0) keys.push(`v-${r - 1}-${c}`);
  if (r < size - 1) keys.push(`v-${r}-${c}`);
  return keys;
};

// After cell (r,c) changes, re-checks only the (up to 4) revealed hints
// touching it and updates their violation flags — never rescans every
// hint on the board.
const updateEdgeViolationsAroundCell = (prevViolations, cells, edgeHints, r, c, size) => {
  const next = { ...prevViolations };
  for (const key of edgeKeysTouching(r, c, size)) {
    const type = edgeHints[key];
    if (!type) continue; // no hint revealed on this edge — nothing to track
    next[key] = !edgeIsSatisfied(cells, key, type);
  }
  return next;
};

const checkWin = (cells, size, edgeHints) =>
  isBoardFull(cells) &&
  hasNoViolations(cells) &&
  countsAreBalanced(cells, size) &&
  rowsAndColsAreUnique(cells, size) &&
  edgeHintsSatisfied(cells, edgeHints);

export default function Binairo() {
  const [size, setSize] = useState(SIZE_OPTIONS[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTY_OPTIONS[0]);
  const [theme, setTheme] = useState(THEME_OPTIONS[0]);
  const [symbols, setSymbols] = useState(SYMBOL_OPTIONS[0]);

  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tool, setTool] = useState("regular");
  const [cells, setCells] = useState(null);
  const [edgeHints, setEdgeHints] = useState(null);

  // Mirrors `rowViolation`/`colViolation` on cells, but for revealed =/X
  // edge hints: `edgeViolations[key]` is true once both cells on that
  // edge are filled and contradict the hint. Recomputed only for the
  // (at most 4) edges touching the cell that just changed — same O(1)
  // per-move approach as updateViolationsAroundCell for triples.
  const [edgeViolations, setEdgeViolations] = useState({});

  // Undo/redo history. Each entry is a full { cells, edgeViolations }
  // snapshot from just before a move. Cheap to keep uncapped here — the
  // board is at most 100 cells, and cell/edge-violation objects are never
  // mutated in place anywhere in this file (every update creates fresh
  // arrays/objects), so a past snapshot is safe to hold a plain reference
  // to without cloning; it can never be changed out from under us later.
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Manual Check mode: once turned on (see the toolbar below), moves stop
  // flagging mistakes live — `checksRevealed` controls whether the
  // violation flags already sitting on `cells`/`edgeViolations` are
  // actually shown, and gets reset to false on every move so a stale
  // check doesn't linger past the move that invalidated it. checkWin
  // itself is unaffected either way, since it reads the real flags
  // directly rather than whatever's currently on screen.
  const [manualCheck, setManualCheck] = useState(false);
  const [checksRevealed, setChecksRevealed] = useState(false);

  // Which cell keyboard input applies to — set by clicking a cell or by
  // arrow-key navigation. Purely a display/input concern, not part of
  // puzzle state.
  const [focusedCell, setFocusedCell] = useState(null);

  // The rules/controls drawer — closed by default so the page starts
  // compact; opened via the button rendered next to the title.
  const [showInstructions, setShowInstructions] = useState(false);

  // True while the carve-and-verify generator is running (see
  // generatePuzzleForDifficulty above). It's fast in practice, but never
  // instant, so the square panel shows a spinner instead of a frozen UI —
  // and the setting dropdowns stay locked, same as while a game is active.
  const [isGenerating, setIsGenerating] = useState(false);

  // True once checkWin confirms the board is full, valid, and unique —
  // see applyCellEdit below, the only place cells changes during play.
  const [isComplete, setIsComplete] = useState(false);

  const t = THEMES[theme];

  // N from "6 x 6" -> 6
  const gridSize = parseInt(size.split("x")[0].trim(), 10);

  // Live mode always shows violations as they happen; Manual Check mode
  // hides them until a check is explicitly requested (see
  // handleManualCheckClick above).
  const showViolations = !manualCheck || checksRevealed;

  useEffect(() => {
    if (!started || isPaused || isComplete) return;
    const interval = setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => clearInterval(interval);
  }, [started, isPaused, isComplete]);

  // Auto-pause when the tab/window loses visibility (switching apps,
  // switching tabs, locking the screen). Deliberately one-directional —
  // it never auto-resumes on return, so coming back to the game always
  // takes a deliberate tap, same as if you'd paused it yourself.
  useEffect(() => {
    if (!started || isComplete) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setIsPaused(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [started, isComplete]);

  const handleStart = async () => {
    setElapsed(0);
    setIsPaused(false);
    setIsComplete(false);
    setHistory([]);
    setRedoStack([]);
    setManualCheck(false);
    setChecksRevealed(false);
    setFocusedCell(null);
    setIsGenerating(true);
    const puzzle = await generatePuzzleForDifficulty(gridSize, difficulty);
    setCells(puzzle.cells);
    setEdgeHints(puzzle.edgeHints);
    setEdgeViolations({});
    setIsGenerating(false);
    setStarted(true);
  };

  // Clears your inputs but keeps the same puzzle (given cells stay put).
  // Non-given cells also get their violation flags reset, since they're
  // going back to empty and can't be part of a triple (or a broken edge
  // hint) anymore. Undo history doesn't carry across this — the board
  // it refers to no longer exists.
  const handleStartOver = () => {
    setElapsed(0);
    setIsPaused(false);
    setIsComplete(false);
    setEdgeViolations({});
    setHistory([]);
    setRedoStack([]);
    setChecksRevealed(false);
    setCells((prev) =>
      prev
        ? prev.map((row) =>
            row.map((cell) =>
              cell.given
                ? cell
                : { ...cell, value: null, rowViolation: false, colViolation: false }
            )
          )
        : prev
    );
  };

  // Bails all the way out to the settings screen — unlocks the dropdowns.
  const handleNewPuzzle = () => {
    setStarted(false);
    setIsPaused(false);
    setElapsed(0);
    setIsComplete(false);
    setCells(null);
    setEdgeHints(null);
    setEdgeViolations({});
    setHistory([]);
    setRedoStack([]);
    setChecksRevealed(false);
  };

  // Shared by mouse clicks and keyboard input — applies a new value to
  // (r, c), pushes an undo snapshot of the board as it was just before,
  // and runs the same violation/win-check bookkeeping either input path
  // needs. `newValue` is already resolved by the caller (tool-cycled for
  // a click, direct A/B/erase for a keypress), so this only ever applies
  // it, never decides what it should be.
  const applyCellEdit = (r, c, newValue) => {
    const cell = cells[r][c];
    if (cell.given) return; // starting tiles can't be edited

    setHistory((h) => [...h, { cells, edgeViolations }]);
    setRedoStack([]); // a fresh move invalidates whatever was available to redo

    const withNewValue = cells.map((row) => row.slice());
    withNewValue[r][c] = { ...cell, value: newValue };
    const updatedCells = updateViolationsAroundCell(withNewValue, r, c, gridSize);
    const updatedEdgeViolations = updateEdgeViolationsAroundCell(edgeViolations, updatedCells, edgeHints, r, c, gridSize);

    setCells(updatedCells);
    setEdgeViolations(updatedEdgeViolations);
    if (manualCheck) setChecksRevealed(false); // hide again until the next explicit check

    if (checkWin(updatedCells, gridSize, edgeHints)) {
      setIsComplete(true);
    }
  };

  // Responds to the click itself rather than watching `cells` in an
  // effect: the win check only ever needs to happen right after a move
  // actually changes the board, so it belongs here, not in a separate
  // effect body that would just be reacting to its own side effect.
  const handleCellClick = (r, c) => {
    if (!started || isPaused || isComplete || !cells) return;
    setFocusedCell({ r, c }); // clicking a cell also moves keyboard focus there
    applyCellEdit(r, c, getNextValue(cells[r][c].value, tool));
  };

  const handleUndo = () => {
    if (!started || isPaused || isComplete || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, { cells, edgeViolations }]);
    setCells(previous.cells);
    setEdgeViolations(previous.edgeViolations);
    if (manualCheck) setChecksRevealed(false);
  };

  const handleRedo = () => {
    if (!started || isPaused || isComplete || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, { cells, edgeViolations }]);
    setCells(next.cells);
    setEdgeViolations(next.edgeViolations);
    if (manualCheck) setChecksRevealed(false);
  };

  // First press turns Manual Check mode on (mistakes stop flagging live,
  // starting from right now); every press after that just performs one
  // on-demand check. There's no way back to live mode mid-puzzle — kept
  // deliberately one-directional, same reasoning as the auto-pause above,
  // so the mode is a single clear choice rather than something to keep
  // flipping mid-game.
  const handleManualCheckClick = () => {
    if (!manualCheck) {
      setManualCheck(true);
      setChecksRevealed(false);
    } else {
      setChecksRevealed(true);
    }
  };

  // Keyboard play, active only while a puzzle is actually up on screen.
  // Arrow keys move a focus cursor (independent of mouse hover); A/B (or
  // 1/2) set that cell directly regardless of the currently selected
  // tool; Space/Enter apply the tool instead, same as a click would;
  // Backspace/Delete/0 erase. Listening on window rather than putting
  // tabIndex/onKeyDown on every cell button keeps the grid's DOM simple
  // and matches how the mouse path already ignores individual button
  // focus entirely.
  useEffect(() => {
    if (!started || isPaused || isComplete || !cells) return;

    const handleKeyDown = (e) => {
      if (!focusedCell) {
        if (e.key.startsWith("Arrow")) {
          e.preventDefault();
          setFocusedCell({ r: 0, c: 0 });
        }
        return;
      }

      const { r, c } = focusedCell;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedCell({ r: Math.max(0, r - 1), c });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedCell({ r: Math.min(gridSize - 1, r + 1), c });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedCell({ r, c: Math.max(0, c - 1) });
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedCell({ r, c: Math.min(gridSize - 1, c + 1) });
        return;
      }

      const cell = cells[r][c];
      if (cell.given) return;

      let nextValue;
      if (e.key === "a" || e.key === "A" || e.key === "1") nextValue = "A";
      else if (e.key === "b" || e.key === "B" || e.key === "2") nextValue = "B";
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") nextValue = null;
      else if (e.key === " " || e.key === "Enter") nextValue = getNextValue(cell.value, tool);
      else return;

      e.preventDefault();
      applyCellEdit(r, c, nextValue);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isPaused, isComplete, cells, edgeHints, edgeViolations, focusedCell, tool, gridSize, manualCheck]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "80px 20px",
        // Previously only the panel itself picked up theme changes — the
        // page around it (behind the title, dropdowns, everything) never
        // did, so switching to Dark left a dark panel floating on a light
        // page. Reusing boardBg here instead of introducing a separate
        // per-theme page color keeps the panel and its surroundings a
        // single continuous surface, which is what a "whole page" theme
        // switch should look like.
        backgroundColor: t.boardBg,
        transition: "background-color 0.3s ease",
      }}
    >
      {/* Overrides the browser's default focus ring + native dropdown arrow
          on the selects below (without this, some browsers show their own
          arrow/indicator alongside our custom chevron icon). */}
      <style>{`
        .binairo-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        .binairo-select:focus {
          outline: 2px solid ${t.accent};
          outline-offset: 2px;
        }
        .binairo-select::-ms-expand {
          display: none;
        }
        @keyframes binairo-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .binairo-spinner {
          animation: binairo-spin 0.9s linear infinite;
        }
      `}</style>

      <h1
        style={{
          fontSize: "28px",
          fontStyle: "italic",
          fontWeight: 700,
          color: t.text,
          marginBottom: "24px",
        }}
      >
        Binairo
      </h1>

      <HowToPlayButton onClick={() => setShowInstructions(true)} theme={t} />
      <HowToPlaySidebar open={showInstructions} onClose={() => setShowInstructions(false)} theme={t} />

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <Dropdown
          label="Size"
          options={SIZE_OPTIONS}
          value={size}
          onChange={setSize}
          disabled={started || isGenerating}
          theme={t}
        />
        <Dropdown
          label="Difficulty"
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={setDifficulty}
          disabled={started || isGenerating}
          theme={t}
        />
        <Dropdown
          label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
          disabled={started || isGenerating}
          theme={t}
        />
        <Dropdown
          label="Symbols"
          options={SYMBOL_OPTIONS}
          value={symbols}
          onChange={setSymbols}
          disabled={started || isGenerating}
          theme={t}
        />
      </div>

      {/* Undo / Redo / Manual Check — its own row so it doesn't crowd the
          settings dropdowns above or the timer/pause row below. Only
          meaningful once a puzzle is up, so it takes up no space before
          Start. */}
      {started && (
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <SmallButton onClick={handleUndo} theme={t} disabled={isPaused || isComplete || history.length === 0}>
            <Icon icon="mdi:undo" width="16" />
            Undo
          </SmallButton>

          <SmallButton onClick={handleRedo} theme={t} disabled={isPaused || isComplete || redoStack.length === 0}>
            <Icon icon="mdi:redo" width="16" />
            Redo
          </SmallButton>

          <SmallButton onClick={handleManualCheckClick} theme={t} active={manualCheck} disabled={isPaused || isComplete}>
            <Icon icon={manualCheck ? "mdi:magnify" : "mdi:eye-off-outline"} width="16" />
            {manualCheck ? "Check" : "Manual Check"}
          </SmallButton>
        </div>
      )}

      {/* Tool selector (left) + square panel (right). Square stays put in
          every state — only its contents swap: Start button, Resume button
          (while paused), or the grid. */}
      <div style={{ width: "100%", maxWidth: "420px", display: "flex", gap: "10px", alignItems: "stretch" }}>
        {started && !isPaused && (
          <ToolSelector tool={tool} setTool={setTool} theme={t} symbolSet={SYMBOL_SETS[symbols]} />
        )}

        <div
          style={{
            flex: 1,
            aspectRatio: "1 / 1",
            borderRadius: "32px",
            border: `4px solid ${t.accent}`,
            backgroundColor: t.boardBg,
            padding: started && !isPaused ? "16px" : "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {isGenerating ? (
            <GeneratingSpinner theme={t} />
          ) : !started ? (
            <BigButton label="Start" onClick={handleStart} theme={t} />
          ) : isPaused ? (
            <BigButton label="Resume" onClick={() => setIsPaused(false)} theme={t} />
          ) : (
            <BinairoGrid
              size={gridSize}
              cells={cells}
              edgeHints={edgeHints || {}}
              edgeViolations={edgeViolations}
              showViolations={showViolations}
              focusedCell={focusedCell}
              isComplete={isComplete}
              onCellClick={handleCellClick}
              theme={t}
              symbolSet={SYMBOL_SETS[symbols]}
            />
          )}
          {isComplete && <ConfettiBurst />}
        </div>
      </div>

      {/* Moved below the square — Pause/Resume, Start Over, New Puzzle.
          maxWidth is wider than the panel above on purpose: at 420px this
          row and the panel's content width were nearly identical, so as
          the timer digits changed width slightly (proportional fonts
          don't give every digit the same width) the row would tip past
          the wrap threshold and back, bouncing New Puzzle on and off a
          second line. tabular-nums on the timer removes the underlying
          cause; the wider cap is slack on top of that so it's never
          border-line again even with longer button labels later. */}
      {started && (
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: t.text, fontVariantNumeric: "tabular-nums" }}>
            Time: {formatTime(elapsed)}
          </span>

          <SmallButton onClick={() => setIsPaused((p) => !p)} theme={t} active={isPaused}>
            <Icon icon={isPaused ? "mdi:play" : "mdi:pause"} width="16" />
            {isPaused ? "Resume" : "Pause"}
          </SmallButton>

          <SmallButton onClick={handleStartOver} theme={t}>
            <Icon icon="mdi:refresh" width="16" />
            Start Over
          </SmallButton>

          <SmallButton onClick={handleNewPuzzle} theme={t}>
            <Icon icon="mdi:shuffle-variant" width="16" />
            New Puzzle
          </SmallButton>
        </div>
      )}

      {/* Win banner — hidden until real win-checking sets isComplete. */}
      {isComplete && (
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            color: t.text,
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          🎉 Congrats! You beat a {difficulty} puzzle in {formatTime(elapsed)}!
        </div>
      )}
    </div>
  );
}

// Shown in the square panel while generatePuzzleForDifficulty carves out
// a puzzle. Generation is fast (typically well under a second, bounded by
// CARVE_TIME_BUDGET_MS), but never instant — this keeps the panel from
// looking frozen and gives the async carve loop's periodic yields
// somewhere to actually paint.
// ---- EASY TWEAK ZONE — HOW TO PLAY DRAWER ----
const SIDEBAR_WIDTH = "min(340px, 88vw)";
// -----------------------------------------------

// Fixed top-left, mirrors BackButton's top-right placement. Stays visible
// throughout — the controls list is worth re-checking mid-game, not just
// before Start.
function HowToPlayButton({ onClick, theme }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      aria-label="How to play"
      title="How to play"
      style={{
        position: "fixed",
        top: "40px",
        left: "40px",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "none",
        backgroundColor: theme.accent,
        color: "#fff",
        cursor: "pointer",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Icon icon="mdi:help" width="22" />
    </motion.button>
  );
}

// Slide-in drawer (rules + controls), replacing what used to be a fixed
// paragraph under the title. Off-screen and unmounted by default — moving
// it here instead of always showing it inline is what actually saves the
// vertical space on both desktop and mobile.
function HowToPlaySidebar({ open, onClose, theme }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              zIndex: 998,
            }}
          />
          <motion.div
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: SIDEBAR_WIDTH,
              backgroundColor: theme.boardBg,
              borderRight: `4px solid ${theme.accent}`,
              boxShadow: "4px 0 24px rgba(0, 0, 0, 0.25)",
              zIndex: 999,
              padding: "28px 24px",
              overflowY: "auto",
            }}
          >
            <button
              onClick={onClose}
              aria-label="Close instructions"
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "rgba(0, 0, 0, 0.08)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon icon="mdi:close" width="18" color={theme.text} />
            </button>

            <InstructionSection title="How to Play" theme={theme} first>
              <p style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: 1.5, color: theme.text }}>
                Fill every tile with one of two symbols so that:
              </p>
              <InstructionList theme={theme}>
                <li>No row or column has three in a row.</li>
                <li>Every row and column ends up with an equal split of both symbols.</li>
                <li>No two rows or columns match exactly.</li>
                <li>A circled = or X between two tiles means they must match or must differ.</li>
              </InstructionList>
            </InstructionSection>

            <InstructionSection title="Controls" theme={theme}>
              <InstructionList theme={theme}>
                <li>Click a tile to fill it in.</li>
                <li>
                  <b>Arrow keys:</b> Move
                </li>
                <li>
                  <b>A / B (or 1 / 2):</b> Set a symbol directly
                </li>
                <li>
                  <b>Space:</b> Use your selected tool
                </li>
                <li>
                  <b>Backspace:</b> Erase
                </li>
              </InstructionList>
            </InstructionSection>

            <InstructionSection title="Extra" theme={theme}>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: theme.text }}>
                Prefer to catch your own mistakes instead of having them flagged live? Turn on Manual
                Check next to the board.
              </p>
            </InstructionSection>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InstructionSection({ title, theme, first, children }) {
  return (
    <div style={{ marginTop: first ? 0 : "24px", paddingRight: first ? "36px" : 0 }}>
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: theme.accent,
          marginBottom: "10px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InstructionList({ theme, children }) {
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
        fontSize: "14px",
        lineHeight: 1.4,
        color: theme.text,
      }}
    >
      {children}
    </ul>
  );
}

function GeneratingSpinner({ theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <Icon icon="mdi:loading" width="36" color={theme.accent} className="binairo-spinner" />
      <span style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>Generating…</span>
    </div>
  );
}

// ---- EASY TWEAK ZONE — CONFETTI ----
const CONFETTI_COLORS = ["#F56C62", "#508eeb", "#ace685", "#f5c542", "#c77dff"];
const CONFETTI_COUNT = 36;
// -------------------------------------

// A one-shot burst fired from the center of the panel when a puzzle is
// completed — see the `isComplete && <ConfettiBurst />` in the panel
// below. Piece positions are randomized once per mount via useMemo, and
// since this only ever mounts fresh (isComplete flips false->true between
// puzzles, unmounting and remounting it), every win gets its own burst
// without any extra bookkeeping to reset. No external confetti library —
// just a handful of small rotated rectangles animated outward and down.
function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 160;
        return {
          id: i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: Math.random() * 360,
          delay: Math.random() * 0.15,
          duration: 1.6 + Math.random() * 0.6,
          width: 6 + Math.random() * 6,
        };
      }),
    []
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y + 220, rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${p.width}px`,
            height: `${p.width * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
          }}
        />
      ))}
    </div>
  );
}

function BigButton({ label, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 32px",
        borderRadius: "999px",
        border: "none",
        backgroundColor: theme.accent,
        color: "#fff",
        fontSize: "15px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function SmallButton({ onClick, theme, active, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 12px",
        borderRadius: "999px",
        border: `2px solid ${disabled ? "#bbb" : theme.accent}`,
        backgroundColor: disabled ? "#e2e2e2" : active ? theme.accent : "transparent",
        color: disabled ? "#999" : active ? "#fff" : theme.accent,
        fontSize: "13px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ToolSelector({ tool, setTool, theme, symbolSet }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "44px",
        borderRadius: "16px",
        overflow: "hidden",
        border: `2px solid ${theme.accent}`,
      }}
    >
      {SYMBOL_TOOLS.map((opt) => {
        const active = tool === opt.id;
        // "regular"/"erase" are generic actions with a fixed icon;
        // "symbolA"/"symbolB" show whatever the chosen symbol set maps
        // A/B to, so this selector always matches the board.
        const symbolChar = opt.id === "symbolA" ? symbolSet.A : opt.id === "symbolB" ? symbolSet.B : null;
        return (
          <button
            key={opt.id}
            onClick={() => setTool(opt.id)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              backgroundColor: active ? theme.cellBg : theme.boardBg,
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            {symbolChar ? (
              isImageSymbol(symbolChar) ? (
                <img src={symbolChar} alt={opt.label} draggable={false} style={{ width: "20px", height: "20px", objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: "18px", lineHeight: 1, color: SYMBOL_COLOR_OVERRIDES[symbolChar] || theme.text }}>
                  {symbolChar}
                </span>
              )
            ) : (
              <Icon icon={opt.icon} width="20" color={theme.text} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Column/row tracks alternate cell, gap, cell, gap, ..., cell, gap, label —
// so there's always a thin track between any two adjacent cells (and one
// more before the label track, just to keep spacing even). `cellLine(i)`
// and `gapLine(i)` return the 1-indexed CSS grid line for cell i and the
// gap immediately after it; `labelLine(size)` is the line for the count
// labels, right after the last cell's gap.
const cellLine = (i) => 2 * i + 1;
const gapLine = (i) => 2 * i + 2;
const labelLine = (size) => 2 * size + 1;

const trackList = (size) => {
  const tracks = [];
  for (let i = 0; i < size; i++) {
    tracks.push("1fr");
    tracks.push(GRID_GAP_TRACK);
  }
  tracks.push("1fr"); // count-label row/column
  return tracks.join(" ");
};

function BinairoGrid({
  size,
  cells,
  edgeHints,
  edgeViolations,
  showViolations,
  focusedCell,
  isComplete,
  onCellClick,
  theme,
  symbolSet,
}) {
  const max = size / 2; // e.g. 6x6 -> at most 3 of each symbol per row/column
  // Ripple stagger: cells further from the board's center start their
  // little "pop" a beat later, so the win animation reads as an outward
  // wave rather than every cell firing at once.
  const centerR = (size - 1) / 2;
  const centerC = (size - 1) / 2;

  const countRow = (r) => {
    let a = 0;
    let b = 0;
    for (let c = 0; c < size; c++) {
      if (cells[r][c].value === "A") a++;
      if (cells[r][c].value === "B") b++;
    }
    return { a, b };
  };

  const countCol = (c) => {
    let a = 0;
    let b = 0;
    for (let r = 0; r < size; r++) {
      if (cells[r][c].value === "A") a++;
      if (cells[r][c].value === "B") b++;
    }
    return { a, b };
  };

  const elements = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cells[r][c];
      // Violation (part of a 3-in-a-row/column run) always wins visually
      // over the "given" styling — a given tile caught in a violation
      // still needs to flag red so the player can see the conflict, even
      // though they can't edit that particular tile to fix it. Suppressed
      // entirely in Manual Check mode until a check is requested.
      const isViolating = showViolations && (cell.rowViolation || cell.colViolation);
      const isFocused = focusedCell && focusedCell.r === r && focusedCell.c === c;
      const borderColor = isViolating ? ERROR_COLOR : cell.given ? theme.given : null;
      const symbolChar = cell.value ? symbolSet[cell.value] : null;
      const symbolColor = symbolChar ? SYMBOL_COLOR_OVERRIDES[symbolChar] : null;
      const rippleDelay = Math.hypot(r - centerR, c - centerC) * 0.05;
      elements.push(
        <motion.button
          key={`cell-${r}-${c}`}
          onClick={() => onCellClick(r, c)}
          animate={isComplete ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={isComplete ? { duration: 0.5, delay: rippleDelay, ease: "easeOut" } : { duration: 0 }}
          style={{
            gridColumn: cellLine(c),
            gridRow: cellLine(r),
            backgroundColor: theme.cellBg,
            borderRadius: "4px",
            border: borderColor ? `2px solid ${borderColor}` : "none",
            boxShadow: isFocused ? `0 0 0 3px ${theme.accent}99` : "none",
            cursor: cell.given ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            fontWeight: 800,
            color: theme.number,
            padding: 0,
          }}
        >
          {symbolChar ? (
            isImageSymbol(symbolChar) ? (
              <img
                src={symbolChar}
                alt=""
                draggable={false}
                style={{ width: "65%", height: "65%", objectFit: "contain", pointerEvents: "none" }}
              />
            ) : symbolColor ? (
              <span style={{ color: symbolColor }}>{symbolChar}</span>
            ) : (
              symbolChar
            )
          ) : null}
        </motion.button>
      );

      // Horizontal hint, in the gap track to this cell's right.
      if (c < size - 1) {
        const hint = edgeHints[`h-${r}-${c}`];
        if (hint) {
          elements.push(
            <HintMark
              key={`h-${r}-${c}`}
              column={gapLine(c)}
              row={cellLine(r)}
              type={hint}
              theme={theme}
              isViolating={showViolations && !!edgeViolations[`h-${r}-${c}`]}
            />
          );
        }
      }
      // Vertical hint, in the gap track below this cell.
      if (r < size - 1) {
        const hint = edgeHints[`v-${r}-${c}`];
        if (hint) {
          elements.push(
            <HintMark
              key={`v-${r}-${c}`}
              column={cellLine(c)}
              row={gapLine(r)}
              type={hint}
              theme={theme}
              isViolating={showViolations && !!edgeViolations[`v-${r}-${c}`]}
            />
          );
        }
      }
    }
  }

  for (let r = 0; r < size; r++) {
    const { a, b } = countRow(r);
    elements.push(
      <div
        key={`rowlabel-${r}`}
        style={{ gridColumn: labelLine(size), gridRow: cellLine(r), display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <CountLabel zero={a} one={b} max={max} theme={theme} showViolations={showViolations} />
      </div>
    );
  }
  for (let c = 0; c < size; c++) {
    const { a, b } = countCol(c);
    elements.push(
      <div
        key={`collabel-${c}`}
        style={{ gridColumn: cellLine(c), gridRow: labelLine(size), display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <CountLabel zero={a} one={b} max={max} theme={theme} showViolations={showViolations} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        display: "grid",
        gridTemplateColumns: trackList(size),
        gridTemplateRows: trackList(size),
      }}
    >
      {elements}
    </div>
  );
}

// Sits in the thin gap track between two adjacent cells and shows their
// revealed =/X relationship. Never interactive — these are locked puzzle
// clues, not something the player edits. Rendered as a small circular
// badge, bigger than the gap track itself so it overlaps onto the two
// cells on either side, with its own background + shadow (rather than
// just colored text) so it reads as sitting above the tile surface, not
// flush with it. Turns the same fixed ERROR_COLOR as a triple violation
// once both cells on this edge are filled in a way that contradicts the
// hint.
function HintMark({ column, row, type, theme, isViolating }) {
  const color = isViolating ? ERROR_COLOR : theme.accent;
  return (
    <div
      style={{
        gridColumn: column,
        gridRow: row,
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: HINT_MARK_SIZE,
          height: HINT_MARK_SIZE,
          // The outer flex container is only as wide as the 4px gap track
          // for horizontal hints (or as tall, for vertical ones) — without
          // this, the default flex-shrink:1 squashes the badge down along
          // that narrow axis instead of letting it overlap the cells on
          // either side the way it's meant to.
          flexShrink: 0,
          borderRadius: "50%",
          backgroundColor: theme.boardBg,
          border: `2px solid ${color}`,
          boxShadow: HINT_MARK_SHADOW,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          fontWeight: 800,
          color,
        }}
      >
        {type === "eq" ? "=" : "X"}
      </div>
    </div>
  );
}

function CountLabel({ zero, one, max, theme, showViolations }) {
  const zeroColor = getCountColor(zero, max, theme, showViolations);
  const oneColor = getCountColor(one, max, theme, showViolations);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "3px",
      }}
    >
      <span style={{ color: zeroColor }}>{zero}</span>
      <span style={{ color: theme.cellBg }}>|</span>
      <span style={{ color: oneColor }}>{one}</span>
    </div>
  );
}

function Dropdown({ label, options, value, onChange, disabled, theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: theme.text,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          className="binairo-select"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{
            padding: "8px 34px 8px 14px",
            borderRadius: "12px",
            fontSize: "14px",
            minWidth: "140px",
            cursor: disabled ? "not-allowed" : "pointer",
            // Locked state gets the same "pressed" treatment as the
            // pause/etc buttons — a flat, muted fill instead of theme
            // colors, so it's unambiguous the control is unavailable.
            border: disabled ? "2px solid #bbb" : `2px solid ${theme.accent}`,
            backgroundColor: disabled ? "#e2e2e2" : theme.boardBg,
            color: disabled ? "#999" : theme.text,
          }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <Icon
          icon="mdi:chevron-down"
          width="18"
          color={disabled ? "#999" : theme.accent}
          style={{
            position: "absolute",
            top: "50%",
            right: "10px",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}