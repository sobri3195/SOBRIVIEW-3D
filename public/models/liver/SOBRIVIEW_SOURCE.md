# SOBRIVIEW liver integration

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Asset packager: https://github.com/organui/liver-3d

All four upstream files were downloaded from **one pinned commit**:
`528ee1794670d3bfa23d581f91ba49d6af585b03` (main inspected 2026-11-09).

| Local file          | Upstream path at that commit |   Bytes | SHA-256                                                          |
| ------------------- | ---------------------------- | ------: | ---------------------------------------------------------------- |
| liver.glb           | public/models/liver.glb      | 5579432 | 4059e94f415a765273e2f095c5fd2c68edbb761c932dfa9460f9893ee5b0decb |
| manifest.json       | public/models/manifest.json  |   20514 | acb42975f06e5d1a2478445e56d2344d9d506f4299eff1dfb8beac8516a48b04 |
| LICENSE.txt         | public/models/LICENSE.txt    |    1263 | bf78e31a9cfb21499c0b398fb90d897fe48a94ea7a3f8f1d755bebf3aec1ffc4 |
| MODEL_PROVENANCE.md | docs/MODEL_PROVENANCE.md     |    7485 | 5dc83fae4e906839d301cf603891ce260ed54240bc5bc5566d6e35a3a0582d93 |

The upstream documents are preserved byte-for-byte. Their repository-relative links refer to the upstream layout; consult the pinned source tree for those supporting documents:
https://github.com/organui/liver-3d/tree/528ee1794670d3bfa23d581f91ba49d6af585b03

## Inspected GLB

GLB v2, embedded buffers, no textures or external resource requests. Seven scene-root mesh nodes have identical node name and `extras.structureId`, with these explicit FMA mappings:

| UI group / node / structureId | extras.fma |
| ----------------------------- | ---------- |
| liver                         | FMA7197    |
| gallbladder                   | FMA7202    |
| portal                        | FMA50735   |
| hepatic-veins                 | FMA14337   |
| artery                        | FMA14772   |
| biliary                       | FMA71891   |
| cystic                        | FMA14539   |

123,178 vertices and 218,056 indexed triangles. Mesh transforms are identity; vertex coordinates already contain the documented `(x,z,-y)` source transformation. The wider x axis, superior y axis, and anterior z axis agree with the upstream conversion and coordinate diagram. Patient-right cameras look from −x, patient-left from +x, anterior from +z, posterior from −z, superior from +y and inferior from −y. No source transform is reapplied.

## SOBRIVIEW modifications

- **GLB, manifest, source license and provenance: unchanged.** No geometry smoothing, welding, decimation, arbitrary segmentation or individual mesh positioning.
- A shared parent uniformly rescales the largest bound to 4.2 display units and centers the complete model. This is a display scale, not a measurement calibration.
- Each mesh receives its own rough, nonmetallic, double-sided illustrative material. Colors provide an educational legend. Selection adds a mild emissive highlight. The translucent liver does not write depth and renders after internal structures.
- Soft lighting and bounding-box-based cameras frame the real model. Grid omitted. Presets preserve all relative vessel/duct positions; no explode in anatomy mode.
- `liver-preview.webp` is an attributed static anterior surface rendering of this same local GLB through the application renderer in Chromium/software WebGL. Regenerate with `node scripts/render-liver-preview.mjs` while the development server runs. Exported PNGs include the model credit as well.
- Explanatory UI text summarizes the upstream anatomical scope; consult its provenance references (Johns Hopkins, NIDDK, NCI SEER). The original source seams remain visible and do not imply validated Couinaud boundaries.

Model anatomi referensi untuk edukasi; bukan rekonstruksi pasien. The seven model groups are not Couinaud segments. Common bile duct, inferior vena cava, upstream common hepatic artery, adjacent organs and microscopic anatomy are omitted. Independent anatomical/clinical review remains pending upstream.
