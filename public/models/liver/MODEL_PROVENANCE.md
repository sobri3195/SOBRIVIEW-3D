# Model provenance and anatomical scope

## Source and terms

The runtime asset is a subset of **BodyParts3D 4.0**, released **2013-05-16**, downloaded **2026-09-22** directly from the [official LSDB archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html). Geometry comes from `isa_BP3D_4.0_obj_99.zip` (136 MiB compressed); “99%” is the source's polygon-reduction label, not an accuracy claim. IS-A and PART-OF tables resolve FMA concepts to FJ element files.

The [official archive license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), last updated **2025-02-27**, specifies [CC BY 4.0 International](https://creativecommons.org/licenses/by/4.0/). Credit:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Original OBJ comments retain an older **CC BY-SA 2.1 Japan** notice, linking to that same official license page. We rely on the current official archive grant for these directly downloaded assets. This discrepancy is preserved here; a byte-for-byte [license-page snapshot](model-source/archive-license.html.txt) is stored as inert text. Models and rendered model screenshots retain their own license; the code's MIT license does not replace it. Runtime attribution is also included in [public/models/LICENSE.txt](../public/models/LICENSE.txt).

## Inspection and selection

The official release supplies both surface and internal structures. However, the PART-OF “right lobe of liver” / “left lobe of liver” concepts include vessels, ducts, and a shared tissue concept; they are not simple, complete lobe shells. Selecting those compound groups as intact lobes would misrepresent the mapping.

The IS-A table maps actual tissue to the caudate lobe and seven named hepatovenous segment concepts. We combine **all nine tissue elements into one Liver surface group**. We do not expose segment labels or claim clinically valid Couinaud boundaries. No arbitrary partitioning or invented internal anatomy was used. Source seams remain visible; meshes were not sculpted or welded into a seamless shell.

| Display group | Source concept(s) | Elements | Triangles |
| --- | --- | ---: | ---: |
| Liver surface | IS-A FMA13365, FMA15739, FMA15741–FMA15746; tissue subset of liver FMA7197 | 9 | 127,788 |
| Gallbladder | PART-OF FMA7202 | 1 | 2,396 |
| Portal vein | PART-OF FMA50735, hepatic portal vein | 18 | 35,982 |
| Hepatic veins | IS-A FMA14337 + FMA17541, main veins and tributaries | 17 | 27,534 |
| Hepatic artery | PART-OF FMA14772, hepatic artery proper | 16 | 12,282 |
| Hepatic bile ducts | PART-OF FMA71891, hepatic biliary tree | 15 | 11,796 |
| Cystic duct | PART-OF FMA14539 | 1 | 278 |

The selected dataset has **77 unique elements, 123,178 vertices, 218,056 triangles**. Each element belongs to exactly one display group. The surface elements are FJ2409, FJ2816, FJ2818–FJ2824. The gallbladder is FJ2817, cystic duct FJ3080. See [exact mapping rows](model-source/selected-mappings.tsv) and the [manifest](../public/models/manifest.json) for every element's original hash, size, source concepts, vertex and face counts.

The common bile duct, inferior vena cava, upstream common hepatic artery, ligaments, adjacent organs and microscopic anatomy are omitted. Vessel/duct trees are selected as groups, with truncated ends and simplified branching. The source body is an adult male reference, not patient-specific anatomy. [Release 4.0 notes](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/release_4.0.html) specifically warn of possible inconsistencies between liver/lung models and concepts, missing models, and anatomical errors. Visible segment seams and intersections are source limitations, not clinically established boundaries.

## Conversion and reproducibility

`public/models/liver.glb` is bundled, so ordinary setup needs no model download. SHA-256:

`4059e94f415a765273e2f095c5fd2c68edbb761c932dfa9460f9893ee5b0decb`

Size: **5,579,432 bytes**. Source ZIP SHA-256:

`40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`

Run from this repository:

```sh
bun install --frozen-lockfile
bun run prepare:model
bun run verify:model
```

Preparation fetches input files into ignored `.asset-cache/` only when absent. [Input URLs and hashes](../scripts/model-inputs.json) pin the content of mutable `LATEST` URLs. Any changed input fails checksum verification; do not update pins without reviewing the new data and license. It extracts only the selected elements. Reproduction uses this repository's locked dependencies and does not read a sibling checkout.

Steps:

1. Resolve each chosen concept using its explicit source hierarchy; reject missing concepts, missing OBJ files, and duplicate element ownership.
2. Parse original OBJ positions and face indices. Fan-triangulate any polygon faces. Preserve geometry topology; no further decimation, smoothing, or sculpting.
3. Use one shared bounding-box center `[-10.3486, -122.87085, 1101.36]` mm for all structures, preserving their relative placement. Map `(x,y,z)` to `(x,z,-y)` and uniformly multiply by `0.02` for display.
4. Recompute vertex normals, assign illustrative materials, combine elements within groups, and export indexed GLB with stable structure IDs, FMA IDs and source concepts.
5. Write original and output SHA-256 hashes, counts, transforms, exact mappings and provenance to the manifest.

The [source coordinate diagram](https://dbarchive.biosciencedbc.jp/archive/bodyparts3d/images/coordinate_system.png) identifies +x as patient-left, −y as anterior, and +z as superior. Thus viewer +x is left, +y superior, +z anterior. Preset cameras follow these axes. Display scale is not a measurement tool.

`verify:model` decodes the GLB independently, verifies the runtime hash, all structure/FMA pairs, unique element ownership, finite coordinates, valid indices, and vertex/triangle counts against the manifest.

## Content and review status

Original short explanations were checked against these sources on 2026-09-22:

- [Johns Hopkins Medicine: Liver anatomy and functions](https://www.hopkinsmedicine.org/health/conditions-and-diseases/liver-anatomy-and-functions): liver, portal vein and hepatic artery.
- [NIDDK: Your digestive system](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works): gallbladder and bile.
- [Johns Hopkins Medicine: Biliary anatomy](https://www.hopkinsmedicine.org/health/conditions-and-diseases/biliary-system-anatomy-and-functions): hepatic ducts and cystic duct.
- [NCI SEER training manual, Book 4, printed p. 112](https://seer.cancer.gov/training/manuals/Book4.pdf): hepatic venous drainage.

No source illustrations are redistributed. Each in-app description includes its reference and a model-specific scope note.

Completed: developer inspection of identifiers, geometry, relative placement and browser interaction. **Pending: independent review by a qualified anatomist or clinician.** No clinical, diagnostic, surgical, physiological or patient-specific validation is claimed. The tour describes static spatial relationships; no blood/bile flow, disease state or surgical plan is simulated.

## Other assets

DM Sans and Manrope are self-hosted through pinned Fontsource packages, under SIL Open Font License 1.1; full notices ship in [public/licenses](../public/licenses). UI icons are Lucide (ISC). No remote fonts, trackers, or externally hosted runtime models are required.
