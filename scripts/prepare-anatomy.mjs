import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
const require = createRequire(import.meta.url);
const source = JSON.parse(
  readFileSync(new URL("../public/anatomy/SOURCE.json", import.meta.url)),
);
const root = dirname(require.resolve("@dagno/anatomy-model/package.json"));
const pkg = JSON.parse(readFileSync(join(root, "package.json")));
if (pkg.version !== source.version)
  throw new Error("Review the new model revision before changing checksums.");
const model = JSON.parse(readFileSync(join(root, "model/atlas.json")));
const expected = [
  "atlas.json",
  ...model.chunks.map((c) => c.gzip),
  "LICENSE",
  "ATTRIBUTION.md",
];
const modelFiles = readdirSync(join(root, "model"));
if (modelFiles.some((f) => !expected.includes(f)))
  throw new Error("Unreviewed model file.");
const target = new URL("../public/anatomy/", import.meta.url);
mkdirSync(target, { recursive: true });
for (const name of expected) {
  const bytes = readFileSync(
    join(
      root,
      name === "LICENSE" || name === "ATTRIBUTION.md" ? name : `model/${name}`,
    ),
  );
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (
    hash !== source.files[name]?.sha256 ||
    bytes.length !== source.files[name]?.bytes
  )
    throw new Error(`Checksum mismatch: ${name}`);
  if (name.endsWith(".gz")) {
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b)
      throw new Error(`Not gzip: ${name}`);
    const chunk = model.chunks.find((c) => c.gzip === name);
    if (gunzipSync(bytes).length !== chunk.bytes)
      throw new Error(`Incomplete chunk: ${name}`);
  }
  writeFileSync(new URL(name, target), bytes);
}
console.log(
  `Verified/copied anatomy-model ${pkg.version}: manifest, ${model.chunks.length} gzip chunks and license/attribution.`,
);

// The extended renderer retains the upstream MIT notice in source and deployment.
writeFileSync(
  new URL("ENGINE_LICENSE.txt", target),
  readFileSync(
    new URL("../src/vendor/anatomy-engine/LICENSE", import.meta.url),
  ),
);
