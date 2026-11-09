# Attribution

## BodyParts3D

BodyParts3D, © The Database Center for Life Science, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

- License: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html> (updated 2025-02-27)
- Dataset: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>
- Source geometry: `isa_BP3D_4.0_obj_99.zip`, BodyParts3D 4.0.
- English names and relationships: the IS-A and PART-OF concept, element and inclusion tables from the same archive.
- Publication: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. <https://doi.org/10.1093/nar/gkn613>

The source OBJ comments mention an older CC BY-SA 2.1 Japan license. The current license of the database, linked above, supersedes that text and permits redistribution and adaptation under CC BY 4.0.

## Human Atlas

The prepared model comes from [Human Atlas](https://github.com/vinaysingh-05/human-atlas), commit `f5d5b74`, which distributes it under CC BY 4.0. Its changes to the source:

- Axes and units converted from millimetres and Z-up to metres and Y-up.
- The model translated so its feet rest at the origin.
- Each mesh simplified with meshoptimizer within a 0.2% relative error.
- Normals quantized to signed 16-bit.
- Meshes packed into binary chunks, and grouped into display systems.

All 2,234 source meshes are kept, and the 3,432 named FMA concepts of the combined hierarchy are listed, each with the meshes it covers. The identity of each mesh in the source is kept in the manifest.

## Dagno

Dagno changed only the manifest: each chunk entry lists its gzip file by a relative name, and the uncompressed copies and absolute paths are removed. The geometry is unchanged.

## Scope

BodyParts3D represents an adult male reference anatomy based on TARO MRI and anatomical illustration refinements. It is not a complete model of every human structure or variation. This model is an educational and visual reference, not a clinical tool.
