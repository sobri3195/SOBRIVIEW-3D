// Render the actual local GLB through the application's renderer, never a placeholder.
// Start npm run dev first. Optionally set LIVER_PREVIEW_URL for another local server.
import { chromium } from "@playwright/test";
import { existsSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
    reducedMotion: "reduce",
  });
  await page.goto(
    process.env.LIVER_PREVIEW_URL || "http://127.0.0.1:5173/liver",
  );
  await page.locator('.liver-scene[data-state="ready"]').waitFor();
  // Let ResizeObserver apply the final canvas size and render the selected preset.
  await page.waitForFunction(() => {
    const c = document.querySelector(".liver-scene canvas");
    return c instanceof HTMLCanvasElement && c.width > 100 && c.height > 100;
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const data = await page.locator(".liver-scene canvas").evaluate((canvas) => {
    const c = canvas;
    const out = document.createElement("canvas");
    out.width = 1200;
    out.height = 1000;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#0b1422";
    ctx.fillRect(0, 0, 1200, 1000);
    const scale = Math.min(1200 / c.width, 910 / c.height);
    const w = c.width * scale,
      h = c.height * scale;
    ctx.drawImage(c, (1200 - w) / 2, (910 - h) / 2, w, h);
    ctx.fillStyle = "#dbe6ef";
    ctx.font = "15px sans-serif";
    ctx.fillText(
      "SOBRIVIEW · Model referensi edukasi · bukan rekonstruksi pasien",
      24,
      932,
    );
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.",
      24,
      956,
    );
    ctx.fillText(
      "Asset: github.com/organui/liver-3d · Reference surface / illustrative materials",
      24,
      978,
    );
    return out.toDataURL("image/webp", 0.9).split(",")[1];
  });
  writeFileSync(
    "public/models/liver/liver-preview.webp",
    Buffer.from(data, "base64"),
  );
  console.log("Rendered local model to public/models/liver/liver-preview.webp");
} finally {
  await browser.close();
}
