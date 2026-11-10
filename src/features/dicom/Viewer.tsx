import { useState } from "react";
import CTLiverViewer from "./CTLiverViewer";
import LegacyViewer from "./LegacyViewer";
export default function Viewer({ mpr = false }: { mpr?: boolean }) {
  const [mode, setMode] = useState("sample");
  const [files, setFiles] = useState<File[] | undefined>();
  if (mpr) return <LegacyViewer mpr />;
  return (
    <>
      <div className="dataset-switch">
        <label htmlFor="viewer-dataset">Dataset</label>
        <select
          id="viewer-dataset"
          aria-label="Dataset"
          value={mode}
          onChange={(e) => {
            setFiles(undefined);
            setMode(e.target.value);
          }}
        >
          <option value="sample">CT contoh — CTLiver</option>
          <option value="dicom">Buka DICOM lokal</option>
          <option value="phantom">Phantom sintetis — pengujian</option>
        </select>
      </div>
      {mode === "sample" ? (
        <CTLiverViewer
          onFiles={(f) => {
            if (f.length) {
              setFiles(f);
              setMode("dicom");
            }
          }}
        />
      ) : (
        <LegacyViewer
          key={mode}
          initialFiles={files}
          localOnly={mode === "dicom"}
        />
      )}
    </>
  );
}
