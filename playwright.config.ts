import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
const production = process.env.E2E_PREVIEW === "1";
const baseURL = production ? "http://127.0.0.1:5174" : "http://127.0.0.1:5173";
export default defineConfig({
  timeout: 90000,
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: production
      ? "npm run preview -- --host 127.0.0.1 --port 5174"
      : "npm run dev -- --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
