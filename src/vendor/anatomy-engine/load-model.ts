import type { Model, Chunk } from './model.ts'
import AnatomyEngineError from './anatomy-engine-error.ts'
import parseModel from './parse-model.ts'

export type LoadModelOptions = {
  signal?: AbortSignal
}

export default async function loadModel(
  url: string | URL,
  { signal }: LoadModelOptions = {},
): Promise<Model> {
  const response = await fetch(url, { signal: signal ?? null })

  if (!response.ok) {
    throw new AnatomyEngineError(
      'model-unavailable',
      `The model manifest could not be loaded (HTTP ${response.status}).`,
    )
  }

  const model = parseModel(await response.json())
  const base = response.url || String(url)

  return {
    ...model,
    chunks: model.chunks.map((chunk) => resolveChunk(chunk, base)),
  }
}

function resolveChunk(chunk: Chunk, base: string): Chunk {
  const resolve = (url: string) => new URL(url, base).href

  if (chunk.url === undefined) {
    return { bytes: chunk.bytes, gzip: resolve(chunk.gzip) }
  }

  return chunk.gzip === undefined
    ? { bytes: chunk.bytes, url: resolve(chunk.url) }
    : { bytes: chunk.bytes, url: resolve(chunk.url), gzip: resolve(chunk.gzip) }
}
