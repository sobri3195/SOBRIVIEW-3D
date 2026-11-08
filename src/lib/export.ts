export function download(
  name: string,
  data: Blob | string,
  type = "application/json",
) {
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJSON(name: string, value: unknown) {
  download(name, JSON.stringify(value, null, 2));
}
export function screenshot(canvas: HTMLCanvasElement) {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height + 45;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#080d18";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.font = "14px sans-serif";
  ctx.fillText("SOBRIVIEW · EDUCATIONAL / NONCLINICAL", 12, out.height - 16);
  out.toBlob((blob) => {
    if (blob) download("sobriview-educational.png", blob);
  });
}
