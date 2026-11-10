import type { Volume, Vec3 } from "./volume";
import type { VolumeMeasurement } from "../features/dicom/CTSliceCanvas";
export function parseVolumeAnnotations(
  value: unknown,
  volume: Volume,
): VolumeMeasurement[] {
  if (!value || typeof value !== "object")
    throw new Error("Invalid annotation document.");
  const d = value as Record<string, unknown>;
  if (
    d.version !== 2 ||
    d.dataset !== volume.source.id ||
    !Array.isArray(d.dimensions) ||
    d.dimensions.some((n, i) => n !== volume.dimensions[i]) ||
    d.dimensions.length !== 3 ||
    !Array.isArray(d.measurements) ||
    d.measurements.length > 1000
  )
    throw new Error("Annotations belong to a different dataset or voxel grid.");
  const seen = new Set<string>();
  return d.measurements.map((value: unknown) => {
    if (!value || typeof value !== "object")
      throw new Error("Invalid measurement.");
    const m = value as Record<string, unknown>;
    if (
      typeof m.id !== "string" ||
      m.id.length > 100 ||
      seen.has(m.id) ||
      !Array.isArray(m.points) ||
      m.points.length !== 2 ||
      !m.points.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 3 &&
          p.every(
            (n, i) =>
              typeof n === "number" &&
              Number.isFinite(n) &&
              n >= 0 &&
              n < volume.dimensions[i],
          ),
      )
    )
      throw new Error("Invalid voxel measurement coordinates.");
    const points = m.points as [Vec3, Vec3];
    if (points[0][2] !== points[1][2] || !Number.isInteger(points[0][2]))
      throw new Error("Measurement endpoints must share a native slice.");
    seen.add(m.id);
    return { id: m.id, points };
  });
}
