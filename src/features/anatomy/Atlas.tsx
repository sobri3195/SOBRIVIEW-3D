import { read, write } from "../../lib/storage";
import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Eye, EyeOff, Focus, Layers } from "lucide-react";
import Scene from "./Scene";
import { organs, segments, filterAnatomy } from "../../data/anatomy";
import { useApp } from "../../stores/useApp";
export default function Atlas({ liver = false }: { liver?: boolean }) {
  const storageKey = liver ? "liver-layers" : "atlas-layers";
  const [colors, setColors] = useState<Record<string, string>>({});
  const items = useMemo(
    () =>
      (liver ? segments : organs).map((s) => ({
        ...s,
        color: colors[s.id] || s.color,
      })),
    [liver, colors],
  );
  const { prefs, update } = useApp();
  const [selected, setSelected] = useState(
    liver ? "segment-1" : prefs.selected,
  );
  const [hidden, setHidden] = useState<string[]>(() =>
    read(
      storageKey,
      (v) =>
        Array.isArray(v)
          ? v.filter((s): s is string => typeof s === "string")
          : [],
      [],
    ),
  );
  useEffect(() => {
    if (!write(storageKey, hidden))
      useApp.getState().notify("Layer preferences could not be saved.");
  }, [hidden, storageKey]);
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("All");
  const [rotate, setRotate] = useState(false);
  const [explode, setExplode] = useState(false);
  const [view, setView] = useState("Front");
  const [reset, setReset] = useState(0);
  const item = items.find((s) => s.id === selected) || items[0];
  function select(id: string) {
    setSelected(id);
    if (!liver) update({ selected: id });
  }
  const toggle = (id: string) =>
    setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {liver ? "COUINAUD SCHEMATIC EXPLORER" : "SOBRI ANATOMY ATLAS"}
          </div>
          <h1>
            {liver ? "Understand the liver." : "Anatomy, in perspective."}
          </h1>
          <p>
            {liver
              ? "Eight segments. One interconnected organ."
              : "Explore the structures that make us human."}
          </p>
        </div>
        <span className="badge">EDUCATIONAL ATLAS</span>
      </div>
      {liver && (
        <div className="notice">
          Schematic learning model: segment positions and boundaries are
          simplified, not a validated anatomical atlas. Patient segmentation and
          registered labelmap import are not implemented.
        </div>
      )}
      <div className="workstation">
        <aside className="panel structures">
          <div className="panel-title">
            <Layers size={16} /> Structures <span>{items.length}</span>
          </div>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search anatomy"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a structure…"
            />
          </label>
          {!liver && (
            <select
              aria-label="Organ system"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
            >
              {["All", ...new Set(organs.map((o) => o.system))].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          <div className="structure-list">
            {filterAnatomy(items, query, system).map((s) => (
              <div
                className={`structure-row ${selected === s.id ? "selected" : ""}`}
                key={s.id}
              >
                <button onClick={() => select(s.id)}>
                  <i style={{ background: s.color }} />
                  {prefs.language === "id" ? s.idName : s.en}
                </button>
                <button
                  aria-label={`Toggle ${s.en}`}
                  onClick={() => toggle(s.id)}
                >
                  {hidden.includes(s.id) ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setHidden([])}>Show all structures</button>
        </aside>
        <div className="viewer-column">
          <div className="toolbar">
            <button onClick={() => setRotate(!rotate)}>
              {rotate ? "Pause" : "Auto rotate"}
            </button>
            <button
              onClick={() => {
                setHidden([]);
                setReset((r) => r + 1);
                setView("Front");
              }}
            >
              <RotateCcw size={15} /> Reset / fit
            </button>
            <select
              aria-label="Camera view"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              {["Front", "Back", "Left", "Right", "Superior", "Inferior"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
            {liver && (
              <button onClick={() => setExplode(!explode)}>
                {explode ? "Assemble" : "Explode"}
              </button>
            )}
            <button
              onClick={() =>
                document
                  .querySelector(".viewer-column")
                  ?.requestFullscreen()
                  .catch(() =>
                    useApp.getState().notify("Fullscreen is unavailable."),
                  )
              }
            >
              Fullscreen
            </button>
          </div>
          <Scene
            items={items}
            selected={selected}
            onSelect={select}
            hidden={hidden}
            opacity={prefs.opacity}
            explode={explode}
            rotate={rotate}
            view={view}
            reset={reset}
          />
          <div className="viewer-status">
            <span>● Interactive 3D</span>
            <span>Drag to orbit · scroll to zoom · right-drag to pan</span>
          </div>
        </div>
        <aside className="panel info">
          <div className="eyebrow">ANATOMY INFORMATION</div>
          <div className="organ-swatch" style={{ background: item.color }} />
          <h2>{prefs.language === "id" ? item.idName : item.en}</h2>
          <em>{item.latin}</em>
          <div className="tag">{item.system}</div>
          <h3>Overview</h3>
          <p>{item.description}</p>
          <h3>Location</h3>
          <p>{item.location}</p>
          <h3>Display properties</h3>
          <label>
            Structure color
            <input
              aria-label="Structure color"
              type="color"
              value={item.color}
              onChange={(e) =>
                setColors((c) => ({ ...c, [item.id]: e.target.value }))
              }
            />
          </label>
          <label>
            Opacity <span>{Math.round(prefs.opacity * 100)}%</span>
            <input
              aria-label="Opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={prefs.opacity}
              onChange={(e) => update({ opacity: +e.target.value })}
            />
          </label>
          <div className="button-row">
            <button
              onClick={() =>
                setHidden(
                  items.filter((s) => s.id !== item.id).map((s) => s.id),
                )
              }
            >
              <Focus size={14} /> Isolate
            </button>
            <button onClick={() => toggle(item.id)}>
              {hidden.includes(item.id) ? "Show" : "Hide"}
            </button>
          </div>
          <h3>Study reference</h3>
          <p className="muted">
            OpenStax Anatomy & Physiology 2e; Couinaud classification. See Data
            Sources for model limitations.
          </p>
          <button onClick={() => window.print()}>Print study sheet</button>
        </aside>
      </div>
    </>
  );
}
