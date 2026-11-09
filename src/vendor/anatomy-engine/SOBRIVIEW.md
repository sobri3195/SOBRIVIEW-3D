# Reviewed AnatomyEngine source extension

Upstream: https://github.com/dagno-labs/anatomy-engine, npm `@dagno/anatomy-engine@0.2.0`, source revision `1102b731bfc060eddce6abded22366ed6f4a65a7`. Original source and MIT notice are retained here. The installed official package supplies `loadModel`, its manifest schema and public types. The extended local `AnatomyEngine` instantiates the only renderer in the atlas viewer.

The upstream public API lacks exact part visibility, group focusing and capture; assembled hover is also disabled upstream. We extend the reviewed source rather than accessing private fields or monkey-patching an instance. Only `anatomy-engine.ts` and `create-part-material.ts` differ from the pinned package source:

- Public `setVisibleParts` controls source mesh membership independently of selection. `focusParts` fits a group without moving any geometry. `diagnostics` reports actual loaded/visible meshes and bounds. `capture` renders synchronously and returns the canvas.
- Framing uses visible bounds instead of the complete manifest's bounding box. Existing documented camera presets and pan/orbit controls are retained.
- Optional per-part colors become vertex colors; neither source positions, normals, indices nor transforms change. Materials are rough/nonmetallic, selection strength is reduced, environment reflections softened, and lighting exposure lowered.
- Render batches are split by explicit UI group and source system. Fully hidden batches skip GPU drawing; assembled batches also use frustum culling, including when focusing a small isolated organ. Source geometry buffers remain unchanged.
- Optional `environment: false` skips the costly room-environment generation/reflections; soft hemisphere/directional lights remain. Disposal explicitly releases the WebGL context after deleting GPU resources.
- Optional `stage: false` hides the upstream floor; it is disabled in SOBRIVIEW to keep the navy background. Drawing-buffer preservation supports static previews and PNG capture.
- Hover works on the assembled model. Explode remains zero and has no UI, so original organ coordinates are preserved.

Individual opacity is deliberately disabled in the UI with an explanation: upstream merges geometry by source system with shared shader materials. This extension does not pretend a shared opacity slider is organ-specific. Isolation/restore and “Lihat struktur” expose occluded structures.

Upstream chunk decompression, geometry decoding/merging, picking, event subscription and cleanup are retained. Browser tests cover real rendering and the added public behavior, including a single canvas, selection/hover, filters, group visibility/focus, retry, context loss, and resource disposal. A future update must review source changes against this pinned version and rerun those tests; do not overwrite these extensions with a blind package-source copy.
