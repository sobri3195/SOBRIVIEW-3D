import { useEffect, useRef, useState } from "react";
import type { ImportedSlice } from "../../medical/dicom";
import type { Types } from "@cornerstonejs/core";
import { initialize } from "../../medical/cornerstone";
export default function CornerstoneViewport({
  slices,
  index,
  tool,
  windowRange,
  invert,
  onIndex,
  reset,
}: {
  slices: ImportedSlice[];
  index: number;
  tool: string;
  windowRange: [number, number];
  invert: boolean;
  onIndex: (i: number) => void;
  reset: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const viewport = useRef<Types.IStackViewport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const toolRef = useRef(tool);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    setLoading(true);
    setError("");
    (async () => {
      await initialize();
      if (cancelled || !element.current) return;
      const core = await import("@cornerstonejs/core"),
        loader = await import("@cornerstonejs/dicom-image-loader"),
        tools = await import("@cornerstonejs/tools");
      const id = crypto.randomUUID();
      const engine = new core.RenderingEngine(id);
      const host = element.current;
      engine.enableElement({
        viewportId: id,
        type: core.Enums.ViewportType.STACK,
        element: host,
      });
      const vp = engine.getViewport(id) as Types.IStackViewport;
      viewport.current = vp;
      const group = tools.ToolGroupManager.createToolGroup(id)!;
      const names = [
        "WindowLevel",
        "Pan",
        "Zoom",
        "StackScroll",
        "Length",
        "Angle",
        "RectangleROI",
        "EllipticalROI",
        "Probe",
      ];
      names.forEach((name) => group.addTool(name));
      group.addViewport(id, id);
      group.setToolActive(toolRef.current, {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
      });
      group.setToolActive("StackScroll", {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Wheel }],
      });
      const ids = slices.map((s) => loader.wadouri.fileManager.add(s.file));
      const resize = new ResizeObserver(() => engine.resize(true, true));
      resize.observe(host);
      const changed = () => onIndex(vp.getCurrentImageIdIndex());
      host.addEventListener(core.Enums.Events.STACK_NEW_IMAGE, changed);
      cleanup = () => {
        host.removeEventListener(core.Enums.Events.STACK_NEW_IMAGE, changed);
        resize.disconnect();
        tools.ToolGroupManager.destroyToolGroup(id);
        engine.destroy();
        ids.forEach((imageId) => {
          try {
            core.cache.removeImageLoadObject(imageId);
          } catch {
            /* Already released. */
          }
        });
        ids.forEach((imageId) =>
          loader.wadouri.fileManager.remove(Number(imageId.split(":")[1])),
        );
        viewport.current = null;
      };
      await vp.setStack(ids, 0);
      if (!cancelled) {
        vp.render();
        setLoading(false);
      }
    })().catch((e) => {
      if (!cancelled) {
        setError(
          `Unable to render this series: ${e instanceof Error ? e.message : "unsupported DICOM encoding"}`,
        );
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [slices, onIndex]);
  useEffect(() => {
    const vp = viewport.current;
    if (vp && index !== vp.getCurrentImageIdIndex())
      void vp
        .setImageIdIndex(index)
        .catch(() => setError("Slice could not be decoded."));
  }, [index]);
  useEffect(() => {
    const vp = viewport.current;
    if (vp) {
      vp.setProperties({
        voiRange: {
          lower: windowRange[1] - windowRange[0] / 2,
          upper: windowRange[1] + windowRange[0] / 2,
        },
        invert,
      });
      vp.render();
    }
  }, [windowRange, invert, loading]);
  useEffect(() => {
    void import("@cornerstonejs/tools").then((tools) => {
      const vp = viewport.current;
      if (!vp) return;
      const group = tools.ToolGroupManager.getToolGroupForViewport(
        vp.id,
        vp.renderingEngineId,
      );
      if (!group) return;
      for (const name of [
        "WindowLevel",
        "Pan",
        "Zoom",
        "Length",
        "Angle",
        "RectangleROI",
        "EllipticalROI",
        "Probe",
      ])
        group.setToolPassive(name);
      group.setToolActive(tool, {
        bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
      });
    });
  }, [tool, loading]);
  useEffect(() => {
    const vp = viewport.current;
    if (vp) {
      vp.resetCamera();
      vp.render();
    }
  }, [reset]);
  return (
    <div className="dicom-viewport" onContextMenu={(e) => e.preventDefault()}>
      <div ref={element} className="cornerstone-host" />
      {loading && (
        <div className="render-error">Initializing local DICOM decoder…</div>
      )}
      {error && <div className="render-error">{error}</div>}
      <span className="viewport-label">
        IMPORTED DICOM · {slices[0]?.metadata.modality || "UNKNOWN"}
      </span>
    </div>
  );
}
