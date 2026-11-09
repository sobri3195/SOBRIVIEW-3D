# SOBRIVIEW 3D

Interactive Radiology, Anatomy & Medical Imaging Explorer. Developed by Muhammad Sobri Maulana.

A client-side educational workstation built with Vite, React, strict TypeScript, Three.js, Anime.js 4, Tailwind CSS, Lucide, Zustand, React Router and Cornerstone3D 4.22.13. No account, backend, paid API key or PACS is required.

**For education and research. Not validated for clinical diagnosis or treatment decisions.** The dashboard model and Couinaud scheme are schematic; it is not a patient reconstruction or validated organ atlas.

## Develop

Node.js 22.12+ (Node 24 is used in the cloud environment).

```sh
npm ci
npm run dev
```

Open the address printed by Vite in your local environment. Each cloud task already has an isolated checkout; use it directly rather than creating a worktree.

```sh
npm run lint
npm run test
npm run build
npm run test:e2e
# Validate the built static bundle instead of the development server:
E2E_PREVIEW=1 npm run test:e2e
```

Playwright uses `/usr/bin/chromium` when present, or its installed Chromium otherwise. Run `npx playwright install chromium` if needed. Set `CHROMIUM_PATH` to use another installed Chromium binary. Tests use software WebGL; production builds include DICOM decoder workers and WASM artifacts. First-time imaging module loading is substantial.

## Implemented workflows

- Responsive dashboard, sidebar/mobile navigation, dark/light themes, English/Indonesian organ names, reduced-motion support and lazy routes.
- BodyParts3D anatomy atlas: 13 reviewed UI groups covering 604 unique source meshes, local gzip assets, independent visibility, selection, hover, isolation/restore, focus, search/system filters, camera presets, rotation, fullscreen and attributed PNG export. Partial source anatomy is labelled. Individual opacity is explicitly disabled; use isolation to reveal internal structures.
- Motion: the dashboard/Couinaud renderer has eased camera presets, smooth layer/opacity/color changes and schematic exploded views; the reference atlas uses the documented Dagno camera controls with reduced-motion-aware auto rotation. Page reveals, reversible dialog/toast exits and flashcard flips remain available.
- Liver Lab opens a locally bundled BodyParts3D liver GLB with seven anatomical groups, independent display properties, vessel/biliary presets, patient-axis cameras, PNG export and a rendered 2D fallback. Attribution and source revision ship with the asset. A separate **Skema Couinaud** tab retains the eight schematic teaching objects; these are not validated anatomical boundaries.
- Local multi-file/folder/drop DICOM import. Study/series grouping, SOP deduplication and slice sorting by patient position projected onto the orientation normal; InstanceNumber fallback for missing spatial metadata.
- Cornerstone stack rendering with scrolling, cine, window presets, window/level, pan, zoom, inversion, length, angle, rectangular/elliptical ROI and probe tools. Compatible single-frame DICOM encodings depend on the bundled loader. Metadata is interpreted by Cornerstone; verify source calibration before interpreting physical units.
- A deterministic 96³ synthetic volume, orthogonal reslicing, windowing, slice navigation, 1 mm calibrated demo distance measurement, undo/redo and annotation JSON export/import.
- Imported orthographic MPR for regular, geometrically consistent series of at least three slices. Single images use the stack viewer. Geometry/memory checks reject unsuitable inputs. MPR must be tested against real de-identified datasets before research use.
- Educational CaseLab templates and opt-in local notes, favorite, restore, delete and workspace JSON export.
- 52 local educational questions with explanations, randomized quizzes, topic filters, study/flashcard modes, bookmark and nonpersonal progress persistence/export.
- Versioned/validated preference storage, settings import/export, quota handling, asset cache clearing and app reset. Explicit opt-in anonymized DICOM caching uses IndexedDB.

## Known limitations / remaining brief items

This initial implementation does **not** complete the full product specification. In particular:

