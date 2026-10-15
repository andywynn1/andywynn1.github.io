import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

const SKILL_CATEGORIES = {
  Languages: ["Python", "React"],
  Hardware: ["FPGA", "Raspberry Pi"],
  Electronics: ["KiCad", "PCB"],
  "Computer Vision / AI": ["Ultralytics", "OpenCV"],
};

const BADGE_COLORS = {
  Python: "#42A1EB",
};

const projects = [
  {
    id: "flag-football-cv",
    title: "Flag Football CV",
    image: "/assets/cv.gif",
    badges: ["Ultralytics", "OpenCV", "Python"],
    description:
      "A computer vision pipeline for tracking players in a local flag football league using drone footage and YOLO11.",
    link: "https://github.com/andywynn1/XFlagCV/blob/main/README.md",
    icon: "mdi:football",
  },

  {
    id: "posm-2",
    title: "Electro-Optic Fabry Pérot Shutter",
    image: "/assets/shutter.png",
    badges: ["KiCad", "PCB"],
    description:
      "A single electrically controlled device that sends cooling, repump, both or neither to the MOT from a single beam path. Paper coming soon.",
    link: "",
    icon: "mdi:laser-pointer",
  },
  
  {
    id: "posm-1",
    title: "Polarimeter PCB",
    image: "/assets/POSM-1.png",
    badges: ["KiCad", "PCB"],
    description:
      "Designed the schematic and PCB for a compact polarization monitoring module that taps a laser beam, splits it into polarization components with a PBS, and digitizes the photodiode signals for real time power and polarization tracking.",
    link: "",
    icon: "mdi:integrated-circuit",
  },
   {
    id: "tetris",
    title: "Handheld Tetris Device",
    image: "/assets/tetris.png",
    badges: ["Python"],
    description:
      "A portable Tetris game built on a microcontroller with a small LCD display with correct game logic coded in CircuitPython.",
    link: "https://github.com/andywynn1/Tetris1001",
    icon: "mdi:gamepad-variant",
  },

  {
    id: "website",
    title: "Personal Portfolio Website",
    image: "/assets/website.png",
    badges: ["React"],
    description:
      "A responsive portfolio website built with React and Framer Motion.",
    link: "https://andywynn1.github.io/",
    icon: "mdi:computer",
  },

   
 
];




function SkillsSection() {
  const allUsedBadges = new Set(projects.flatMap((p) => p.badges));

  return (
    <div
      style={{
        border: "4px solid #508eeb",
        borderRadius: "14px",
        backgroundColor: "#fdf9e8",
        padding: "28px 32px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => {
          const present = skills.filter((s) => allUsedBadges.has(s));
          if (present.length === 0) return null;

          return (
            <div key={category}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#508eeb",
                  marginBottom: "10px",
                }}
              >
                {category}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {present.map((skill) => (
                  <Badge key={skill} label={skill} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <div
      style={{
        border: "4px solid #508eeb",
        borderRadius: "14px",
        backgroundColor: "#fdf9e8",
        padding: "28px 32px",
        
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#508eeb",
          marginBottom: "10px",
        }}
      >
        Contact
      </h3>
      
      <p style={{ color: "#4d4d4d" }}>andrewnguyenedenprairie@gmail.com</p>
      <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
        <a
          href="https://www.linkedin.com/in/andrew-nguyenep"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4d4d4d" }}
        >
          <Icon icon="mdi:linkedin" width="36" color="#0A66C2" />
        </a>
        <a
          href="https://www.instagram.com/21andrewnguyen/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4d4d4d" }}
        >
          <Icon icon="mdi:instagram" width="36" color="#E4405F" />
        </a>
        <a
          href="https://www.tiktok.com/@andrew.nguyen17"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4d4d4d" }}
        >
          <Icon icon="simple-icons:tiktok" width="36" color="#000000" />
        </a>
      </div>
    </div>
  );
}

function Badge({ label }) {
  const color = BADGE_COLORS[label] || "#888";
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#fff",
        backgroundColor: color,
        padding: "3px 9px",
        borderRadius: "999px",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </span>
  );
}

function ProjectCard({ project, onClick }) {
  return (
    <motion.div
      layoutId={`card-${project.id}`}
      onClick={() => onClick(project.id)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: "#fdf9e8",
        border: "4px solid #508eeb",
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
      }}
    >
      <motion.div
        layoutId={`bar-${project.id}`}
        style={{ backgroundColor: "#508eeb", padding: "14px 18px" }}
      >
        <motion.span
          layoutId={`title-${project.id}`}
          style={{
            color: "#fff",
            fontSize: "20px",
            fontWeight: 700,
            fontStyle: "italic",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {project.icon && <Icon icon={project.icon} width="20" />}
          {project.title}
        </motion.span>
      </motion.div>

      <div style={{ position: "relative" }}>
        <motion.img
          layoutId={`img-${project.id}`}
          src={project.image}
          alt={project.title}
          style={{ width: "100%", height: "200px", objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {project.badges.map((b) => (
            <Badge key={b} label={b} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ExpandedCard({ project, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      <motion.div
        layoutId={`card-${project.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(600px, 90vw)",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "#fdf9e8",
          border: "5px solid #508eeb",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 2,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "rgba(255,255,255,0.85)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d4d4d" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <motion.div layoutId={`bar-${project.id}`} style={{ backgroundColor: "#508eeb", padding: "18px 24px" }}>
          <motion.span
            layoutId={`title-${project.id}`}
            style={{
              color: "#fff",
              fontSize: "26px",
              fontWeight: 700,
              fontStyle: "italic",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {project.icon && <Icon icon={project.icon} width="26" />}
            {project.title}
          </motion.span>
        </motion.div>

        <div style={{ position: "relative" }}>
          <motion.img
            layoutId={`img-${project.id}`}
            src={project.image}
            alt={project.title}
            style={{ width: "100%", height: "320px", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {project.badges.map((b) => (
              <Badge key={b} label={b} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{ padding: "24px" }}
        >
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "#4d4d4d" }}>
            {project.description}
          </p>

          {project.link && (
            <p style={{ marginTop: "16px", fontSize: "15px" }}>
              <strong>More:</strong>{" "}
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#508eeb", textDecoration: "underline" }}
              >
                {project.link}
              </a>
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Portfolio() {
  const [expandedId, setExpandedId] = useState(null);
  const expandedProject = projects.find((p) => p.id === expandedId);

  return (
    <div style={{ minHeight: "100vh", padding: "60px 40px" }}>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "28px",
          maxWidth: "1200px",
          margin: "0 auto 28px auto",
        }}
      >
        <SkillsSection />
        <ContactSection />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "28px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onClick={setExpandedId} />
        ))}
      </div>

      <AnimatePresence>
        {expandedProject && <ExpandedCard project={expandedProject} onClose={() => setExpandedId(null)} />}
      </AnimatePresence>
    </div>
  );
}
