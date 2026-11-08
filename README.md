# SOBRIVIEW 3D

Interactive Radiology, Anatomy & Medical Imaging Explorer. Developed by Muhammad Sobri Maulana.

A client-side educational workstation built with Vite, React, strict TypeScript, Three.js, Anime.js 4, Tailwind CSS, Lucide, Zustand, React Router and Cornerstone3D 4.22.13. No account, backend, paid API key or PACS is required.

**For education and research. Not validated for clinical diagnosis or treatment decisions.** The procedural atlas is schematic; it is not a patient reconstruction or validated organ atlas.

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
- Three.js procedural atlas: orbit, zoom, pan, six camera orientations, picking, visibility, isolation, opacity, rotation, fit/reset and educational PNG export. GPU resources, observers and controls are disposed on unmount.
- Motion: eased camera presets and focus, smooth layer/opacity/color changes, frame-rate-independent exploded views, staggered page reveals, reversible dialog/toast exits and flashcard flips. The 3D renderer sleeps when idle or offscreen and reacts immediately to system reduced-motion changes. Color and quality edits retain the current camera and WebGL canvas.
- Eight schematic Couinaud segment objects with selection, visibility, isolation and exploded layout. Geometry and arrangement are explicitly **not anatomically accurate**.
- Local multi-file/folder/drop DICOM import. Study/series grouping, SOP deduplication and slice sorting by patient position projected onto the orientation normal; InstanceNumber fallback for missing spatial metadata.
- Cornerstone stack rendering with scrolling, cine, window presets, window/level, pan, zoom, inversion, length, angle, rectangular/elliptical ROI and probe tools. Compatible single-frame DICOM encodings depend on the bundled loader. Metadata is interpreted by Cornerstone; verify source calibration before interpreting physical units.
- A deterministic 96³ synthetic volume, orthogonal reslicing, windowing, slice navigation, 1 mm calibrated demo distance measurement, undo/redo and annotation JSON export/import.
- Imported orthographic MPR for regular, geometrically consistent series of at least three slices. Single images use the stack viewer. Geometry/memory checks reject unsuitable inputs. MPR must be tested against real de-identified datasets before research use.
- Educational CaseLab templates and opt-in local notes, favorite, restore, delete and workspace JSON export.
- 52 local educational questions with explanations, randomized quizzes, topic filters, study/flashcard modes, bookmark and nonpersonal progress persistence/export.
- Versioned/validated preference storage, settings import/export, quota handling, asset cache clearing and app reset. Explicit opt-in anonymized DICOM caching uses IndexedDB.

## Known limitations / remaining brief items

This initial implementation does **not** complete the full product specification. In particular:

- Procedural spheres are schematic teaching objects, not licensed anatomical surface models. No validated liver atlas, vessel branching model, IVa/IVb boundaries or patient segmentation/registered mask import is supplied.
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
