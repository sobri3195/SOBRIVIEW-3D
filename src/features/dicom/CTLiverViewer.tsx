import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Upload } from "lucide-react";
import CTSliceCanvas, { type VolumeMeasurement } from "./CTSliceCanvas";
import {
  physicalDistance,
  sliceGeometry,
  type Volume,
} from "../../medical/volume";
import { parseVolumeAnnotations } from "../../medical/volume-annotations";
import { download, exportJSON } from "../../lib/export";
import { presets } from "../../medical/demo";
import source from "../../../public/demo/ct-liver/source.json";
export const ctAsset = (name: string) =>
  `${import.meta.env.BASE_URL}demo/ct-liver/${name}`;
export default function CTLiverViewer({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const [volume, setVolume] = useState<Volume | null>(null),
    [phase, setPhase] = useState("loading"),
    [error, setError] = useState("");
  const [progress, setProgress] = useState<{
      loaded: number;
      total: number | null;
    } | null>(null),
    [retry, setRetry] = useState(0);
  const [slice, setSlice] = useState(source.preview.initialSlice),
    [windowRange, setWindow] = useState<[number, number]>([400, 40]);
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState<[number, number]>([0, 0]),
    [invert, setInvert] = useState(false),
    [tool, setTool] = useState("Probe"),
    [cine, setCine] = useState(false),
    [crosshair, setCrosshair] = useState(false);
  const [history, setHistory] = useState<{
    past: VolumeMeasurement[][];
    present: VolumeMeasurement[];
    future: VolumeMeasurement[][];
  }>({ past: [], present: [], future: [] });
  const measurements = history.present;
  const [annotationError, setAnnotationError] = useState("");
  function editMeasurements(
    edit: (current: VolumeMeasurement[]) => VolumeMeasurement[],
  ) {
    setHistory((h) => ({
      past: [...h.past.slice(-99), h.present],
      present: edit(h.present),
      future: [],
    }));
  }
  const input = useRef<HTMLInputElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../medical/ct-liver.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      setError(
        "CT loader could not start. This browser or its security policy does not allow module workers.",
      );
      setPhase("error");
      return;
    }
    let active = true;
    worker.onmessage = (event: MessageEvent) => {
      if (!active) return;
      const data = event.data;
      if (data.type === "progress")
        setProgress({ loaded: data.loaded, total: data.total });
      else if (data.type === "decoding") setPhase("decoding");
      else if (data.type === "volume") {
        setVolume(data.volume);
        setPhase("rendering");
        worker.terminate();
      } else if (data.type === "error") {
        setError(data.message);
        setPhase("error");
        worker.terminate();
      }
    };
    worker.onerror = () => {
      if (active) {
        setError(
          "CT loader worker failed. Retry or use a browser that supports module workers.",
        );
        setPhase("error");
      }
      worker.terminate();
    };
    worker.postMessage({
      url: new URL(ctAsset(source.preview.file), location.href).href,
    });
    return () => {
      active = false;
      worker.postMessage({ cancel: true });
      worker.terminate();
    };
  }, [retry]);
  const markReady = useCallback(
    () => setPhase((p) => (p === "rendering" ? "ready" : p)),
    [],
  );
  useEffect(() => {
    if (!cine || !volume || phase !== "ready") return;
    const timer = setInterval(
      () => setSlice((n) => (n + 1) % volume.dimensions[2]),
      140,
    );
    return () => clearInterval(timer);
  }, [cine, volume, phase]);
  const ready = phase === "ready",
    g = volume ? sliceGeometry(volume) : null;
  function reset() {
    setZoom(1);
    setPan([0, 0]);
    setWindow([400, 40]);
    setInvert(false);
    setSlice(source.preview.initialSlice);
    setCine(false);
  }
  function capture() {
    const c = viewport.current?.querySelector("canvas");
    if (!c || !ready) return;
    const out = document.createElement("canvas");
    out.width = Math.max(1000, c.width);
    out.height = c.height + 90;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, (out.width - c.width) / 2, 0);
    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      "SOBRIVIEW · CTLiver resampled preview · Medical Segmentation Decathlon / 3D Slicer",
      14,
      out.height - 61,
    );
    const o = sliceGeometry(volume!);
    ctx.fillText(o.top, out.width / 2, 25);
    ctx.fillText(o.bottom, out.width / 2, c.height - 22);
    ctx.fillText(o.left, 15, c.height / 2);
    ctx.fillText(o.right, out.width - 28, c.height / 2);
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "CC BY-SA 4.0 · Nearest-neighbor preview · For education and research",
      14,
      out.height - 38,
    );
    ctx.fillText(
      `Native float intensity (HU unconfirmed) · Slice ${slice + 1} / ${volume!.dimensions[2]} · W ${windowRange[0]} / L ${windowRange[1]}`,
      14,
      out.height - 16,
    );
    out.toBlob((b) => {
      if (b) download("sobriview-ctliver-cc-by-sa.png", b);
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SOBRI CT EXPLORER</div>
          <h1>Explore every slice.</h1>
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
          onChange={(e) => {
            const files = [...(e.target.files || [])];
            if (files.length) onFiles(files);
          }}
        />
      </div>
      <div className="notice">
        CT contoh publik — Medical Segmentation Decathlon / 3D Slicer. Untuk
        edukasi dan penelitian. <strong>Resampled preview</strong> · CC BY-SA
        4.0.
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles([...e.dataTransfer.files]);
        }}
      >
        <div className="toolbar ct-toolbar">
          <label className="file-button">
            Import folder
            <input
              type="file"
              hidden
              multiple
              {...{ webkitdirectory: "" }}
              onChange={(e) => onFiles([...(e.target.files || [])])}
            />
          </label>
          <select
            aria-label="Imaging tool"
            disabled={!ready}
            value={tool}
            onChange={(e) => setTool(e.target.value)}
          >
            {["Probe", "WindowLevel", "Pan", "Zoom", "Length"].map((t) => (
              <option
                key={t}
                disabled={t === "Length" && volume?.spatialUnit !== "mm"}
              >
                {t}
              </option>
            ))}
          </select>
          <select
            aria-label="Window preset"
            disabled={!ready}
            value={
              Object.entries(presets).find(
                ([, v]) => v[0] === windowRange[0] && v[1] === windowRange[1],
              )?.[0] || "Custom"
            }
            onChange={(e) => setWindow(presets[e.target.value])}
          >
            <option value="Custom" disabled>
              Custom
            </option>
            {Object.keys(presets).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button disabled={!ready} onClick={() => setInvert(!invert)}>
            Invert
          </button>
          <button disabled={!ready} aria-label="Reset viewport" onClick={reset}>
            <RotateCcw size={16} />
          </button>
          <button
            disabled={!ready}
            aria-pressed={cine}
            onClick={() => setCine(!cine)}
          >
            {cine ? <Pause size={15} /> : <Play size={15} />} Cine
          </button>
          <button disabled={!ready} onClick={capture}>
            <Download size={16} /> PNG
          </button>
          <button
            disabled={!ready || slice === 0}
            onClick={() => setSlice((n) => Math.max(0, n - 1))}
          >
            Previous slice
          </button>
          <button
            disabled={!ready || slice === (volume?.dimensions[2] || 1) - 1}
            onClick={() =>
              setSlice((n) => Math.min(volume!.dimensions[2] - 1, n + 1))
            }
          >
            Next slice
          </button>
        </div>
        <div className="imaging-grid ct-grid">
          <div
            className="imaging-workspace ct-workspace"
            ref={viewport}
            data-state={phase}
          >
            {volume && (
              <CTSliceCanvas
                volume={volume}
                slice={slice}
                windowRange={windowRange}
                invert={invert}
                zoom={zoom}
                pan={pan}
                tool={tool}
                crosshair={crosshair}
                measurements={measurements}
                onSlice={setSlice}
                onWindow={setWindow}
                onZoom={setZoom}
                onPan={setPan}
                onPaint={markReady}
                onMeasure={(m) => {
                  if (measurements.length < 1000)
                    editMeasurements((a) => [...a, m]);
                  else
                    setAnnotationError(
                      "The 1,000-annotation limit has been reached.",
                    );
                }}
              />
            )}
            {!ready && (
              <div
                className="ct-loading"
                role={phase === "error" ? "alert" : "status"}
              >
                <strong>
                  {phase === "error"
                    ? "CT contoh gagal dimuat"
                    : phase === "loading"
                      ? "Memuat CT contoh…"
                      : phase === "decoding"
                        ? "Mendekompresi dan memeriksa volume…"
                        : "Menyiapkan irisan CT…"}
                </strong>
                {progress && phase === "loading" && (
                  <>
                    <p>
                      {(progress.loaded / 1048576).toFixed(1)} MB
                      {progress.total
                        ? ` / ${(progress.total / 1048576).toFixed(1)} MB`
                        : ""}
                    </p>
                    {progress.total && (
                      <progress value={progress.loaded} max={progress.total} />
                    )}
                  </>
                )}
                {error && (
                  <>
                    <p>{error}</p>
                    <button
                      onClick={() => {
                        setError("");
                        setProgress(null);
                        setVolume(null);
                        setPhase("loading");
                        setRetry((n) => n + 1);
                      }}
                    >
                      Coba lagi
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <aside className="panel ct-properties">
            <div className="eyebrow">VIEWPORT PROPERTIES</div>
            <h3>CTLiver · resampled preview</h3>
            <label>
              Slice {volume ? `${slice + 1} / ${volume.dimensions[2]}` : "—"}
              <input
                disabled={!ready}
                aria-label="Slice"
                type="range"
                min="0"
                max={volume ? volume.dimensions[2] - 1 : 0}
                value={slice}
                onChange={(e) => setSlice(+e.target.value)}
              />
            </label>
            <label>
              Window width
              <input
                disabled={!ready}
                aria-label="Window width"
                type="number"
                min="1"
                value={windowRange[0]}
                onChange={(e) =>
                  setWindow([Math.max(1, +e.target.value), windowRange[1]])
                }
              />
            </label>
            <label>
              Window level
              <input
                disabled={!ready}
                aria-label="Window level"
                type="number"
                value={windowRange[1]}
                onChange={(e) => setWindow([windowRange[0], +e.target.value])}
              />
            </label>
            <label>
              Zoom {zoom.toFixed(1)}×
              <input
                disabled={!ready}
                aria-label="Zoom"
                type="range"
                min="0.25"
                max="8"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
            <label className="check">
              <input
                disabled={!ready}
                type="checkbox"
                checked={crosshair}
                onChange={(e) => setCrosshair(e.target.checked)}
              />{" "}
              Show crosshair
            </label>
            {volume && (
              <>
                <h3>Volume metadata</h3>
                <p data-testid="volume-metadata">
                  {volume.dimensions.join(" × ")} voxels
                  <br />
                  Spacing {volume.spacing
                    .map((n) => n.toFixed(6))
                    .join(" × ")}{" "}
                  {volume.spatialUnit}
                  <br />
                  LPS · {g?.axial ? "Axial" : "Native oblique/permuted plane"} ·
                  stack {g?.stack}
                  <br />
                  Origin {volume.origin.map((n) => n.toFixed(3)).join(", ")}
                  <br />
                  Float32 · Intensity {volume.range.join(" … ")}
                </p>
                <p>
                  Spacing mm follows the Slicer coordinate convention; the
                  original header omits units. Intensity is shown without a
                  confirmed HU calibration. Display presets are not metadata
                  calibration.
                </p>
              </>
            )}
            <h3>Measurements</h3>
            <p>
              Select Length, then two points. Length uses the physical
              voxel-to-LPS transform.{" "}
              {volume?.spatialUnit !== "mm" &&
                "Measurement in mm is disabled until spatial units are confirmed."}
            </p>
            <ol>
              {measurements.map((m) => (
                <li key={m.id}>
                  {volume
                    ? physicalDistance(
                        volume,
                        m.points[0],
                        m.points[1],
                      )?.toFixed(2)
                    : "—"}{" "}
                  mm · slice {m.points[0][2] + 1}
                  <button
                    aria-label="Delete measurement"
                    onClick={() =>
                      editMeasurements((a) => a.filter((x) => x.id !== m.id))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <div className="button-row">
              <button
                disabled={!history.past.length}
                onClick={() =>
                  setHistory((h) => ({
                    past: h.past.slice(0, -1),
                    present: h.past[h.past.length - 1],
                    future: [h.present, ...h.future],
                  }))
                }
              >
                Undo
              </button>
              <button
                disabled={!history.future.length}
                onClick={() =>
                  setHistory((h) => ({
                    past: [...h.past, h.present],
                    present: h.future[0],
                    future: h.future.slice(1),
                  }))
                }
              >
                Redo
              </button>
            </div>
            <button
              disabled={!volume}
              onClick={() =>
                exportJSON("sobriview-ctliver-annotations.json", {
                  version: 2,
                  dataset: volume!.source.id,
                  dimensions: volume!.dimensions,
                  measurements,
                })
              }
            >
              Export annotations
            </button>
            <label className="file-button">
              Import CT annotations
              <input
                type="file"
                hidden
                accept="application/json,.json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f || !volume) return;
                    if (f.size > 1048576)
                      throw new Error("Annotation file too large.");
                    const parsed = parseVolumeAnnotations(
                      JSON.parse(await f.text()),
                      volume,
                    );
                    editMeasurements(() => parsed);
                    setAnnotationError("");
                  } catch (error) {
                    setAnnotationError(
                      error instanceof Error
                        ? error.message
                        : "Invalid annotations.",
                    );
                  }
                }}
              />
            </label>
            {annotationError && <p role="alert">{annotationError}</p>}
            <h3>Data Sources</h3>
            <p>{source.attribution}</p>
            <p>
              <a href={ctAsset("ATTRIBUTION.md")}>Attribution</a> ·{" "}
              <a href={ctAsset("LICENSE.md")}>CC BY-SA 4.0</a> ·{" "}
              <a href={ctAsset("source.json")}>Source & metadata</a>
            </p>
          </aside>
        </div>
        <div className="viewer-status" role="status">
          <span>
            {ready
              ? `● CT contoh siap · ${slice + 1} / ${volume!.dimensions[2]}`
              : phase === "error"
                ? "CT gagal dimuat"
                : "CT belum siap"}
          </span>
          <span>
            W {windowRange[0].toFixed(0)} / L {windowRange[1].toFixed(0)} ·
            Intensity · resampled preview
          </span>
        </div>
      </div>
    </>
  );
}
