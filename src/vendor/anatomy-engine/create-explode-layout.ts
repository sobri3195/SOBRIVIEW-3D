import type { Part } from './model.ts'

export type LayoutCell = {
  x: number
  y: number
  width: number
  height: number
}

export type ExplodeLayout = {
  cells: Map<string, LayoutCell>
  width: number
  height: number
}

const MIN_CELL_SIZE = 0.035
const CELL_GAP = 0.04
const MIN_ROW_WIDTH = 0.3
const MIN_ASPECT = 0.5
const MAX_ASPECT = 1.5
const ROW_WIDTH_SLACK = 1.18

export default function createExplodeLayout(
  parts: readonly Part[],
  aspect = 1,
): ExplodeLayout {
  const cards = parts.map((part) => ({
    id: part.id,
    width:
      Math.max(MIN_CELL_SIZE, part.bounds[1][0] - part.bounds[0][0]) + CELL_GAP,
    height:
      Math.max(MIN_CELL_SIZE, part.bounds[1][1] - part.bounds[0][1]) + CELL_GAP,
  }))
  const area = cards.reduce((sum, card) => sum + card.width * card.height, 0)
  const widest = Math.max(MIN_ROW_WIDTH, ...cards.map((card) => card.width))
  const clampedAspect = Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, aspect))
  const rowWidth = Math.max(
    widest,
    Math.sqrt(area * clampedAspect) * ROW_WIDTH_SLACK,
  )

  cards.sort((a, b) => b.height - a.height || a.id.localeCompare(b.id))

  const cells = new Map<string, LayoutCell>()
  let x = 0
  let y = 0
  let rowHeight = 0
  let usedWidth = 0

  for (const card of cards) {
    if (x > 0 && x + card.width > rowWidth) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }

    cells.set(card.id, {
      x: x + card.width / 2,
      y: -y - card.height / 2,
      width: card.width,
      height: card.height,
    })
    x += card.width
    usedWidth = Math.max(usedWidth, x)
    rowHeight = Math.max(rowHeight, card.height)
  }

  const height = y + rowHeight

  for (const cell of cells.values()) {
    cell.x -= usedWidth / 2
    cell.y += height / 2
  }

  return { cells, width: usedWidth, height }
}
