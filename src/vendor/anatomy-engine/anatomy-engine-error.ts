export type AnatomyEngineErrorCode =
  | 'chunk-incomplete'
  | 'chunk-unavailable'
  | 'context-lost'
  | 'decompression-unavailable'
  | 'geometry-invalid'
  | 'model-invalid'
  | 'model-unavailable'
  | 'webgl-unavailable'

export default class AnatomyEngineError extends Error {
  readonly code: AnatomyEngineErrorCode

  constructor(
    code: AnatomyEngineErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AnatomyEngineError'
    this.code = code
  }
}
