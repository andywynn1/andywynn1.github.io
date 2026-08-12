import { useState, useCallback, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Icon } from "@iconify/react";


const items = [
  {
    id: 1,
    url: "public/assets/1.png",
    title: "Me",
    text: "I am Andrew Nguyen.",
  },
  {
    id: 2,
    url: "public/assets/4.svg.webp",
    title: "UMN",
    text: "I go to the University of Minnesota Twin Cities, where I study Computer Engineering and Business Management.",
  },
  
  
];

// ---- EASY TWEAK ZONE ----
const RADIUS = 250;
const THUMBNAIL_SIZE = 110;
const CENTER_SIZE = 350;
const ACCENT_COLOR = "#F56C62";
// --------------------------

export default function About() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [responsiveSizes, setResponsiveSizes] = useState({
    radius: RADIUS,
    thumbnailSize: THUMBNAIL_SIZE,
    centerSize: CENTER_SIZE,
  });

  useEffect(() => {
    const updateSizes = () => {
      const width = window.innerWidth;
      if (width < 400) {
        setResponsiveSizes({
          radius: Math.min(RADIUS, 110),
          thumbnailSize: Math.min(THUMBNAIL_SIZE, 70),
          centerSize: Math.min(CENTER_SIZE, 260),
        });
      } else if (width < 640) {
        setResponsiveSizes({
          radius: Math.min(RADIUS, 140),
          thumbnailSize: Math.min(THUMBNAIL_SIZE, 80),
          centerSize: Math.min(CENTER_SIZE, 300),
        });
      } else if (width < 1024) {
        setResponsiveSizes({
          radius: Math.min(RADIUS, 200),
          thumbnailSize: Math.min(THUMBNAIL_SIZE, 90),
          centerSize: Math.min(CENTER_SIZE, 340),
        });
      } else {
        setResponsiveSizes({ radius: RADIUS, thumbnailSize: THUMBNAIL_SIZE, centerSize: CENTER_SIZE });
      }
    };

    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, []);

  const rotation = useMotionValue(0);
  const smoothRotation = useSpring(rotation, { bounce: 0.15, duration: 0.1 });

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleItemClick = (index) => {
    setActiveIndex(index);
    setIsExpanded(false);
  };

  const containerVariants = {
    collapsed: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
    expanded: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
  };

  const activeItem = items[activeIndex];

  return (
    // Everything — carousel + caption + spin hint — lives in one column
    // so each piece just stacks under the last one in normal flow.
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
      }}
    >
      {/* Carousel stage: fixed square footprint, matches the card size
          exactly, so nothing overflows it and pushes later elements around */}
      <div
        style={{
          position: "relative",
          width: responsiveSizes.centerSize,
          height: responsiveSizes.centerSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          userSelect: "none",
          touchAction: "pan-y",
        }}
      >
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            <motion.div
              key="center-view"
              layout
              transition={{ type: "spring", bounce: 0.15, duration: 0.15 }}
              style={{ position: "relative", zIndex: 10 }}
            >
              {/* Shared layoutId box is now ONLY the image card — same square
                  shape as the thumbnail version, so Motion can FLIP it cleanly */}
              <motion.div
                layoutId={`card-${activeItem.id}`}
                style={{
                  width: responsiveSizes.centerSize,
                  height: responsiveSizes.centerSize,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "32px",
                  border: `4px solid ${ACCENT_COLOR}`,
                  backgroundColor: "#fdf9e8",
                  padding: "16px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                }}
              >
                <motion.img
                  layoutId={`img-${activeItem.id}`}
                  src={activeItem.url}
                  alt={activeItem.title}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "24px",
                    display: "block",
                  }}
                />

                <button
                  onClick={toggleExpand}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "rgba(255,255,255,0.85)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon icon="mdi:close" width="18" color="#4d4d4d" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="radial-view"
              variants={containerVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              style={{
                position: "relative",
                height: "100%",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isPanning ? "grabbing" : "grab",
                touchAction: isPanning ? "none" : "pan-y",
              }}
              onPanStart={() => setIsPanning(true)}
              onPanEnd={() => setIsPanning(false)}
              onPan={(_, info) => {
                rotation.set(rotation.get() + info.delta.x * 0.5);
              }}
            >
              {items.map((item, index) => {
                const baseAngle = (index / items.length) * (2 * Math.PI) - Math.PI / 2;
                return (
                  <RadialItem
                    key={item.id}
                    item={item}
                    baseAngle={baseAngle}
                    radius={responsiveSizes.radius}
                    thumbnailSize={responsiveSizes.thumbnailSize}
                    rotation={smoothRotation}
                    onClick={() => handleItemClick(index)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption — no longer inside the layoutId card, so it just crossfades
          on its own instead of distorting the card's FLIP animation */}
      {!isExpanded && (activeItem.title || activeItem.text) && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            style={{
              marginTop: "20px",
              maxWidth: responsiveSizes.centerSize,
              textAlign: "center",
            }}
          >
            {activeItem.title && (
              <h3
                style={{
                  fontSize: "18px",
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "#4d4d4d",
                  marginBottom: "6px",
                }}
              >
                {activeItem.title}
              </h3>
            )}
            {activeItem.text && (
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#4d4d4d" }}>
                {activeItem.text}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}

    </div>
  );
}

function RadialItem({ item, baseAngle, radius, thumbnailSize, rotation, onClick }) {
  const x = useTransform(rotation, (r) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return Math.cos(currentAngle) * radius;
  });

  const y = useTransform(rotation, (r) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return Math.sin(currentAngle) * radius;
  });

  const rotate = useTransform(rotation, (r) => {
    const currentAngle = baseAngle + (r * Math.PI) / 180;
    return (currentAngle * 180) / Math.PI + 90;
  });

  const itemVariants = {
    collapsed: { opacity: 0, scale: 0.8, transition: { type: "spring", bounce: 0.4, duration: 0.5 } },
    expanded: { scale: 1, opacity: 1, transition: { type: "spring", bounce: 0.4, duration: 0.5 } },
  };

  return (
    <motion.div
      variants={itemVariants}
      style={{ x, y, rotate, position: "absolute", cursor: "pointer" }}
      onClick={onClick}
    >
      <motion.div
        layoutId={`card-${item.id}`}
        style={{
          width: thumbnailSize,
          height: thumbnailSize,
          overflow: "hidden",
          borderRadius: "18px",
          border: `3px solid ${ACCENT_COLOR}`,
          backgroundColor: "#fdf9e8",
          padding: "4px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <motion.img
          layoutId={`img-${item.id}`}
          src={item.url}
          alt={item.title}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }}
        />
      </motion.div>
    </motion.div>
  );
}