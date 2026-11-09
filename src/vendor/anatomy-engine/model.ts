import type { SystemId } from './systems.ts'

export type Point = [number, number, number]

export type Part = {
  id: string
  name: string
  conceptId: string
  system: SystemId
  chunk: number
  positions: number
  normals: number
  indices: number
  vertexCount: number
  indexCount: number
  bounds: [Point, Point]
}

export type Concept = {
  id: string
  name: string
  elements: string[]
}

export type Chunk =
  | { bytes: number; url: string; gzip?: string }
  | { bytes: number; url?: undefined; gzip: string }

export type Model = {
  version: string
  parts: Part[]
  concepts: Concept[]
  chunks: Chunk[]
}
