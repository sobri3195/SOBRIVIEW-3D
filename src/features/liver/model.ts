import * as THREE from "three";

export const liverAsset = (name: string) =>
  `${import.meta.env.BASE_URL}models/liver/${name}`;
export const modelCredit =
  "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.";
export const sourceCommit = "528ee1794670d3bfa23d581f91ba49d6af585b03";

// Inspected in the pinned GLB: seven root mesh nodes; extras.structureId and
// extras.fma accompany each name. Do not infer a Couinaud mapping from these.
export const structures = [
  {
    id: "liver",
    node: "liver",
    fma: "FMA7197",
    name: "Liver surface",
    idName: "Permukaan hati",
    color: "#a95b4b",
    description:
      "Jaringan hati sebagai satu kelompok permukaan. Berperan dalam metabolisme, pembentukan empedu, dan pemrosesan zat dalam darah.",
    scope:
      "Gabungan sembilan elemen jaringan sumber; sambungan asli tetap terlihat. Tidak menggambarkan batas Couinaud tervalidasi.",
  },
  {
    id: "gallbladder",
    node: "gallbladder",
    fma: "FMA7202",
    name: "Gallbladder",
    idName: "Kantong empedu",
    color: "#69b66d",
    description:
      "Menyimpan dan memekatkan empedu sebelum disalurkan ke sistem pencernaan.",
    scope: "Terletak pada permukaan inferior hati pada model referensi.",
  },
  {
    id: "portal",
    node: "portal",
    fma: "FMA50735",
    name: "Portal vein",
    idName: "Vena porta",
    color: "#a57cdd",
    description:
      "Membawa darah dari organ pencernaan menuju hati melalui percabangan vena porta.",
    scope:
      "Kelompok pembuluh sumber dengan ujung terpotong; bukan simulasi aliran darah.",
  },
  {
    id: "hepatic-veins",
    node: "hepatic-veins",
    fma: "FMA14337",
    name: "Hepatic veins",
    idName: "Vena hepatika",
    color: "#5eade5",
    description:
      "Mengalirkan darah keluar dari hati menuju vena kava inferior.",
    scope: "Vena kava inferior tidak disertakan dalam aset ini.",
  },
  {
    id: "artery",
    node: "artery",
    fma: "FMA14772",
    name: "Hepatic artery",
    idName: "Arteri hepatika",
    color: "#ed6a65",
    description:
      "Menyuplai darah beroksigen ke jaringan hati melalui arteri hepatika propria dan cabangnya.",
    scope: "Arteri hepatika komunis di hulu tidak disertakan.",
  },
  {
    id: "biliary",
    node: "biliary",
    fma: "FMA71891",
    name: "Hepatic bile ducts",
    idName: "Saluran empedu hepatik",
    color: "#e7c568",
    description:
      "Mengumpulkan empedu yang diproduksi hati melalui percabangan saluran hepatik.",
    scope:
      "Duktus koledokus tidak disertakan; cabang sumber merupakan kelompok referensi.",
  },
  {
    id: "cystic",
    node: "cystic",
    fma: "FMA14539",
    name: "Cystic duct",
    idName: "Duktus sistikus",
    color: "#72d2b4",
    description: "Menghubungkan kantong empedu dengan saluran empedu hepatik.",
    scope: "Satu elemen duktus sumber; anatomi mikroskopis tidak ditampilkan.",
  },
] as const;
export type StructureId = (typeof structures)[number]["id"];
export type LiverMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshStandardMaterial
>;
export type Manifest = {
  runtime: { bytes: number; sha256: string };
  structures: { id: string; fma: string }[];
  transform: { axes: string };
};

export function bindStructures(root: THREE.Object3D, manifest: Manifest) {
  if (manifest.transform.axes !== "[x,z,-y]")
    throw new Error("Orientasi sumber tidak dikenali.");
  const meshes = new Map<StructureId, LiverMesh>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const entry = structures.find(
      (s) =>
        s.node === node.name &&
        s.id === node.userData.structureId &&
        s.fma === node.userData.fma,
    );
    if (
      !entry ||
      !manifest.structures.some(
        (s) => s.id === entry.id && s.fma === entry.fma,
      ) ||
      meshes.has(entry.id)
    )
      throw new Error(
        "Struktur GLB tidak sesuai dengan manifest yang diperiksa.",
      );
    // Each structure owns its material; geometry, transforms and normals stay intact.
    const original = node.material as THREE.Material | THREE.Material[];
    node.material = new THREE.MeshStandardMaterial({
      color: entry.color,
      roughness: 0.86,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    for (const m of Array.isArray(original) ? original : [original])
      m.dispose();
    node.userData.structureId = entry.id;
    meshes.set(entry.id, node as LiverMesh);
  });
  if (
    meshes.size !== structures.length ||
    manifest.structures.length !== structures.length
  )
    throw new Error("Model harus memuat tujuh kelompok anatomi.");
  return meshes;
}

export function centerModel(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (
    bounds.isEmpty() ||
    !Number.isFinite(size.length()) ||
    size.length() === 0
  )
    throw new Error("Batas geometri tidak valid.");
  // Only the shared parent is centered/scaled. The source axes are already transformed.
  const parent = new THREE.Group();
  parent.add(model);
  const scale = 4.2 / Math.max(size.x, size.y, size.z);
  parent.scale.setScalar(scale);
  parent.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  parent.updateMatrixWorld(true);
  return parent;
}

// +x patient-left, +y superior, +z anterior, verified in source provenance and GLB.
export const views = {
  Anterior: { direction: [0, 0, 1], up: [0, 1, 0] },
  Posterior: { direction: [0, 0, -1], up: [0, 1, 0] },
  "Kanan pasien": { direction: [-1, 0, 0], up: [0, 1, 0] },
  "Kiri pasien": { direction: [1, 0, 0], up: [0, 1, 0] },
  Superior: { direction: [0, 1, 0], up: [0, 0, -1] },
  Inferior: { direction: [0, -1, 0], up: [0, 0, 1] },
} satisfies Record<string, { direction: number[]; up: number[] }>;
export type View = keyof typeof views;

export function fitDistance(
  box: THREE.Box3,
  direction: THREE.Vector3,
  up: THREE.Vector3,
  aspect: number,
  fov: number,
) {
  const right = new THREE.Vector3().crossVectors(up, direction).normalize();
  const vertical = new THREE.Vector3()
    .crossVectors(direction, right)
    .normalize();
  const center = box.getCenter(new THREE.Vector3());
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  let distance = 0;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).sub(center);
        distance = Math.max(
          distance,
          Math.abs(p.dot(right)) / (tanV * aspect * 0.8) + p.dot(direction),
          Math.abs(p.dot(vertical)) / (tanV * 0.8) + p.dot(direction),
        );
      }
  return Math.max(distance, 0.1);
}

export function disposeModel(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material])
      material.dispose();
  });
}
