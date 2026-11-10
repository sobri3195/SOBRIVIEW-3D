// Offline preparation only; builds use the committed volume preview and never download patient data.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = new URL("../public/demo/ct-liver/", import.meta.url);
mkdirSync(root, { recursive: true });
const hash = "e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e";
const url = `https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/${hash}`;
const original = new URL("CTLiver.nrrd", root);
if (!existsSync(original)) {
  execFileSync(
    "curl",
    [
      "--fail",
      "--location",
      "--max-time",
      "120",
      "--output",
      fileURLToPath(original),
      url,
    ],
    { stdio: "inherit" },
  );
}
const bytes = readFileSync(original);
const sha = (data) => createHash("sha256").update(data).digest("hex");
if (sha(bytes) !== hash)
  throw new Error(
    "Upstream CTLiver checksum mismatch; do not update the pin without review.",
  );
const end = bytes.indexOf("\n\n");
const header = bytes.subarray(0, end).toString();
const fields = Object.fromEntries(
  header
    .split("\n")
    .filter((s) => !s.startsWith("#") && s.includes(":"))
    .map((s) => {
      const i = s.indexOf(":");
      return [s.slice(0, i), s.slice(i + 1).trim()];
    }),
);
if (
  !header.startsWith("NRRD0004") ||
  fields.type !== "float" ||
  fields.sizes !== "512 512 685" ||
  fields.encoding !== "gzip" ||
  fields.endian !== "little"
)
  throw new Error("Unexpected source header.");
const plain = gunzipSync(bytes.subarray(end + 2));
if (plain.length !== 512 * 512 * 685 * 4)
  throw new Error("Incomplete original voxel buffer.");
if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1)
  throw new Error("Offline preview preparation requires a little-endian host.");
const source = new Float32Array(
  plain.buffer,
  plain.byteOffset,
  plain.byteLength / 4,
);
const dims = [256, 256, 343],
  preview = new Float32Array(dims[0] * dims[1] * dims[2]);
let low = Infinity,
  high = -Infinity;
for (let k = 0; k < dims[2]; k++)
  for (let j = 0; j < dims[1]; j++)
    for (let i = 0; i < dims[0]; i++) {
      const v = source[(k * 2 * 512 + j * 2) * 512 + i * 2];
      if (!Number.isFinite(v)) throw new Error("Non-finite source voxel.");
      preview[(k * dims[1] + j) * dims[0] + i] = v;
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
const directions = [
  [-1.3984375, 0, 0],
  [0, -1.3984375, 0],
  [0, 0, 1.399999856948853],
];
const previewHeader = `NRRD0004\n# CTLiver resampled preview; see source.json and ATTRIBUTION.md\ntype: float\ndimension: 3\nspace: left-posterior-superior\nsizes: ${dims.join(" ")}\nspace directions: ${directions.map((v) => `(${v.join(",")})`).join(" ")}\nkinds: domain domain domain\nendian: little\nencoding: gzip\nspace origin: ${fields["space origin"]}\nspace units: "mm" "mm" "mm"\n\n`;
const result = Buffer.concat([
  Buffer.from(previewHeader),
  gzipSync(new Uint8Array(preview.buffer), { level: 9 }),
]);
writeFileSync(new URL("CTLiver-preview.nrrd", root), result);
writeFileSync(
  new URL("source.json", root),
  JSON.stringify(
    {
      id: `ctliver-preview-sha256:${sha(result)}`,
      title: "CTLiver — resampled preview",
      format: "NRRD",
      modality: "CT",
      upstream: {
        url,
        file: "CTLiver.nrrd",
        bytes: bytes.length,
        sha256: hash,
        dimensions: [512, 512, 685],
        type: "float32",
        decodedBytes: plain.length,
        space: fields.space,
        spaceDirections: [
          [-0.69921875, 0, 0],
          [0, -0.69921875, 0],
          [0, 0, 0.6999999284744265],
        ],
        origin: [188.18499755859375, 320.03762817382824, 15.300048828125004],
      },
      preview: {
        file: "CTLiver-preview.nrrd",
        bytes: result.length,
        sha256: sha(result),
        dimensions: dims,
        decodedBytes: preview.byteLength,
        type: "float32",
        range: [low, high],
        spacing: [1.3984375, 1.3984375, 1.399999856948853],
        origin: [188.18499755859375, 320.03762817382824, 15.300048828125004],
        spaceDirections: directions,
        initialSlice: 220,
        method:
          "Nearest-neighbor on source indices [2*i,2*j,2*k]; no intensity scaling or interpolation. Last x/y source index 511 is not sampled; final z index 684 is preserved.",
      },
      provenance: {
        dataset: "Medical Segmentation Decathlon",
        task: "Task03_Liver",
        image: "imagesTr/liver_100.nii.gz",
        sampleDataRevision: "4aeb6cc47e0372105004d6045efa5f52b6501542",
        definition:
          "https://github.com/Slicer/Slicer/blob/4aeb6cc47e0372105004d6045efa5f52b6501542/Modules/Scripted/SampleData/SampleData.py",
        spatialUnits:
          "mm per 3D Slicer physical-coordinate convention; original NRRD omits space units; derivative explicitly records this provenance assumption.",
        coordinateReference:
          "https://github.com/Slicer/Slicer/blob/4aeb6cc47e0372105004d6045efa5f52b6501542/Docs/user_guide/coordinate_systems.md",
      },
      intensity: {
        unit: "Intensity",
        calibration:
          "NRRD stores converted float values; no HU unit/calibration is stated in this header. No DICOM rescale is applied.",
      },
      license: {
        name: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
      attribution:
        "CT contoh publik — Medical Segmentation Decathlon / 3D Slicer. Untuk edukasi dan penelitian. Resampled preview · CC BY-SA 4.0.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    originalBytes: bytes.length,
    previewBytes: result.length,
    sha256: sha(result),
    dimensions: dims,
    range: [low, high],
  }),
);
