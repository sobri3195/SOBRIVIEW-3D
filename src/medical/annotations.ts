export type DemoMeasurement = {
  id: string;
  points: [number, number][];
  slice: number;
  plane: string;
};
export function parseAnnotations(value: unknown): DemoMeasurement[] {
  if (!value || typeof value !== "object")
    throw Error("Invalid annotation document");
  const doc = value as Record<string, unknown>;
  if (
    doc.version !== 1 ||
    doc.dataset !== "synthetic-phantom" ||
    !Array.isArray(doc.measurements) ||
    doc.measurements.length > 1000
  )
    throw Error("Expected version 1 synthetic phantom annotations");
  return doc.measurements.map((value: unknown) => {
    if (!value || typeof value !== "object") throw Error("Invalid measurement");
    const m = value as Record<string, unknown>;
    if (
      typeof m.id !== "string" ||
      m.id.length > 100 ||
      !["Axial", "Coronal", "Sagittal"].includes(String(m.plane)) ||
      typeof m.slice !== "number" ||
      !Number.isInteger(m.slice) ||
      m.slice < 0 ||
      m.slice > 95 ||
      !Array.isArray(m.points) ||
      m.points.length !== 2 ||
      !m.points.every(
        (p) =>
          Array.isArray(p) &&
          p.length === 2 &&
          p.every(
            (v) =>
              typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 96,
          ),
      )
    )
      throw Error("Invalid measurement coordinates");
    return {
      id: m.id,
      points: m.points as [number, number][],
      slice: m.slice,
      plane: String(m.plane),
    };
  });
}
