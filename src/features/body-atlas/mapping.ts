import type { Model } from "@dagno/anatomy-engine";
import entries from "./structures.json";
export const atlasStructures = entries;
export type AtlasStructure = (typeof entries)[number];
export const anatomyAsset = (name: string) =>
  `${import.meta.env.BASE_URL}anatomy/${name}`;
export const atlasCredit =
  "BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0.";
export function resolveStructures(model: Model) {
  const parts = new Set(model.parts.map((p) => p.id));
  const concepts = new Map(model.concepts.map((c) => [c.id, c]));
  const used = new Set<string>();
  return atlasStructures.map((s) => {
    const actual = new Set<string>();
    const matches = s.concepts.every((c) => {
      const concept = concepts.get(c.id);
      if (!concept || concept.name !== c.name) return false;
      concept.elements.forEach((id) => actual.add(id));
      return true;
    });
    const valid =
      matches &&
      s.meshIds.length > 0 &&
      new Set(s.meshIds).size === s.meshIds.length &&
      s.meshIds.length === actual.size &&
      s.meshIds.every((id) => actual.has(id) && parts.has(id) && !used.has(id));
    if (valid) s.meshIds.forEach((id) => used.add(id));
    return {
      ...s,
      status: valid ? s.status : "unavailable",
      meshIds: valid ? s.meshIds : [],
      scope: valid
        ? s.scope
        : "Pemetaan tidak sesuai dengan model sumber. Struktur belum tersedia.",
    };
  });
}
export function filterStructures<T extends AtlasStructure>(
  items: T[],
  query: string,
  system: string,
) {
  const text = query.toLowerCase().trim();
  return items.filter(
    (s) =>
      (system === "All" || s.system === system) &&
      `${s.en} ${s.idName} ${s.latin || ""}`.toLowerCase().includes(text),
  );
}
export function meshIdsFor(items: AtlasStructure[], ids: readonly string[]) {
  return [
    ...new Set(
      items.filter((s) => ids.includes(s.id)).flatMap((s) => s.meshIds),
    ),
  ];
}
