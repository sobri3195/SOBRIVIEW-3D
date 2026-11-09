import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  bindStructures,
  centerModel,
  disposeModel,
  fitDistance,
  structures,
  views,
  type Manifest,
} from "../../src/features/liver/model";

const bytes = readFileSync("public/models/liver/liver.glb");
const manifest: Manifest = JSON.parse(
  readFileSync("public/models/liver/manifest.json", "utf8"),
);
const load = async () =>
  (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    )
  ).scene;
describe("pinned BodyParts3D liver", () => {
  test("binary and manifest match the reviewed source revision", () => {
    expect(bytes.length).toBe(5579432);
    expect(bytes.length).toBe(manifest.runtime.bytes);
    expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha).toBe(
      "4059e94f415a765273e2f095c5fd2c68edbb761c932dfa9460f9893ee5b0decb",
    );
    expect(sha).toBe(manifest.runtime.sha256);
    expect(
      readFileSync("public/models/liver/liver-preview.webp").toString(
        "ascii",
        8,
        12,
      ),
    ).toBe("WEBP");
  });
  test("all seven groups map by actual node name, extras and FMA, preserving geometry and relative placement", async () => {
    const root = await load();
    const before = new Map<string, number[]>();
    root.traverse((n) => {
      if (n instanceof THREE.Mesh)
        before.set(n.name, Array.from(n.geometry.attributes.position.array));
    });
    const meshes = bindStructures(root, manifest);
    expect([...meshes.keys()]).toEqual(structures.map((s) => s.id));
    expect(new Set([...meshes.values()].map((m) => m.material)).size).toBe(7);
    let triangles = 0,
      vertices = 0;
    const parent = centerModel(root);
    const bounds = new THREE.Box3().setFromObject(parent);
    expect(bounds.getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-6);
    expect(
      Math.max(...bounds.getSize(new THREE.Vector3()).toArray()),
    ).toBeCloseTo(4.2);
    for (const [id, mesh] of meshes) {
      expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(
        before.get(id),
      );
      expect(mesh.geometry.type).toBe("BufferGeometry");
      expect(mesh.position.toArray()).toEqual([0, 0, 0]);
      expect(mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      vertices += mesh.geometry.attributes.position.count;
      triangles += mesh.geometry.index!.count / 3;
    }
    expect(vertices).toBe(123178);
    expect(triangles).toBe(218056);
    meshes.get("liver")!.material.opacity = 0.1;
    expect(meshes.get("portal")!.material.opacity).toBe(1);
    disposeModel(parent);
  });
  test("inconsistent structure metadata fails instead of silently displaying a placeholder", async () => {
    const root = await load();
    root.children[0].userData.structureId = "segment-1";
    expect(() => bindStructures(root, manifest)).toThrow(/manifest/);
    disposeModel(root);
  });
  test("six patient-axis presets frame the shared bounds without clipping on mobile and desktop", async () => {
    const parent = centerModel(await load());
    const box = new THREE.Box3().setFromObject(parent);
    const center = box.getCenter(new THREE.Vector3());
    for (const aspect of [0.65, 1.4, 2])
      for (const preset of Object.values(views)) {
        const direction = new THREE.Vector3().fromArray(preset.direction);
        const camera = new THREE.PerspectiveCamera(38, aspect, 0.005, 100);
        camera.up.fromArray(preset.up);
        camera.position
          .copy(center)
          .addScaledVector(
            direction,
            fitDistance(box, direction, camera.up, aspect, 38),
          );
        camera.lookAt(center);
        camera.updateMatrixWorld(true);
        let extent = 0;
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              const projected = new THREE.Vector3(x, y, z).project(camera);
              extent = Math.max(
                extent,
                Math.abs(projected.x),
                Math.abs(projected.y),
              );
              expect(projected.z).toBeGreaterThan(-1);
              expect(projected.z).toBeLessThan(1);
            }
        expect(extent).toBeCloseTo(0.8);
      }
    expect(views["Kanan pasien"].direction).toEqual([-1, 0, 0]);
    expect(views.Anterior.direction).toEqual([0, 0, 1]);
    disposeModel(parent);
  });
});
