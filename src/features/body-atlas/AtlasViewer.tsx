import { useEffect, useLayoutEffect, useRef } from "react";
import { loadModel, AnatomyEngineError } from "@dagno/anatomy-engine";
import LocalAnatomyEngineError from "../../vendor/anatomy-engine/anatomy-engine-error";
import AnatomyEngine, {
  type View,
} from "../../vendor/anatomy-engine/anatomy-engine";
import { download } from "../../lib/export";
import {
  anatomyAsset,
  atlasCredit,
  meshIdsFor,
  resolveStructures,
  type AtlasStructure,
} from "./mapping";
export type AtlasStatus =
  | "loading"
  | "preparing"
  | "ready"
  | "error"
  | "fallback";
type Props = {
  items: AtlasStructure[];
  visible: string[];
  selected: string;
  rotate: boolean;
  view: View;
  reset: number;
  focus: number;
  retry: number;
  status: AtlasStatus;
  message: string;
  progress: { loaded: number; total: number } | null;
  onSelect: (id: string) => void;
  onStatus: (s: AtlasStatus, message?: string) => void;
  onProgress: (p: { loaded: number; total: number }) => void;
  onMapped: (items: AtlasStructure[]) => void;
  onRetry: () => void;
};
export default function AtlasViewer(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const engine = useRef<AnatomyEngine | null>(null);
  const last = useRef({ view: "", focus: 0, reset: -1 });
  const motion = useRef(false);
  function apply() {
    const e = engine.current,
      p = live.current;
    if (!e) return;
    e.setVisibleParts(meshIdsFor(p.items, p.visible));
    e.setSelection(meshIdsFor(p.items, [p.selected]));
    e.setAutoRotate(p.rotate && !motion.current);
    if (last.current.view !== p.view) e.setView(p.view);
    if (last.current.reset !== p.reset) e.resetView();
    if (last.current.focus !== p.focus)
      e.focusParts(meshIdsFor(p.items, [p.selected]));
    last.current = { view: p.view, focus: p.focus, reset: p.reset };
  }
  useLayoutEffect(() => {
    live.current = props;
    apply();
  }, [props]);
  useEffect(() => {
    const abort = new AbortController();
    let disposed = false,
      failed = false,
      loaded = false,
      reported = false;
    let instance: AnatomyEngine | null = null;
    const unsubscribers: (() => void)[] = [];
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    motion.current = media.matches;
    const changeMotion = () => {
      motion.current = media.matches;
      engine.current?.setAutoRotate(live.current.rotate && !media.matches);
    };
    media.addEventListener("change", changeMotion);
    const release = () => {
      unsubscribers.splice(0).forEach((off) => off());
      instance?.dispose();
      instance = null;
      engine.current = null;
    };
    const fail = (error: unknown) => {
      if (disposed || failed) return;
      failed = true;
      abort.abort();
      release();
      const code =
        error instanceof AnatomyEngineError ||
        error instanceof LocalAnatomyEngineError
          ? error.code
          : "unknown";
      const fallback = code === "webgl-unavailable" || code === "context-lost";
      live.current.onStatus(
        fallback ? "fallback" : "error",
        fallback
          ? "WebGL tidak tersedia atau konteks terputus. Preview model ditampilkan sebagai Tampilan 2D."
          : code === "decompression-unavailable"
            ? "Browser ini tidak mendukung dekompresi model. Gunakan browser modern yang mendukung gzip dan WebGL2."
            : "Berkas model tidak tersedia, tidak lengkap, atau tidak valid. Periksa koneksi atau coba lagi.",
      );
      if (import.meta.env.DEV) console.error("[atlas]", code, error);
    };
    async function start() {
      try {
        const model = await loadModel(anatomyAsset("atlas.json"), {
          signal: abort.signal,
        });
        if (disposed) return;
        const mapped = resolveStructures(model);
        const ids = new Set(mapped.flatMap((s) => s.meshIds));
        if (!ids.size)
          throw new Error("No verified structures in this manifest.");
        live.current.onMapped(mapped);
        live.current.onStatus("preparing");
        const partColors = Object.fromEntries(
          mapped.flatMap((s) => s.meshIds.map((id) => [id, s.color])),
        );
        instance = new AnatomyEngine(host.current!, {
          model: { ...model, parts: model.parts.filter((p) => ids.has(p.id)) },
          label: "Interactive 3D anatomy",
          visibleSystems: [],
          partColors,
          partGroups: Object.fromEntries(
            mapped.flatMap((s) => s.meshIds.map((id) => [id, s.id])),
          ),
          stage: false,
          environment: false,
          theme: {
            background: "#0b1422",
            ground: "#0b1422",
            platform: "#0b1422",
            ring: "#0b1422",
            innerRing: "#0b1422",
            selection: "#f1aa78",
            hover: "#5ac9ed",
          },
        });
        engine.current = instance;
        last.current = { view: "", focus: 0, reset: -1 };
        apply();
        const owner = new Map(
          mapped.flatMap((s) => s.meshIds.map((id) => [id, s.id])),
        );
        unsubscribers.push(
          instance.on("progress", (p) => live.current.onProgress(p)),
          instance.on("ready", () => {
            loaded = true;
          }),
          instance.on("render", () => {
            if (!loaded || reported || disposed || failed) return;
            reported = true;
            if (import.meta.env.DEV)
              console.debug("[atlas] ready", instance?.diagnostics());
            live.current.onStatus("ready");
          }),
          instance.on("select", (part) => {
            const id = owner.get(part.id);
            if (id) live.current.onSelect(id);
          }),
          instance.on("hover", (detail) => {
            if (host.current)
              host.current.title = detail
                ? mapped.find((s) => s.id === owner.get(detail.part.id))?.en ||
                  ""
                : "";
          }),
          instance.on("error", fail),
        );
      } catch (error) {
        if (!disposed) fail(error);
      }
    }
    void start();
    return () => {
      disposed = true;
      abort.abort();
      release();
      media.removeEventListener("change", changeMotion);
    };
  }, [props.retry]);
  function capture() {
    const e = engine.current;
    if (!e || live.current.status !== "ready") return;
    const canvas = e.capture();
    const out = document.createElement("canvas");
    out.width = Math.max(1000, canvas.width);
    out.height = canvas.height + 82;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#0b1422";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, (out.width - canvas.width) / 2, 0);
    ctx.fillStyle = "#dbe6ef";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      "SOBRIVIEW · Model anatomi referensi untuk edukasi · bukan rekonstruksi pasien",
      14,
      out.height - 55,
    );
    ctx.font = "12px sans-serif";
    ctx.fillText(atlasCredit, 14, out.height - 33);
    ctx.fillText(
      "Prepared by Human Atlas / Dagno · Illustrative colors · CC BY 4.0",
      14,
      out.height - 13,
    );
    out.toBlob((blob) => {
      if (blob) download("sobriview-educational.png", blob);
    });
  }
  const labels = {
    loading: "Memuat data anatomi",
    preparing: "Menyiapkan model",
    ready: "Anatomi 3D siap",
    error: "Gagal memuat aset",
    fallback: "WebGL tidak tersedia · Tampilan 2D",
  };
  return (
    <div className="scene-wrap atlas-scene" data-state={props.status}>
      <div
        className="scene"
        ref={host}
        style={{ opacity: props.status === "ready" ? 1 : 0 }}
      />
      {props.status !== "ready" && (
        <div className="atlas-placeholder">
          <img
            src={anatomyAsset("atlas-preview.webp")}
            alt="Preview anatomi dari render dataset BodyParts3D yang sama"
          />
          <div role={props.status === "error" ? "alert" : "status"}>
            <strong>{labels[props.status]}</strong>
            {props.progress && props.status === "preparing" && (
              <>
                <progress
                  value={props.progress.loaded}
                  max={props.progress.total}
                />
                <p>
                  {props.progress.loaded} / {props.progress.total} berkas model
                </p>
              </>
            )}
            {props.message && <p>{props.message}</p>}
            {(props.status === "error" || props.status === "fallback") && (
              <button onClick={props.onRetry}>Coba lagi</button>
            )}
          </div>
        </div>
      )}
      {props.status === "ready" && (
        <>
          <div className="viewport-label">
            BODYPARTS3D <span>ANATOMI 3D</span>
          </div>
          <div className="model-disclaimer">
            MODEL REFERENSI EDUKASI
            <br />
            <small>BodyParts3D · CC BY 4.0 · bukan rekonstruksi pasien</small>
          </div>
          <button className="capture" onClick={capture}>
            Export PNG
          </button>
        </>
      )}
    </div>
  );
}
