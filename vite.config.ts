import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
