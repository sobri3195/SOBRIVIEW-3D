import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import {
  Activity,
  Box,
  ScanLine,
  Layers,
  BookOpen,
  FolderOpen,
  Settings,
  LayoutDashboard,
  PanelLeftClose,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { animate } from "animejs";
import { useApp } from "../stores/useApp";
const Dashboard = lazy(() => import("../features/dashboard/Dashboard"));
const Atlas = lazy(() => import("../features/anatomy/Atlas"));
const Viewer = lazy(() => import("../features/dicom/Viewer"));
const Learning = lazy(() => import("../features/learning/Learning"));
const Cases = lazy(() => import("../features/caselab/Cases"));
const Preferences = lazy(() => import("../features/settings/Settings"));
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/atlas", label: "Anatomy Atlas", icon: Box },
  { to: "/viewer", label: "CT Explorer", icon: ScanLine },
  { to: "/mpr", label: "MPR Studio", icon: Layers },
  { to: "/liver", label: "Liver Lab", icon: Activity },
  { to: "/cases", label: "CaseLab", icon: FolderOpen },
  { to: "/learn", label: "Learning Center", icon: BookOpen },
];
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <section className="panel">
        <h1>Workspace could not load</h1>
        <p>Try reloading. Your files have not been uploaded.</p>
        <button onClick={() => location.reload()}>Reload application</button>
      </section>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const { prefs, update, notice, notify } = useApp();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const side = useRef<HTMLElement>(null);
  const current =
    nav.find((n) => n.to === location.pathname)?.label || "Settings";
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = animate(main.current!, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 350,
      ease: "outQuad",
    });
    return () => {
      a.revert();
    };
  }, [location.pathname]);
  useEffect(() => {
    side.current?.classList.remove("mobile-open");
  }, [location.pathname]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 5000);
    return () => clearTimeout(timer);
  }, [notice, notify]);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" ref={side}>
        <Link to="/" className="brand">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <path
              d="M22 3 38 12v20L22 41 6 32V12Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M10 23h7l3-9 5 17 3-8h7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <div>
            SOBRIVIEW <sup>3D</sup>
            <small>MEDICAL VISUALIZATION</small>
          </div>
        </Link>
        <div className="nav-section">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink to={to} end={to === "/"} key={to}>
              <Icon size={19} />
              <span>{label}</span>
              {to === "/liver" && <small>ATLAS</small>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="live-dot" /> Local-first workspace
            <p>
              Your imaging stays
              <br />
              in your browser.
            </p>
          </div>
          <NavLink to="/settings">
            <Settings size={18} /> Settings
          </NavLink>
          <div className="sidebar-footer">
            SOBRIVIEW 3D <span>v0.1.0</span>
            <small>
              Developed by
              <br />
              Muhammad Sobri Maulana
            </small>
          </div>
        </div>
        <button
          className="sidebar-close"
          aria-label="Close menu"
          onClick={() => side.current?.classList.remove("mobile-open")}
        >
          <PanelLeftClose size={18} />
        </button>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div>
            <button
              className="menu-button"
              aria-label="Open menu"
              onClick={() => side.current?.classList.toggle("mobile-open")}
            >
              <Menu size={19} />
            </button>
            <span className="muted">Workspace</span>
            <span className="breadcrumb">/</span>
            <strong>{current}</strong>
          </div>
          <div className="header-actions">
            <span className="dataset-indicator">
              <span className="live-dot" /> Educational workspace
            </span>
            <button
              aria-label="Change anatomy language"
              onClick={() =>
                update({ language: prefs.language === "en" ? "id" : "en" })
              }
            >
              <Globe size={16} />
              {prefs.language.toUpperCase()}
            </button>
            <button
              aria-label="Toggle theme"
              onClick={() =>
                update({ theme: prefs.theme === "dark" ? "light" : "dark" })
              }
            >
              {prefs.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/settings" aria-label="Settings">
              <Settings size={18} />
            </Link>
          </div>
        </header>
        <main id="main" ref={main}>
          <Boundary>
            <Suspense
              fallback={
                <div className="skeleton" role="status">
                  Loading workspace…
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/atlas" element={<Atlas key="atlas" />} />
                <Route path="/liver" element={<Atlas liver key="liver" />} />
                <Route path="/viewer" element={<Viewer key="viewer" />} />
                <Route path="/mpr" element={<Viewer mpr key="mpr" />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/learn" element={<Learning />} />
                <Route path="/settings" element={<Preferences />} />
                <Route
                  path="*"
                  element={
                    <section className="panel">
                      <h1>Page not found</h1>
                      <Link to="/">Return to dashboard</Link>
                    </section>
                  }
                />
              </Routes>
            </Suspense>
          </Boundary>
          <footer className="main-footer">
            <span>
              SOBRIVIEW 3D · Developed by Muhammad Sobri Maulana · © 2026
            </span>
            <span>For education & research</span>
          </footer>
        </main>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav
            .filter((n) =>
              ["/", "/atlas", "/viewer", "/liver", "/learn"].includes(n.to),
            )
            .map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                <Icon size={19} />
                <span>
                  {label
                    .replace("Anatomy ", "")
                    .replace("Learning Center", "Learn")}
                </span>
              </NavLink>
            ))}
        </nav>
      </div>
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
