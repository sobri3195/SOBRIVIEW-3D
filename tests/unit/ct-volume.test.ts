import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { parseNrrd, readNrrdHeader } from "../../src/medical/nrrd";
import {
  dicomVolume,
  displayToIndex,
  indexToWorld,
  physicalDistance,
  sliceGeometry,
  valueAt,
  windowPixel,
  worldToIndex,
  type Vec3,
  type Volume,
} from "../../src/medical/volume";
import { parseVolumeAnnotations } from "../../src/medical/volume-annotations";
import { importFiles } from "../../src/medical/dicom";
import { groupSeries, validateVolume } from "../../src/medical/metadata";
import { dicomFixture } from "../fixture";
import source from "../../public/demo/ct-liver/source.json";
const sourceInfo = {
  id: "unit-test",
  title: "NRRD fixture",
  attribution: "Test data",
  space: "lps",
};
function nrrd(fields: Record<string, string>, values: Uint8Array) {
  const header = `NRRD0004\n${Object.entries({
    type: "float",
    dimension: "3",
    sizes: "2 2 2",
    space: "left-posterior-superior",
    "space directions": "(-1,0,0) (0,-2,0) (0,0,3)",
    "space origin": "(10,20,30)",
    "space units": '"mm" "mm" "mm"',
    encoding: "raw",
    endian: "little",
    ...fields,
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n\n`;
  const result = Buffer.concat([Buffer.from(header), values]);
  return result.buffer.slice(
    result.byteOffset,
    result.byteOffset + result.byteLength,
  );
}
let actual: Volume;
describe("verified public CT volume", () => {
  test("checks the genuine preview hash, full float voxel buffer, geometry and distinct slices", async () => {
    const bytes = readFileSync("public/demo/ct-liver/CTLiver-preview.nrrd");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      source.preview.sha256,
    );
    expect(bytes.length).toBe(source.preview.bytes);
    actual = await parseNrrd(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      { ...sourceInfo, id: source.id },
    );
    expect(actual.scalarData).toBeInstanceOf(Float32Array);
    expect(actual.scalarData.byteLength).toBe(89915392);
    expect(actual.dimensions).toEqual([256, 256, 343]);
    actual.spacing.forEach((n, i) =>
      expect(n).toBeCloseTo(source.preview.spacing[i], 10),
    );
    expect(actual.origin).toEqual(source.preview.origin);
    expect(actual.direction).toEqual([-1, 0, 0, 0, -1, 0, 0, 0, 1]);
    expect(actual.range).toEqual([-1024, 3071]);
    expect(actual.intensity.unit).toBe("Intensity");
    const hashes = [0, 171, 220, 221, 342].map((k) =>
      createHash("sha256")
        .update(
          new Uint8Array(
            actual.scalarData.buffer,
            k * 256 * 256 * 4,
            256 * 256 * 4,
          ),
        )
        .digest("hex"),
    );
    expect(new Set(hashes).size).toBe(5);
    if (existsSync("public/demo/ct-liver/CTLiver.nrrd")) {
      const original = readFileSync("public/demo/ct-liver/CTLiver.nrrd");
      expect(createHash("sha256").update(original).digest("hex")).toBe(
        "e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e",
      );
      expect(readNrrdHeader(original).dimensions).toEqual([512, 512, 685]);
    }
  }, 15000);
  test("screen orientation and probe identify the correct native voxel without a left/right flip", () => {
    expect(sliceGeometry(actual)).toMatchObject({
      left: "R",
      right: "L",
      top: "A",
      bottom: "P",
      stack: "S",
    });
    expect(displayToIndex(actual, 20, 30, 220)).toEqual([235, 225, 220]);
    expect(valueAt(actual, displayToIndex(actual, 20, 30, 220))).toBe(
      actual.scalarData[(220 * 256 + 225) * 256 + 235],
    );
    const p: Vec3 = [20.5, 40.2, 110];
    const physical = indexToWorld(actual, p);
    worldToIndex(actual, physical).forEach((n, i) =>
      expect(n).toBeCloseTo(p[i], 9),
    );
    expect(physicalDistance(actual, [10, 20, 30], [20, 20, 30])).toBeCloseTo(
      13.984375,
      8,
    );
    expect(windowPixel(40, 400, 40)).toBe(128);
    expect(windowPixel(40, 400, 40, true)).toBe(127);
  });
  test("annotations retain dataset identity and native coordinates", () => {
    const m = {
      id: "a",
      points: [
        [10, 20, 220],
        [20, 20, 220],
      ],
    };
    expect(
      parseVolumeAnnotations(
        {
          version: 2,
          dataset: source.id,
          dimensions: [256, 256, 343],
          measurements: [m],
        },
        actual,
      ),
    ).toEqual([m]);
    expect(() =>
      parseVolumeAnnotations(
        { version: 1, dataset: "synthetic-phantom", measurements: [] },
        actual,
      ),
    ).toThrow(/dataset/);
    expect(() =>
      parseVolumeAnnotations(
        {
          version: 2,
          dataset: source.id,
          dimensions: [256, 256, 343],
          measurements: [
            {
              id: "bad",
              points: [
                [1, 2, 220],
                [3, 4, 221],
              ],
            },
          ],
        },
        actual,
      ),
    ).toThrow(/slice/);
  });
});
describe("NRRD format and physical-coordinate contract", () => {
  test("preserves signed float values and big-endian signed short precision", async () => {
    const floats = new Float32Array([-1024, 0.25, 1.5, 3071, -5, 6, 7, 8]);
    const v = await parseNrrd(
      nrrd({}, new Uint8Array(floats.buffer)),
      sourceInfo,
    );
    expect([...v.scalarData]).toEqual([...floats]);
    const signed = new Int16Array([-32768, -1000, -1, 0, 1, 2, 1000, 32767]);
    const bytes = new Uint8Array(16),
      view = new DataView(bytes.buffer);
    signed.forEach((n, i) => view.setInt16(i * 2, n, false));
    const big = await parseNrrd(
      nrrd({ type: "short", endian: "big", encoding: "gzip" }, gzipSync(bytes)),
      sourceInfo,
    );
    expect(big.scalarData).toBeInstanceOf(Int16Array);
    expect([...big.scalarData]).toEqual([...signed]);
  });
  test("converts RAS to LPS explicitly and handles anisotropic physical distances", async () => {
    const data = new Uint8Array(new Float32Array(8).buffer);
    const v = await parseNrrd(
      nrrd(
        {
          space: "right-anterior-superior",
          "space directions": "(1,0,0) (0,2,0) (0,0,3)",
        },
        data,
      ),
      sourceInfo,
    );
    expect(v.origin).toEqual([-10, -20, 30]);
    expect(indexToWorld(v, [1, 1, 1])).toEqual([-11, -22, 33]);
    expect(physicalDistance(v, [0, 0, 0], [1, 1, 1])).toBeCloseTo(
      Math.sqrt(14),
    );
    const unknown = await parseNrrd(
      nrrd({ "space units": "" }, data),
      sourceInfo,
    );
    expect(unknown.spatialUnit).toBe("unknown");
    expect(physicalDistance(unknown, [0, 0, 0], [1, 1, 1])).toBeNull();
    const oblique = await parseNrrd(
      nrrd(
        {
          "space directions":
            "(0.707106781,0.707106781,0) (-1.414213562,1.414213562,0) (0,0,3)",
        },
        data,
      ),
      sourceInfo,
    );
    expect(sliceGeometry(oblique).axial).toBe(false);
    expect(physicalDistance(oblique, [0, 0, 0], [1, 1, 1])).toBeCloseTo(
      Math.sqrt(14),
    );
  });
  test("rejects HTML, detached/vector data, incomplete payloads, sheared axes and excessive allocations", async () => {
    expect(() =>
      readNrrdHeader(new TextEncoder().encode("<html>not NRRD</html>")),
    ).toThrow();
    const data = new Uint8Array(32);
    await expect(
      parseNrrd(nrrd({ "data file": "remote.raw" }, data), sourceInfo),
    ).rejects.toThrow(/attached/);
    await expect(
      parseNrrd(nrrd({}, data.slice(0, 16)), sourceInfo),
    ).rejects.toThrow(/length/);
    await expect(
      parseNrrd(nrrd({ sizes: "512 512 685" }, data), sourceInfo),
    ).rejects.toThrow(/256 MB/);
    await expect(
      parseNrrd(
        nrrd({ "space directions": "(1,0,0) (1,1,0) (0,0,1)" }, data),
        sourceInfo,
      ),
    ).rejects.toThrow(/Sheared/);
  });
});
describe("shared DICOM volume adapter", () => {
  test("applies modality rescale exactly once and keeps valid LPS geometry", async () => {
    const result = await importFiles(
      [2, 0, 1].map(
        (s) => new File([dicomFixture(s)], `misleading-${9 - s}.dcm`),
      ),
    );
    const frames = result.series[0].map(({ metadata }) => ({
      metadata,
      scalarData: new Int16Array(1024).fill(1064),
      preScaled: false,
    }));
    const raw = dicomVolume(frames);
    expect(raw.scalarData[0]).toBe(40);
    expect(raw.intensity.unit).toBe("HU");
    expect(raw.dimensions).toEqual([32, 32, 3]);
    const scaled = dicomVolume(
      frames.map((f) => ({
        ...f,
        scalarData: new Float32Array(1024).fill(40),
        preScaled: true,
      })),
    );
    expect(scaled.scalarData[0]).toBe(40);
    expect(scaled.spacing).toEqual([1, 1, 1]);
    expect(scaled.direction).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
  test("separates incompatible geometry and localizers within one series UID", async () => {
    const result = await importFiles(
      [0, 1, 2].map((s) => new File([dicomFixture(s)], `slice-${s}.dcm`)),
    );
    const original = result.series[0];
    const localizer = {
      ...original[0],
      metadata: {
        ...original[0].metadata,
        sop: "localizer",
        imageType: ["LOCALIZER"],
      },
    };
    const mismatch = {
      ...original[0],
      metadata: { ...original[0].metadata, sop: "different-rows", rows: 64 },
    };
    expect(groupSeries([...original, localizer, mismatch])).toHaveLength(3);
    expect(
      validateVolume([
        localizer.metadata,
        localizer.metadata,
        localizer.metadata,
      ]),
    ).toMatch(/Localizer/);
  });
});

test("cancelled local DICOM import discards a pending read and stops remaining files", async () => {
  const controller = new AbortController();
  const first = new File([dicomFixture(0)], "first.dcm");
  first.arrayBuffer = async () => {
    controller.abort();
    return dicomFixture(0).buffer as ArrayBuffer;
  };
  let reads = 0;
  const second = new File([dicomFixture(1)], "second.dcm");
  second.arrayBuffer = async () => {
    reads++;
    return dicomFixture(1).buffer as ArrayBuffer;
  };
  await expect(
    importFiles([first, second], controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(reads).toBe(0);
});
