import {
  Group,
  Mesh,
  CircleGeometry,
  MeshStandardMaterial,
  CylinderGeometry,
  RingGeometry,
  MeshBasicMaterial,
  DoubleSide,
} from 'three'

import type { AnatomyEngineTheme } from './theme.ts'

const GROUND_RADIUS = 30
const GROUND_SEGMENTS = 96
const GROUND_Y = -0.019
const PLATFORM_TOP_RADIUS = 0.68
const PLATFORM_BOTTOM_RADIUS = 0.7
const PLATFORM_HEIGHT = 0.028
const PLATFORM_SEGMENTS = 100
const PLATFORM_Y = -0.016
const PLATFORM_METALNESS = 0.12
const PLATFORM_ROUGHNESS = 0.67
const RING_SEGMENTS = 128
const RING_Y = 0.001
const RING_INNER_RADIUS = 0.63
const RING_OUTER_RADIUS = 0.632
const RING_OPACITY = 0.4
const INNER_RING_INNER_RADIUS = 0.55
const INNER_RING_OUTER_RADIUS = 0.551
const INNER_RING_OPACITY = 0.16
const FLAT = -Math.PI / 2

export default function createStage(theme: AnatomyEngineTheme) {
  const stage = new Group()

  const ground = new Mesh(
    new CircleGeometry(GROUND_RADIUS, GROUND_SEGMENTS),
    new MeshStandardMaterial({ color: theme.ground, roughness: 1 }),
  )
  ground.rotation.x = FLAT
  ground.position.y = GROUND_Y

  const platform = new Mesh(
    new CylinderGeometry(
      PLATFORM_TOP_RADIUS,
      PLATFORM_BOTTOM_RADIUS,
      PLATFORM_HEIGHT,
      PLATFORM_SEGMENTS,
    ),
    new MeshStandardMaterial({
      color: theme.platform,
      metalness: PLATFORM_METALNESS,
      roughness: PLATFORM_ROUGHNESS,
    }),
  )
  platform.position.y = PLATFORM_Y

  stage.add(
    ground,
    platform,
    createRing(RING_INNER_RADIUS, RING_OUTER_RADIUS, theme.ring, RING_OPACITY),
    createRing(
      INNER_RING_INNER_RADIUS,
      INNER_RING_OUTER_RADIUS,
      theme.innerRing,
      INNER_RING_OPACITY,
    ),
  )

  return stage
}

function createRing(
  innerRadius: number,
  outerRadius: number,
  color: string,
  opacity: number,
) {
  const ring = new Mesh(
    new RingGeometry(innerRadius, outerRadius, RING_SEGMENTS),
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: DoubleSide,
    }),
  )
  ring.rotation.x = FLAT
  ring.position.y = RING_Y

  return ring
}
