export type Spatial = {
  study: string;
  series: string;
  sop: string;
  position: number[];
  orientation: number[];
  spacing: number[];
  rows: number;
  columns: number;
  modality: string;
  slope: number;
  intercept: number;
  instance: number;
  frameOfReference?: string;
  imageType?: string[];
  photometric?: string;
  transferSyntax?: string;
};
export function spatialPosition(m: Spatial) {
  const o = m.orientation,
    p = m.position;
  if (
    o.length !== 6 ||
    p.length !== 3 ||
    [...o, ...p].some((x) => !Number.isFinite(x))
  )
    return null;
  const n = [
    o[1] * o[5] - o[2] * o[4],
    o[2] * o[3] - o[0] * o[5],
    o[0] * o[4] - o[1] * o[3],
  ];
  if (
    Math.abs(Math.hypot(...o.slice(0, 3)) - 1) > 1e-3 ||
    Math.abs(Math.hypot(...o.slice(3)) - 1) > 1e-3 ||
    Math.abs(o[0] * o[3] + o[1] * o[4] + o[2] * o[5]) > 1e-3
  )
    return null;
  return n.reduce((s, v, i) => s + v * p[i], 0);
}
export function sortSlices<T extends { metadata: Spatial }>(slices: T[]): T[] {
  return [...slices].sort((a, b) => {
    const p = spatialPosition(a.metadata),
      q = spatialPosition(b.metadata);
    return p !== null && q !== null
      ? p - q
      : a.metadata.instance - b.metadata.instance;
  });
}
export function groupSeries<T extends { metadata: Spatial }>(slices: T[]) {
  const groups = new Map<string, T[]>();
  for (const slice of slices) {
    const m = slice.metadata;
    const geometry = [
      m.rows,
      m.columns,
      ...m.spacing.map((n) => n.toFixed(4)),
      ...m.orientation.map((n) => n.toFixed(4)),
    ].join(",");
    const kind = m.imageType?.some((t) => /LOCALIZER|SCOUT/i.test(t))
      ? "localizer"
      : "image";
    const key = [
      m.study,
      m.series,
      m.frameOfReference || "",
      m.modality,
      m.photometric || "",
      geometry,
      kind,
    ].join("|");
    const group = groups.get(key) || [];
    if (!group.some((s) => s.metadata.sop === slice.metadata.sop))
      group.push(slice);
    groups.set(key, group);
  }
  return [...groups.values()].map(sortSlices);
}
export function distance(
  a: [number, number],
  b: [number, number],
  spacing?: number[],
) {
  const calibrated =
    spacing?.length === 2 && spacing.every((x) => Number.isFinite(x) && x > 0);
  return {
    value: Math.hypot(
      (b[0] - a[0]) * (calibrated ? spacing![1] : 1),
      (b[1] - a[1]) * (calibrated ? spacing![0] : 1),
    ),
    unit: calibrated ? "mm" : "px",
  };
}
export function angle(a: number[], b: number[], c: number[]) {
  const u = a.map((v, i) => v - b[i]),
    v = c.map((x, i) => x - b[i]);
  const d = Math.hypot(...u) * Math.hypot(...v);
  return d === 0
    ? null
    : (Math.acos(
        Math.min(1, Math.max(-1, u.reduce((s, x, i) => s + x * v[i], 0) / d)),
      ) *
        180) /
        Math.PI;
}
export function calibratedHU(
  raw: number,
  metadata: Pick<Spatial, "modality" | "slope" | "intercept">,
) {
  return metadata.modality === "CT" &&
    Number.isFinite(metadata.slope) &&
    metadata.slope !== 0 &&
    Number.isFinite(metadata.intercept)
    ? raw * metadata.slope + metadata.intercept
    : null;
}

export function validateVolume(slices: Spatial[]): string | null {
  if (slices.length < 3)
    return "At least three spatially positioned slices are required. Use the single-image/stack viewer for this series.";
  const first = slices[0];
  if (slices.some((s) => s.imageType?.some((t) => /LOCALIZER|SCOUT/i.test(t))))
    return "Localizer/scout images are not a reconstructable volume.";
  if (
    first.photometric &&
    !["MONOCHROME1", "MONOCHROME2"].includes(first.photometric)
  )
    return "Only monochrome DICOM series are supported for MPR.";
  if (
    first.rows < 1 ||
    first.columns < 1 ||
    first.spacing.length !== 2 ||
    first.spacing.some((n) => !Number.isFinite(n) || n <= 0)
  )
    return "Valid image dimensions and PixelSpacing are required.";
  if (
    slices.some(
      (s) =>
        s.rows !== first.rows ||
        s.columns !== first.columns ||
        s.orientation.length !== 6 ||
        s.orientation.some(
          (v, i) => Math.abs(v - first.orientation[i]) > 1e-4,
        ) ||
        s.spacing.length !== 2 ||
        s.spacing.some((v, i) => Math.abs(v - first.spacing[i]) > 1e-4),
    )
  )
    return "Series geometry is inconsistent.";
  const positions = slices.map(spatialPosition);
  if (positions.some((p) => p === null))
    return "Image orientation and position metadata are missing or invalid.";
  const gaps = (positions as number[])
    .slice(1)
    .map((p, i) => p - positions[i]!);
  const gap = gaps[0];
  if (
    gap <= 0 ||
    gaps.some((g) => Math.abs(g - gap) > Math.max(0.01, gap * 0.01))
  )
    return "Slices are duplicated, nonuniformly spaced, or missing.";
  const o = first.orientation;
  const normal = [
    o[1] * o[5] - o[2] * o[4],
    o[2] * o[3] - o[0] * o[5],
    o[0] * o[4] - o[1] * o[3],
  ];
  if (
    slices.some((s) => {
      const delta = s.position.map((v, i) => v - first.position[i]);
      const projection = delta.reduce((sum, v, i) => sum + v * normal[i], 0);
      return (
        Math.hypot(...delta.map((v, i) => v - projection * normal[i])) > 0.01
      );
    })
  )
    return "Gantry tilt or in-plane slice offsets are not supported for volume reconstruction.";
  const bytes = first.rows * first.columns * slices.length * 4;
  if (bytes > 256 * 1024 * 1024)
    return "This volume exceeds the 256 MB decoded-volume limit. Use the stack viewer or a smaller series.";
  return null;
}
