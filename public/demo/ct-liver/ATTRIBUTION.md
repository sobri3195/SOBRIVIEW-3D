# CTLiver attribution and preparation

CT example: **Medical Segmentation Decathlon**, Task03_Liver, `imagesTr/liver_100.nii.gz`, distributed as **CTLiver** in the official 3D Slicer sample data collection.

CT contoh publik — Medical Segmentation Decathlon / 3D Slicer. Untuk edukasi dan penelitian.

- Dataset project: http://medicaldecathlon.com/
- Official sample definition: https://github.com/Slicer/Slicer/blob/4aeb6cc47e0372105004d6045efa5f52b6501542/Modules/Scripted/SampleData/SampleData.py
- Original content-addressed NRRD: https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e
- Dataset and derivatives: **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/. Slicer's code license does not replace this dataset license.

## Original inspected metadata

SHA-256 `e16eae0ae6fefa858c5c11e58f0f1bb81834d81b7102e021571056324ef6f37e`; 292,331,176 bytes. NRRD0004, dimension 3, float32, little endian, gzip, 512 × 512 × 685. Voxel payload is exactly 718,274,560 bytes. The complete source is downloaded and retained locally at `public/demo/ct-liver/CTLiver.nrrd`, ignored by Git and excluded from production to avoid a 292 MB static file and 718 MB client allocation.

Space: left-posterior-superior. Direction columns already include spacing: `(-0.69921875,0,0)`, `(0,-0.69921875,0)`, `(0,0,0.69999992847442649)`. Origin `(188.18499755859375,320.03762817382824,15.300048828125004)`. Native x/y indices run toward patient-right/anterior; native z runs superior. The screen reverses x/y sampling for conventional radiological axial display (R on screen-left, A at top); the underlying scalar buffer is not flipped or rewritten.

The original header omits `space units`. The reference's physical lengths use the 3D Slicer millimetre coordinate convention, documented at https://github.com/Slicer/Slicer/blob/4aeb6cc47e0372105004d6045efa5f52b6501542/Docs/user_guide/coordinate_systems.md. This provenance convention is explicitly recorded in the derivative and UI; it is not independent spatial/clinical validation. Generic NRRD files without known units do not enable mm measurements.

The header does not explicitly confirm HU calibration. Native converted float values are preserved and labelled **Intensity**. No DICOM slope/intercept is applied to this NRRD. The supplied display window presets are presentation settings, not calibration metadata. No claim of normal anatomy or absence of disease is made.

## SOBRIVIEW derivative

`CTLiver-preview.nrrd` is a **resampled preview** of this same volume, not screenshots or invented slices. Each destination voxel `[i,j,k]` samples source `[2i,2j,2k]` (nearest neighbour). Dimensions 256 × 256 × 343; spacing doubles on all three source axes; origin and anatomical directions are preserved. Float32 intensity values are copied without scaling or interpolation. The last odd x/y source index (511) is not sampled; the final z source slice (684) is retained. This grid restriction is explicitly described in `source.json`.

The derivative and its PNG exports retain CC BY-SA 4.0. `source.json` records both checksums, sizes, physical geometry, display starting slice and the preparation method. Regenerate using `node scripts/prepare-ct-liver.mjs` from the checkout. It verifies the immutable original hash before preparing anything. Production builds verify the committed preview and serve it from the application's own origin; they do not download the original. Gzip decompression and checksum verification occur in a module worker. Only the documented attached scalar 3D raw/gzip NRRD types in LPS/RAS with orthogonal directions are supported; sheared grids and detached/vector/time files fail explicitly.

This is public educational/research data, not a scan uploaded by the user, a clinical diagnostic tool, or anatomical ground truth. No segmentation mask is displayed. Independent review in the 3D Slicer desktop application is not part of the browser test suite; affine and orientation behavior are checked against the inspected header and synthetic known-coordinate tests.