- Dashboard spheres and the separate Couinaud scheme are schematic teaching objects. Liver anatomy uses a BodyParts3D reference subset with source seams and truncated vessel/duct branches; no clinically validated Couinaud boundaries, patient segmentation, or registered mask import is supplied.
- No automatic segmentation, diagnostic findings, patient sharing or claims of AI capability.
- No ZIP import, enhanced multiframe validation, PACS, drag-editable linked MPR crosshairs, volume rendering or MPR maximization.
- Synthetic crosshairs link voxel intersections between planes. Imported MPR planes share volume geometry but do not yet provide linked crosshair editing.
- Imported DICOM measurements remain in Cornerstone memory. Imported annotation persistence/export, freehand/arrow/text tools, annotation color editing are not implemented.
- DICOM files are not automatically anonymized. Headers and burned-in pixels may contain identifiers. Local browser storage is not encrypted. Anonymization must happen before opting into persistent caching. The cache manager supports clearing; cached-study restoration UI is not yet implemented.
- No collision-aware projected anatomy labels, whole-workspace import, navigation restoration, anatomical identification game or bespoke splash screen.
- Supported input geometry is intentionally conservative. Irregular spacing and inconsistent orientation are rejected for imported MPR. Large studies may exhaust browser/GPU memory; decoded MPR volumes are limited to 256 MB.
- Decoder dependencies emit build warnings for browser-externalized Node modules and large chunks. These are upstream dependencies; decoder compatibility is verified only for the included generated uncompressed CT fixture.

See `DATA_SOURCES.md` and `LICENSES.md` for provenance. Tests generate their own tiny CT phantom; no patient files or proprietary assets are committed.

## Vercel

Import this repository as a Vite project. Build with `npm run build`, output directory `dist`. `vercel.json` provides SPA routing fallback for direct links and refresh. No environment variables or secrets are required. Do not add secrets to `VITE_*` variables: those values are public client code.

## Privacy

Files are processed locally in the browser. No application upload endpoint exists. Only nonpatient preferences, educational notes and quiz results belong in localStorage (`sobriview:v1:*`). Optional anonymized binary caching uses IndexedDB after explicit consent. The software cannot verify that a study is anonymous. Use only appropriately de-identified educational data. Clear local caches on shared devices.

## Whole-body atlas assets

`@dagno/anatomy-model@0.1.2` supplies the locally bundled `public/anatomy/atlas.json` and all 15 gzip chunks. `npm run prepare:anatomy` verifies their pinned checksums and refreshes the assets before each build. `public/anatomy/SOBRIVIEW_SOURCE.md` records source revisions, scope and all 13 mappings; `SOURCE.json` holds exact hashes. The default preset hides the external obliques. Lung groups are source bronchial/vessel trees, not complete parenchymal surfaces; other partial groups are labelled.

The official `@dagno/anatomy-engine@0.2.0` manifest loader is paired with a documented MIT source extension under `src/vendor/anatomy-engine/` for exact group visibility, focus, capture, assembled hover and render culling. Three.js `0.186.1` matches its peer requirement. No private engine fields are accessed by the React adapter.

Run `node scripts/render-atlas-preview.mjs` while the development server runs to regenerate the attributed preview from the actual local atlas renderer. WebGL failure uses that local image with honest 2D status. The unit suite validates every geometry offset, vertex/index, coordinate bound, mapping and gzip contract.

## Liver asset verification

`public/models/liver/` bundles the GLB, manifest, source license and provenance from `organui/liver-3d` commit `528ee1794670d3bfa23d581f91ba49d6af585b03`. The unit suite verifies the binary SHA-256, seven actual node/extras/FMA mappings, geometry counts, shared normalization and camera framing. See `public/models/liver/SOBRIVIEW_SOURCE.md` for checksums, scope and modifications.

To regenerate the attributed 2D preview from the real model, start the development server, then run `node scripts/render-liver-preview.mjs`. Playwright uses system Chromium or `CHROMIUM_PATH`. This changes only `liver-preview.webp`; it never modifies the GLB.
