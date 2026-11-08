import { describe, it, expect } from "vitest";
import {
  damping,
  easeInOutCubic,
  shortestAngle,
} from "../../src/three/animations/motion";
describe("time-based 3D transitions", () => {
  it("converges equally at 30, 60 and 144 Hz", () => {
    const end = (fps: number) => {
      let value = 0;
      for (let i = 0; i < fps; i++) value += (1 - value) * damping(1 / fps);
      return value;
    };
    expect(end(30)).toBeCloseTo(end(144), 10);
    expect(end(60)).toBeCloseTo(end(144), 10);
  });
  it("crosses the azimuth seam using the short path", () => {
    const from = (179 * Math.PI) / 180,
      to = (-179 * Math.PI) / 180;
    expect(shortestAngle(from, to) - from).toBeCloseTo((2 * Math.PI) / 180);
  });
  it("clamps eased camera transitions at both endpoints", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(damping(0)).toBe(0);
  });
});
