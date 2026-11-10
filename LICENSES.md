# Licenses and attribution

SOBRIVIEW 3D — Developed by Muhammad Sobri Maulana, © 2026.

No project-wide redistribution license is selected in this initial implementation; the repository owner should choose one. Do not assume the application's original source is MIT licensed merely because its dependencies are.

Original procedural meshes, SVG branding, mathematical phantom and quiz wording were created for this project. No proprietary assets or private user datasets are bundled. The licensed public reference assets and public CT sample are attributed separately below.

The bundled liver reference model and its rendered WebP/PNG images retain **CC BY 4.0** terms: “BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.” The asset packager is https://github.com/organui/liver-3d. Complete source notices, the upstream license discrepancy and integration modifications are recorded in `public/models/liver/LICENSE.txt`, `MODEL_PROVENANCE.md`, and `SOBRIVIEW_SOURCE.md`. Application code licensing does not replace these asset terms.

The whole-body atlas also bundles BodyParts3D under **CC BY 4.0**, prepared by Human Atlas / Dagno. Its original legal notice and attribution ship in `public/anatomy/LICENSE` and `ATTRIBUTION.md`. Source revisions, hashes, partial group definitions and rendering adaptations are recorded in that directory. The extended Dagno renderer retains the MIT copyright notice in `src/vendor/anatomy-engine/LICENSE` and the deployed `public/anatomy/ENGINE_LICENSE.txt`. Model licensing is independent of engine/application code licensing.

The CTLiver public example is Medical Segmentation Decathlon Task03_Liver data distributed through 3D Slicer, under **CC BY-SA 4.0**. Its resampled volume and exported CT images retain that license and source attribution. See `public/demo/ct-liver/ATTRIBUTION.md`, `LICENSE.md`, and `source.json` for the original checksum, sampling adaptations and license links. Slicer's software license does not replace the data license; neither do the application's other asset licenses.

Major dependencies retain their upstream licenses:

| Dependency                                | Upstream license |
| ----------------------------------------- | ---------------- |
| React / React DOM                         | MIT              |
| Vite                                      | MIT              |
| TypeScript                                | Apache-2.0       |
| Three.js                                  | MIT              |
| Anime.js                                  | MIT              |
| Tailwind CSS                              | MIT              |
| Lucide                                    | ISC              |
| Zustand                                   | MIT              |
| React Router                              | MIT              |
| Cornerstone3D core / tools / DICOM loader | MIT              |
| dicom-parser                              | MIT              |
| Vitest                                    | MIT              |
| Playwright                                | Apache-2.0       |

Transitive packages, codecs, WASM and vtk.js retain their own notices in installed package distributions. Consult each package's LICENSE file and the committed lockfile before redistribution. OpenStax is a reference source (CC BY 4.0); no OpenStax artwork is distributed. See DATA_SOURCES.md.
