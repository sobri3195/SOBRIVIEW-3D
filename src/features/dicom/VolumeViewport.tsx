import { useEffect, useRef, useState } from "react";
import { initialize } from "../../medical/cornerstone";
import { validateVolume } from "../../medical/metadata";
import { dicomVolume } from "../../medical/volume";
import type { ImportedSlice } from "../../medical/dicom";
import type { Types } from "@cornerstonejs/core";
export default function VolumeViewport({
  slices,
  windowRange,
  invert,
  reset,
}: {
  slices: ImportedSlice[];
  windowRange: [number, number];
  invert: boolean;
  reset: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewports = useRef<Types.IVolumeViewport[]>([]);
  const [status, setStatus] = useState("Preparing volume…");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    setReady(false);
    setProgress(0);
    (async () => {
      const reason = validateVolume(slices.map((s) => s.metadata));
      if (reason) throw Error(reason);
      await initialize();
      if (cancelled) return;
      const core = await import("@cornerstonejs/core"),
        loader = await import("@cornerstonejs/dicom-image-loader"),
        tools = await import("@cornerstonejs/tools");
      if (cancelled || !root.current) return;
      const id = crypto.randomUUID(),
        volumeId = "volume:" + id;
      const ids = slices.map((s) => loader.wadouri.fileManager.add(s.file));
      const engine = new core.RenderingEngine(id);
      const group = tools.ToolGroupManager.createToolGroup(id)!;
      for (const name of ["WindowLevel", "Pan", "Zoom", "StackScroll"])
        group.addTool(name);
      const hosts = [
        ...root.current.querySelectorAll<HTMLDivElement>(".volume-host"),
      ];
      const orientations = [
        core.Enums.OrientationAxis.AXIAL,
        core.Enums.OrientationAxis.CORONAL,
        core.Enums.OrientationAxis.SAGITTAL,
      ];
      engine.setViewports(
        hosts.map((element, i) => ({
          viewportId: id + i,
          type: core.Enums.ViewportType.ORTHOGRAPHIC,
          element,
          defaultOptions: { orientation: orientations[i] },
        })),
      );
      viewports.current = hosts.map(
        (_, i) => engine.getViewport(id + i) as Types.IVolumeViewport,
      );
      viewports.current.forEach((v) => group.addViewport(v.id, id));
      group.setToolActive("WindowLevel", {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
      });
      group.setToolActive("Pan", {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Auxiliary }],
      });
      group.setToolActive("Zoom", {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Secondary }],
      });
      group.setToolActive("StackScroll", {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Wheel }],
      });
      const observer = new ResizeObserver(() => engine.resize(true, true));
      hosts.forEach((h) => observer.observe(h));
      cleanup = () => {
        observer.disconnect();
        tools.ToolGroupManager.destroyToolGroup(id);
        engine.destroy();
        try {
          core.cache.removeVolumeLoadObject(volumeId);
        } catch {
          /* Volume may not have been created. */
        }
        ids.forEach((imageId) => {
          try {
            core.cache.removeImageLoadObject(imageId);
          } catch {
            /* Already released. */
          }
          loader.wadouri.fileManager.remove(Number(imageId.split(":")[1]));
        });
        viewports.current = [];
      };
      const frames: Parameters<typeof dicomVolume>[0] = [];
      for (let i = 0; i < ids.length; i++) {
        const image = await core.imageLoader.loadAndCacheImage(ids[i]);
        frames.push({
          metadata: slices[i].metadata,
          scalarData: image.getPixelData(),
          preScaled: !!(image.isPreScaled || image.preScale?.scaled),
        });
        if (cancelled) return;
        setProgress(Math.round(((i + 1) / ids.length) * 100));
      }
      const common = dicomVolume(frames);
      const volume = core.volumeLoader.createLocalVolume(volumeId, {
        scalarData: common.scalarData,
        dimensions: common.dimensions,
        spacing: common.spacing,
        origin: common.origin,
        direction: common.direction,
        metadata: core.utilities.makeVolumeMetadata(ids),
      });
      volume.isPreScaled = true;
      const derivedIds = volume.imageIds;
      const previousCleanup = cleanup;
      cleanup = () => {
        previousCleanup();
        for (const imageId of derivedIds) {
          try {
            core.cache.removeImageLoadObject(imageId);
          } catch {
            /* Already released. */
          }
        }
      };
      if (cancelled) return;
      await Promise.all(
        viewports.current.map((v) => v.setVolumes([{ volumeId }])),
      );
      if (!cancelled) {
        viewports.current.forEach((v) => v.render());
        setReady(true);
        setStatus("");
      }
    })().catch((e) => {
      if (!cancelled)
        setStatus(
          `MPR unavailable: ${e instanceof Error ? e.message : "volume initialization failed"}`,
        );
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [slices]);
  useEffect(() => {
    if (!ready) return;
    for (const viewport of viewports.current) {
      viewport.setProperties({
        voiRange: {
          lower: windowRange[1] - windowRange[0] / 2,
          upper: windowRange[1] + windowRange[0] / 2,
        },
        invert,
      });
      viewport.render();
    }
  }, [windowRange, invert, ready]);
  useEffect(() => {
    for (const viewport of viewports.current) {
      viewport.resetCamera();
      viewport.render();
    }
  }, [reset]);
  return (
    <div className="imported-mpr" ref={root}>
      {["Axial", "Coronal", "Sagittal"].map((plane, i) => (
        <div className="volume-cell" key={plane}>
          <div
            className="volume-host"
            onContextMenu={(e) => e.preventDefault()}
          />
          <span className="viewport-label">{plane.toUpperCase()}</span>
          <button
            disabled={!ready}
            onClick={() => {
              viewports.current[i]?.scroll(1);
              viewports.current[i]?.render();
            }}
          >
            Next slice
          </button>
        </div>
      ))}
      {status && (
        <div className="notice" role="status">
          {status} {progress > 0 && progress < 100 ? `${progress}%` : ""}
        </div>
      )}
      <p>
        Same source volume · scroll each plane to navigate. Drag: window/level ·
        middle-drag: pan · right-drag: zoom. Linked crosshair editing is not yet
        available.
      </p>
    </div>
  );
}
