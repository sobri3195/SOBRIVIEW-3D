import dicomParser from "dicom-parser";
import { groupSeries, type Spatial } from "./metadata";
export type ImportedSlice = { file: File; metadata: Spatial };
export async function importFiles(
  files: File[],
): Promise<{ series: ImportedSlice[][]; rejected: number }> {
  if (
    files.length > 3000 ||
    files.reduce((n, f) => n + f.size, 0) > 512 * 1024 * 1024
  )
    throw Error(
      "Study exceeds the 3,000-file / 512 MB input limit. Choose a smaller series.",
    );
  const slices: ImportedSlice[] = [];
  let rejected = 0;
  for (const file of files) {
    try {
      const ds = dicomParser.parseDicom(
        new Uint8Array(await file.arrayBuffer()),
      );
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
      slices.push({
        file,
        metadata: {
          study: str("x0020000d"),
          series: str("x0020000e"),
          sop: str("x00080018"),
          modality: str("x00080060"),
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
    } catch {
      rejected++;
    }
  }
  return { series: groupSeries(slices), rejected };
}
