import type { Model, Concept } from './model.ts'

const DEFAULT_LIMIT = 80

export default function findConcepts(
  model: Model,
  query: string,
  limit = DEFAULT_LIMIT,
): Concept[] {
  const term = query.toLowerCase().trim()

  if (!term) {
    return []
  }

  return model.concepts
    .filter(
      (concept) =>
        concept.name.toLowerCase().includes(term) ||
        concept.id.toLowerCase().includes(term),
    )
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, limit)
}
