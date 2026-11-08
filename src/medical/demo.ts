export const SIZE = 96;
// Deterministic mathematical phantom in a 1 mm isotropic grid, not a patient scan.
export function voxel(x: number, y: number, z: number) {
  const dx = (x - 48) / 34,
    dy = (y - 48) / 27,
    dz = (z - 48) / 40;
  if (dx * dx + dy * dy + dz * dz > 1) return -1000;
  let value = 35;
  if (Math.pow((x - 48) / 7, 2) + Math.pow((y - 63) / 8, 2) < 1) value = 650;
  if (
    Math.pow((x - 31) / 11, 2) +
      Math.pow((y - 42) / 13, 2) +
      Math.pow((z - 47) / 20, 2) <
    1
  )
    value = 90;
  if (
    Math.pow((x - 64) / 8, 2) +
      Math.pow((y - 53) / 6, 2) +
      Math.pow((z - 42) / 14, 2) <
    1
  )
    value = 140;
  return value;
}
export function sliceValue(plane: string, u: number, v: number, slice: number) {
  return plane === "Axial"
    ? voxel(u, v, slice)
    : plane === "Coronal"
      ? voxel(u, slice, SIZE - 1 - v)
      : voxel(slice, u, SIZE - 1 - v);
}
export const presets: Record<string, [number, number]> = {
  "Soft tissue": [400, 40],
  Lung: [1500, -600],
  Bone: [1800, 400],
  Brain: [80, 40],
  Liver: [150, 60],
};
