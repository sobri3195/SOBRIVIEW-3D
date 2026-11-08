import { parseAnnotations } from "../../src/medical/annotations";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  defaults,
  parsePreferences,
  read,
  write,
  resetStorage,
  PREFIX,
} from "../../src/lib/storage";
import { questions, score, shuffle } from "../../src/data/quizzes";
import {
  distance,
  angle,
  calibratedHU,
  spatialPosition,
  validateVolume,
} from "../../src/medical/metadata";
import { filterAnatomy, organs, segments } from "../../src/data/anatomy";
import { importFiles } from "../../src/medical/dicom";
import { sliceValue, voxel, SIZE } from "../../src/medical/demo";
import { dicomFixture } from "../fixture";
beforeEach(() => {
  const data: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  });
});
describe("settings persistence", () => {
  it("validates and migrates legacy fields", () => {
    expect(
      parsePreferences({ theme: "light", opacity: 8, version: 0 }),
    ).toEqual({ ...defaults, theme: "light", opacity: 1 });
    expect(parsePreferences(null)).toEqual(defaults);
    expect(parsePreferences({ opacity: NaN }).opacity).toBe(defaults.opacity);
  });
  it("round trips and handles quota failure", () => {
    expect(write("test", { x: 1 })).toBe(true);
    expect(read("test", (x) => x, {})).toEqual({ x: 1 });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw Error("Quota");
    });
    expect(write("test", {})).toBe(false);
  });
  it("falls back from invalid JSON", () => {
    localStorage.setItem(PREFIX + "test", "{");
    expect(read("test", (x) => x, 42)).toBe(42);
    resetStorage();
  });
});
describe("learning", () => {
  it("contains at least 50 valid questions", () => {
    expect(questions.length).toBeGreaterThanOrEqual(50);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.explanation.length).toBeGreaterThan(20);
    }
  });
  it("scores correct and unanswered items", () => {
    const answers = Object.fromEntries(
      questions.slice(0, 3).map((q) => [q.id, q.answer]),
    );
    expect(score(answers, questions)).toBe(3);
    expect(shuffle(questions, () => 0.5)).toHaveLength(questions.length);
  });
});
describe("medical calculations", () => {
  it("uses row/column spacing in correct order", () => {
    expect(distance([0, 0], [3, 4], [2, 1])).toEqual({
      value: Math.sqrt(73),
      unit: "mm",
    });
    expect(distance([0, 0], [3, 4], [0, 1])).toEqual({ value: 5, unit: "px" });
    expect(angle([1, 0], [0, 0], [0, 1])).toBeCloseTo(90);
    expect(angle([0, 0], [0, 0], [1, 1])).toBeNull();
  });
  it("requires CT and valid rescale metadata for HU", () => {
    expect(
      calibratedHU(100, { modality: "CT", slope: 2, intercept: -1024 }),
    ).toBe(-824);
    expect(
      calibratedHU(100, { modality: "MR", slope: 1, intercept: 0 }),
    ).toBeNull();
  });
  it("samples one volume consistently in all planes", () => {
    expect(sliceValue("Axial", 30, 40, 50)).toBe(voxel(30, 40, 50));
    expect(sliceValue("Coronal", 30, SIZE - 1 - 50, 40)).toBe(
      voxel(30, 40, 50),
    );
    expect(sliceValue("Sagittal", 40, SIZE - 1 - 50, 30)).toBe(
      voxel(30, 40, 50),
    );
  });
});
describe("DICOM import integration", () => {
  it("groups and spatially sorts generated slices, deduplicating SOP instances", async () => {
    const files = [2, 0, 1, 1].map(
      (s, i) => new File([dicomFixture(s)], `misleading-${9 - i}.dcm`),
    );
    const result = await importFiles([
      ...files,
      new File(["invalid"], "bad.dcm"),
    ]);
    expect(result.rejected).toBe(1);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].map((s) => s.metadata.position[2])).toEqual([
      0, 1, 2,
    ]);
    expect(spatialPosition(result.series[0][2].metadata)).toBe(2);
    expect(result.series[0][0].metadata.spacing).toEqual([1, 1]);
  });
});
describe("anatomy filtering", () => {
  it("filters multilingual structures and systems", () => {
    expect(filterAnatomy(organs, "ginjal")).toHaveLength(2);
    expect(filterAnatomy(organs, "", "Urinary")).toHaveLength(2);
    expect(segments).toHaveLength(8);
  });
});

it("rejects invalid MPR geometry", async () => {
  const result = await importFiles(
    [0, 1, 2].map((s) => new File([dicomFixture(s)], `slice-${s}.dcm`)),
  );
  const metadata = result.series[0].map((s) => s.metadata);
  expect(validateVolume(metadata)).toBeNull();
  expect(validateVolume(metadata.slice(0, 1))).toMatch(/three/);
  expect(
    validateVolume(
      metadata.map((s, i) => ({ ...s, position: [0, 0, i === 2 ? 4 : i] })),
    ),
  ).toMatch(/spaced/);
});

it("validates imported annotations and rejects patient/invalid coordinates", () => {
  expect(
    parseAnnotations({
      version: 1,
      dataset: "synthetic-phantom",
      measurements: [
        {
          id: "a",
          points: [
            [1, 2],
            [3, 4],
          ],
          slice: 4,
          plane: "Axial",
        },
      ],
    }),
  ).toHaveLength(1);
  expect(() =>
    parseAnnotations({ version: 1, dataset: "patient", measurements: [] }),
  ).toThrow();
  expect(() =>
    parseAnnotations({
      version: 1,
      dataset: "synthetic-phantom",
      measurements: [
        {
          id: "x",
          points: [
            [Infinity, 2],
            [3, 4],
          ],
          slice: 4,
          plane: "Axial",
        },
      ],
    }),
  ).toThrow();
});
