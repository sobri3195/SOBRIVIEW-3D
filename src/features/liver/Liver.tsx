import { useRef, useState } from "react";
import { Eye, EyeOff, Focus, Layers, RotateCcw, Search } from "lucide-react";
import Atlas from "../anatomy/Atlas";
import { useApp } from "../../stores/useApp";
import LiverScene, { type Display, type LoadState } from "./LiverScene";
import {
  liverAsset,
  modelCredit,
  sourceCommit,
  structures,
  views,
  type StructureId,
  type View,
} from "./model";

type Preset = "Permukaan" | "Pembuluh" | "Biliaris" | "Semua struktur";
function presetDisplay(preset: Preset): Display {
  const vessels = ["portal", "hepatic-veins", "artery"];
  const bile = ["gallbladder", "biliary", "cystic"];
  return Object.fromEntries(
    structures.map(({ id }) => [
      id,
      {
        visible:
          id === "liver" ||
          preset === "Semua struktur" ||
          (preset === "Pembuluh" && vessels.includes(id)) ||
          (preset === "Biliaris" && bile.includes(id)),
        opacity: id === "liver" && preset !== "Permukaan" ? 0.18 : 1,
      },
    ]),
  ) as Display;
}
export default function Liver() {
  const [mode, setMode] = useState("anatomy");
  return (
    <>
      <div className="liver-tabs" role="tablist" aria-label="Mode hati">
        <button
          role="tab"
          id="anatomy-tab"
          aria-controls="liver-mode"
          aria-selected={mode === "anatomy"}
          onClick={() => setMode("anatomy")}
        >
          Anatomi Hati
        </button>
        <button
          role="tab"
          id="couinaud-tab"
          aria-controls="liver-mode"
          aria-selected={mode === "schematic"}
          onClick={() => setMode("schematic")}
        >
          Skema Couinaud
        </button>
      </div>
      <div
        id="liver-mode"
        role="tabpanel"
        aria-labelledby={mode === "anatomy" ? "anatomy-tab" : "couinaud-tab"}
      >
        {mode === "anatomy" ? <LiverAnatomy /> : <Atlas liver />}
      </div>
    </>
  );
}
function LiverAnatomy() {
  const viewer = useRef<HTMLDivElement>(null);
  const language = useApp((s) => s.prefs.language);
  const [loaded, setLoaded] = useState<StructureId[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StructureId>("liver");
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState<Display>(() =>
    presetDisplay("Permukaan"),
  );
  const [preset, setPreset] = useState<Preset | "custom">("Permukaan");
  const [isolated, setIsolated] = useState<Display | null>(null);
  const [rotate, setRotate] = useState(false);
  const [view, setView] = useState<View>("Anterior");
  const [reset, setReset] = useState(0);
  const [focus, setFocus] = useState(0);
  const [retry, setRetry] = useState(0);
  const ready = state === "ready";
  // Only groups confirmed in both the loaded GLB and manifest count as structures.
  const items = structures.filter((s) => loaded.includes(s.id));
  const item = structures.find((s) => s.id === selected)!;
  const name = (s: (typeof structures)[number]) =>
    language === "id" ? s.idName : s.name;
  function updateStructure(
    id: StructureId,
    change: Partial<Display[StructureId]>,
  ) {
    setPreset("custom");
    setDisplay((d) => ({ ...d, [id]: { ...d[id], ...change } }));
  }
  function select(id: StructureId) {
    setSelected(id);
    setIsolated(null);
    updateStructure(id, { visible: true });
  }
  function applyPreset(p: Preset) {
    setPreset(p);
    setIsolated(null);
    setDisplay(presetDisplay(p));
  }
  function showAll() {
    setIsolated(null);
    setPreset("custom");
    setDisplay(
      (d) =>
        Object.fromEntries(
          structures.map(({ id }) => [id, { ...d[id], visible: true }]),
        ) as Display,
    );
  }
  function inside() {
    setIsolated(null);
    setPreset("custom");
    setDisplay((d) => ({
      ...d,
      liver: { visible: true, opacity: 0.16 },
      [selected]: { visible: true, opacity: selected === "liver" ? 0.16 : 1 },
    }));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LIVER ANATOMY EXPLORER</div>
          <h1>Understand the liver.</h1>
          <p>Permukaan, pembuluh, dan saluran dalam satu model referensi.</p>
        </div>
        <span className="badge">BODYPARTS3D · EDUCATIONAL ATLAS</span>
      </div>
      <div className="notice">
        Model anatomi referensi untuk edukasi; bukan rekonstruksi pasien. Tujuh
        kelompok struktur, bukan segmen Couinaud. Batas segmen tidak ditampilkan
        atau divalidasi.
      </div>
      <div className="workstation liver-workstation">
        <aside className="panel structures">
          <div className="panel-title">
            <Layers size={16} /> Structures{" "}
            <span aria-label="Loaded structures">{items.length}</span>
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
          <div className="structure-list" aria-label="Liver structures">
            {items
              .filter((s) =>
                `${s.name} ${s.idName}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((s) => (
                <div
                  className={`structure-row ${selected === s.id ? "selected" : ""}`}
                  key={s.id}
                  data-structure={s.id}
                >
                  <button
                    aria-pressed={selected === s.id}
                    disabled={!ready}
                    onClick={() => select(s.id)}
                  >
                    <i style={{ background: s.color }} />
                    {name(s)}
                  </button>
                  <button
                    disabled={!ready}
                    aria-label={`Toggle ${s.name}`}
                    aria-pressed={display[s.id].visible}
                    onClick={() =>
                      updateStructure(s.id, { visible: !display[s.id].visible })
                    }
                  >
                    {display[s.id].visible ? (
                      <Eye size={14} />
                    ) : (
                      <EyeOff size={14} />
                    )}
                  </button>
                </div>
              ))}
          </div>
          <button disabled={!ready} onClick={showAll}>
            Show all structures
          </button>
          <h3 className="liver-legend-title">Legenda warna</h3>
          <p className="muted liver-note">
            Warna adalah kode visual edukasi, bukan warna jaringan sebenarnya.
          </p>
          <ul className="liver-legend">
            {items.map((s) => (
              <li key={s.id}>
                <i style={{ background: s.color }} />
                {name(s)}
              </li>
            ))}
          </ul>
        </aside>
        <div className="viewer-column" ref={viewer}>
          <div className="toolbar liver-presets" aria-label="Display presets">
            {(
              ["Permukaan", "Pembuluh", "Biliaris", "Semua struktur"] as const
            ).map((p) => (
              <button
                key={p}
                disabled={!ready}
                aria-pressed={preset === p}
                onClick={() => applyPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="toolbar liver-controls">
            <button
              disabled={!ready}
              onClick={() => {
                updateStructure(selected, { visible: true });
                setFocus((n) => n + 1);
              }}
            >
              <Focus size={15} /> Focus selected
            </button>
            <button
              disabled={!ready}
              aria-pressed={rotate}
              onClick={() => setRotate(!rotate)}
            >
              {rotate ? "Pause" : "Auto rotate"}
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                applyPreset("Permukaan");
                setSelected("liver");
                setView("Anterior");
                setRotate(false);
                setReset((n) => n + 1);
              }}
            >
              <RotateCcw size={15} /> Reset / fit
            </button>
            <select
              aria-label="Camera view"
              disabled={!ready}
              value={view}
              onChange={(e) => setView(e.target.value as View)}
            >
              {Object.keys(views).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button
              disabled={!ready}
              onClick={() => {
                const action = document.fullscreenElement
                  ? document.exitFullscreen()
                  : viewer.current?.requestFullscreen();
                action?.catch(() =>
                  useApp.getState().notify("Fullscreen is unavailable."),
                );
              }}
            >
              Fullscreen
            </button>
          </div>
          <LiverScene
            selected={selected}
            display={display}
            rotate={rotate}
            view={view}
            reset={reset}
            focus={focus}
            retry={retry}
            state={state}
            error={error}
            onSelect={select}
            onLoad={setLoaded}
            onState={(s, message = "") => {
              setState(s);
              setError(message);
            }}
            onRetry={() => {
              setState("loading");
              setError("");
              setLoaded([]);
              setRetry((n) => n + 1);
            }}
          />
          <div className="viewer-status" role="status">
            <span>
              {ready
                ? "● Interactive 3D"
                : state === "fallback"
                  ? "Tampilan 2D"
                  : state === "error"
                    ? "Gagal memuat model"
                    : "Memuat model…"}
            </span>
            <span>
              {ready
                ? "Drag to orbit · scroll to zoom · right-drag to pan"
                : "Preview statis · kontrol 3D nonaktif"}
            </span>
          </div>
        </div>
        <aside className="panel info">
          <div className="eyebrow">ANATOMY INFORMATION</div>
          <div className="organ-swatch" style={{ background: item.color }} />
          <h2>{name(item)}</h2>
          <em>
            {item.idName} · {item.fma}
          </em>
          <h3>Overview</h3>
          <p>{item.description}</p>
          <h3>Cakupan model</h3>
          <p>{item.scope}</p>
          <h3>Display properties</h3>
          <label>
            Opacity <span>{Math.round(display[selected].opacity * 100)}%</span>
            <input
              disabled={!ready}
              aria-label="Opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={display[selected].opacity}
              onChange={(e) =>
                updateStructure(selected, { opacity: Number(e.target.value) })
              }
            />
          </label>
          <div className="button-row">
            <button
              disabled={!ready}
              onClick={() => {
                if (isolated) {
                  setDisplay(isolated);
                  setIsolated(null);
                } else {
                  setIsolated(display);
                  setDisplay(
                    Object.fromEntries(
                      structures.map(({ id }) => [
                        id,
                        { ...display[id], visible: id === selected },
                      ]),
                    ) as Display,
                  );
                }
                setPreset("custom");
              }}
            >
              <Focus size={14} />
              {isolated ? "Restore isolate" : "Isolate"}
            </button>
            <button
              disabled={!ready}
              onClick={() =>
                updateStructure(selected, {
                  visible: !display[selected].visible,
                })
              }
            >
              {display[selected].visible ? "Hide" : "Show"}
            </button>
          </div>
          <button disabled={!ready} onClick={inside}>
            Lihat di dalam
          </button>
          <h3>Sumber & atribusi</h3>
          <p>{modelCredit}</p>
          <p>
            <a
              href="https://github.com/organui/liver-3d"
              target="_blank"
              rel="noreferrer"
            >
              organui/liver-3d
            </a>{" "}
            · <a href={liverAsset("LICENSE.txt")}>CC BY 4.0</a>
          </p>
          <p className="muted">
            Revisi {sourceCommit.slice(0, 12)}. Geometri tidak diubah; material
            dan framing disesuaikan. Preview dirender dari model yang sama.
          </p>
          <p>
            <a href={liverAsset("MODEL_PROVENANCE.md")}>Provenance sumber</a> ·{" "}
            <a href={liverAsset("SOBRIVIEW_SOURCE.md")}>Catatan integrasi</a>
          </p>
        </aside>
      </div>
    </>
  );
}
