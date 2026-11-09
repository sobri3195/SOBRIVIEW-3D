import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
const names = [
  "Liver surface",
  "Gallbladder",
  "Portal vein",
  "Hepatic veins",
  "Hepatic artery",
  "Hepatic bile ducts",
  "Cystic duct",
];
async function ready(page: Page) {
  await page.goto("/liver");
  await expect(page.locator('.liver-scene[data-state="ready"]')).toBeVisible();
  await expect(page.locator(".liver-scene canvas")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".liver-scene canvas")
        .evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBeGreaterThan(100);
}
const image = async (page: Page) =>
  createHash("sha256")
    .update(
      await page
        .locator(".liver-scene canvas")
        .evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .digest("hex");

test("local verified GLB survives direct liver refresh and exports an attributed render", async ({
  page,
  request,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/raw\.githubusercontent\.com/.test(r.url())) external.push(r.url());
  });
  const response = await request.get("/models/liver/liver.glb");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.length).toBe(5579432);
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "4059e94f415a765273e2f095c5fd2c68edbb761c932dfa9460f9893ee5b0decb",
  );
  await ready(page);
  await expect(page.getByLabel("Loaded structures")).toHaveText("7");
  await expect(page.locator(".structure-row")).toHaveCount(7);
  await expect(
    page.getByRole("button", { name: "Explode", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".info h2")).toHaveText("Liver surface");
  await page.reload();
  await expect(page.locator('.liver-scene[data-state="ready"]')).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "sobriview-liver-educational.png",
  );
  expect(external).toEqual([]);
});

