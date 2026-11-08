/** Exponential damping stays consistent at different frame rates. */
export function damping(deltaSeconds: number, rate = 12) {
  return 1 - Math.exp(-Math.max(0, deltaSeconds) * rate);
}
export function shortestAngle(from: number, to: number) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
export function easeInOutCubic(t: number) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
