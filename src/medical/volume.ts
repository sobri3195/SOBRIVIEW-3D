import type { Spatial } from "./metadata";
import { sortSlices, spatialPosition, validateVolume } from "./metadata";
export type Vec3 = [number, number, number];
export type Scalars =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;
export type Volume = {
  scalarData: Scalars;
  dimensions: Vec3;
  spacing: Vec3;
  origin: Vec3;
  /** Three unit direction columns, in LPS. */
  direction: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  spatialUnit: "mm" | "unknown";
  intensity: {
    unit: "HU" | "Intensity" | "synthetic units";
    calibration: string;
  };
  source: {
    id: string;
    title: string;
    attribution: string;
    space: string;
    license?: string;
  };
  range: [number, number];
};
export function indexToWorld(
  v: Pick<Volume, "direction" | "origin" | "spacing">,
  p: Vec3,
): Vec3 {
  return v.origin.map(
    (o, r) =>
      o +
      p.reduce(
        (sum, n, c) => sum + n * v.spacing[c] * v.direction[c * 3 + r],
        0,
      ),
  ) as Vec3;
}
export function worldToIndex(
  v: Pick<Volume, "direction" | "origin" | "spacing">,
  p: Vec3,
): Vec3 {
  return v.spacing.map(
    (s, c) =>
      p.reduce(
        (sum, n, r) => sum + (n - v.origin[r]) * v.direction[c * 3 + r],
        0,
      ) / s,
  ) as Vec3;
}
export function physicalDistance(v: Volume, a: Vec3, b: Vec3) {
  if (v.spatialUnit !== "mm") return null;
  const p = indexToWorld(v, a),
    q = indexToWorld(v, b);
  return Math.hypot(...p.map((n, i) => n - q[i]));
}
export function valueAt(v: Volume, p: Vec3) {
  const [x, y, z] = p.map(Math.round);
  if ([x, y, z].some((n, i) => n < 0 || n >= v.dimensions[i])) return null;
  return v.scalarData[(z * v.dimensions[1] + y) * v.dimensions[0] + x];
}
export function orientationLabel(direction: number[]) {
  return direction
    .map((n, i) => ({
      m: Math.abs(n),
      label: n >= 0 ? ["L", "P", "S"][i] : ["R", "A", "I"][i],
    }))
    .filter((a) => a.m > 0.1)
    .sort((a, b) => b.m - a.m)
    .map((a) => a.label)
    .join("");
}
export function sliceGeometry(v: Volume) {
  const axial =
    Math.abs(v.direction[0]) > 1 - 1e-6 &&
    Math.abs(v.direction[4]) > 1 - 1e-6 &&
    Math.abs(v.direction[8]) > 1 - 1e-6;
  const flipX = axial && v.direction[0] < 0,
    flipY = axial && v.direction[4] < 0;
  const right = v.direction.slice(0, 3).map((n) => n * (flipX ? -1 : 1));
  const down = v.direction.slice(3, 6).map((n) => n * (flipY ? -1 : 1));
  return {
    flipX,
    flipY,
    axial,
    left: orientationLabel(right.map((n) => -n)),
    right: orientationLabel(right),
    top: orientationLabel(down.map((n) => -n)),
    bottom: orientationLabel(down),
    stack: orientationLabel(v.direction.slice(6, 9)),
  };
}
export function displayToIndex(
  v: Volume,
  u: number,
  w: number,
  slice: number,
): Vec3 {
  const g = sliceGeometry(v);
  return [
    g.flipX ? v.dimensions[0] - 1 - u : u,
    g.flipY ? v.dimensions[1] - 1 - w : w,
    slice,
  ];
}
export function indexToDisplay(v: Volume, p: Vec3): [number, number] {
  const g = sliceGeometry(v);
  return [
    g.flipX ? v.dimensions[0] - 1 - p[0] : p[0],
    g.flipY ? v.dimensions[1] - 1 - p[1] : p[1],
  ];
}
export function windowPixel(
  value: number,
  width: number,
  level: number,
  invert = false,
) {
  const n = Math.round(
    255 *
      Math.max(
        0,
        Math.min(1, (value - (level - width / 2)) / Math.max(1, width)),
      ),
  );
  return invert ? 255 - n : n;
}
export function dicomVolume(
  frames: {
    metadata: Spatial;
    scalarData: ArrayLike<number>;
    preScaled: boolean;
  }[],
): Volume {
  const sorted = sortSlices(frames);
  const reason = validateVolume(sorted.map((f) => f.metadata));
  if (reason) throw new Error(reason);
  const m = sorted[0].metadata;
  const dimensions: Vec3 = [m.columns, m.rows, sorted.length];
  const scalarData = new Float32Array(
    dimensions[0] * dimensions[1] * dimensions[2],
  );
  const calibrated = sorted.every(
    (f) =>
      f.metadata.modality === "CT" &&
      Number.isFinite(f.metadata.slope) &&
      f.metadata.slope !== 0 &&
      Number.isFinite(f.metadata.intercept),
  );
  let low = Infinity,
    high = -Infinity;
  sorted.forEach((f, k) => {
    if (f.scalarData.length !== dimensions[0] * dimensions[1])
      throw new Error("DICOM voxel buffer length mismatch.");
    for (let i = 0; i < f.scalarData.length; i++) {
      const n =
        calibrated && !f.preScaled
          ? f.scalarData[i] * f.metadata.slope + f.metadata.intercept
          : f.scalarData[i];
      if (!Number.isFinite(n))
        throw new Error("Invalid decoded DICOM intensity.");
      scalarData[k * f.scalarData.length + i] = n;
      low = Math.min(low, n);
      high = Math.max(high, n);
    }
  });
  const o = m.orientation;
  const normal = [
    o[1] * o[5] - o[2] * o[4],
    o[2] * o[3] - o[0] * o[5],
    o[0] * o[4] - o[1] * o[3],
  ];
  return {
    scalarData,
    dimensions,
    spacing: [
      m.spacing[1],
      m.spacing[0],
      spatialPosition(sorted[1].metadata)! - spatialPosition(m)!,
    ],
    origin: [...m.position] as Vec3,
    direction: [...o, ...normal] as Volume["direction"],
    spatialUnit: "mm",
    range: [low, high],
    intensity: {
      unit: calibrated ? "HU" : "Intensity",
      calibration: calibrated
        ? "Modality transform applied once; pre-scaled Cornerstone frames are preserved."
        : "Unconfirmed modality calibration; decoded intensity preserved.",
    },
    source: {
      id: `local-dicom:${m.study}:${m.series}`,
      title: "Local DICOM volume",
      attribution: "Local DICOM · no upload",
      space: "left-posterior-superior",
    },
  };
}
