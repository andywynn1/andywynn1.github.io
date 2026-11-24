import { useState , useEffect } from "react";
import { useAnimationControls } from "framer-motion";
import FallingRectangle from "./FallingRectangle";
import RisingRectangle from "./RisingRectangle";
import FloatingRectangle from "./FloatingRectangle";
import MenuBar from "./MenuBar";
import TransitionOverlay from "./TransitionOverlay";
import Portfolio from "./PortfolioPage";
import Puzzles, { puzzles } from "./PuzzlePage";
import About from "./AboutPage";
import Vignette from "./Vignette";
import BackButton from "./BackButton";
import Title from "./Title";
import DotField from "./DotField";
import Haze from "./Haze";
import Binairo from "./Binairo";
import AlbumSpinner from "./AlbumSpinner";

const RECT_ZOOM_MS = 700;
const OVERLAY_FADE_IN_MS = 400;
const OVERLAY_FADE_OUT_MS = 500;

const PAGE_COLORS = {
  home: "0, 0, 0",
  page1: "245, 108, 98",
  page2: "80, 142, 235",
  page3: "172, 230, 133",
};

// "#RRGGBB" -> "r, g, b", matching the comma-separated format Vignette
// and DotField already expect everywhere else (see PAGE_COLORS above).
function hexToRgbString(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// Every puzzle page's vignette/dot-field color comes straight from its
// own card in PuzzlePage's `puzzles` list, keyed by the same `id` used as
// the page value (e.g. "binairo"). New puzzles automatically get a
// matching page color this way — no separate PAGE_COLORS entry to
// remember to add, and no risk of the two drifting apart.
const PUZZLE_COLORS = Object.fromEntries(puzzles.map((p) => [p.id, hexToRgbString(p.color)]));


// Each page lives at a hash URL so the browser's back button, refresh and
// direct links work on GitHub Pages without any server config.
const ROUTES = {
  home: "/",
  page1: "/about",
  page2: "/portfolio",
  page3: "/fun",
  binairo: "/fun/binairo",
  albums: "/fun/albums",
};

function pageFromHash() {
  const path = window.location.hash.replace(/^#/, "") || "/";
  return Object.keys(ROUTES).find((key) => ROUTES[key] === path) ?? "home";
}

function App() {
  const [page, setPageState] = useState(pageFromHash);

  // history.state.d counts how many in-app steps deep we are, so Back can
  // either undo a step or, after a direct link, fall back to a sensible page.
  const navigate = (target, { replace = false } = {}) => {
    const depth = window.history.state?.d ?? 0;
    const url = `#${ROUTES[target]}`;
    if (replace) window.history.replaceState({ d: depth }, "", url);
    else window.history.pushState({ d: depth + 1 }, "", url);
    setPageState(target);
  };
  const setPage = (target) => navigate(target);
  const goBack = (fallback = "home") => {
    if ((window.history.state?.d ?? 0) > 0) window.history.back();
    else navigate(fallback, { replace: true });
  };

  useEffect(() => {
    if (window.history.state === null) window.history.replaceState({ d: 0 }, "");
    const onPop = () => setPageState(pageFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [zoomIndex, setZoomIndex] = useState(null);
  const overlayControls = useAnimationControls();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    if (page === "home") {
      setHoveredIndex(null);
    }
  }, [page]);

  // Falls back to a puzzle's own card color for any page that isn't one
  // of the fixed site sections above — this is what was missing for
  // "binairo" (PAGE_COLORS has no such key, so this used to silently
  // resolve to undefined and Vignette would fall back to its own black
  // default instead of matching the card you actually came from).
  const vignetteColor = PAGE_COLORS[page] ?? PUZZLE_COLORS[page];

  const handleBack = () => {
    goBack("home");
  };

  const handleSelect = (index) => {
    setZoomIndex(index);
  
    setTimeout(() => {
      overlayControls.start({
        opacity: 1,
        transition: { duration: OVERLAY_FADE_IN_MS / 1000, ease: "easeIn" },
      });
    }, RECT_ZOOM_MS);
  
    setTimeout(() => {
      setPage(`page${index + 1}`);
      setZoomIndex(null);
      overlayControls.start({
        opacity: 0,
        transition: { duration: OVERLAY_FADE_OUT_MS / 1000, ease: "easeOut" },
      });
    }, RECT_ZOOM_MS + OVERLAY_FADE_IN_MS);
  };
  
  {page === "home" && (
    <>
      {/* ... */}
      <Vignette />
      
    </>
  )}
  
 
  


  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: page === "home" ? "hidden" : "auto"}}>
      {page === "home" && (
        <>
        <MenuBar
  onSelect={handleSelect}
  isExiting={zoomIndex !== null}
  hoveredIndex={hoveredIndex}
  setHoveredIndex={setHoveredIndex}
        />

<FallingRectangle
  isZooming={zoomIndex === 0}
  isExiting={zoomIndex !== null && zoomIndex !== 0}
  isHighlighted={hoveredIndex === 0}
/>
<RisingRectangle
  isZooming={zoomIndex === 1}
  isExiting={zoomIndex !== null && zoomIndex !== 1}
  isHighlighted={hoveredIndex === 1}
/>
<FloatingRectangle
  isZooming={zoomIndex === 2}
  isExiting={zoomIndex !== null && zoomIndex !== 2}
  isHighlighted={hoveredIndex === 2}
/>
          <Title></Title>
          
       <Haze />
       <DotField colors={[PAGE_COLORS.page1, PAGE_COLORS.page2, PAGE_COLORS.page3]} orbs />
          
        </>
      )}

{page === "page1" && (
  <>
 
    <About />
    <DotField colors={[PAGE_COLORS.page1]} />
    <BackButton onBack={handleBack} />
  </>
)}

{page === "page2" && (
  <>
 
    <Portfolio />
    <DotField colors={[PAGE_COLORS.page2]} />
    <BackButton onBack={handleBack} />
  </>
)}

{page === "page3" && (
  <>
    <Puzzles onSelectPuzzle={(id) => setPage(id)} />
    <DotField colors={[PAGE_COLORS.page3]} />
    <BackButton onBack={handleBack} />
  </>
)}

{page === "binairo" && (
  <>
    <Binairo />
    <BackButton onBack={() => goBack("page3")} />
  </>
)}

{page === "albums" && (
  <>
    <AlbumSpinner />
    <DotField colors={[PUZZLE_COLORS.albums]} />
    <BackButton onBack={() => goBack("page3")} />
  </>
)}


<Vignette color={vignetteColor} intensity={page === "albums" || page === "home" ? 0 : 0.4} duration={1.5} />
      <TransitionOverlay controls={overlayControls} />
    </div>
  );
}

export default App;