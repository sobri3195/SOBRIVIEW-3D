// Start the development server first. This renders the real local anatomy dataset.
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
    process.env.ATLAS_PREVIEW_URL || "http://127.0.0.1:5173/atlas",
  );
  await page
    .locator('.atlas-scene[data-state="ready"]')
    .waitFor({ timeout: 60000 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const data = await page.locator(".atlas-scene canvas").evaluate((c) => {
    const out = document.createElement("canvas");
    out.width = 1000;
    out.height = 1200;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#0b1422";
    ctx.fillRect(0, 0, 1000, 1200);
    const scale = Math.min(1000 / c.width, 1120 / c.height),
      w = c.width * scale,
      h = c.height * scale;
    ctx.drawImage(c, (1000 - w) / 2, (1120 - h) / 2, w, h);
    ctx.fillStyle = "#dbe6ef";
    ctx.font = "14px sans-serif";
    ctx.fillText("SOBRIVIEW · Model anatomi referensi untuk edukasi", 20, 1142);
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0.",
      20,
      1165,
    );
    ctx.fillText(
      "Prepared by Human Atlas / Dagno · Illustrative colors · Not patient reconstruction",
      20,
      1186,
    );
    return out.toDataURL("image/webp", 0.9).split(",")[1];
  });
  writeFileSync(
    "public/anatomy/atlas-preview.webp",
    Buffer.from(data, "base64"),
  );
  console.log(
    "Rendered same-model preview to public/anatomy/atlas-preview.webp",
  );
} finally {
  await browser.close();
}
