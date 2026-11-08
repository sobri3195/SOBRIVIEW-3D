import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Box,
  ScanLine,
  Layers,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import Scene from "../anatomy/Scene";
import { organs } from "../../data/anatomy";
import { read } from "../../lib/storage";
const actions = [
  {
    to: "/atlas",
    title: "Anatomy Atlas",
    text: "Explore interactive organ structures",
    icon: Box,
  },
  {
    to: "/viewer",
    title: "CT Explorer",
    text: "Open a local DICOM study",
    icon: ScanLine,
  },
  {
    to: "/liver",
    title: "Liver Lab",
    text: "Learn Couinaud segment terminology",
    icon: Layers,
  },
  {
    to: "/cases",
    title: "Case Laboratory",
    text: "Organize educational workspaces",
    icon: FolderOpen,
  },
  {
    to: "/learn",
    title: "Learning Center",
    text: "Practice, review, remember",
    icon: BookOpen,
  },
];
export default function Dashboard() {
  const [gpu, setGpu] = useState("Checking…");
  const [usage, setUsage] = useState("—");
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    setGpu(gl ? "WebGL available" : "WebGL unavailable");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    void navigator.storage
      ?.estimate()
      .then((s) => setUsage(`${((s.usage || 0) / 1024 / 1024).toFixed(1)} MB`));
  }, []);
  const progress = read<unknown[]>(
    "progress",
    (v) => (Array.isArray(v) ? v : []),
    [],
  );
  const cases = read<{ title: string }[]>(
    "cases",
    (v) =>
      Array.isArray(v) ? v.filter((x) => x && typeof x.title === "string") : [],
    [],
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> SOBRIVIEW MEDICAL VISUALIZATION
            PLATFORM
          </span>
          <h1>
            Explore human
            <br />
            anatomy in <span>3D.</span>
          </h1>
          <p>
            A new perspective on the human body. Explore anatomy, navigate
            imaging, and build your understanding — all in your browser.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/atlas">
              Explore anatomy <ArrowUpRight size={18} />
            </Link>
            <Link className="button" to="/viewer">
              Open CT study <ScanLine size={17} />
            </Link>
          </div>
          <div className="hero-caption">
            EDUCATION & RESEARCH <span>•</span> BROWSER-LOCAL PROCESSING
          </div>
        </div>
        <div className="hero-model">
          <Scene
            items={organs}
            selected="liver"
            onSelect={() => {}}
            hidden={[]}
            opacity={0.85}
            explode={false}
            rotate={true}
            view="Front"
            reset={0}
          />
          <div className="model-caption">
            THE HUMAN BODY <span>01 / ANATOMY PREVIEW</span>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>Your exploration starts here</h2>
        <span className="muted">Five ways to go deeper</span>
      </div>
      <div className="quick-grid">
        {actions.map(({ to, title, text, icon: Icon }, i) => (
          <Link className="quick-card" to={to} key={to}>
            <div className={`quick-icon color-${i}`}>
              <Icon size={23} />
            </div>
            <ArrowUpRight className="card-arrow" size={18} />
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="eyebrow">OPEN MODULE →</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="section-heading">
            <h2>Recent workspaces</h2>
            <Link to="/cases">View CaseLab →</Link>
          </div>
          {cases.length ? (
            cases.slice(-3).map((c, i) => (
              <Link className="workspace-link" to="/cases" key={i}>
                <FolderOpen size={18} />
                {c.title}
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <FolderOpen size={28} />
              <h3>A space for your discoveries</h3>
              <p>Create an educational notebook in CaseLab to get started.</p>
              <Link to="/cases">Create workspace →</Link>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="eyebrow">LEARNING PROGRESS</div>
          <h2>{progress.length} completed sessions</h2>
          <p>Keep building your knowledge, one structure at a time.</p>
          <Link className="button" to="/learn">
            Start anatomy quiz →
          </Link>
          <hr />
          <div className="eyebrow">SYSTEM INFORMATION</div>
          <div className="system-row">
            <span>GPU rendering</span>
            <strong>{gpu}</strong>
          </div>
          <div className="system-row">
            <span>Local storage usage</span>
            <strong>{usage}</strong>
          </div>
          <div className="system-row">
            <span>Dataset</span>
            <strong>Synthetic demo</strong>
          </div>
        </section>
      </div>
      <div className="education-banner">
        <BookOpen size={22} />
        <div>
          <strong>Designed for learning. Built with care.</strong>
          <p>
            Procedural anatomy and synthetic imaging are clearly labeled.
            SOBRIVIEW is not a clinical diagnostic device.
          </p>
        </div>
        <Link to="/settings">About the platform →</Link>
      </div>
    </>
  );
}
