/// <reference lib="webworker" />
import { parseNrrd } from "./nrrd";
import source from "../../public/demo/ct-liver/source.json";
const scope = self as unknown as DedicatedWorkerGlobalScope;
const controller = new AbortController();
scope.onmessage = async (
  event: MessageEvent<{ url: string; cancel?: boolean }>,
) => {
  if (event.data.cancel) {
    controller.abort();
    return;
  }
  try {
    const response = await fetch(event.data.url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`CT download failed (HTTP ${response.status}).`);
    const total = Number(response.headers.get("Content-Length")) || null;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Browser cannot stream CT data.");
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      scope.postMessage({ type: "progress", loaded, total });
    }
    if (loaded !== source.preview.bytes)
      throw new Error("CT example download is incomplete.");
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    if (!crypto.subtle)
      throw new Error("SHA-256 verification requires HTTPS or localhost.");
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    if (hash !== source.preview.sha256)
      throw new Error("CT example checksum mismatch.");
    scope.postMessage({ type: "decoding" });
    const volume = await parseNrrd(bytes.buffer, {
      id: source.id,
      title: source.title,
      attribution: source.attribution,
      space: "left-posterior-superior",
      license: source.license.name,
    });
    if (volume.dimensions.some((n, i) => n !== source.preview.dimensions[i]))
      throw new Error("CT dimensions do not match source record.");
    scope.postMessage({ type: "volume", volume }, [
      volume.scalarData.buffer as ArrayBuffer,
    ]);
  } catch (error) {
    if (!controller.signal.aborted)
      scope.postMessage({
        type: "error",
        message:
          error instanceof Error ? error.message : "CT could not be loaded.",
      });
  }
};
