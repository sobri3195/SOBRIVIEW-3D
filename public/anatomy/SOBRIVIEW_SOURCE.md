# SOBRIVIEW whole-body atlas source and scope

BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0.

Model package: `@dagno/anatomy-model@0.1.2`.
Source: https://github.com/dagno-labs/anatomy-model/tree/d3b47239f1038041bb550a1cfb6bfe40a62c4970
Engine: `@dagno/anatomy-engine@0.2.0`, source revision `1102b731bfc060eddce6abded22366ed6f4a65a7`, Three.js `0.186.1`.

The npm package manifest, LICENSE and ATTRIBUTION.md were byte-compared with that model commit. `SOURCE.json` records byte counts and SHA-256 for the manifest, all 15 chunks and both legal notices. The npm lockfile additionally pins registry package integrity. All model files are bundled under this directory and served from the application's origin; no runtime GitHub model request is made.

Run `npm run prepare:anatomy` to verify and refresh these assets from the pinned npm package. The script also runs before every build, rejects unreviewed checksums and verifies each gzip stream against the manifest's uncompressed byte size. Do not attach a Content-Encoding header manually: these are static gzip files. The loader checks the gzip magic and also accepts a response already decompressed by the browser, without double decompression.

## Explicit UI mapping

The authoritative application mapping is `src/features/body-atlas/structures.json`: verified source concept IDs/names, exact unique mesh IDs, display names, systems, colors, availability and scope. Runtime validates the mapping against the loaded manifest and disables any unresolved structure. All 13 entries map to **604 distinct source meshes**:

| UI structure     | Source concept(s) | Meshes | Scope                                                                                                                                              |
| ---------------- | ----------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brain            | FMA50801          |     59 | Source brain regions, white matter, ventricles and pineal body. Source system tags for ventricles include cardiac; the UI uses concept membership. |
| Left lung        | FMA7310           |    124 | Partial: bronchial/pulmonary vessel trees; no parenchymal surface.                                                                                 |
| Right lung       | FMA7309           |    156 | Partial: bronchial/pulmonary vessel trees; no parenchymal surface.                                                                                 |
| Heart            | FMA7088           |     83 | Partial: chambers, valves, atrial walls, papillary muscles, coronary vessels; not a seamless myocardial shell.                                     |
| Liver            | FMA7197           |     60 | Tissue, vessels and ducts in this dataset only; not the separate Liver Lab asset.                                                                  |
| Stomach          | FMA7148           |      1 | Source stomach.                                                                                                                                    |
| Left kidney      | FMA7205           |      1 | FJ3145; positive x is patient-left.                                                                                                                |
| Right kidney     | FMA7204           |      1 | FJ3147; negative x is patient-right.                                                                                                               |
| Intestinal tract | FMA7200 + FMA7201 |     63 | Partial: union of small/large intestinal source regions, taeniae and ileocecal junction; shared FJ2599 deduplicated.                               |
| Urinary bladder  | FMA15900          |      1 | Source bladder.                                                                                                                                    |
| Vertebral column | FMA13478          |     48 | Vertebrae and associated components of the source column concept.                                                                                  |
| Aorta            | FMA3734           |      5 | Source aortic parts.                                                                                                                               |
| Abdominal wall   | FMA14627          |      2 | Partial: FJ1452/FJ1452M, external oblique muscles only. Not rectus abdominis, transversus, or skin.                                                |

No entry is currently unresolved. “Available” means a mapped group exists, not that all anatomical variants/components are represented. The full deployed dataset retains all 2,234 source meshes and 3,432 concepts. Only the reviewed 604-mesh union is decoded into the current viewer; all required chunk files are supplied.

## Coordinates, adaptation and preview

Coordinates are already converted to metres, Y up, feet at the stage. Positive x is patient-left and positive z anterior, checked against named kidney/external-oblique bounds and the source conversion. No axis conversion, mesh repositioning, per-organ centering or rescaling is applied. All organs retain their original relationships. Cameras fit the visible group's bounds, with source anterior, posterior, patient-left and three-quarter presets.

The initial “Organ utama” preset hides the external obliques; “Konteks tubuh” adds those muscles. Vertebral-column support appears in both presets. This does not claim a complete skin or skeleton context. Search and system filtering affect both the list and viewer. Individual opacity is explicitly disabled with its limitation explained; isolation exposes obscured structures.

Source geometry and legal notices are unchanged. Illustrative vertex colors, rough materials, selection highlighting, a navy stage-free background and framing are display adaptations. `atlas-preview.webp` is rendered from the same local model through the actual atlas renderer in Chromium/software WebGL; run `node scripts/render-atlas-preview.mjs` with the development server running to regenerate it. The preview and exported PNGs carry attribution.

Model anatomi referensi untuk edukasi. Not patient reconstruction, exhaustive anatomy, a physiological simulation or a clinically validated model. The source represents adult male reference anatomy, includes simplification and omissions, and does not represent every anatomical variation. Consult the preserved `ATTRIBUTION.md` and `LICENSE` for the source chain and terms.