test("all seven groups share list/mesh selection and independent display properties", async ({
  page,
}) => {
  await ready(page);
  for (const name of names) {
    await page
      .locator(".structure-list")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator(".info h2")).toHaveText(name);
  }
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Portal vein", exact: true })
    .click();
  await page.getByLabel("Opacity", { exact: true }).fill("0.42");
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Liver surface", exact: true })
    .click();
  await expect(page.getByLabel("Opacity", { exact: true })).toHaveValue("1");
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Portal vein", exact: true })
    .click();
  await expect(page.getByLabel("Opacity", { exact: true })).toHaveValue("0.42");
  await page.getByRole("button", { name: "Lihat di dalam" }).click();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  await expect(page.getByLabel("Toggle Liver surface")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Restore isolate" }).click();
  await expect(page.getByLabel("Toggle Liver surface")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Permukaan", exact: true }).click();
  // The panel still selects portal; clicking the visible tissue must pick liver.
  await page.locator(".liver-scene canvas").click({
    position: await page.locator(".liver-scene canvas").evaluate((c) => ({
      x: c.clientWidth * 0.46,
      y: c.clientHeight * 0.48,
    })),
  });
  await expect(page.locator(".info h2")).toHaveText("Liver surface");
  await expect(
    page.locator('[data-structure="liver"] button').first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Toggle Liver surface").click();
  await expect(page.getByLabel("Toggle Liver surface")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Show all structures" }).click();
  for (const name of names)
    await expect(
      page.getByLabel(`Toggle ${name}`, { exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
});

test("presets, camera directions, orbit, zoom, focus, fit and rotation change the real render", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const original = await image(page);
  for (const preset of ["Pembuluh", "Biliaris", "Semua struktur"]) {
    await page.getByRole("button", { name: preset, exact: true }).click();
    await expect.poll(() => image(page)).not.toBe(original);
  }
  await page.getByRole("button", { name: "Biliaris", exact: true }).click();
  await expect(page.getByLabel("Toggle Gallbladder")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Toggle Portal vein")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Reset / fit" }).click();
  for (const view of [
    "Posterior",
    "Kanan pasien",
    "Kiri pasien",
    "Superior",
    "Inferior",
  ]) {
    await page.getByLabel("Camera view").selectOption(view);
    await expect(page.locator(".viewport-label")).toContainText(
      view.toUpperCase(),
    );
    await expect.poll(() => image(page)).not.toBe(original);
  }
  await page.getByRole("button", { name: "Reset / fit" }).click();
  await expect.poll(() => image(page)).toBe(original);
  await page.locator(".liver-scene canvas").scrollIntoViewIfNeeded();
  const box = (await page.locator(".liver-scene canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 25,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect.poll(() => image(page)).not.toBe(original);
  const orbited = await image(page);
  await page.mouse.wheel(0, -150);
  await expect.poll(() => image(page)).not.toBe(orbited);
  const zoomed = await image(page);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    box.x + box.width / 2 + 100,
    box.y + box.height / 2 + 50,
    { steps: 8 },
  );
  await page.mouse.up({ button: "right" });
  await expect.poll(() => image(page)).not.toBe(zoomed);
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Gallbladder", exact: true })
    .click();
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  const beforeFocus = await image(page);
  await page.getByRole("button", { name: "Focus selected" }).click();
  await expect.poll(() => image(page)).not.toBe(beforeFocus);
  await page.getByRole("button", { name: "Reset / fit" }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Auto rotate", exact: true }).click();
  const beforeRotate = await image(page);
  await expect.poll(() => image(page)).not.toBe(beforeRotate);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test("model load failure disables 3D controls and retry recovers without placeholders", async ({
  page,
}) => {
  await page.route("**/models/liver/liver.glb", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html>SPA fallback</html>",
    }),
  );
  await page.goto("/liver");
  await expect(page.locator('.liver-scene[data-state="error"]')).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("GLB tidak valid");
  await expect(
    page.getByRole("button", { name: "Auto rotate", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("● Interactive 3D", { exact: true })).toHaveCount(
    0,
  );
  await page.unroute("**/models/liver/liver.glb");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator('.liver-scene[data-state="ready"]')).toBeVisible();
  await expect(page.getByLabel("Loaded structures")).toHaveText("7");
});

test("WebGL unavailable shows a real local 2D preview and disabled 3D tools", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof getContext>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("/liver");
  await expect(
    page.locator('.liver-scene[data-state="fallback"]'),
  ).toBeVisible();
  await expect(page.locator(".liver-placeholder strong")).toHaveText(
    "Tampilan 2D",
  );
  await expect
    .poll(() =>
      page
        .locator(".liver-placeholder img")
        .evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBe(1200);
  await expect(page.getByLabel("Loaded structures")).toHaveText("0");
  await expect(page.getByLabel("Camera view")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Focus selected" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export PNG" })).toHaveCount(0);
  await expect(page.getByText("● Interactive 3D", { exact: true })).toHaveCount(
    0,
  );
});

test("context loss uses 2D mode; leaving and reopening rebuilds the renderer", async ({
  page,
}) => {
  await ready(page);
  const canvas = await page.locator(".liver-scene canvas").elementHandle();
  await page.locator(".liver-scene canvas").evaluate((c) => {
    (c as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!
      .loseContext();
  });
  await expect(
    page.locator('.liver-scene[data-state="fallback"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Auto rotate", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Skema Couinaud" }).click();
  expect(await canvas!.evaluate((c) => c.isConnected)).toBe(false);
  await expect(
    page.getByText("Schematic learning model:", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Anatomi Hati" }).click();
  await expect(page.locator('.liver-scene[data-state="ready"]')).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("desktop fullscreen and mobile resize retain a usable viewer", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect
    .poll(() =>
      page.locator(".liver-scene canvas").evaluate((c) => c.clientWidth),
    )
    .toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".liver-scene canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pembuluh", exact: true }).click();
  await expect(page.getByLabel("Toggle Portal vein")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .locator(".structure-list")
    .getByRole("button", { name: "Portal vein", exact: true })
    .click();
  await expect(page.locator(".info h2")).toHaveText("Portal vein");
});

test("leaving liver releases GPU buffers and document listeners", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    Reflect.set(window, "__liverVisibilityListeners", listeners);
    Reflect.set(window, "__deletedLiverBuffers", 0);
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === document && type === "visibilitychange" && listener)
        listeners.add(listener);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === document && type === "visibilitychange" && listener)
        listeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
    const original = WebGL2RenderingContext.prototype.deleteBuffer;
    WebGL2RenderingContext.prototype.deleteBuffer = function (buffer) {
      Reflect.set(
        window,
        "__deletedLiverBuffers",
        Reflect.get(window, "__deletedLiverBuffers") + 1,
      );
      return original.call(this, buffer);
    };
  });
  const listeners = () =>
    page.evaluate(
      () =>
        (Reflect.get(window, "__liverVisibilityListeners") as Set<unknown>)
          .size,
    );
  await page.goto("/settings");
  await expect(page.locator("main h1")).toBeVisible();
  const baseline = await listeners(); // Vite HMR also owns a visibility listener in development.
  await page.locator('.sidebar a[href="/liver"]').click();
  await expect(page.locator('.liver-scene[data-state="ready"]')).toBeVisible();
  await expect.poll(listeners).toBe(baseline + 1);
  const buffers = await page.evaluate(
    () => Reflect.get(window, "__deletedLiverBuffers") as number,
  );
  await page.locator('.sidebar a[href="/settings"]').click();
  await expect(page.locator(".liver-scene")).toHaveCount(0);
  await expect.poll(listeners).toBe(baseline);
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "__deletedLiverBuffers") as number,
      ),
    )
    .toBeGreaterThan(buffers);
});
