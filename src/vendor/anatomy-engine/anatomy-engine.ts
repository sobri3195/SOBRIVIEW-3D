import {
  Box3,
  Vector3,
  Mesh,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  type Texture,
  type Group,
  DataTexture,
  type Material,
  BufferGeometry,
  MeshBasicMaterial,
  DoubleSide,
  BufferAttribute,
  Points,
  PointsMaterial,
  Vector2,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PMREMGenerator,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  RGBAFormat,
  FloatType,
  Color,
  MOUSE,
  TOUCH,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { Part, Model } from "./model.ts";
import AnatomyEngineError from "./anatomy-engine-error.ts";
import {
  type AnatomyEngineThemeOverrides,
  type AnatomyEngineTheme,
  resolveTheme,
} from "./theme.ts";
import {
  type SystemId,
  DEFAULT_VISIBLE_SYSTEMS,
  SYSTEM_IDS,
  SURFACE_SYSTEM,
} from "./systems.ts";
import createPartMaterial, {
  type PartUniforms,
} from "./create-part-material.ts";
import PartPicker from "./part-picker.ts";
import CameraGlide from "./camera-glide.ts";
import PointerTap from "./pointer-tap.ts";
import createStage from "./create-stage.ts";
import decodeChunk from "./decode-chunk.ts";
import createExplodeLayout from "./create-explode-layout.ts";

export type View = "three-quarter" | "front" | "side" | "back";

export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type HoverDetail = {
  part: Part;
  x: number;
  y: number;
};

export type ProgressDetail = {
  loaded: number;
  total: number;
};

export type AnatomyEngineEvents = {
  progress: ProgressDetail;
  ready: undefined;
  error: AnatomyEngineError;
  select: Part;
  hover: HoverDetail | null;
  focus: Part | null;
  render: undefined;
};

export type AnatomyEngineOptions = {
  model: Model;
  label?: string;
  theme?: AnatomyEngineThemeOverrides;
  visibleSystems?: readonly SystemId[];
  insets?: Partial<Insets>;
  /** SOBRIVIEW: fixed illustrative color by source mesh ID. */
  partColors?: Readonly<Record<string, string>>;
  stage?: boolean;
  environment?: boolean;
  partGroups?: Readonly<Record<string, string>>;
};

type PartEntry = {
  part: Part;
  bounds: Box3;
  center: Vector3;
  destination: Vector3;
  bloom: Vector3;
  pickMesh?: Mesh;
};

type ScreenTarget = {
  index: number;
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const FIELD_OF_VIEW = 34;
const NEAR = 0.005;
const FAR = 100;
const EXPOSURE = 0.9;
const ENVIRONMENT_BLUR = 0.04;
const SKY_INTENSITY = 0.65;
const KEY_INTENSITY = 1.7;
const KEY_POSITION = new Vector3(-2, 4, 3);
const RIM_INTENSITY = 1.0;
const RIM_POSITION = new Vector3(2, 2, -3);
const ORBIT_DAMPING = 0.085;
const MIN_ZOOM = 0.07;
const MAX_ZOOM = 40;
const MAX_POLAR_ANGLE = Math.PI * 0.96;
const AUTO_ROTATE_SPEED = 0.65;
const COMPACT_WIDTH = 768;
const COMPACT_HEIGHT = 600;
const COMPACT_PIXEL_RATIO = 1.5;
const MAX_PIXEL_RATIO = 2;
const CHUNK_CONCURRENCY = 3;
const EXPLODE_DAMPING = 8;
const MAX_FRAME_SECONDS = 0.05;
const EXPLODE_EPSILON = 0.0001;
const BLOOM_END = 0.45;
const BLOOM_RADIUS = 0.48;
const BLOOM_LIFT = 0.28;
const BODY_CENTER_Y = 0.85;
const VISIBLE = 0.5;
const FOCUS_FROM = 0.5;
const FOCUS_RELEASE_BELOW = 0.4;
const SCREEN_TARGETS_FROM = 0.45;
const LAYOUT_REFRAME_FROM = 0.05;
const FRAME_EXPLODE_FROM = 0.3;
const FRONT_VIEW_FROM = 0.8;
const MOVING_FRONT_FROM = 0.5;
const PAN_FROM = 0.8;
const STAGE_HIDDEN_FROM = 0.5;
const MARKERS_FROM = 0.75;
const AUTO_ROTATE_BELOW = 0.4;
const TOUCH_TAP_THRESHOLD = 12;
const MOUSE_TAP_THRESHOLD = 5;
const TOUCH_TARGET_RADIUS = 24;
const MOUSE_TARGET_RADIUS = 16;
const TARGET_CENTER_WEIGHT = 0.025;
const ASSEMBLED_MARGIN = 1.4;
const EXPLODED_MARGIN = 1.08;
const ISOLATED_MARGIN = 1.35;
const MIN_VIEWPORT = 160;
const ISOLATION_APPROACH = new Vector3(0.2, 0.1, 1).normalize();
const VIEW_DIRECTIONS: Record<View, Vector3> = {
  "three-quarter": new Vector3(0.35, 0.06, 1).normalize(),
  front: new Vector3(0, 0.02, 1).normalize(),
  side: new Vector3(1, 0.02, 0).normalize(),
  back: new Vector3(0, 0.02, -1).normalize(),
};
const MARKER_SIZE = 5;
const MARKER_OPACITY = 0.72;
const MARKER_RENDER_ORDER = 10;
const HIDDEN_MARKER = 10_000;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const CHANNEL_ON = 255;
const SELECTED_CHANNEL = 0;
const HOVERED_CHANNEL = 1;
const GHOSTED_CHANNEL = 2;
const VISIBILITY_COMPONENT = 3;
const STRIDE = 4;

export default class AnatomyEngine {
  readonly model: Model;

  private readonly container: HTMLElement;
  private readonly events = new EventTarget();
  private readonly abort = new AbortController();
  private readonly theme: AnatomyEngineTheme;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, NEAR, FAR);
  private readonly controls: OrbitControls;
  private readonly environment: Texture | null;
  private readonly stage: Group;
  private readonly entries: PartEntry[];
  private readonly partIndex: Map<string, number>;
  private readonly stateWidth: number;
  private readonly partState: Float32Array;
  private readonly partTexture: DataTexture;
  private readonly selectionState: Uint8Array;
  private readonly selectionTexture: DataTexture;
  private readonly uniforms: PartUniforms;
  private readonly materials = new Map<SystemId, Material>();
  private readonly geometries: BufferGeometry[] = [];
  private readonly pickMaterial = new MeshBasicMaterial({ side: DoubleSide });
  private readonly modelBox = new Box3();
  private readonly markerPositions: Float32Array;
  private readonly markerAttribute: BufferAttribute;
  private readonly markers: Points<BufferGeometry, PointsMaterial>;
  private readonly picker: PartPicker;
  private readonly glide = new CameraGlide();
  private readonly tap = new PointerTap();
  private readonly pointer = new Vector2();
  private readonly offset = new Vector3();
  private readonly projected = new Vector3();
  private readonly resizeObserver: ResizeObserver;

  private visibleParts: ReadonlySet<string> | null = null;
  private frameParts: ReadonlySet<string> | null = null;
  private readonly batches: { mesh: Mesh; parts: Part[] }[] = [];
  private readonly partGroups: Readonly<Record<string, string>>;
  private readonly showStage: boolean;
  private readonly partColors: Readonly<Record<string, string>>;
  private visibleSystems: ReadonlySet<SystemId>;
  private selection: ReadonlySet<string> = new Set();
  private isolated = false;
  private explodeTarget = 0;
  private explode = 0;
  private view: View = "three-quarter";
  private autoRotate = false;
  private insets: Insets;
  private loadedChunks = 0;
  private isReady = false;
  private disposed = false;
  private frameRequest = 0;
  private lastFrameTime = 0;
  private dirty = true;
  private partsChanged = true;
  private needsFrame = true;
  private layoutKey = "";
  private packingWidth = 1;
  private packingHeight = 1;
  private hoverIndex = -1;
  private focusIndex = -1;
  private screenTargets: ScreenTarget[] = [];

  constructor(container: HTMLElement, options: AnatomyEngineOptions) {
    this.container = container;
    this.model = options.model;
    this.partColors = options.partColors ?? {};
    this.showStage = options.stage ?? true;
    this.partGroups = options.partGroups ?? {};
    this.theme = resolveTheme(options.theme);
    this.visibleSystems = new Set(
      options.visibleSystems ?? DEFAULT_VISIBLE_SYSTEMS,
    );
    this.insets = { ...NO_INSETS, ...options.insets };

    try {
      this.renderer = new WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (cause) {
      throw new AnatomyEngineError(
        "webgl-unavailable",
        "WebGL could not be started in this browser.",
        { cause },
      );
    }

    this.renderer.setClearColor(this.theme.background);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = EXPOSURE;
    this.renderer.domElement.style.display = "block";

    if (options.label) {
      this.renderer.domElement.setAttribute("aria-label", options.label);
    }

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = ORBIT_DAMPING;
    this.controls.minDistance = MIN_ZOOM;
    this.controls.maxDistance = MAX_ZOOM;
    this.controls.maxPolarAngle = MAX_POLAR_ANGLE;
    this.controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    this.controls.addEventListener("change", this.markDirty);

    if (options.environment === false) {
      this.environment = null;
    } else {
      const pmrem = new PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.environment = pmrem.fromScene(room, ENVIRONMENT_BLUR).texture;
      this.scene.environment = this.environment;
      room.dispose();
      pmrem.dispose();
    }

    const key = new DirectionalLight(this.theme.keyLight, KEY_INTENSITY);
    const rim = new DirectionalLight(this.theme.rimLight, RIM_INTENSITY);

    key.position.copy(KEY_POSITION);
    rim.position.copy(RIM_POSITION);
    this.stage = createStage(this.theme);

    this.scene.add(
      new HemisphereLight(
        this.theme.skyLight,
        this.theme.groundLight,
        SKY_INTENSITY,
      ),
      key,
      rim,
      this.stage,
    );

    const { parts } = this.model;

    this.entries = parts.map((part) => {
      const bounds = new Box3(
        new Vector3(...part.bounds[0]),
        new Vector3(...part.bounds[1]),
      );
      const center = bounds.getCenter(new Vector3());
      const angle =
        (SYSTEM_IDS.indexOf(part.system) / SYSTEM_IDS.length) * Math.PI * 2;

      this.modelBox.union(bounds);

      return {
        part,
        bounds,
        center,
        destination: center.clone(),
        bloom: new Vector3(
          Math.sin(angle) * BLOOM_RADIUS,
          (center.y - BODY_CENTER_Y) * BLOOM_LIFT,
          Math.cos(angle) * BLOOM_RADIUS,
        ),
      };
    });
    this.partIndex = new Map(parts.map((part, index) => [part.id, index]));
    this.stateWidth = MathUtils.ceilPowerOfTwo(Math.max(1, parts.length));
    this.partState = new Float32Array(this.stateWidth * STRIDE);
    this.selectionState = new Uint8Array(this.stateWidth * STRIDE);

    this.partTexture = new DataTexture(
      this.partState,
      this.stateWidth,
      1,
      RGBAFormat,
      FloatType,
    );
    this.selectionTexture = new DataTexture(
      this.selectionState,
      this.stateWidth,
      1,
    );
    this.uniforms = {
      partState: { value: this.partTexture },
      selectionState: { value: this.selectionTexture },
      stateWidth: { value: this.stateWidth },
      selectionColor: { value: new Color(this.theme.selection) },
      hoverColor: { value: new Color(this.theme.hover) },
    };

    for (const system of SYSTEM_IDS) {
      this.materials.set(
        system,
        createPartMaterial("#ffffff", system === SURFACE_SYSTEM, this.uniforms),
      );
    }

    this.markerPositions = new Float32Array(parts.length * 3);
    this.markerAttribute = new BufferAttribute(this.markerPositions, 3);
    this.markers = this.createMarkers();
    this.scene.add(this.markers);
    this.picker = new PartPicker(this.entries, this.isShown);

    const canvas = this.renderer.domElement;

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("webglcontextlost", this.onContextLost);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.loadChunks();
    this.frameRequest = requestAnimationFrame(this.animate);
  }

  get ready() {
    return this.isReady;
  }

  on<K extends keyof AnatomyEngineEvents>(
    type: K,
    listener: (detail: AnatomyEngineEvents[K]) => void,
  ) {
    const handler = (event: Event) => {
      if (event instanceof CustomEvent) {
        listener(event.detail);
      }
    };

    this.events.addEventListener(type, handler);

    return () => this.events.removeEventListener(type, handler);
  }

  /** SOBRIVIEW extension: exact mesh membership, independent of selection. */
  setVisibleParts(partIds: readonly string[]) {
    this.visibleParts = new Set(partIds.filter((id) => this.partIndex.has(id)));
    this.partsChanged = true;
  }

  focusParts(partIds: readonly string[]) {
    this.frameParts = new Set(partIds.filter((id) => this.partIndex.has(id)));
    this.needsFrame = true;
  }

  capture() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }

  diagnostics() {
    const visible = this.model.parts.filter((part) => this.isPartVisible(part));
    const box = this.boundsFor(visible.map((p) => p.id));
    return {
      loadedMeshes: this.entries.filter((e) => e.pickMesh).length,
      visibleMeshes: visible.length,
      chunks: this.loadedChunks,
      bounds: box.isEmpty() ? null : [box.min.toArray(), box.max.toArray()],
    };
  }

  private boundsFor(ids: Iterable<string>) {
    const box = new Box3();
    for (const id of ids) {
      const index = this.partIndex.get(id);
      if (index !== undefined) box.union(this.entries[index]!.bounds);
    }
    return box;
  }

  setVisibleSystems(systems: readonly SystemId[]) {
    this.visibleSystems = new Set(systems);
    this.partsChanged = true;
  }

  setSelection(partIds: readonly string[]) {
    this.selection = new Set(partIds);
    this.partsChanged = true;

    if (this.isolated) {
      this.needsFrame = true;
    }
  }

  setIsolated(isolated: boolean) {
    this.isolated = isolated;
    this.partsChanged = true;
    this.needsFrame = true;
  }

  setExplode(amount: number) {
    this.explodeTarget = MathUtils.clamp(amount, 0, 1);
  }

  setView(view: View) {
    this.view = view;
    this.frameParts = null;
    this.needsFrame = true;
  }

  resetView() {
    this.frameParts = null;
    this.needsFrame = true;
  }

  setAutoRotate(autoRotate: boolean) {
    this.autoRotate = autoRotate;
  }

  setInsets(insets: Partial<Insets>) {
    this.insets = { ...NO_INSETS, ...insets };
    this.needsFrame = true;
  }

  projectPart(partId: string) {
    const index = this.partIndex.get(partId);
    const entry = index === undefined ? undefined : this.entries[index];

    if (index === undefined || !entry) {
      return null;
    }

    return this.toScreen(
      this.projected.copy(entry.center).add(this.partOffset(index)),
    );
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.abort.abort();
    cancelAnimationFrame(this.frameRequest);
    this.resizeObserver.disconnect();

    const canvas = this.renderer.domElement;

    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerCancel);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.controls.dispose();

    this.scene.traverse((object) => {
      if (!(object instanceof Mesh || object instanceof Points)) {
        return;
      }

      const materials: Material[] = [object.material].flat();

      object.geometry.dispose();

      for (const material of materials) {
        material.dispose();
      }
    });

    for (const geometry of this.geometries) {
      geometry.dispose();
    }

    this.pickMaterial.dispose();
    this.environment?.dispose();
    this.partTexture.dispose();
    this.selectionTexture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }

  private emit<K extends keyof AnatomyEngineEvents>(
    type: K,
    detail: AnatomyEngineEvents[K],
  ) {
    this.events.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private readonly markDirty = () => {
    this.dirty = true;
  };

  private createMarkers() {
    const geometry = new BufferGeometry();
    const material = new PointsMaterial({
      color: this.theme.marker,
      size: MARKER_SIZE,
      sizeAttenuation: false,
      transparent: true,
      opacity: MARKER_OPACITY,
      depthTest: false,
    });

    geometry.setAttribute("position", this.markerAttribute);

    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;",
      );
    };

    const markers = new Points(geometry, material);

    markers.frustumCulled = false;
    markers.renderOrder = MARKER_RENDER_ORDER;
    markers.visible = false;

    return markers;
  }

  private async loadChunks() {
    const { chunks } = this.model;
    let cursor = 0;

    try {
      await Promise.all(
        Array.from({ length: CHUNK_CONCURRENCY }, async () => {
          while (cursor < chunks.length) {
            const index = cursor;

            cursor += 1;
            await this.loadChunk(index);
          }
        }),
      );

      if (!this.disposed) {
        this.isReady = true;
        this.dirty = true;
        this.emit("ready", undefined);
      }
    } catch (cause) {
      if (!this.disposed) {
        this.emit(
          "error",
          cause instanceof AnatomyEngineError
            ? cause
            : new AnatomyEngineError(
                "chunk-unavailable",
                "A model chunk could not be loaded.",
                { cause },
              ),
        );
      }
    }
  }

  private async loadChunk(chunkIndex: number) {
    const chunk = this.model.chunks[chunkIndex];

    if (!chunk) {
      return;
    }

    const gzipUrl =
      typeof DecompressionStream === "undefined" ? undefined : chunk.gzip;
    const url = gzipUrl ?? chunk.url;

    if (!url) {
      throw new AnatomyEngineError(
        "decompression-unavailable",
        "This browser cannot decompress the gzip-only model chunks.",
      );
    }

    const response = await fetch(url, { signal: this.abort.signal });
    const buffer = await decodeChunk(response, chunk.bytes, !!gzipUrl);

    if (this.disposed) {
      return;
    }

    const groups = new Map<
      string,
      { system: SystemId; geometries: BufferGeometry[]; parts: Part[] }
    >();

    for (const [index, entry] of this.entries.entries()) {
      if (entry.part.chunk !== chunkIndex) {
        continue;
      }

      const geometry = this.createPartGeometry(entry, index, buffer);
      const pickMesh = new Mesh(geometry, this.pickMaterial);
      const batchKey = `${entry.part.system}:${this.partGroups[entry.part.id] ?? entry.part.system}`;
      const group = groups.get(batchKey) ?? {
        system: entry.part.system,
        geometries: [],
        parts: [],
      };

      pickMesh.matrixAutoUpdate = false;
      entry.pickMesh = pickMesh;
      this.geometries.push(geometry);
      group.geometries.push(geometry);
      group.parts.push(entry.part);
      groups.set(batchKey, group);
    }

    for (const { system, geometries, parts } of groups.values()) {
      const merged = mergeGeometries(geometries, false);

      if (!merged) {
        throw new AnatomyEngineError(
          "geometry-invalid",
          `The ${system} geometry of chunk ${chunkIndex} could not be merged.`,
        );
      }

      const mesh = new Mesh(merged, this.materials.get(system));

      mesh.frustumCulled = false;
      this.batches.push({ mesh, parts });
      this.scene.add(mesh);
    }

    this.loadedChunks += 1;
    this.partsChanged = true;
    this.dirty = true;
    this.emit("progress", {
      loaded: this.loadedChunks,
      total: this.model.chunks.length,
    });
  }

  private createPartGeometry(
    { part, bounds }: PartEntry,
    index: number,
    buffer: ArrayBuffer,
  ) {
    const geometry = new BufferGeometry();
    const values = part.vertexCount * 3;

    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(buffer, part.positions, values), 3),
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(
        new Int16Array(buffer, part.normals, values),
        3,
        true,
      ),
    );
    const color = new Color(
      this.partColors[part.id] ?? this.theme.systems[part.system],
    );
    const colors = new Float32Array(values);
    for (let i = 0; i < values; i += 3) color.toArray(colors, i);
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.setAttribute(
      "partIndex",
      new BufferAttribute(new Float32Array(part.vertexCount).fill(index), 1),
    );
    geometry.setIndex(
      new BufferAttribute(
        new Uint32Array(buffer, part.indices, part.indexCount),
        1,
      ),
    );
    geometry.boundingBox = bounds.clone();
    geometry.computeBoundingSphere();

    return geometry;
  }

  private readonly resize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (!width || !height) {
      return;
    }

    const compact = width < COMPACT_WIDTH || height < COMPACT_HEIGHT;

    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        compact ? COMPACT_PIXEL_RATIO : MAX_PIXEL_RATIO,
      ),
    );

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.layoutKey = "";
    this.partsChanged = true;
    this.needsFrame = true;
  };

  private readonly animate = (time: number) => {
    if (this.disposed) {
      return;
    }

    this.frameRequest = requestAnimationFrame(this.animate);

    const delta = Math.min(
      (time - (this.lastFrameTime || time)) / 1000,
      MAX_FRAME_SECONDS,
    );
    const moving =
      Math.abs(this.explode - this.explodeTarget) > EXPLODE_EPSILON;

    this.lastFrameTime = time;

    if (moving) {
      this.explode = MathUtils.damp(
        this.explode,
        this.explodeTarget,
        EXPLODE_DAMPING,
        delta,
      );
      this.dirty = true;
    }

    if (this.explode < FOCUS_RELEASE_BELOW && this.focusIndex >= 0) {
      this.releaseFocus();
    }

    if (this.glide.update(this.camera, this.controls, delta)) {
      this.dirty = true;
    }

    if (this.partsChanged || moving) {
      this.updateParts();
    }

    if (this.needsFrame || moving) {
      this.frame(moving);
    }

    this.updateControls();

    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.updateScreenTargets();
      this.dirty = false;
      this.emit("render", undefined);
    }
  };

  private updateControls() {
    const panning = this.explode >= PAN_FROM;

    this.controls.enableRotate = !panning;
    this.controls.mouseButtons.LEFT = panning ? MOUSE.PAN : MOUSE.ROTATE;
    this.controls.touches.ONE = panning ? TOUCH.PAN : TOUCH.ROTATE;
    this.controls.autoRotate =
      this.autoRotate && !this.isolated && this.explode < AUTO_ROTATE_BELOW;
    this.stage.visible =
      this.showStage && this.explode < STAGE_HIDDEN_FROM && !this.isolated;
    this.markers.visible = this.explode > MARKERS_FROM;
    this.controls.update();

    if (this.controls.autoRotate) {
      this.dirty = true;
    }
  }

  private updateParts() {
    const visibleParts = this.model.parts.filter((part) =>
      this.isPartVisible(part),
    );

    this.updateLayout(visibleParts);

    for (const [index, entry] of this.entries.entries()) {
      const { part, center, pickMesh } = entry;
      const offset = this.explodedOffset(entry);
      const visible = this.isPartVisible(part);
      const base = index * STRIDE;

      this.partState.set([offset.x, offset.y, offset.z, visible ? 1 : 0], base);
      this.selectionState[base + SELECTED_CHANNEL] = this.selection.has(part.id)
        ? CHANNEL_ON
        : 0;

      this.markerPositions.set(
        visible
          ? [center.x + offset.x, center.y + offset.y, center.z + offset.z]
          : [HIDDEN_MARKER, HIDDEN_MARKER, HIDDEN_MARKER],
        index * 3,
      );

      if (pickMesh) {
        pickMesh.position.copy(offset);
        pickMesh.updateMatrix();
        pickMesh.updateMatrixWorld(true);
      }
    }

    for (const batch of this.batches) {
      batch.mesh.visible = batch.parts.some((part) => this.isPartVisible(part));
      batch.mesh.frustumCulled = this.explode === 0;
    }
    this.partTexture.needsUpdate = true;
    this.selectionTexture.needsUpdate = true;
    this.markerAttribute.needsUpdate = true;
    this.partsChanged = false;
    this.dirty = true;
  }

  private updateLayout(visibleParts: readonly Part[]) {
    const layoutKey = `${visibleParts.map((part) => part.id).join(",")}:${this.camera.aspect.toFixed(3)}`;

    if (layoutKey === this.layoutKey) {
      return;
    }

    const layout = createExplodeLayout(visibleParts, this.camera.aspect);

    for (const { part, center, destination } of this.entries) {
      const cell = layout.cells.get(part.id);

      if (cell) {
        destination.set(cell.x, cell.y + BODY_CENTER_Y, 0);
      } else {
        destination.copy(center);
      }
    }

    this.packingWidth = layout.width;
    this.packingHeight = layout.height;
    this.layoutKey = layoutKey;

    if (this.explode > LAYOUT_REFRAME_FROM && !this.isolated) {
      this.needsFrame = true;
    }
  }

  private isPartVisible(part: Part) {
    const visible =
      this.visibleParts?.has(part.id) ?? this.visibleSystems.has(part.system);
    return visible && (!this.isolated || this.selection.has(part.id));
  }

  private explodedOffset({ center, destination, bloom }: PartEntry) {
    if (this.explode <= BLOOM_END) {
      return this.offset.copy(bloom).multiplyScalar(this.explode / BLOOM_END);
    }

    const t = (this.explode - BLOOM_END) / (1 - BLOOM_END);

    return this.offset.set(
      MathUtils.lerp(bloom.x, destination.x - center.x, t),
      MathUtils.lerp(bloom.y, destination.y - center.y, t),
      MathUtils.lerp(bloom.z, -center.z, t),
    );
  }

  private partOffset(index: number) {
    const base = index * STRIDE;

    return this.offset.set(
      this.partState[base] ?? 0,
      this.partState[base + 1] ?? 0,
      this.partState[base + 2] ?? 0,
    );
  }

  private frame(moving = false) {
    this.needsFrame = false;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (!width || !height) {
      return;
    }

    const { top, right, bottom, left } = this.insets;
    const availableWidth = Math.max(MIN_VIEWPORT, width - left - right);
    const availableHeight = Math.max(MIN_VIEWPORT, height - top - bottom);
    const fovFactor = 2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2));

    const fit = (size: Vector3, margin: number) =>
      Math.max(
        MIN_ZOOM,
        (Math.max(
          (size.y * height) / availableHeight,
          (size.x * width) / availableWidth / this.camera.aspect,
          size.z,
        ) /
          fovFactor) *
          margin,
      );

    this.camera.setViewOffset(
      width,
      height,
      (right - left) / 2,
      (bottom - top) / 2,
      width,
      height,
    );

    const isolatedBox = this.frameParts
      ? this.boundsFor(this.frameParts)
      : this.isolated
        ? this.selectionBox()
        : undefined;

    if (isolatedBox && !isolatedBox.isEmpty()) {
      const distance = fit(isolatedBox.getSize(new Vector3()), ISOLATED_MARGIN);

      this.controls.maxDistance = Math.max(MAX_ZOOM, distance * 2);
      this.aim(
        isolatedBox.getCenter(new Vector3()),
        ISOLATION_APPROACH,
        distance,
      );

      return;
    }

    const extent = Math.max(
      0,
      (this.explode - FRAME_EXPLODE_FROM) / (1 - FRAME_EXPLODE_FROM),
    );
    const front =
      extent > FRONT_VIEW_FROM || (moving && this.explode > MOVING_FRONT_FROM);
    const visibleBox = this.boundsFor(
      this.model.parts.filter((p) => this.isPartVisible(p)).map((p) => p.id),
    );
    if (visibleBox.isEmpty()) return;
    const assembledDistance = fit(
      visibleBox.getSize(new Vector3()),
      ASSEMBLED_MARGIN,
    );
    const explodedDistance = fit(
      new Vector3(this.packingWidth, this.packingHeight, 0),
      EXPLODED_MARGIN,
    );
    const target = new Vector3().lerpVectors(
      visibleBox.getCenter(new Vector3()),
      new Vector3(0, BODY_CENTER_Y, 0),
      extent,
    );

    this.controls.maxDistance = MAX_ZOOM;
    this.aim(
      target,
      VIEW_DIRECTIONS[front ? "front" : this.view],
      MathUtils.lerp(assembledDistance, explodedDistance, extent),
    );
  }

  private selectionBox() {
    const box = new Box3();

    for (const [index, { part, bounds }] of this.entries.entries()) {
      if (this.selection.has(part.id)) {
        box.union(bounds.clone().translate(this.partOffset(index)));
      }
    }

    return box.isEmpty() ? undefined : box;
  }

  private aim(target: Vector3, direction: Vector3, distance: number) {
    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction, distance);
    this.controls.update();
    this.dirty = true;
  }

  private updateScreenTargets() {
    this.screenTargets = [];

    if (this.explode <= SCREEN_TARGETS_FROM) {
      return;
    }

    const hasSolidPart = this.entries.some(
      ({ part }, index) =>
        part.system !== SURFACE_SYSTEM && this.isShown(index),
    );

    for (const [index, { part, center }] of this.entries.entries()) {
      if (
        !this.isShown(index) ||
        (hasSolidPart && part.system === SURFACE_SYSTEM)
      ) {
        continue;
      }

      const offset = this.partOffset(index).clone();
      const corners = Array.from({ length: 8 }, (_, corner) =>
        this.toScreen(
          this.projected
            .set(
              part.bounds[corner & 1 ? 1 : 0][0],
              part.bounds[corner & 2 ? 1 : 0][1],
              part.bounds[corner & 4 ? 1 : 0][2],
            )
            .add(offset),
          false,
        ),
      ).filter((point) => point !== null);
      const point = this.toScreen(this.projected.copy(center).add(offset));

      if (point) {
        this.screenTargets.push({
          index,
          ...point,
          left: Math.min(...corners.map(({ x }) => x)),
          right: Math.max(...corners.map(({ x }) => x)),
          top: Math.min(...corners.map(({ y }) => y)),
          bottom: Math.max(...corners.map(({ y }) => y)),
        });
      }
    }
  }

  private readonly isShown = (index: number) =>
    (this.partState[index * STRIDE + VISIBILITY_COMPONENT] ?? 0) > VISIBLE;

  private toScreen(world: Vector3, clip = true) {
    world.project(this.camera);

    if (clip && (world.z < -1 || world.z > 1)) {
      return null;
    }

    return {
      x: ((world.x + 1) * this.container.clientWidth) / 2,
      y: ((1 - world.y) * this.container.clientHeight) / 2,
    };
  }

  private findScreenTarget(x: number, y: number, radius: number) {
    let best = -1;
    let score = Number.POSITIVE_INFINITY;

    for (const target of this.screenTargets) {
      const dx = Math.max(target.left - x, 0, x - target.right);
      const dy = Math.max(target.top - y, 0, y - target.bottom);
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        continue;
      }

      const candidate =
        distance +
        Math.hypot(target.x - x, target.y - y) * TARGET_CENTER_WEIGHT;

      if (candidate < score) {
        score = candidate;
        best = target.index;
      }
    }

    return best;
  }

  private pick(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    return this.picker.pick(this.pointer, this.camera);
  }

  private setHover(index: number, event?: PointerEvent) {
    const part = this.entries[index]?.part;
    const hadHover = this.hoverIndex >= 0;

    if (index !== this.hoverIndex) {
      if (hadHover) {
        this.selectionState[this.hoverIndex * STRIDE + HOVERED_CHANNEL] = 0;
      }

      if (part) {
        this.selectionState[index * STRIDE + HOVERED_CHANNEL] = CHANNEL_ON;
      }

      this.selectionTexture.needsUpdate = true;
      this.dirty = true;
    }

    this.hoverIndex = part ? index : -1;
    this.renderer.domElement.style.cursor = part ? "pointer" : "";

    if (part && event) {
      const rect = this.container.getBoundingClientRect();

      this.emit("hover", {
        part,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    } else if (hadHover) {
      this.emit("hover", null);
    }
  }

  private focus(index: number) {
    const entry = this.entries[index];

    if (!entry) {
      return;
    }

    const size = entry.bounds.getSize(new Vector3());

    this.glide.start(
      entry.center.clone().add(this.partOffset(index)),
      Math.max(size.x, size.y, size.z),
      this.camera,
    );

    this.focusIndex = index;
    this.setGhosts(index);
    this.emit("focus", entry.part);
  }

  private releaseFocus() {
    this.glide.stop();
    this.focusIndex = -1;
    this.setGhosts(-1);
    this.emit("focus", null);
  }

  private setGhosts(focusIndex: number) {
    for (let index = 0; index < this.entries.length; index++) {
      this.selectionState[index * STRIDE + GHOSTED_CHANNEL] =
        focusIndex < 0 || index === focusIndex ? 0 : CHANNEL_ON;
    }

    this.selectionTexture.needsUpdate = true;
    this.dirty = true;
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.setHover(-1);
    this.tap.down(
      event.pointerId,
      event.clientX,
      event.clientY,
      event.pointerType === "touch" ? TOUCH_TAP_THRESHOLD : MOUSE_TAP_THRESHOLD,
    );
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    this.tap.move(event.pointerId, event.clientX, event.clientY);

    if (event.buttons || event.pointerType === "touch") {
      this.setHover(-1);

      return;
    }

    this.setHover(this.pick(event), event);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const tapped = this.tap.up(event.pointerId, event.clientX, event.clientY);

    if (!tapped || !this.isReady) {
      return;
    }

    const index = this.pick(event);
    const part = this.entries[index]?.part;

    if (part) {
      this.setHover(-1);
      this.emit("select", part);

      if (this.explode > FOCUS_FROM) {
        this.focus(index);
      }

      return;
    }

    if (this.explode <= SCREEN_TARGETS_FROM) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const radius =
      event.pointerType === "touch" ? TOUCH_TARGET_RADIUS : MOUSE_TARGET_RADIUS;
    const target = this.findScreenTarget(
      event.clientX - rect.left,
      event.clientY - rect.top,
      radius,
    );
    const targetPart = this.entries[target]?.part;

    if (targetPart) {
      this.setHover(-1);
      this.emit("select", targetPart);
    }
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    this.tap.cancel(event.pointerId);
  };

  private readonly onPointerLeave = () => {
    this.setHover(-1);
  };

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.emit(
      "error",
      new AnatomyEngineError("context-lost", "The WebGL context was lost."),
    );
  };
}
