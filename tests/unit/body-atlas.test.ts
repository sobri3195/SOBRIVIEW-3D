import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { parseModel } from "@dagno/anatomy-engine";
import decodeChunk from "../../src/vendor/anatomy-engine/decode-chunk";
import {
  anatomyAsset,
  atlasStructures,
  meshIdsFor,
  resolveStructures,
} from "../../src/features/body-atlas/mapping";
const raw = JSON.parse(readFileSync("public/anatomy/atlas.json", "utf8"));
const model = parseModel(raw);
describe("BodyParts3D atlas assets and reviewed mapping", () => {
  test("every bundled file matches the pinned package checksum and every geometry buffer is valid", () => {
    const source = JSON.parse(
      readFileSync("public/anatomy/SOURCE.json", "utf8"),
    );
    expect(model.parts).toHaveLength(2234);
    expect(model.chunks).toHaveLength(15);
    expect(model.concepts).toHaveLength(3432);
    for (const [name, info] of Object.entries(source.files) as [
      string,
      { bytes: number; sha256: string },
    ][]) {
      const data = readFileSync(`public/anatomy/${name}`);
      expect(data.length).toBe(info.bytes);
      expect(createHash("sha256").update(data).digest("hex")).toBe(info.sha256);
    }
    model.chunks.forEach((chunk, index) => {
      const zipped = readFileSync(`public/anatomy/${chunk.gzip}`);
      expect([...zipped.subarray(0, 2)]).toEqual([0x1f, 0x8b]);
      const data = gunzipSync(zipped);
      expect(data.length).toBe(chunk.bytes);
      const buffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      );
      for (const part of model.parts.filter((p) => p.chunk === index)) {
        expect(part.vertexCount).toBeGreaterThan(0);
        expect(part.indexCount % 3).toBe(0);
        const positions = new Float32Array(
          buffer,
          part.positions,
          part.vertexCount * 3,
        );
        const normals = new Int16Array(
          buffer,
          part.normals,
          part.vertexCount * 3,
        );
        const indices = new Uint32Array(buffer, part.indices, part.indexCount);
        expect(normals.length).toBe(positions.length);
        let valid = true;
        for (let i = 0; i < positions.length; i++) {
          const v = positions[i],
            axis = i % 3;
          if (
            !Number.isFinite(v) ||
            v < part.bounds[0][axis] - 1e-5 ||
            v > part.bounds[1][axis] + 1e-5
          )
            valid = false;
        }
        for (const i of indices) if (i >= part.vertexCount) valid = false;
        expect(valid, part.id).toBe(true);
      }
    });
  });
  test("13 verified groups own 604 distinct source meshes with honest partial scope", () => {
    const groups = resolveStructures(model);
    expect(groups).toHaveLength(13);
    expect(groups.every((s) => s.status !== "unavailable")).toBe(true);
    const ids = groups.flatMap((s) => s.meshIds);
    expect(ids.length).toBe(604);
    expect(new Set(ids).size).toBe(604);
    expect(meshIdsFor(groups, ["kidney-left", "kidney-left"])).toEqual([
      "FJ3145",
    ]);
    expect(groups.find((s) => s.id === "muscle")!.meshIds).toEqual([
      "FJ1452",
      "FJ1452M",
    ]);
    expect(groups.find((s) => s.id === "muscle")!.status).toBe("partial");
    expect(groups.find((s) => s.id === "muscle")!.latin).toBeNull();
    for (const id of ["lung-left", "lung-right", "heart", "intestine"])
      expect(groups.find((s) => s.id === id)!.status).toBe("partial");
    expect(
      model.parts.find((p) => p.id === "FJ3145")!.bounds[0][0],
    ).toBeGreaterThan(0);
    expect(
      model.parts.find((p) => p.id === "FJ3147")!.bounds[1][0],
    ).toBeLessThan(0);
  });
  test("missing or changed source identities become unavailable rather than invented anatomy", () => {
    const groups = resolveStructures({
      ...model,
      parts: model.parts.filter((p) => p.id !== "FJ3145"),
    });
    expect(groups.find((s) => s.id === "kidney-left")!.status).toBe(
      "unavailable",
    );
    expect(groups.find((s) => s.id === "kidney-left")!.meshIds).toEqual([]);
    expect(groups.find((s) => s.id === "kidney-right")!.status).toBe(
      "available",
    );
    expect(atlasStructures.every((s) => s.concepts.length > 0)).toBe(true);
  });
  test("loader accepts gzip bytes or HTTP-decoded bytes without double decompression", async () => {
    const zipped = readFileSync("public/anatomy/body-0.bin.gz");
    const plain = gunzipSync(zipped);
    const gzipResult = await decodeChunk(
      new Response(zipped),
      model.chunks[0].bytes,
      true,
    );
    const plainResult = await decodeChunk(
      new Response(plain),
      model.chunks[0].bytes,
      true,
    );
    expect(Buffer.from(gzipResult).equals(plain)).toBe(true);
    expect(Buffer.from(plainResult).equals(plain)).toBe(true);
    await expect(
      decodeChunk(
        new Response("<html>SPA fallback</html>"),
        model.chunks[0].bytes,
        true,
      ),
    ).rejects.toThrow(/bytes/);
  });
  test("asset URLs honor the Vite base", () => {
    vi.stubEnv("BASE_URL", "/workstation/");
    expect(anatomyAsset("atlas.json")).toBe("/workstation/anatomy/atlas.json");
    vi.unstubAllEnvs();
  });
});
