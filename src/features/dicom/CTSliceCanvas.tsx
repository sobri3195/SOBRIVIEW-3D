import { useEffect, useRef, useState } from "react";
import {
  displayToIndex,
  indexToDisplay,
  sliceGeometry,
  valueAt,
  windowPixel,
  type Vec3,
  type Volume,
} from "../../medical/volume";
export type VolumeMeasurement = { id: string; points: [Vec3, Vec3] };
type Props = {
  volume: Volume;
  slice: number;
  windowRange: [number, number];
  invert: boolean;
  zoom: number;
  pan: [number, number];
  tool: string;
  crosshair: boolean;
  measurements: VolumeMeasurement[];
  onSlice: (n: number) => void;
  onWindow: (v: [number, number]) => void;
  onZoom: (n: number) => void;
  onPan: (p: [number, number]) => void;
  onMeasure: (m: VolumeMeasurement) => void;
  onPaint: () => void;
};
export default function CTSliceCanvas(p: Props) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [probe, setProbe] = useState<{ index: Vec3; value: number } | null>(
    null,
  );
  const [first, setFirst] = useState<Vec3 | null>(null);
  const [cross, setCross] = useState<[number, number] | null>(null);
  const transform = useRef({ x: 0, y: 0, sx: 1, sy: 1 });
  const gesture = useRef<{
    x: number;
    y: number;
    button: number;
    moved: boolean;
    window: [number, number];
    zoom: number;
    pan: [number, number];
  } | null>(null);
  useEffect(() => {
    const h = host.current!;
    const observer = new ResizeObserver(() =>
      setSize([h.clientWidth, h.clientHeight]),
    );
    observer.observe(h);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setFirst(null);
    setProbe(null);
  }, [p.slice, p.tool]);
  useEffect(() => {
    if (!size[0] || !size[1] || !canvas.current) return;
    const [nx, ny] = p.volume.dimensions;
    const image = document.createElement("canvas");
    image.width = nx;
    image.height = ny;
    const ic = image.getContext("2d")!,
      pixels = ic.createImageData(nx, ny);
    const geometry = sliceGeometry(p.volume);
    for (let y = 0; y < ny; y++) {
      const row = (p.slice * ny + (geometry.flipY ? ny - 1 - y : y)) * nx;
      for (let x = 0; x < nx; x++) {
        const value =
          p.volume.scalarData[row + (geometry.flipX ? nx - 1 - x : x)];
        const n = windowPixel(
            value,
            p.windowRange[0],
            p.windowRange[1],
            p.invert,
          ),
          i = (y * nx + x) * 4;
        pixels.data[i] = n;
        pixels.data[i + 1] = n;
        pixels.data[i + 2] = n;
        pixels.data[i + 3] = 255;
      }
    }
    ic.putImageData(pixels, 0, 0);
    const ratio = Math.min(devicePixelRatio, 2),
      c = canvas.current;
    c.width = Math.round(size[0] * ratio);
    c.height = Math.round(size[1] * ratio);
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#020508";
    ctx.fillRect(0, 0, ...size);
    const scale =
      Math.min(
        size[0] / (nx * p.volume.spacing[0]),
        size[1] / (ny * p.volume.spacing[1]),
      ) *
      0.94 *
      p.zoom;
    const sx = p.volume.spacing[0] * scale,
      sy = p.volume.spacing[1] * scale;
    const x = (size[0] - nx * sx) / 2 + p.pan[0],
      y = (size[1] - ny * sy) / 2 + p.pan[1];
    transform.current = { x, y, sx, sy };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, nx * sx, ny * sy);
    const location = (point: Vec3) => {
      const [u, v] = indexToDisplay(p.volume, point);
      return [x + (u + 0.5) * sx, y + (v + 0.5) * sy];
    };
    if (p.crosshair) {
      const center = cross || [(nx - 1) / 2, (ny - 1) / 2];
      ctx.strokeStyle = "#5ab9da88";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y + (center[1] + 0.5) * sy);
      ctx.lineTo(x + nx * sx, y + (center[1] + 0.5) * sy);
      ctx.moveTo(x + (center[0] + 0.5) * sx, y);
      ctx.lineTo(x + (center[0] + 0.5) * sx, y + ny * sy);
      ctx.stroke();
    }
    ctx.strokeStyle = "#fbbf24";
    ctx.fillStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    for (const m of p.measurements.filter(
      (m) => Math.round(m.points[0][2]) === p.slice,
    )) {
      const a = location(m.points[0]),
        b = location(m.points[1]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      for (const q of [a, b]) {
        ctx.beginPath();
        ctx.arc(q[0], q[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (first) {
      const a = location(first);
      ctx.beginPath();
      ctx.arc(a[0], a[1], 4, 0, Math.PI * 2);
      ctx.fill();
    }
    p.onPaint();
  }, [
    p.volume,
    p.slice,
    p.windowRange,
    p.invert,
    p.zoom,
    p.pan,
    p.crosshair,
    p.measurements,
    p.onPaint,
    size,
    first,
    cross,
  ]);
  useEffect(() => {
    const h = host.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      p.onSlice(
        Math.max(
          0,
          Math.min(
            p.volume.dimensions[2] - 1,
            p.slice + Math.sign(event.deltaY),
          ),
        ),
      );
    };
    h.addEventListener("wheel", wheel, { passive: false });
    return () => h.removeEventListener("wheel", wheel);
  }, [p.slice, p.volume, p.onSlice]);
  function point(e: React.PointerEvent): Vec3 | null {
    const r = canvas.current!.getBoundingClientRect(),
      t = transform.current;
    const u = (e.clientX - r.left - t.x) / t.sx - 0.5,
      v = (e.clientY - r.top - t.y) / t.sy - 0.5;
    if (
      u < 0 ||
      v < 0 ||
      u >= p.volume.dimensions[0] ||
      v >= p.volume.dimensions[1]
    )
      return null;
    return displayToIndex(p.volume, u, v, p.slice);
  }
  const g = sliceGeometry(p.volume);
  return (
    <div
      className="ct-slice"
      ref={host}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvas}
        aria-label={`${g.axial ? "Axial" : "Native"} CT example volume`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          gesture.current = {
            x: e.clientX,
            y: e.clientY,
            button: e.button,
            moved: false,
            window: p.windowRange,
            zoom: p.zoom,
            pan: p.pan,
          };
        }}
        onPointerMove={(e) => {
          const a = gesture.current;
          if (!a) return;
          const dx = e.clientX - a.x,
            dy = e.clientY - a.y;
          if (Math.hypot(dx, dy) > 3) a.moved = true;
          if (!a.moved) return;
          if (a.button === 1 || p.tool === "Pan")
            p.onPan([a.pan[0] + dx, a.pan[1] + dy]);
          else if (a.button === 2 || p.tool === "Zoom")
            p.onZoom(Math.max(0.25, Math.min(8, a.zoom * Math.exp(-dy / 150))));
          else if (p.tool === "WindowLevel")
            p.onWindow([
              Math.max(1, a.window[0] + dx * 3),
              a.window[1] + dy * 3,
            ]);
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerUp={(e) => {
          const a = gesture.current;
          gesture.current = null;
          if (!a || a.moved || e.button !== 0) return;
          const q = point(e);
          if (!q) return;
          const value = valueAt(p.volume, q);
          if (value === null) return;
          setProbe({ index: q, value });
          setCross(indexToDisplay(p.volume, q));
          if (p.tool === "Length" && p.volume.spatialUnit === "mm") {
            if (!first) setFirst(q);
            else {
              p.onMeasure({ id: crypto.randomUUID(), points: [first, q] });
              setFirst(null);
            }
          }
        }}
      />
      <span className="viewport-label">
        {g.axial ? "AXIAL" : "NATIVE PLANE"} · CTLIVER · {p.slice + 1} /{" "}
        {p.volume.dimensions[2]}
      </span>
      <span className="ct-orientation top">{g.top}</span>
      <span className="ct-orientation bottom">{g.bottom}</span>
      <span className="ct-orientation left">{g.left}</span>
      <span className="ct-orientation right">{g.right}</span>
      <output className="probe" aria-label="Voxel probe">
        {first
          ? "Select second point"
          : probe
            ? `Voxel ${probe.index.map(Math.round).join(", ")} · ${probe.value.toFixed(2)} ${p.volume.intensity.unit}`
            : "Click to probe native voxel values"}
      </output>
    </div>
  );
}
