import { parseAnnotations } from "../../medical/annotations";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Upload, RotateCcw, Download, Play, Pause } from "lucide-react";
import { importFiles, type ImportedSlice } from "../../medical/dicom";
import { SIZE, sliceValue, presets } from "../../medical/demo";
import { distance } from "../../medical/metadata";
import { exportJSON, screenshot } from "../../lib/export";
import { saveBlob } from "../../lib/indexeddb";
import { useApp } from "../../stores/useApp";
const VolumeViewport = lazy(() => import("./VolumeViewport"));
const CornerstoneViewport = lazy(() => import("./CornerstoneViewport"));
type Point = [number, number];
type Measurement = {
  id: string;
  points: Point[];
  slice: number;
  plane: string;
};
function Phantom({
  plane,
  slice,
  windowRange,
  invert,
  zoom,
  tool,
  measurements,
  onMeasure,
  onSlice,
  coordinates,
  onCrosshair,
}: {
  plane: string;
  slice: number;
  windowRange: [number, number];
  invert: boolean;
  zoom: number;
  tool: string;
  measurements: Measurement[];
  onMeasure: (m: Measurement) => void;
  onSlice: (n: number) => void;
  coordinates: [number, number, number];
  onCrosshair: (p: Point) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [probe, setProbe] = useState("");
  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    const image = ctx.createImageData(SIZE, SIZE);
    for (let v = 0; v < SIZE; v++)
      for (let u = 0; u < SIZE; u++) {
        let n = Math.round(
          Math.max(
            0,
            Math.min(
              255,
              ((sliceValue(plane, u, v, slice) -
                (windowRange[1] - windowRange[0] / 2)) /
                windowRange[0]) *
                255,
            ),
          ),
        );
        if (invert) n = 255 - n;
        const i = (v * SIZE + u) * 4;
        image.data.set([n, n, n, 255], i);
      }
    const tmp = document.createElement("canvas");
    tmp.width = tmp.height = SIZE;
    tmp.getContext("2d")!.putImageData(image, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 480, 480);
    ctx.save();
    ctx.translate(240, 240);
    ctx.scale(zoom, zoom);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, -240, -240, 480, 480);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cross =
      plane === "Axial"
        ? [coordinates[0], coordinates[1]]
        : plane === "Coronal"
          ? [coordinates[0], 95 - coordinates[2]]
          : [coordinates[1], 95 - coordinates[2]];
    ctx.moveTo(-240, cross[1] * 5 - 240);
    ctx.lineTo(240, cross[1] * 5 - 240);
    ctx.moveTo(cross[0] * 5 - 240, -240);
    ctx.lineTo(cross[0] * 5 - 240, 240);
    ctx.stroke();
    for (const m of measurements.filter(
      (m) => m.plane === plane && m.slice === slice,
    )) {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.points[0][0] * 5 - 240, m.points[0][1] * 5 - 240);
      ctx.lineTo(m.points[1][0] * 5 - 240, m.points[1][1] * 5 - 240);
      ctx.stroke();
    }
    ctx.restore();
  }, [plane, slice, windowRange, invert, zoom, measurements, coordinates]);
  function click(e: React.MouseEvent) {
    const rect = canvas.current!.getBoundingClientRect();
    const p: Point = [
      (((e.clientX - rect.left) / rect.width) * 480 - 240) / zoom / 5 + 48,
      (((e.clientY - rect.top) / rect.height) * 480 - 240) / zoom / 5 + 48,
    ];
    if (p.some((n) => n < 0 || n >= SIZE)) return;
    if (tool === "Crosshair") onCrosshair([Math.floor(p[0]), Math.floor(p[1])]);
    setProbe(
      `${p.map(Math.round).join(", ")} · ${sliceValue(plane, Math.floor(p[0]), Math.floor(p[1]), slice)} synthetic units`,
    );
    if (tool === "Length") {
      if (points.length === 0) setPoints([p]);
      else {
        onMeasure({
          id: crypto.randomUUID(),
          points: [points[0], p],
          slice,
          plane,
        });
        setPoints([]);
      }
    }
  }
  const touch = useRef(0);
  return (
    <div
      className="phantom"
      onWheel={(e) =>
        onSlice(Math.max(0, Math.min(SIZE - 1, slice + Math.sign(e.deltaY))))
      }
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const d = e.changedTouches[0].clientY - touch.current;
        if (Math.abs(d) > 20)
          onSlice(Math.max(0, Math.min(SIZE - 1, slice + Math.sign(d))));
      }}
    >
      <canvas
        ref={canvas}
        width="480"
        height="480"
        onClick={click}
        aria-label={`${plane} synthetic volume`}
      />
      <span className="viewport-label">
        {plane.toUpperCase()}{" "}
        <span>
          {slice + 1} / {SIZE}
        </span>
      </span>
      <span className="orientation">{plane === "Axial" ? "A" : "S"}</span>
      <div className="probe">
        {points.length
          ? "Select second point"
          : probe || "Click to probe · 1 mm synthetic voxel grid"}
      </div>
    </div>
  );
}
export default function LegacyViewer({
  mpr = false,
  initialFiles,
  localOnly = false,
}: {
  mpr?: boolean;
  initialFiles?: File[];
  localOnly?: boolean;
}) {
  const [groups, setGroups] = useState<ImportedSlice[][]>([]);
  const [group, setGroup] = useState(0);
  const [index, setIndex] = useState(48);
  const [axes, setAxes] = useState([48, 48, 48]);
  const [windowRange, setWindowRange] = useState<[number, number]>(
    presets["Soft tissue"],
  );
  const [invert, setInvert] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState("Probe");
  const [reset, setReset] = useState(0);
  const [cine, setCine] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [redo, setRedo] = useState<Measurement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [layout, setLayout] = useState("2x2");
  const input = useRef<HTMLInputElement>(null);
  const activeImport = useRef<AbortController | null>(null);
  useEffect(() => () => activeImport.current?.abort(), []);
  const series = groups[group];
  const volumeMode = !!(mpr && series && series.length >= 3);
  const calibrated = series?.every(
    (s) =>
      s.metadata.spacing.length === 2 &&
      s.metadata.spacing.every((v) => Number.isFinite(v) && v > 0) &&
      (s.metadata.modality !== "CT" ||
        (Number.isFinite(s.metadata.slope) &&
          s.metadata.slope !== 0 &&
          Number.isFinite(s.metadata.intercept))),
  );
  const updateIndex = useCallback((n: number) => setIndex(n), []);
  useEffect(() => {
    if (!cine) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % (series?.length || SIZE)),
      140,
    );
    return () => clearInterval(timer);
  }, [cine, series]);
  async function load(files: File[]) {
    if (!files.length) return;
    activeImport.current?.abort();
    const controller = new AbortController();
    activeImport.current = controller;
    setBusy(true);
    setError("");
    setCine(false);
    try {
      const result = await importFiles(files, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.series.length)
        throw Error(
          result.issues[0] ||
            "No supported DICOM images found. ZIP import is not supported.",
        );
      setGroups(result.series);
      if (result.issues.length) setError(result.issues.join(" "));
      setGroup(0);
      setTool("WindowLevel");
      setIndex(0);
      setMeasurements([]);
      setRedo([]);
      setInvert(result.series[0][0].metadata.photometric === "MONOCHROME1");
      setConsent(false);
      useApp
        .getState()
        .notify(
          `${result.series.length} series imported locally; ${result.rejected} non-image or invalid files excluded.`,
        );
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    if (initialFiles?.length) void load(initialFiles);
  }, [initialFiles]);
  const addMeasurement = (m: Measurement) => {
    setMeasurements((ms) => [...ms, m]);
    setRedo([]);
  };
  if (localOnly && !series)
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">SOBRI CT EXPLORER</div>
            <h1>Explore every slice.</h1>
            <p>Open a local DICOM series. Files stay in this browser.</p>
          </div>
          <button className="primary" onClick={() => input.current?.click()}>
            <Upload size={16} /> Open DICOM files
          </button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept=".dcm,application/dicom"
          onChange={(e) => void load([...(e.target.files || [])])}
        />
        <label className="file-button">
          Import folder
          <input
            type="file"
            multiple
            hidden
            {...{ webkitdirectory: "" }}
            onChange={(e) => void load([...(e.target.files || [])])}
          />
        </label>
        <div
          className="ct-empty"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void load([...e.dataTransfer.files]);
          }}
        >
          <p role="status">
            {busy
              ? "Reading DICOM metadata locally…"
              : "Pilih atau seret berkas DICOM lokal untuk mulai. Tidak ada upload otomatis."}
          </p>
          {error && <p role="alert">{error}</p>}
        </div>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {mpr ? "SOBRI MPR STUDIO" : "SOBRI CT EXPLORER"}
          </div>
          <h1>
            {mpr ? "One volume. Three perspectives." : "Explore every slice."}
          </h1>
          <p>Local processing. No upload. Education and research only.</p>
        </div>
        <button className="primary" onClick={() => input.current?.click()}>
          <Upload size={16} /> Open DICOM files
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".dcm,application/dicom"
          hidden
          onChange={(e) => void load([...(e.target.files || [])])}
        />
      </div>
      <div className="notice">
        {series
          ? "Imported DICOM remains in memory. Patient identity metadata is neither displayed nor stored in localStorage. Calibration depends on source metadata."
          : "SYNTHETIC DEMO — NOT A REAL PATIENT SCAN. Mathematical phantom, 1 mm isotropic grid; intensity values are synthetic, not clinical HU."}
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void load([...e.dataTransfer.files]);
        }}
      >
        <div className="toolbar">
          <label className="file-button">
            Import folder
            <input
              type="file"
              multiple
              hidden
              {...{ webkitdirectory: "" }}
              onChange={(e) => void load([...(e.target.files || [])])}
            />
          </label>
          {series && (
            <>
              <select
                aria-label="DICOM series"
                value={group}
                onChange={(e) => {
                  setGroup(+e.target.value);
                  setIndex(0);
                  setTool("WindowLevel");
                  setInvert(
                    groups[+e.target.value][0].metadata.photometric ===
                      "MONOCHROME1",
                  );
                  setCine(false);
                }}
              >
                {groups.map((s, i) => (
                  <option value={i} key={i}>
                    Series {i + 1} · {s.length} images ·{" "}
                    {s[0].metadata.modality}
                    {s[0].metadata.imageType?.some((t) =>
                      /LOCALIZER|SCOUT/i.test(t),
                    )
                      ? " · Localizer/scout"
                      : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setGroups([]);
                  setTool("Probe");
                  setIndex(48);
                  setCine(false);
                }}
              >
                {localOnly ? "Close local study" : "Return to synthetic demo"}
              </button>
            </>
          )}
          <select
            disabled={volumeMode}
            aria-label="Imaging tool"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
          >
            {(series
              ? [
                  "WindowLevel",
                  "Pan",
                  "Zoom",
                  "Length",
                  "Angle",
                  "RectangleROI",
                  "EllipticalROI",
                  "Probe",
                ]
              : ["Length", "Probe", "Crosshair"]
            )
              .filter(
                (t) =>
                  !series ||
                  calibrated ||
                  ["WindowLevel", "Pan", "Zoom"].includes(t),
              )
              .map((t) => (
                <option key={t}>{t}</option>
              ))}
          </select>
          <select
            aria-label="Window preset"
            onChange={(e) => setWindowRange(presets[e.target.value])}
          >
            {Object.keys(presets).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button onClick={() => setInvert(!invert)}>Invert</button>
          <button
            aria-label="Reset viewport"
            onClick={() => {
              setReset((r) => r + 1);
              setZoom(1);
              setWindowRange(presets["Soft tissue"]);
              setInvert(false);
              setIndex(series ? 0 : 48);
              setAxes([48, 48, 48]);
            }}
          >
            <RotateCcw size={16} />
          </button>
          <button disabled={volumeMode} onClick={() => setCine(!cine)}>
            {cine ? <Pause size={15} /> : <Play size={15} />} Cine
          </button>
          <button
            onClick={() => {
              const c = document.querySelector(".imaging-workspace canvas");
              if (c) screenshot(c as HTMLCanvasElement);
            }}
          >
            <Download size={16} /> PNG
          </button>
          {mpr && !series && (
            <select
              aria-label="MPR layout"
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              {["2x2", "1x3", "3x1", "1x1"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          )}
        </div>
        {busy && <p role="status">Reading DICOM metadata locally…</p>}
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {mpr && series && (
          <p className="notice">
            MPR requires a consistent, evenly spaced volume of at least three
            slices. Single images use the stack viewer. Unsupported geometry is
            rejected.
          </p>
        )}
        <div className="imaging-grid">
          <div
            className={`imaging-workspace ${mpr && !series ? "mpr layout-" + layout : ""}`}
          >
            {series ? (
              <Suspense fallback={<p>Loading DICOM engine…</p>}>
                {mpr && series.length >= 3 ? (
                  <VolumeViewport
                    slices={series}
                    windowRange={windowRange}
                    invert={invert}
                    reset={reset}
                  />
                ) : (
                  <CornerstoneViewport
                    slices={series}
                    index={index}
                    tool={tool}
                    windowRange={windowRange}
                    invert={invert}
                    onIndex={updateIndex}
                    reset={reset}
                  />
                )}
              </Suspense>
            ) : (
              (mpr
                ? ["Axial", "Coronal", "Sagittal"].slice(
                    0,
                    layout === "1x1" ? 1 : 3,
                  )
                : ["Axial"]
              ).map((plane, i) => (
                <div key={plane}>
                  <Phantom
                    coordinates={[axes[2], axes[1], index]}
                    onCrosshair={([u, v]) => {
                      if (plane === "Axial") setAxes((a) => [a[0], v, u]);
                      else if (plane === "Coronal") {
                        setAxes((a) => [a[0], a[1], u]);
                        setIndex(95 - v);
                      } else {
                        setAxes((a) => [a[0], u, a[2]]);
                        setIndex(95 - v);
                      }
                    }}
                    plane={plane}
                    slice={i === 0 ? index : axes[i]}
                    windowRange={windowRange}
                    invert={invert}
                    zoom={zoom}
                    tool={tool}
                    measurements={measurements}
                    onMeasure={addMeasurement}
                    onSlice={(n) => {
                      if (i === 0) setIndex(n);
                      else setAxes((a) => a.map((v, j) => (j === i ? n : v)));
                    }}
                  />
                  {mpr && (
                    <input
                      type="range"
                      aria-label={`${plane} position`}
                      min="0"
                      max={SIZE - 1}
                      value={i === 0 ? index : axes[i]}
                      onChange={(e) => {
                        if (i === 0) setIndex(+e.target.value);
                        else
                          setAxes((a) =>
                            a.map((v, j) => (j === i ? +e.target.value : v)),
                          );
                      }}
                    />
                  )}
                </div>
              ))
            )}
            {mpr && !series && layout === "2x2" && (
              <div className="volume-info">
                <h2>Synthetic volume</h2>
                <p>96 × 96 × 96 voxels</p>
                <p>
                  Shared mathematical phantom sampled in three orthogonal
                  planes.
                </p>
                <p>
                  Crosshairs link the three synthetic volume planes. Select
                  Crosshair and click a plane to reposition the intersection. 3D
                  volume rendering is not implemented.
                </p>
              </div>
            )}
          </div>
          <aside className="panel">
            <div className="eyebrow">VIEWPORT PROPERTIES</div>
            <h3>{series ? "DICOM stack" : "Synthetic phantom"}</h3>
            <label>
              Slice {index + 1} / {series?.length || SIZE}
              <input
                type="range"
                disabled={volumeMode}
                aria-label="Slice"
                min="0"
                max={(series?.length || SIZE) - 1}
                value={index}
                onChange={(e) => setIndex(+e.target.value)}
              />
            </label>
            <label>
              Window width{" "}
              <input
                aria-label="Window width"
                type="number"
                min="1"
                value={windowRange[0]}
                onChange={(e) =>
                  setWindowRange([Math.max(1, +e.target.value), windowRange[1]])
                }
              />
            </label>
            <label>
              Window level{" "}
              <input
                aria-label="Window level"
                type="number"
                value={windowRange[1]}
                onChange={(e) =>
                  setWindowRange([windowRange[0], +e.target.value])
                }
              />
            </label>
            {!series && (
              <label>
                Zoom {zoom.toFixed(1)}×
                <input
                  aria-label="Zoom"
                  type="range"
                  min=".5"
                  max="3"
                  step=".1"
                  value={zoom}
                  onChange={(e) => setZoom(+e.target.value)}
                />
              </label>
            )}
            {series && !calibrated && (
              <p className="notice">
                Measurement and intensity tools are disabled: valid spacing or
                CT rescale metadata is missing.
              </p>
            )}
            {volumeMode && (
              <p>
                Use each volume viewport’s wheel or Next slice button. Drag to
                adjust window/level, middle-drag to pan, right-drag to zoom.
              </p>
            )}
            <h3>Measurements</h3>
            {series ? (
              <p>
                Cornerstone measurements are held in memory. Physical units
                require valid PixelSpacing. Export of imported-study annotations
                is not implemented.
              </p>
            ) : (
              <>
                <p>
                  Select Length, then click two points. Measurements use the
                  synthetic 1 mm grid.
                </p>
                <ol>
                  {measurements.map((m) => (
                    <li key={m.id}>
                      {distance(m.points[0], m.points[1], [1, 1]).value.toFixed(
                        2,
                      )}{" "}
                      mm · {m.plane}{" "}
                      <button
                        aria-label="Delete measurement"
                        onClick={() =>
                          setMeasurements((ms) =>
                            ms.filter((x) => x.id !== m.id),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="button-row">
                  <button
                    disabled={!measurements.length}
                    onClick={() => {
                      setRedo((r) => [
                        ...r,
                        measurements[measurements.length - 1],
                      ]);
                      setMeasurements((ms) => ms.slice(0, -1));
                    }}
                  >
                    Undo
                  </button>
                  <button
                    disabled={!redo.length}
                    onClick={() => {
                      setMeasurements((ms) => [...ms, redo[redo.length - 1]]);
                      setRedo((r) => r.slice(0, -1));
                    }}
                  >
                    Redo
                  </button>
                </div>
                <button
                  onClick={() =>
                    exportJSON("sobriview-demo-annotations.json", {
                      version: 1,
                      dataset: "synthetic-phantom",
                      measurements,
                    })
                  }
                >
                  Export annotations
                </button>
                <label className="file-button">
                  Import demo annotations
                  <input
                    type="file"
                    hidden
                    accept="application/json,.json"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024)
                          throw Error("Annotation file too large");
                        setMeasurements(
                          parseAnnotations(JSON.parse(await file.text())),
                        );
                        setRedo([]);
                        useApp.getState().notify("Demo annotations imported.");
                      } catch {
                        useApp
                          .getState()
                          .notify(
                            "Invalid annotations: expected version 1 synthetic phantom coordinates.",
                          );
                      }
                    }}
                  />
                </label>
              </>
            )}
            {series && (
              <>
                <h3>Optional local cache</h3>
                <p>
                  Only cache properly anonymized files. DICOM may contain
                  identifiers in headers and burned-in pixels. Local storage is
                  not encrypted or a clinical archive.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{" "}
                  I confirm these files are anonymized and consent to persistent
                  local storage.
                </label>
                <button
                  disabled={!consent}
                  onClick={async () => {
                    try {
                      for (const s of series)
                        await saveBlob("dicom-" + s.metadata.sop, s.file);
                      useApp
                        .getState()
                        .notify("Anonymized series saved to local IndexedDB.");
                    } catch {
                      useApp
                        .getState()
                        .notify(
                          "Unable to save dataset: quota or storage error.",
                        );
                    }
                  }}
                >
                  Cache series locally
                </button>
              </>
            )}
          </aside>
        </div>
        <div className="viewer-status">
          <span>
            ● {series ? "DICOM" : "SYNTHETIC"} · {index + 1} /{" "}
            {series?.length || SIZE}
          </span>
          <span>
            W {windowRange[0]} / L {windowRange[1]} ·{" "}
            {series ? "Cornerstone3D" : "Canvas volume reslicing"}
          </span>
        </div>
      </div>
    </>
  );
}
