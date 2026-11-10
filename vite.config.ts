import { defineConfig } from "vitest/config";
import { cpSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  // Keep the verified 292 MB preparation source locally; deploy the real-volume preview.
  build: { copyPublicDir: false },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-deployable-public-assets",
      apply: "build",
      writeBundle(output) {
        cpSync(resolve("public"), resolve(output.dir || "dist"), {
          recursive: true,
          filter: (path) =>
            path !== resolve("public/demo/ct-liver/CTLiver.nrrd"),
        });
      },
    },
  ],
  resolve: { alias: { events: "events/", url: "url/" } },
  optimizeDeps: {
    exclude: ["@cornerstonejs/dicom-image-loader"],
    include: [
      "@cornerstonejs/codec-openjpeg/decodewasmjs",
      "@cornerstonejs/codec-openjph/wasmjs",
      "@cornerstonejs/codec-libjpeg-turbo-8bit/decodewasmjs",
      "@cornerstonejs/codec-charls/decodewasmjs",
    ],
  },
  worker: { format: "es" },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
