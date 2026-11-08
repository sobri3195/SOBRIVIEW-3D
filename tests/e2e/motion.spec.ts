import { test, expect, type Page } from "@playwright/test";
async function instrument(page: Page) {
  await page.addInitScript(() => {
    Reflect.set(window, "__motionDraws", 0);
    for (const proto of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype,
    ]) {
      const original = proto.drawElements;
      proto.drawElements = function (...args: Parameters<typeof original>) {
        Reflect.set(
          window,
          "__motionDraws",
          Reflect.get(window, "__motionDraws") + 1,
        );
        return original.apply(this, args);
      };
    }
  });
}
const draws = (page: Page) =>
  page.evaluate(() => Reflect.get(window, "__motionDraws") as number);
async function sample(page: Page, ms = 350) {
  return page.evaluate(
    (ms) =>
      new Promise<number>((resolve) =>
        setTimeout(() => resolve(Reflect.get(window, "__motionDraws")), ms),
      ),
    ms,
  );
}

test("3D motion settles, preserves the canvas on color changes, and honors live reduced motion", async ({
  page,
}) => {
  await instrument(page);
  await page.goto("/atlas");
  const canvas = page.locator(".scene canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(
      async () => {
        const before = await draws(page);
        return (await sample(page)) - before;
      },
      { timeout: 10000 },
    )
    .toBe(0);
  const initial = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.getByLabel("Camera view").selectOption("Back");
  await expect
    .poll(
      async () =>
        await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(initial);
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBe(0);
  const element = await canvas.elementHandle();
  await page.getByLabel("Structure color").fill("#22cc99");
  expect(await element!.evaluate((c) => c.isConnected)).toBe(true);
  await page
    .getByRole("button", { name: "Focus selected", exact: true })
    .click();
  await page.getByRole("button", { name: "Auto rotate", exact: true }).click();
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBe(0);
  await page
    .getByRole("link", { name: "Dashboard", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Explore human/ }),
  ).toBeVisible();
  expect(await element!.evaluate((c) => c.isConnected)).toBe(false);
});

test("automatic dashboard rotation stops when its viewer is offscreen", async ({
  page,
}) => {
  await instrument(page);
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto("/");
  await expect(page.locator(".scene canvas")).toBeVisible();
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBe(0);
  await page.evaluate(() => scrollTo(0, 0));
  await expect
    .poll(async () => {
      const before = await draws(page);
      return (await sample(page)) - before;
    })
    .toBeGreaterThan(0);
});

test("dialog entrance/exit and flashcards stay usable with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cases");
  await page.getByRole("button", { name: "New educational case" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "New educational case" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Motion remains interactive");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto("/learn");
  await page.getByLabel("Learning mode").selectOption("Flashcards");
  const card = page.locator(".flashcard");
  await card.click();
  await expect(card).toHaveAttribute("data-flipped", "true");
  await expect(page.locator(".explanation")).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute("data-flipped", "false");
  await expect(card.locator(".flashcard-inner")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});

test("mobile navigation can be closed with Escape and reopens cleanly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Anatomy Atlas", exact: true })
    .click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { name: "Anatomy, in perspective." }),
  ).toBeVisible();
});

test("page reveals release transforms for card hover interactions", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator(".quick-card").first();
  await expect.poll(() => card.evaluate((e) => e.style.transform)).toBe("");
  await card.hover();
  await expect
    .poll(() => card.evaluate((e) => getComputedStyle(e).transform))
    .toBe("matrix(1, 0, 0, 1, 0, -3)");
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.locator(".toast")).toHaveCount(0);
});
