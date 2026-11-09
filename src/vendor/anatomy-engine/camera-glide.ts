import { Vector3, type PerspectiveCamera, MathUtils } from 'three'

type OrbitTarget = {
  target: Vector3
  update(): void
}

const APPROACH = new Vector3(0.2, 0.08, 1).normalize()
const MIN_DISTANCE = 0.12
const FRAME_MARGIN = 1.5
const SPEED = 6
const SETTLED_DISTANCE_SQUARED = 1e-5

export default class CameraGlide {
  private readonly position = new Vector3()
  private readonly target = new Vector3()
  private gliding = false

  get active() {
    return this.gliding
  }

  start(center: Vector3, size: number, camera: PerspectiveCamera) {
    const halfFov = MathUtils.degToRad(camera.fov / 2)
    const distance = Math.max(
      MIN_DISTANCE,
      (size / 2 / Math.tan(halfFov)) * FRAME_MARGIN,
    )

    this.target.copy(center)
    this.position.copy(center).addScaledVector(APPROACH, distance)
    this.gliding = true
  }

  stop() {
    this.gliding = false
  }

  update(camera: PerspectiveCamera, controls: OrbitTarget, delta: number) {
    if (!this.gliding) {
      return false
    }

    const alpha = 1 - Math.exp(-SPEED * delta)

    camera.position.lerp(this.position, alpha)
    controls.target.lerp(this.target, alpha)
    controls.update()

    this.gliding =
      camera.position.distanceToSquared(this.position) >=
        SETTLED_DISTANCE_SQUARED ||
      controls.target.distanceToSquared(this.target) >= SETTLED_DISTANCE_SQUARED

    return this.gliding
  }
}
