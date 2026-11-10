import { test, expect, type Page, type Route } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const source = JSON.parse(
  readFileSync("public/demo/ct-liver/source.json", "utf8"),
);
const preview = readFileSync("public/demo/ct-liver/CTLiver-preview.nrrd");
const offset = preview.indexOf("\n\n") + 2,
  plain = gunzipSync(preview.subarray(offset));
const voxels = new Float32Array(
  plain.buffer,
  plain.byteOffset,
  plain.length / 4,
);
async function ready(page: Page) {
  await page.goto("/viewer");
  await expect(page.locator('.ct-workspace[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
}
const image = async (page: Page) =>
  createHash("sha256")
    .update(
      await page
        .locator(".ct-slice canvas")
        .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .digest("hex");

test("default CT is a verified local float volume with real geometry and different first/middle/last slices", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const asset = await request.get("/demo/ct-liver/CTLiver-preview.nrrd");
  expect(asset.ok()).toBe(true);
  const bytes = await asset.body();
  expect(bytes.subarray(0, 8).toString()).toBe("NRRD0004");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    source.preview.sha256,
  );
  await ready(page);
  await expect(page.getByLabel("Dataset", { exact: true })).toHaveValue(
    "sample",
  );
  await expect(page.locator(".ct-properties")).toContainText("256 × 256 × 343");
  await expect(page.locator(".ct-properties")).toContainText(
    "1.398438 × 1.398438 × 1.400000",
  );
  await expect(page.locator(".notice").first()).toContainText(
    "Medical Segmentation Decathlon / 3D Slicer",
  );
  await expect(page.locator(".ct-orientation.top")).toHaveText("A");
  await expect(page.locator(".ct-orientation.left")).toHaveText("R");
  await expect(page.locator(".ct-orientation.right")).toHaveText("L");
  const hashes = [];
  for (const slice of [0, 171, 342]) {
    await page.getByLabel("Slice", { exact: true }).fill(String(slice));
    hashes.push(await image(page));
  }
  expect(new Set(hashes).size).toBe(3);
  await page.reload();
  await expect(page.locator('.ct-workspace[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("220");
  expect(errors).toEqual([]);
});

test("window/level, scrolling, zoom, pan, invert and reset operate on the CT viewport", async ({
  page,
}) => {
  await ready(page);
  const initial = await image(page);
  await page.getByLabel("Window preset").selectOption("Bone");
  await expect.poll(() => image(page)).not.toBe(initial);
  await page.getByLabel("Window width", { exact: true }).fill("600");
  await expect(page.getByLabel("Window preset")).toHaveValue("Custom");
  await page.getByLabel("Window level", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Reset viewport" }).click();
  await page.locator(".ct-slice canvas").scrollIntoViewIfNeeded();
  const box = (await page.locator(".ct-slice canvas").boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.getByLabel("Imaging tool").selectOption("WindowLevel");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 20, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel("Window width", { exact: true })).toHaveValue(
    "520",
  );
  await expect(page.getByLabel("Window level", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByRole("button", { name: "Reset viewport" }).click();
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 100);
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("221");
  await page.getByRole("button", { name: "Next slice", exact: true }).click();
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("222");
  await page
    .getByRole("button", { name: "Previous slice", exact: true })
    .click();
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("221");
  const before = await image(page);
  await page.getByRole("button", { name: "Invert", exact: true }).click();
  await expect.poll(() => image(page)).not.toBe(before);
  await page.getByRole("button", { name: "Reset viewport" }).click();
  await page.getByLabel("Zoom", { exact: true }).fill("1.5");
  const zoomed = await image(page);
  await page.getByLabel("Imaging tool").selectOption("Pan");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45, y + 30, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => image(page)).not.toBe(zoomed);
  await page.getByRole("button", { name: "Reset viewport" }).click();
  await expect(page.getByLabel("Zoom", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Window width", { exact: true })).toHaveValue(
    "400",
  );
});

test("probe reads original voxels, physical length and history persist in dataset-scoped exports", async ({
  page,
}, testInfo) => {
  await ready(page);
  await page.locator(".ct-slice canvas").scrollIntoViewIfNeeded();
  const c = page.locator(".ct-slice canvas"),
    box = (await c.boundingBox())!;
  const physicalScale =
    0.94 *
    Math.min(
      box.width / (256 * source.preview.spacing[0]),
      box.height / (256 * source.preview.spacing[1]),
    );
  await c.click({ position: { x: box.width / 2 - 60, y: box.height / 2 } });
  const text = await page.getByLabel("Voxel probe").textContent();
  const m = text!.match(/Voxel (\d+), (\d+), (\d+) · (-?[\d.]+) Intensity/)!;
  expect(m).not.toBeNull();
  const [i, j, k] = m.slice(1, 4).map(Number);
  expect(i).toBeGreaterThan(128);
  expect(Number(m[4])).toBeCloseTo(voxels[(k * 256 + j) * 256 + i], 2);
  await page.getByLabel("Imaging tool").selectOption("Length");
  await c.click({ position: { x: box.width / 2 - 30, y: box.height / 2 } });
  await c.click({ position: { x: box.width / 2 + 30, y: box.height / 2 } });
  await expect(page.locator(".ct-properties li")).toHaveCount(1);
  const length = Number(
    (await page.locator(".ct-properties li").innerText()).split(" mm")[0],
  );
  expect(length).toBeCloseTo(60 / physicalScale, 1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".ct-properties li")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".ct-properties li")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete measurement" }).click();
  await expect(page.locator(".ct-properties li")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".ct-properties li")).toHaveCount(1);
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export annotations", exact: true })
    .click();
  const file = await event;
  const path = testInfo.outputPath("annotations.json");
  await file.saveAs(path);
  const doc = JSON.parse(readFileSync(path, "utf8"));
  expect(doc.dataset).toBe(source.id);
  expect(doc.dimensions).toEqual([256, 256, 343]);
  expect(doc.measurements[0].points[0][2]).toBe(220);
  await page
    .getByText("Import CT annotations", { exact: true })
    .locator("input")
    .setInputFiles({
      name: "foreign.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          dataset: "synthetic-phantom",
          measurements: [],
        }),
      ),
    });
  await expect(page.getByRole("alert")).toContainText("different dataset");
  await expect(page.locator(".ct-properties li")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete measurement" }).click();
  await page
    .getByText("Import CT annotations", { exact: true })
    .locator("input")
    .setInputFiles(path);
  await expect(page.locator(".ct-properties li")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  expect((await png).suggestedFilename()).toBe(
    "sobriview-ctliver-cc-by-sa.png",
  );
});

test("cine advances genuine slices, stops on source change and never imports phantom annotations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const timers = new Set<number>();
    Reflect.set(window, "__ctCineTimers", timers);
    const start = window.setInterval.bind(window),
      stop = window.clearInterval.bind(window);
    window.setInterval = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      const id = start(handler, delay, ...args);
      if (delay === 140) timers.add(id);
      return id;
    }) as typeof window.setInterval;
    window.clearInterval = (id) => {
      if (typeof id === "number") timers.delete(id);
      stop(id);
    };
  });
  const timers = () =>
    page.evaluate(
      () => (Reflect.get(window, "__ctCineTimers") as Set<number>).size,
    );
  await ready(page);
  await page.getByRole("button", { name: "Cine", exact: true }).click();
  await expect(page.getByLabel("Slice", { exact: true })).not.toHaveValue(
    "220",
  );
  await page.getByRole("button", { name: "Cine", exact: true }).click();
  const paused = await page.getByLabel("Slice", { exact: true }).inputValue();
  await expect(
    page.getByRole("button", { name: "Cine", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect.poll(timers).toBe(0);
  await page.waitForTimeout(350);
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue(paused);
  const crossBefore = await image(page);
  await page.getByLabel("Show crosshair").check();
  await expect.poll(() => image(page)).not.toBe(crossBefore);
  await page.getByRole("button", { name: "Cine", exact: true }).click();
  await expect.poll(timers).toBe(1);
  await page.getByLabel("Dataset", { exact: true }).selectOption("phantom");
  await expect(page.locator(".phantom canvas")).toBeVisible();
  await expect(page.locator(".ct-slice")).toHaveCount(0);
  await expect.poll(timers).toBe(0);
  await page.getByLabel("Dataset", { exact: true }).selectOption("sample");
  await expect(page.locator('.ct-workspace[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("220");
  await expect(
    page.getByRole("button", { name: "Cine", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".ct-properties li")).toHaveCount(0);
  await expect.poll(timers).toBe(0);
});

test("failed CT download stays an error, never a phantom, and retry recovers", async ({
  page,
}) => {
  await page.route("**/demo/ct-liver/CTLiver-preview.nrrd", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html>SPA fallback</html>",
    }),
  );
  await page.goto("/viewer");
  await expect(page.locator('.ct-workspace[data-state="error"]')).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("CT contoh gagal dimuat");
  await expect(page.locator(".phantom canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cine", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/demo/ct-liver/CTLiver-preview.nrrd");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator('.ct-workspace[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
});

test("switching away discards an in-flight worker and local DICOM mode has no synthetic fallback", async ({
  page,
}) => {
  let pending: Route | undefined;
  await page.route("**/demo/ct-liver/CTLiver-preview.nrrd", (r) => {
    pending = r;
  });
  await page.goto("/viewer");
  await expect.poll(() => !!pending).toBe(true);
  await page.getByLabel("Dataset", { exact: true }).selectOption("dicom");
  // A terminated worker may have already aborted the intercepted request.
  await pending!.fulfill({ status: 200, body: preview }).catch(() => {});
  await expect(page.locator(".ct-empty")).toContainText("DICOM lokal");
  await expect(page.locator(".phantom canvas")).toHaveCount(0);
  await expect(page.locator(".ct-workspace")).toHaveCount(0);
  await page.getByLabel("Dataset", { exact: true }).selectOption("phantom");
  await expect(page.locator(".phantom canvas")).toBeVisible();
  await expect(page.locator(".ct-workspace")).toHaveCount(0);
});

test("mobile CT fits without overflow and controls remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Slice", { exact: true }).fill("171");
  await expect(page.locator(".viewport-label")).toContainText("172 / 343");
  await page.getByLabel("Window preset").selectOption("Liver");
  await expect(page.getByLabel("Window width", { exact: true })).toHaveValue(
    "150",
  );
  await expect(page.locator(".skip-link")).toHaveCSS("clip-path", "inset(50%)");
  await expect(page.locator(".ct-slice canvas")).toBeVisible();
});
