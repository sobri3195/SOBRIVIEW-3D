import { test, expect } from "@playwright/test";
import { dicomFixture } from "../fixture";
test("dashboard, anatomy controls and screenshot export", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Explore human/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore anatomy", exact: false })
    .click();
  await expect(page.locator(".scene canvas")).toBeVisible();
  await page.getByLabel("Search anatomy").fill("kidney");
  await expect(page.locator(".structure-row")).toHaveCount(2);
  await page.locator(".structure-row button").first().click();
  await expect(page.locator(".info h2")).toHaveText("Left kidney");
  await page.getByRole("button", { name: "Isolate", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await download).suggestedFilename()).toBe(
    "sobriview-educational.png",
  );
});
test("liver segment selection and visibility", async ({ page }) => {
  await page.goto("/liver");
  await page.getByRole("tab", { name: "Skema Couinaud" }).click();
  await page
    .getByRole("button", { name: "II · Left lateral superior", exact: true })
    .click();
  await expect(page.locator(".info h2")).toHaveText(
    "II · Left lateral superior",
  );
  await page
    .getByRole("button", {
      name: "Toggle II · Left lateral superior",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Explode", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Assemble", exact: true }),
  ).toBeVisible();
});
test("quiz completion and settings restoration", async ({ page }) => {
  await page.goto("/learn");
  for (let i = 0; i < 10; i++) {
    await page.locator(".answers button").first().click();
    await page
      .getByRole("button", {
        name: i === 9 ? "Finish session" : "Next question →",
      })
      .click();
  }
  await expect(page.getByText("SESSION COMPLETE")).toBeVisible();
  await page.goto("/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await page.reload();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("light");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light");
});
test("mobile navigation has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "CT Explorer" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Explore every slice." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "CaseLab" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your research workspace." }),
  ).toBeVisible();
});
test("synthetic MPR and measurement workflow", async ({ page }) => {
  await page.goto("/mpr");
  await expect(page.locator(".phantom canvas")).toHaveCount(3);
  await page.getByLabel("Coronal position", { exact: true }).fill("60");
  await expect(
    page.getByLabel("Coronal position", { exact: true }),
  ).toHaveValue("60");
  await page.getByLabel("Imaging tool").selectOption("Length");
  const canvas = page.locator(".phantom canvas").first();
  await canvas.click({ position: { x: 100, y: 100 } });
  await canvas.click({ position: { x: 150, y: 150 } });
  await expect(page.locator(".imaging-grid aside li")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".imaging-grid aside li")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator(".imaging-grid aside li")).toHaveCount(1);
});
test("educational workspace persistence", async ({ page }) => {
  await page.goto("/cases");
  await page.getByRole("button", { name: "New educational case" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Synthetic study");
  await page.getByLabel(/I confirm this contains/).check();
  await page
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Synthetic study", exact: true }),
  ).toBeVisible();
});
test("DICOM decoder renders generated local CT stack", async ({ page }) => {
  const errors: string[] = [];
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method())) uploads.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/viewer");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(
      [0, 1, 2].map((s) => ({
        name: `phantom-${s}.dcm`,
        mimeType: "application/dicom",
        buffer: Buffer.from(dicomFixture(s)),
      })),
    );
  await expect(page.locator(".cornerstone-host canvas")).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByText("Initializing local DICOM decoder…")).toHaveCount(
    0,
    { timeout: 60000 },
  );
  await expect(page.getByText(/Unable to render this series/)).toHaveCount(0);
  await page.getByLabel("Slice", { exact: true }).fill("2");
  await expect(page.getByLabel("Slice", { exact: true })).toHaveValue("2");
  await expect
    .poll(() =>
      page.locator(".cornerstone-host canvas").evaluate((canvas) => {
        const c = canvas as HTMLCanvasElement;
        const ctx = c.getContext("2d")!;
        const center = ctx.getImageData(
          Math.floor(c.width / 2),
          Math.floor(c.height / 2),
          1,
          1,
        ).data;
        const corner = ctx.getImageData(0, 0, 1, 1).data;
        return center[0] !== corner[0];
      }),
    )
    .toBe(true);
  expect(errors).toEqual([]);
  expect(uploads).toEqual([]);
});

test("imported MPR reconstructs a coherent generated CT volume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/mpr");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(
      Array.from({ length: 6 }, (_, s) => ({
        name: `volume-${s}.dcm`,
        mimeType: "application/dicom",
        buffer: Buffer.from(dicomFixture(s)),
      })),
    );
  await expect(page.locator(".volume-host canvas")).toHaveCount(3, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "Next slice", exact: true }).first(),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByRole("button", { name: "Next slice", exact: true })
    .first()
    .click();
  await expect(page.getByText(/MPR unavailable:/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("linked synthetic crosshair updates the other planes", async ({
  page,
}) => {
  await page.goto("/mpr");
  await page.getByLabel("Imaging tool").selectOption("Crosshair");
  await page
    .locator(".phantom canvas")
    .first()
    .click({ position: { x: 100, y: 100 } });
  await expect(
    page.getByLabel("Coronal position", { exact: true }),
  ).not.toHaveValue("48");
  await expect(
    page.getByLabel("Sagittal position", { exact: true }),
  ).not.toHaveValue("48");
});
test("demo annotations import validates dataset coordinates", async ({
  page,
}) => {
  await page.goto("/viewer");
  await page.getByLabel("Dataset", { exact: true }).selectOption("phantom");
  const doc = {
    version: 1,
    dataset: "synthetic-phantom",
    measurements: [
      {
        id: "demo-1",
        points: [
          [20, 20],
          [30, 30],
        ],
        plane: "Axial",
        slice: 48,
      },
    ],
  };
  await page
    .getByText("Import demo annotations", { exact: true })
    .locator("input")
    .setInputFiles({
      name: "annotations.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(doc)),
    });
  await expect(page.locator(".imaging-grid aside li")).toHaveCount(1);
  await expect(page.locator(".imaging-grid aside li")).toContainText("14.14");
});
