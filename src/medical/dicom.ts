import dicomParser from "dicom-parser";
import { groupSeries, type Spatial } from "./metadata";
export type ImportedSlice = { file: File; metadata: Spatial };
export async function importFiles(
  files: File[],
  signal?: AbortSignal,
): Promise<{ series: ImportedSlice[][]; rejected: number; issues: string[] }> {
  if (
    files.length > 3000 ||
    files.reduce((n, f) => n + f.size, 0) > 512 * 1024 * 1024
  )
    throw Error(
      "Study exceeds the 3,000-file / 512 MB input limit. Choose a smaller series.",
    );
  const slices: ImportedSlice[] = [];
  let rejected = 0;
  const issues = new Set<string>();
  for (const file of files) {
    signal?.throwIfAborted();
    try {
      const buffer = await file.arrayBuffer();
      signal?.throwIfAborted();
      const ds = dicomParser.parseDicom(new Uint8Array(buffer));
      const str = (tag: string) => ds.string(tag) || "";
      const nums = (tag: string) =>
        str(tag).split("\\").filter(Boolean).map(Number);
      if (
        !str("x0020000d") ||
        !str("x0020000e") ||
        !str("x00080018") ||
        !ds.elements.x7fe00010
      )
        throw Error("Not an image");
      if (Number(str("x00280008") || 1) > 1)
        throw new Error(
          "Multi-frame DICOM is not supported by this importer. Choose a single-frame series.",
        );
      slices.push({
        file,
        metadata: {
          study: str("x0020000d"),
          series: str("x0020000e"),
          sop: str("x00080018"),
          modality: str("x00080060"),
          frameOfReference: str("x00200052"),
          imageType: str("x00080008").split("\\"),
          photometric: str("x00280004"),
          transferSyntax: str("x00020010"),
          position: nums("x00200032"),
          orientation: nums("x00200037"),
          spacing: nums("x00280030"),
          rows: ds.uint16("x00280010") || 0,
          columns: ds.uint16("x00280011") || 0,
          slope: Number(str("x00281053") || "NaN"),
          intercept: Number(str("x00281052") || "NaN"),
          instance: Number(str("x00200013") || 0),
        },
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof Error && error.message.startsWith("Multi-frame"))
        issues.add(error.message);
      else if (/transfer syntax|encapsulat|encoding/i.test(String(error)))
        issues.add(
          "Unsupported DICOM transfer syntax or encoding. Choose a series supported by the bundled decoder.",
        );
      rejected++;
    }
  }
  return { series: groupSeries(slices), rejected, issues: [...issues] };
}
