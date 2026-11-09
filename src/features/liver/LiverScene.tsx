import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { download } from "../../lib/export";
import {
  bindStructures,
  centerModel,
  disposeModel,
  fitDistance,
  liverAsset,
  modelCredit,
  structures,
  views,
  type LiverMesh,
  type Manifest,
  type StructureId,
  type View,
} from "./model";

export type LoadState = "loading" | "ready" | "error" | "fallback";
export type Display = Record<
  StructureId,
  { visible: boolean; opacity: number }
>;
type Props = {
  selected: StructureId;
  display: Display;
  rotate: boolean;
  view: View;
  reset: number;
  focus: number;
  retry: number;
  state: LoadState;
  error: string;
  onSelect: (id: StructureId) => void;
  onLoad: (ids: StructureId[]) => void;
  onState: (state: LoadState, error?: string) => void;
  onRetry: () => void;
};
export default function LiverScene(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const wake = useRef(() => {});
  const capture = useRef(() => {});
  useLayoutEffect(() => {
    live.current = props;
    wake.current();
  }, [props]);
  useEffect(() => {
    const host = root.current!;
    const abort = new AbortController();
    let disposed = false,
      contextLost = false,
      frame = 0,
      lastTime = 0,
      onscreen = true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      live.current.onState(
        "fallback",
        "WebGL tidak tersedia. Preview statis dari model yang sama ditampilkan.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setClearColor("#0b1422");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D liver anatomy",
    );
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(0, 0, 10);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 0.5;
    controls.maxDistance = 35;
    scene.add(new THREE.HemisphereLight(0xfff1e2, 0x33495f, 2));
    const key = new THREE.DirectionalLight(0xffe5d4, 2.7);
    key.position.set(-4, 5, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb7d5ed, 1.3);
    fill.position.set(5, 1, -4);
    scene.add(fill);
    let model: THREE.Object3D | undefined;
    let meshes = new Map<StructureId, LiverMesh>();
    let bounds = new THREE.Box3();
    const framed = new THREE.Box3();
    let lastView = "",
      lastReset = -1,
      lastFocus = 0,
      interacting = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches;
    function requestRender() {
      if (
        !disposed &&
        !contextLost &&
        !frame &&
        onscreen &&
        !document.hidden &&
        !["fallback", "error"].includes(live.current.state)
      )
        frame = requestAnimationFrame(render);
    }
    wake.current = requestRender;
    function fit(
      box: THREE.Box3,
      direction = camera.position.clone().sub(controls.target).normalize(),
    ) {
      framed.copy(box);
      const target = box.getCenter(new THREE.Vector3());
      const distance = fitDistance(
        box,
        direction,
        camera.up,
        camera.aspect,
        camera.fov,
      );
      controls.target.copy(target);
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.near = Math.max(0.005, distance / 1000);
      camera.far = Math.max(100, distance * 10);
      camera.updateProjectionMatrix();
      controls.update();
    }
    function render(time: number) {
      frame = 0;
      if (disposed || contextLost || !onscreen || document.hidden) return;
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = time;
      const p = live.current;
      if (model) {
        if (lastView !== p.view || lastReset !== p.reset) {
          const preset = views[p.view];
          camera.up.fromArray(preset.up);
          fit(bounds, new THREE.Vector3().fromArray(preset.direction));
          lastView = p.view;
          lastReset = p.reset;
        }
        if (lastFocus !== p.focus) {
          const mesh = meshes.get(p.selected);
          if (mesh) fit(new THREE.Box3().setFromObject(mesh));
          lastFocus = p.focus;
        }
        for (const [id, mesh] of meshes) {
          const display = p.display[id];
          mesh.visible = display.visible && display.opacity > 0;
          const transparent = display.opacity < 0.999;
          if (mesh.material.transparent !== transparent) {
            mesh.material.transparent = transparent;
            mesh.material.needsUpdate = true;
          }
          mesh.material.opacity = display.opacity;
          mesh.material.depthWrite = !transparent;
          // Draw opaque inner structures first, then the translucent tissue shell.
          mesh.renderOrder =
            id === "liver" && transparent ? 2 : transparent ? 1 : 0;
          mesh.material.emissive.set(id === p.selected ? 0x502419 : 0x000000);
          mesh.material.emissiveIntensity = 0.2;
        }
      }
      controls.autoRotate = !!model && p.rotate && !reduced && !interacting;
      controls.autoRotateSpeed = 1;
      controls.update(dt);
      renderer.render(scene, camera);
      if (controls.autoRotate) requestRender();
      else lastTime = 0;
    }
    const resize = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      if (model) fit(framed);
      else camera.updateProjectionMatrix();
      requestRender();
    });
    resize.observe(host);
    const visibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      requestRender();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      visibility();
    });
    intersection.observe(host);
    const changeMotion = () => {
      reduced = motion.matches;
      requestRender();
    };
    motion.addEventListener("change", changeMotion);
    document.addEventListener("visibilitychange", visibility);
    const startControl = () => {
      interacting = true;
    };
    const endControl = () => {
      interacting = false;
      requestRender();
    };
    controls.addEventListener("change", requestRender);
    controls.addEventListener("start", startControl);
    controls.addEventListener("end", endControl);
    let down: [number, number] = [0, 0];
    const start = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (
        e.button !== 0 ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 ||
        live.current.state !== "ready"
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hits = ray.intersectObjects(
        [...meshes.values()].filter(
          (m) => m.visible && m.material.opacity > 0.05,
        ),
      );
      // In inside-view, let the opaque vessel behind a translucent shell be selected.
      const hit =
        hits.find((h) => (h.object as LiverMesh).material.opacity >= 0.5) ||
        hits[0];
      if (hit)
        live.current.onSelect(hit.object.userData.structureId as StructureId);
    };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    const lost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      abort.abort();
      live.current.onState(
        "fallback",
        "Konteks WebGL terputus. Preview 2D ditampilkan.",
      );
      controls.enabled = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    capture.current = () => {
      if (live.current.state !== "ready") return;
      renderer.render(scene, camera);
      const out = document.createElement("canvas");
      out.width = Math.max(1000, renderer.domElement.width);
      out.height = renderer.domElement.height + 88;
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#0b1422";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(
        renderer.domElement,
        (out.width - renderer.domElement.width) / 2,
        0,
      );
      ctx.fillStyle = "#dbe6ef";
      ctx.font = "12px sans-serif";
      ctx.fillText(
        "SOBRIVIEW · Model anatomi referensi untuk edukasi; bukan rekonstruksi pasien.",
        14,
        out.height - 58,
      );
      ctx.font = "11px sans-serif";
      ctx.fillText(modelCredit, 14, out.height - 36);
      ctx.fillText(
        "Asset: github.com/organui/liver-3d · Illustrative materials / CC BY 4.0",
        14,
        out.height - 16,
      );
      out.toBlob((blob) => {
        if (blob) download("sobriview-liver-educational.png", blob);
      });
    };
    async function load() {
      let loaded: THREE.Object3D | undefined;
      try {
        const [metaResponse, modelResponse] = await Promise.all([
          fetch(liverAsset("manifest.json"), { signal: abort.signal }),
          fetch(liverAsset("liver.glb"), { signal: abort.signal }),
        ]);
        if (!metaResponse.ok || !modelResponse.ok)
          throw new Error("Berkas model lokal tidak tersedia.");
        const manifest: Manifest = await metaResponse.json();
        const buffer = await modelResponse.arrayBuffer();
        const header = new DataView(buffer);
        if (
          buffer.byteLength !== manifest.runtime.bytes ||
          header.getUint32(0, true) !== 0x46546c67 ||
          header.getUint32(4, true) !== 2 ||
          header.getUint32(8, true) !== buffer.byteLength
        )
          throw new Error("Berkas GLB tidak valid atau tidak lengkap.");
        loaded = (await new GLTFLoader().parseAsync(buffer, "")).scene;
        if (disposed || contextLost) {
          disposeModel(loaded);
          return;
        }
        meshes = bindStructures(loaded, manifest);
        model = centerModel(loaded);
        bounds = new THREE.Box3().setFromObject(model);
        framed.copy(bounds);
        scene.add(model);
        live.current.onLoad(
          structures.filter((s) => meshes.has(s.id)).map((s) => s.id),
        );
        live.current.onState("ready");
        requestRender();
      } catch (error) {
        if (loaded) disposeModel(loaded);
        if (!disposed && !contextLost)
          live.current.onState(
            "error",
            error instanceof Error ? error.message : "Model gagal dimuat.",
          );
      }
    }
    void load();
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      wake.current = () => {};
      capture.current = () => {};
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", changeMotion);
      document.removeEventListener("visibilitychange", visibility);
      controls.removeEventListener("change", requestRender);
      controls.removeEventListener("start", startControl);
      controls.removeEventListener("end", endControl);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      if (model) disposeModel(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.retry]);
  return (
    <div className="scene-wrap liver-scene" data-state={props.state}>
      <div className="scene" ref={root} hidden={props.state !== "ready"} />
      {props.state !== "ready" && (
        <div className="liver-placeholder">
          <img
            src={liverAsset("liver-preview.webp")}
            alt="Render statis permukaan hati dari model BodyParts3D yang sama"
          />
          <div role={props.state === "error" ? "alert" : "status"}>
            <strong>
              {props.state === "loading"
                ? "Memuat anatomi hati…"
                : props.state === "fallback"
                  ? "Tampilan 2D"
                  : "Model gagal dimuat"}
            </strong>
            <p>
              {props.error || "Preview 2D · memuat tujuh struktur model lokal"}
            </p>
            {props.state !== "loading" && (
              <button onClick={props.onRetry}>Coba lagi</button>
            )}
          </div>
        </div>
      )}
      {props.state === "ready" && (
        <>
          <div className="viewport-label">
            ANATOMI HATI <span>3D · {props.view.toUpperCase()}</span>
          </div>
          <div className="model-disclaimer">
            MODEL REFERENSI EDUKASI
            <br />
            <small>BodyParts3D · CC BY 4.0 · bukan rekonstruksi pasien</small>
          </div>
          <button className="capture" onClick={() => capture.current()}>
            Export PNG
          </button>
        </>
      )}
    </div>
  );
}
