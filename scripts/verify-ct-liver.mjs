import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../public/demo/ct-liver/", import.meta.url);
const source = JSON.parse(readFileSync(new URL("source.json", root)));
const bytes = readFileSync(new URL(source.preview.file, root));
if (
  bytes.length !== source.preview.bytes ||
  createHash("sha256").update(bytes).digest("hex") !== source.preview.sha256 ||
  !bytes.subarray(0, 8).toString().startsWith("NRRD0004")
)
  throw new Error("CTLiver preview verification failed.");
console.log(
  `Verified CTLiver resampled preview: ${bytes.length} bytes; ${source.preview.sha256}`,
);
