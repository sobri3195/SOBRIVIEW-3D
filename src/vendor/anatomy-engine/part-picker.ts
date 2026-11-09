import {
  Box3,
  type Mesh,
  Raycaster,
  Vector3,
  type Vector2,
  type PerspectiveCamera,
} from 'three'

import type { Part } from './model.ts'
import { SURFACE_SYSTEM } from './systems.ts'

export type PickablePart = {
  part: Part
  bounds: Box3
  pickMesh?: Mesh
}

export default class PartPicker {
  private readonly raycaster = new Raycaster()
  private readonly box = new Box3()
  private readonly hit = new Vector3()
  private readonly entries: readonly PickablePart[]
  private readonly isVisible: (index: number) => boolean

  constructor(
    entries: readonly PickablePart[],
    isVisible: (index: number) => boolean,
  ) {
    this.entries = entries
    this.isVisible = isVisible
  }

  pick(pointer: Vector2, camera: PerspectiveCamera) {
    this.raycaster.setFromCamera(pointer, camera)

    const hasSolidPart = this.entries.some(
      ({ part }, index) =>
        part.system !== SURFACE_SYSTEM && this.isVisible(index),
    )
    let nearest = Number.POSITIVE_INFINITY
    let found = -1

    for (const [index, { part, bounds, pickMesh }] of this.entries.entries()) {
      if (
        !pickMesh ||
        !this.isVisible(index) ||
        (hasSolidPart && part.system === SURFACE_SYSTEM)
      ) {
        continue
      }

      this.box.copy(bounds).translate(pickMesh.position)

      if (!this.raycaster.ray.intersectBox(this.box, this.hit)) {
        continue
      }

      const [hit] = this.raycaster.intersectObject(pickMesh, false)

      if (hit && hit.distance < nearest) {
        nearest = hit.distance
        found = index
      }
    }

    return found
  }
}
