import type { Model, Chunk, Part, Point, Concept } from './model.ts'
import AnatomyEngineError from './anatomy-engine-error.ts'
import { isSystemId } from './systems.ts'

type UnknownRecord = Record<string, unknown>

export default function parseModel(value: unknown): Model {
  if (
    !isRecord(value) ||
    typeof value.version !== 'string' ||
    !Array.isArray(value.chunks) ||
    !Array.isArray(value.parts) ||
    !Array.isArray(value.concepts)
  ) {
    throw invalid(
      'The model manifest needs a version and arrays of chunks, parts and concepts.',
    )
  }

  const chunks = value.chunks.map(parseChunk)
  const parts = value.parts.map((part, index) =>
    parsePart(part, index, chunks.length),
  )
  const partIds = new Set(parts.map((part) => part.id))
  const concepts = value.concepts.map((concept, index) =>
    parseConcept(concept, index, partIds),
  )

  return { version: value.version, parts, concepts, chunks }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string) {
  return new AnatomyEngineError('model-invalid', message)
}

function parseChunk(value: unknown, index: number): Chunk {
  if (!isRecord(value) || !isByteCount(value.bytes)) {
    throw invalid(`Chunk ${index} needs a byte count.`)
  }

  const { bytes, url, gzip } = value

  if (typeof url === 'string' && typeof gzip === 'string') {
    return { bytes, url, gzip }
  }

  if (typeof url === 'string' && gzip === undefined) {
    return { bytes, url }
  }

  if (typeof gzip === 'string' && url === undefined) {
    return { bytes, gzip }
  }

  throw invalid(`Chunk ${index} needs a url, a gzip url, or both.`)
}

function isByteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function parsePart(value: unknown, index: number, chunkCount: number): Part {
  if (!isRecord(value)) {
    throw invalid(`Part ${index} is not an object.`)
  }

  const { id, name, conceptId, system, chunk } = value
  const { positions, normals, indices, vertexCount, indexCount } = value
  const bounds = parseBounds(value.bounds)

  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof conceptId !== 'string' ||
    !isSystemId(system) ||
    !isByteCount(chunk) ||
    chunk >= chunkCount ||
    !isByteCount(positions) ||
    !isByteCount(normals) ||
    !isByteCount(indices) ||
    !isByteCount(vertexCount) ||
    !isByteCount(indexCount) ||
    !bounds
  ) {
    throw invalid(
      `Part ${index} needs an id, a name, a concept, a known system, a chunk, buffer offsets and bounds.`,
    )
  }

  return {
    id,
    name,
    conceptId,
    system,
    chunk,
    positions,
    normals,
    indices,
    vertexCount,
    indexCount,
    bounds,
  }
}

function parseBounds(value: unknown): [Point, Point] | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    return undefined
  }

  const min = parsePoint(value[0])
  const max = parsePoint(value[1])

  return min && max ? [min, max] : undefined
}

function parsePoint(value: unknown): Point | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined
  }

  const [x, y, z] = value

  return isFiniteNumber(x) && isFiniteNumber(y) && isFiniteNumber(z)
    ? [x, y, z]
    : undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseConcept(
  value: unknown,
  index: number,
  partIds: ReadonlySet<string>,
): Concept {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.elements)
  ) {
    throw invalid(`Concept ${index} needs an id, a name and its part ids.`)
  }

  const elements = value.elements.filter(
    (element): element is string =>
      typeof element === 'string' && partIds.has(element),
  )

  if (elements.length !== value.elements.length) {
    throw invalid(`Concept ${value.id} names a part the model does not have.`)
  }

  return { id: value.id, name: value.name, elements }
}
