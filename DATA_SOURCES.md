# Data provenance and limitations

## Procedural anatomy

The dashboard and the separate Skema Couinaud tab use Three.js sphere primitives. The anatomy atlas and default liver anatomy mode use the attributed reference models described below. Shapes, colors, positions and proportions are simplified, not validated anatomical segmentations. The Couinaud panel teaches names and interactions; the geometric segment arrangement is schematic and does not depict true boundaries. Do not use it for surgical planning.

## Whole-body reference atlas

BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0. Prepared by Human Atlas and Dagno. `@dagno/anatomy-model@0.1.2`, source commit `d3b47239f1038041bb550a1cfb6bfe40a62c4970`, bundles 2,234 meshes and 3,432 named concepts. The current UI uses 604 unique meshes in 13 explicitly mapped groups. Original `ATTRIBUTION.md`, CC BY 4.0 `LICENSE`, checksum metadata, and detailed group scope ship in `public/anatomy/`.

Original converted coordinates, normals and geometry are preserved. No model from Liver Lab is merged into this coordinate system. Illustrative colors, material lighting, visibility, and camera framing are display adaptations. Both the atlas WebP preview and exported PNGs are attributed renderings of the same source model. The dataset is an adult male educational reference with omissions and simplification; lung parenchymal surfaces and complete abdominal-wall layers are absent. The documented local Dagno engine source extension retains its MIT notice; see `src/vendor/anatomy-engine/SOBRIVIEW.md`.

## Liver reference model

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

The seven-group subset is packaged by https://github.com/organui/liver-3d at commit `528ee1794670d3bfa23d581f91ba49d6af585b03`. The binary and source metadata are bundled locally in `public/models/liver/`; no model is fetched from GitHub at runtime. See `SOBRIVIEW_SOURCE.md`, `LICENSE.txt`, and the preserved upstream `MODEL_PROVENANCE.md` in that directory.

The GLB is unchanged. Materials, lighting, centering and uniform display scale are adjusted at runtime. The attributed WebP preview is a rendering of this same GLB. Surface seams are inherited; seven display groups do not represent Couinaud segments. Common bile duct, inferior vena cava and other structures are omitted by the source. This adult reference has no patient-specific or clinical validation.

## Public CT example

Medical Segmentation Decathlon Task03_Liver, `imagesTr/liver_100.nii.gz`, distributed through 3D Slicer's official CTLiver sample data. Dataset and derivative license: CC BY-SA 4.0. The source NRRD SHA-256 is `e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e`; its provenance is pinned to Slicer sample definition commit `4aeb6cc47e0372105004d6045efa5f52b6501542`.

The default CT Explorer uses a real resampled volume, not rendered anatomy models or duplicate images. Nearest-neighbor source `[2i,2j,2k]` sampling preserves float32 intensity, origin and direction while doubling spacing. All source/derivative geometry, bytes and hashes are recorded in `public/demo/ct-liver/source.json`; adaptation details and attribution ship alongside it. The full 512 × 512 × 685 source is available through the offline preparation script, while the 256 × 256 × 343 preview is deployed. Intensity calibration is not stated in the header, so NRRD values are not labelled HU. Spatial mm is explicitly based on Slicer's physical-coordinate convention because the original omits `space units`. No independent clinical/spatial validation or desktop Slicer review is claimed.

## Imaging phantom

`src/medical/demo.ts` defines a deterministic mathematical phantom sampled on a 96 × 96 × 96 grid with 1 mm isotropic spacing. Ellipsoid/cylinder intensity regions are artificial and do not represent real organ boundaries, pathology or patient anatomy. All displayed values in this demo are synthetic intensity units, not measured patient HU. The three planes resample the same function.

`tests/fixture.ts` generates an Explicit VR Little Endian single-frame CT phantom for DICOM import/decoder tests. The UID namespace is test-only; files contain no real patient information. Values and calibration fields are artificial. These test fixtures remain separate from the public CTLiver example. No clinical validation is claimed.

## Educational references

- OpenStax, _Anatomy and Physiology 2e_: https://openstax.org/details/books/anatomy-and-physiology-2e — anatomy terminology and general physiological concepts. CC BY 4.0. Quiz prose is original; no textbook illustrations are copied.
- DICOM Standard, Part 3: https://dicom.nema.org/medical/dicom/current/output/html/part03.html — image geometry, spacing, orientation and rescale conventions. No standard text is reproduced.
- Couinaud C. _Le foie: études anatomiques et chirurgicales_. Masson, 1957 — segment nomenclature; no figures or models reproduced.
- Cornerstone3D documentation/examples: https://www.cornerstonejs.org/ — client-side rendering API.
- Anime.js documentation: https://animejs.com/documentation/ — modern animation lifecycle API.

Educational summaries are limited and require review by qualified anatomy educators before formal curriculum use. The application does not provide diagnostic advice or fabricated clinical histories.
