import AnatomyEngineError from './anatomy-engine-error.ts'

const GZIP_MAGIC = [0x1f, 0x8b] as const

export default async function decodeChunk(
  response: Response,
  expectedBytes: number,
  requestedGzip: boolean,
): Promise<ArrayBuffer> {
  if (!response.ok) {
    throw new AnatomyEngineError(
      'chunk-unavailable',
      `A model chunk could not be loaded (HTTP ${response.status}).`,
    )
  }

  const payload = await response.arrayBuffer()
  const buffer =
    requestedGzip && isGzip(payload) ? await gunzip(payload) : payload

  if (buffer.byteLength !== expectedBytes) {
    throw new AnatomyEngineError(
      'chunk-incomplete',
      `A model chunk has ${buffer.byteLength} bytes instead of ${expectedBytes}.`,
    )
  }

  return buffer
}

// A static host may serve a .gz file either as gzip bytes or with Content-Encoding, which fetch has already decoded.
function isGzip(payload: ArrayBuffer) {
  const signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength))

  return signature[0] === GZIP_MAGIC[0] && signature[1] === GZIP_MAGIC[1]
}

function gunzip(payload: ArrayBuffer) {
  const stream = new Blob([payload])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))

  return new Response(stream).arrayBuffer()
}
