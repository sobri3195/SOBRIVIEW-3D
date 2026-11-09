import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const source: { files: Record<string, { bytes: number; sha256: string }> } =
  JSON.parse(readFileSync("public/anatomy/SOURCE.json", "utf8"));
async function ready(page: Page) {
  await page.goto("/atlas");
  await expect(page.locator('.atlas-scene[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(1);
}
const image = async (page: Page) =>
  createHash("sha256")
    .update(
      await page
        .locator(".atlas-scene canvas")
        .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .digest("hex");

test("atlas loads real local gzip assets, paints anatomy and survives a direct refresh", async ({
  page,
  request,
}) => {
  const errors: string[] = [],
    remote: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (/raw\.githubusercontent|unpkg|jsdelivr/.test(r.url()))
      remote.push(r.url());
  });
  for (const [name, meta] of Object.entries(source.files)) {
    const response = await request.get(`/anatomy/${name}`);
    expect(response.ok(), name).toBe(true);
    const bytes = await response.body();
    if (name.endsWith(".gz") && !(bytes[0] === 0x1f && bytes[1] === 0x8b)) {
      // Vite serves gzip with Content-Encoding; fetch/Playwright already decode it.
      expect(
        bytes.equals(gunzipSync(readFileSync(`public/anatomy/${name}`))),
      ).toBe(true);
    } else {
      expect(bytes.length).toBe(meta.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        meta.sha256,
      );
    }
  }
  await ready(page);
  await expect(page.locator(".skip-link")).toHaveCSS("clip-path", "inset(50%)");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await expect(page.locator(".skip-link")).toHaveCSS("clip-path", "none");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toHaveCSS("clip-path", "inset(50%)");
  await expect(page.locator(".structure-row")).toHaveCount(13);
  await expect(page.locator(".viewer-status")).toContainText("Anatomi 3D siap");
  const fraction = await page.locator(".atlas-scene canvas").evaluate((c) => {
    const canvas = c as HTMLCanvasElement,
      out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(canvas, 0, 0);
    const data = ctx.getImageData(0, 0, out.width, out.height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] > 45 || data[i + 1] > 55 || data[i + 2] > 65) colored++;
    return colored / (out.width * out.height);
  });
  expect(fraction).toBeGreaterThan(0.02);
  await page.reload();
  await expect(page.locator('.atlas-scene[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});

test("13 groups have honest scope; search and system filters control the render", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator('[data-structure="lung-left"]')).toContainText(
    "Sebagian",
  );
  await page.locator('[data-structure="muscle"] button').first().click();
  await expect(page.locator(".info h2")).toHaveText("Abdominal wall");
  await expect(page.locator(".info")).toContainText("external oblique");
  await expect(page.getByLabel("Opacity", { exact: true })).toBeDisabled();
  await page.getByLabel("Organ system").selectOption("Urinary");
  await expect(page.locator(".structure-row")).toHaveCount(3);
  const allUrinary = await image(page);
  await page.getByLabel("Search anatomy").fill("left kidney");
  await expect(page.locator(".structure-row")).toHaveCount(1);
  await expect.poll(() => image(page)).not.toBe(allUrinary);
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Left kidney", exact: true })
    .click();
  await expect(page.locator(".info h2")).toHaveText("Left kidney");
  const handle = await page.locator(".atlas-scene canvas").elementHandle();
  await page.getByRole("button", { name: "Show all structures" }).click();
  await expect(page.locator(".structure-row")).toHaveCount(13);
  expect(await handle!.evaluate((c) => c.isConnected)).toBe(true);
});

test("selection, hover, hide/show, isolate/restore, focus, presets and PNG export work", async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-structure="kidney-right"] button').first().click();
  await page.getByLabel("Search anatomy").fill("left kidney");
  await page.locator(".atlas-scene canvas").scrollIntoViewIfNeeded();
  const canvas = page.locator(".atlas-scene canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page.locator(".atlas-scene .scene")).toHaveAttribute(
    "title",
    "Left kidney",
  );
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  await expect(page.locator(".info h2")).toHaveText("Left kidney");
  await expect(
    page.locator('[data-structure="kidney-left"] button').first(),
  ).toHaveAttribute("aria-pressed", "true");
  const shown = await image(page);
  await page.getByLabel("Toggle Left kidney", { exact: true }).click();
  await expect.poll(() => image(page)).not.toBe(shown);
  await page.getByRole("button", { name: "Show all structures" }).click();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  await expect(
    page.getByLabel("Toggle Brain", { exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Focus selected" }).click();
  await page.getByRole("button", { name: "Restore isolate" }).click();
  await expect(
    page.getByLabel("Toggle Brain", { exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Organ utama", exact: true }).click();
  await expect(
    page.getByLabel("Toggle Abdominal wall", { exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Konteks tubuh", exact: true })
    .click();
  await expect(
    page.getByLabel("Toggle Abdominal wall", { exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "sobriview-educational.png",
  );
});

test("camera presets and orbit/zoom/pan change the rendered anatomy", async ({
  page,
}) => {
  await ready(page);
  const front = await image(page);
  await page.getByLabel("Camera view").selectOption("back");
  await expect.poll(() => image(page)).not.toBe(front);
  await page.getByRole("button", { name: "Reset / fit" }).click();
  await expect(page.getByLabel("Camera view")).toHaveValue("three-quarter");
  await page.locator(".atlas-scene canvas").scrollIntoViewIfNeeded();
  const box = (await page.locator(".atlas-scene canvas").boundingBox())!;
  const before = await image(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect.poll(() => image(page)).not.toBe(before);
  const orbited = await image(page);
  await page.mouse.wheel(0, -150);
  await expect.poll(() => image(page)).not.toBe(orbited);
  const zoomed = await image(page);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    box.x + box.width / 2 + 120,
    box.y + box.height / 2 + 60,
    { steps: 8 },
  );
  await page.mouse.up({ button: "right" });
  await expect.poll(() => image(page)).not.toBe(zoomed);
});

test("rotation, fullscreen and mobile panels remain usable", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Auto rotate", exact: true }).click();
  const rotating = await image(page);
  await expect.poll(() => image(page)).not.toBe(rotating);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect
    .poll(() =>
      page.locator(".atlas-scene canvas").evaluate((c) => c.clientWidth),
    )
    .toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".structures > summary").click();
  await expect(page.locator(".body-atlas .structures")).not.toHaveAttribute(
    "open",
  );
  await page.locator(".info > summary").click();
  await expect(page.locator(".body-atlas .info")).not.toHaveAttribute("open");
  await expect(page.locator(".atlas-scene canvas")).toBeVisible();
});

test("a truncated chunk reports failure without a false 3D badge and retry recovers", async ({
  page,
}) => {
  await page.route("**/anatomy/body-0.bin.gz", (r) =>
    r.fulfill({
      status: 200,
      body: "<html>SPA fallback</html>",
      contentType: "text/html",
    }),
  );
  await page.goto("/atlas");
  await expect(page.locator('.atlas-scene[data-state="error"]')).toBeVisible();
  await expect(page.locator(".atlas-placeholder")).toContainText(
    "Gagal memuat aset",
  );
  await expect(
    page.getByRole("button", { name: "Auto rotate", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("● Interactive 3D", { exact: false }),
  ).toHaveCount(0);
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(0);
  await page.unroute("**/anatomy/body-0.bin.gz");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator('.atlas-scene[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(1);
});

test("missing WebGL shows an actual same-model 2D preview and disables 3D tools", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/atlas");
  await expect(
    page.locator('.atlas-scene[data-state="fallback"]'),
  ).toBeVisible();
  await expect(page.locator(".atlas-placeholder")).toContainText("Tampilan 2D");
  await expect
    .poll(() =>
      page
        .locator(".atlas-placeholder img")
        .evaluate((i) => (i as HTMLImageElement).naturalWidth),
    )
    .toBe(1000);
  await expect(page.getByLabel("Camera view")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export PNG" })).toHaveCount(0);
});

test("context loss releases the renderer and retry rebuilds exactly one canvas", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator(".atlas-scene canvas")
    .evaluate((c) =>
      (c as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context")!
        .loseContext(),
    );
  await expect(
    page.locator('.atlas-scene[data-state="fallback"]'),
  ).toBeVisible();
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator('.atlas-scene[data-state="ready"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(1);
});

test("leaving atlas deletes GPU buffers and pending loads cannot resurrect a canvas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.set(window, "__atlasDeletedBuffers", 0);
    const original = WebGL2RenderingContext.prototype.deleteBuffer;
    WebGL2RenderingContext.prototype.deleteBuffer = function (buffer) {
      Reflect.set(
        window,
        "__atlasDeletedBuffers",
        Reflect.get(window, "__atlasDeletedBuffers") + 1,
      );
      return original.call(this, buffer);
    };
  });
  await ready(page);
  const before = await page.evaluate(
    () => Reflect.get(window, "__atlasDeletedBuffers") as number,
  );
  await page.locator('.sidebar a[href="/settings"]').click();
  await expect(page.locator(".atlas-scene canvas")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "__atlasDeletedBuffers") as number,
      ),
    )
    .toBeGreaterThan(before);
  await page.route("**/anatomy/body-*.bin.gz", (r) => r.abort());
  await page.locator('.sidebar a[href="/atlas"]').click();
  await page.locator('.sidebar a[href="/settings"]').click();
  await expect(page.locator(".atlas-scene")).toHaveCount(0);
});
