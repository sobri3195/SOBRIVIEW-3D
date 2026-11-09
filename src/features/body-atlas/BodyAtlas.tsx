import { useRef, useState } from "react";
import { Eye, EyeOff, Focus, Layers, RotateCcw, Search } from "lucide-react";
import type { View } from "../../vendor/anatomy-engine/anatomy-engine";
import AtlasViewer, { type AtlasStatus } from "./AtlasViewer";
import {
  anatomyAsset,
  atlasCredit,
  atlasStructures,
  filterStructures,
  type AtlasStructure,
} from "./mapping";
import { useApp } from "../../stores/useApp";
const cameraViews: Record<string, View> = {
  "Three-quarter": "three-quarter",
  Anterior: "front",
  "Kiri pasien": "side",
  Posterior: "back",
};
export default function BodyAtlas() {
  const language = useApp((s) => s.prefs.language);
  const viewer = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AtlasStructure[]>(atlasStructures);
  const [status, setStatus] = useState<AtlasStatus>("loading");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [selected, setSelected] = useState("liver");
  const [hidden, setHidden] = useState<string[]>(["muscle"]);
  const [isolated, setIsolated] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("All");
  const [rotate, setRotate] = useState(false);
  const [view, setView] = useState<View>("three-quarter");
  const [reset, setReset] = useState(0);
  const [focus, setFocus] = useState(0);
  const [retry, setRetry] = useState(0);
  const [preset, setPreset] = useState("Organ utama");
  const ready = status === "ready";
  const available = items.filter((s) => s.status !== "unavailable");
  const filtered = filterStructures(items, query, system);
  const visible = filterStructures(available, query, system)
    .filter((s) => !hidden.includes(s.id))
    .map((s) => s.id);
  const item = items.find((s) => s.id === selected) || items[0];
  const name = (s: AtlasStructure) => (language === "id" ? s.idName : s.en);
  function select(id: string) {
    setSelected(id);
    setHidden((h) => h.filter((v) => v !== id));
    setIsolated(null);
  }
  function fit() {
    setReset((n) => n + 1);
  }
  function showAll() {
    setQuery("");
    setSystem("All");
    setHidden([]);
    setIsolated(null);
    setPreset("Konteks tubuh");
    fit();
  }
  function applyPreset(p: string) {
    setQuery("");
    setSystem("All");
    setHidden(p === "Organ utama" ? ["muscle"] : []);
    setIsolated(null);
    setPreset(p);
    fit();
  }
  function isolate() {
    if (isolated) {
      setHidden(isolated);
      setIsolated(null);
    } else {
      setIsolated(hidden);
      setHidden(available.filter((s) => s.id !== item.id).map((s) => s.id));
    }
    setQuery("");
    setSystem("All");
    setPreset("");
    fit();
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SOBRI ANATOMY ATLAS</div>
          <h1>Anatomy, in perspective.</h1>
          <p>
            Model anatomi referensi untuk edukasi. Explore structures in their
            source spatial relationships.
          </p>
        </div>
        <span className="badge">BODYPARTS3D · REFERENCE ATLAS</span>
      </div>
      <div className="notice">
        Referensi dewasa laki-laki; bukan rekonstruksi pasien atau model
        tervalidasi klinis. Beberapa kelompok hanya tersedia sebagian—lihat
        cakupan tiap struktur.
      </div>
      <div className="workstation body-atlas">
        <details className="panel structures atlas-panel" open>
          <summary>
            <Layers size={16} /> Structures{" "}
            <span>{ready ? available.length : "—"}</span>
          </summary>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search anatomy"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fit();
              }}
              placeholder="Find a structure…"
            />
          </label>
          <select
            aria-label="Organ system"
            value={system}
            onChange={(e) => {
              setSystem(e.target.value);
              fit();
            }}
          >
            {["All", ...new Set(items.map((s) => s.system))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="structure-list">
            {filtered.map((s) => (
              <div
                key={s.id}
                data-structure={s.id}
                className={`structure-row ${s.id === selected ? "selected" : ""}`}
              >
                <button
                  disabled={!ready || s.status === "unavailable"}
                  aria-pressed={s.id === selected}
                  onClick={() => select(s.id)}
                >
                  <i style={{ background: s.color }} />
                  <span>
                    {name(s)}
                    {s.status !== "available" && (
                      <small>
                        {s.status === "partial" ? "Sebagian" : "Belum tersedia"}
                      </small>
                    )}
                  </span>
                </button>
                <button
                  disabled={!ready || s.status === "unavailable"}
                  aria-label={`Toggle ${s.en}`}
                  aria-pressed={visible.includes(s.id)}
                  onClick={() => {
                    setHidden((h) =>
                      h.includes(s.id)
                        ? h.filter((v) => v !== s.id)
                        : [...h, s.id],
                    );
                    setPreset("");
                  }}
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
          {!filtered.length && (
            <p className="atlas-note">Tidak ada struktur yang cocok.</p>
          )}
          <button disabled={!ready} onClick={showAll}>
            Show all structures
          </button>
          <p className="atlas-note">
            Warna adalah kode visual edukasi. Organ berlabel “Sebagian” tidak
            memiliki seluruh komponen atau permukaan jaringan.
          </p>
        </details>
        <div className="viewer-column" ref={viewer}>
          <div className="toolbar atlas-toolbar">
            {["Organ utama", "Konteks tubuh"].map((p) => (
              <button
                key={p}
                disabled={!ready}
                aria-pressed={preset === p}
                onClick={() => applyPreset(p)}
              >
                {p}
              </button>
            ))}
            <button
              disabled={!ready || item.status === "unavailable"}
              onClick={() => {
                setQuery("");
                setSystem("All");
                setHidden((h) => h.filter((id) => id !== item.id));
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
                setView("three-quarter");
                setRotate(false);
                fit();
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
              {Object.entries(cameraViews).map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
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
          <AtlasViewer
            items={items}
            visible={visible}
            selected={selected}
            rotate={rotate}
            view={view}
            reset={reset}
            focus={focus}
            retry={retry}
            status={status}
            message={message}
            progress={progress}
            onSelect={select}
            onStatus={(s, m = "") => {
              setStatus(s);
              setMessage(m);
            }}
            onProgress={setProgress}
            onMapped={setItems}
            onRetry={() => {
              setStatus("loading");
              setMessage("");
              setProgress(null);
              setRetry((n) => n + 1);
            }}
          />
          <div className="viewer-status" role="status">
            <span>
              {ready
                ? "● Interactive 3D · Anatomi 3D siap"
                : status === "fallback"
                  ? "Tampilan 2D"
                  : status === "error"
                    ? "Gagal memuat aset"
                    : "Memuat data anatomi…"}
            </span>
            <span>
              {ready
                ? visible.length
                  ? "Drag to orbit · scroll to zoom · right-drag to pan"
                  : "Tidak ada struktur terlihat. Ubah filter atau Show all."
                : "Model lokal · kontrol 3D nonaktif"}
            </span>
          </div>
        </div>
        <details className="panel info atlas-panel" open>
          <summary>ANATOMY INFORMATION</summary>
          <div className="organ-swatch" style={{ background: item.color }} />
          <h2>{name(item)}</h2>
          {item.latin && <em>{item.latin}</em>}
          <div className="tag">{item.system}</div>
          <h3>Cakupan model</h3>
          <p>{item.scope}</p>
          <p>
            {item.status === "unavailable"
              ? "Belum tersedia"
              : item.status === "partial"
                ? "Tersedia sebagian"
                : "Kelompok sumber tersedia"}
          </p>
          <h3>Display properties</h3>
          <label>
            Opacity
            <input
              aria-label="Opacity"
              type="range"
              value="1"
              min="0"
              max="1"
              disabled
              readOnly
            />
          </label>
          <p className="atlas-note">
            Opacity per organ belum didukung ekstensi engine ini. Gunakan “Lihat
            struktur” untuk membuka organ tanpa mengubah posisinya.
          </p>
          <div className="button-row">
            <button
              disabled={!ready || item.status === "unavailable"}
              onClick={isolate}
            >
              <Focus size={14} />
              {isolated ? "Restore isolate" : "Isolate"}
            </button>
            <button
              disabled={!ready || item.status === "unavailable"}
              onClick={() =>
                setHidden((h) =>
                  h.includes(item.id)
                    ? h.filter((id) => id !== item.id)
                    : [...h, item.id],
                )
              }
            >
              {hidden.includes(item.id) ? "Show" : "Hide"}
            </button>
          </div>
          <button
            disabled={!ready || item.status === "unavailable"}
            onClick={() => {
              setIsolated(hidden);
              setQuery("");
              setSystem("All");
              setHidden(
                available.filter((s) => s.id !== item.id).map((s) => s.id),
              );
              setFocus((n) => n + 1);
            }}
          >
            Lihat struktur
          </button>
          <h3>Data Sources</h3>
          <p>{atlasCredit}</p>
          <p>
            <a
              href="https://github.com/dagno-labs/anatomy-model"
              target="_blank"
              rel="noreferrer"
            >
              Dagno anatomy-model
            </a>{" "}
            · <a href={anatomyAsset("ATTRIBUTION.md")}>Attribution</a> ·{" "}
            <a href={anatomyAsset("LICENSE")}>CC BY 4.0</a>
          </p>
          <p className="atlas-note">
            Disiapkan oleh Human Atlas / Dagno. Geometri dan koordinat sumber
            dipertahankan; warna, kontrol, dan framing disesuaikan. Konteks
            tubuh hanya menambahkan otot oblik eksternal; vertebra tersedia pada
            kedua preset.
          </p>
          <p>
            <a href={anatomyAsset("SOBRIVIEW_SOURCE.md")}>
              Cakupan & revisi sumber
            </a>
          </p>
        </details>
      </div>
    </>
  );
}
