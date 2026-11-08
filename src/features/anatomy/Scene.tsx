import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Structure } from "../../data/anatomy";
import { screenshot } from "../../lib/export";
import { useApp } from "../../stores/useApp";
import {
  damping,
  easeInOutCubic,
  shortestAngle,
} from "../../three/animations/motion";
type Props = {
  items: Structure[];
  selected: string;
  onSelect: (id: string) => void;
  hidden: string[];
  opacity: number;
  explode: boolean;
  rotate: boolean;
  view: string;
  reset: number;
  focus?: number;
};
export default function Scene(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const wake = useRef<() => void>(() => {});
  const quality = useApp((s) => s.prefs.quality);
  const qualityRef = useRef(quality);
  const [error, setError] = useState("");
  // Color, selection and layer edits must not recreate the renderer or reset the camera.
  const geometryKey = JSON.stringify(
    props.items.map(({ id, position, scale }) => [id, position, scale]),
  );
  useLayoutEffect(() => {
    live.current = props;
    qualityRef.current = quality;
    wake.current();
  }, [props, quality]);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "WebGL rendering is unavailable. Structure information and learning tools remain available.",
      );
      return;
    }
    setError("");
    renderer.setClearColor("#0b1422");
    renderer.domElement.setAttribute("aria-label", "Interactive 3D anatomy");
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.5, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 2;
    controls.maxDistance = 25;
    scene.add(new THREE.AmbientLight(0xbad9ff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(4, 6, 8);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x38bdf8, 2);
    rim.position.set(-5, 0, -5);
    scene.add(rim);
    const meshes = live.current.items.map((item) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 24),
        new THREE.MeshStandardMaterial({
          color: item.color,
          transparent: true,
          opacity: 0,
          roughness: 0.55,
          metalness: 0.08,
        }),
      );
      mesh.scale.set(...item.scale);
      mesh.position.set(...item.position);
      mesh.userData.id = item.id;
      scene.add(mesh);
      return mesh;
    });
    const grid = new THREE.GridHelper(14, 28, 0x26435c, 0x142a40);
    grid.position.y = -3;
    scene.add(grid);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motion.matches,
      frame = 0,
      lastTime = 0,
      visible = true,
      disposed = false,
      rendering = false;
    let lastView = "",
      lastReset = -1,
      lastFocus = 0,
      hovered = "",
      rotationSpeed = 0,
      interacting = false;
    let cameraMove: {
      from: THREE.Spherical;
      to: THREE.Spherical;
      fromTarget: THREE.Vector3;
      toTarget: THREE.Vector3;
      elapsed: number;
    } | null = null;
    const targetPosition = new THREE.Vector3(),
      targetColor = new THREE.Color(),
      offset = new THREE.Vector3();
    const spherical = new THREE.Spherical();
    function requestRender() {
      if (!disposed && !rendering && !frame && visible && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    wake.current = requestRender;
    function moveCamera(target: THREE.Vector3, position: THREE.Vector3) {
      const from = new THREE.Spherical().setFromVector3(
        offset.copy(camera.position).sub(controls.target),
      );
      const to = new THREE.Spherical().setFromVector3(
        offset.copy(position).sub(target),
      );
      to.theta = shortestAngle(from.theta, to.theta);
      to.makeSafe();
      from.makeSafe();
      cameraMove = {
        from,
        to,
        fromTarget: controls.target.clone(),
        toTarget: target.clone(),
        elapsed: 0,
      };
    }
    function render(time: number) {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      rendering = true;
      const dt = lastTime ? Math.max(0, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const p = live.current;
      const alpha = reduced ? 1 : damping(dt);
      let moving = false;
      const pixelRatio = Math.min(
        devicePixelRatio,
        qualityRef.current === "low" ? 1 : 1.7,
      );
      if (renderer.getPixelRatio() !== pixelRatio)
        renderer.setPixelRatio(pixelRatio);
      if (lastView !== p.view || lastReset !== p.reset) {
        const views: Record<string, [number, number, number]> = {
          Front: [0, 0.5, 12],
          Back: [0, 0.5, -12],
          Left: [12, 0.5, 0],
          Right: [-12, 0.5, 0],
          Superior: [0, 12, 0.01],
          Inferior: [0, -12, 0.01],
        };
        moveCamera(
          new THREE.Vector3(0, 0.5, 0),
          new THREE.Vector3(...(views[p.view] || views.Front)),
        );
        // Initial layout is immediate; subsequent user camera commands interpolate.
        if (lastReset === -1 && cameraMove) cameraMove.elapsed = 1;
        lastView = p.view;
        lastReset = p.reset;
      }
      if (lastFocus !== (p.focus || 0)) {
        const item = p.items.find((i) => i.id === p.selected);
        if (item) {
          const target = new THREE.Vector3(...item.position).multiplyScalar(
            p.explode ? 1.6 : 1,
          );
          const direction = camera.position
            .clone()
            .sub(controls.target)
            .normalize();
          const radius = Math.max(...item.scale) * 4 + 1.5;
          moveCamera(
            target,
            target.clone().addScaledVector(direction, Math.max(2.5, radius)),
          );
        }
        lastFocus = p.focus || 0;
      }
      controls.enableDamping = !reduced && !cameraMove;
      controls.dampingFactor = alpha;
      const desiredSpeed = p.rotate && !reduced && !interacting ? 1 : 0;
      rotationSpeed += (desiredSpeed - rotationSpeed) * alpha;
      if (Math.abs(rotationSpeed - desiredSpeed) < 0.001)
        rotationSpeed = desiredSpeed;
      controls.autoRotate = !cameraMove && rotationSpeed > 0.001;
      controls.autoRotateSpeed = rotationSpeed;
      if (cameraMove) {
        cameraMove.elapsed += dt;
        const t = reduced ? 1 : Math.min(1, cameraMove.elapsed / 0.7),
          e = easeInOutCubic(t);
        spherical.set(
          THREE.MathUtils.lerp(cameraMove.from.radius, cameraMove.to.radius, e),
          THREE.MathUtils.lerp(cameraMove.from.phi, cameraMove.to.phi, e),
          THREE.MathUtils.lerp(cameraMove.from.theta, cameraMove.to.theta, e),
        );
        controls.target.lerpVectors(
          cameraMove.fromTarget,
          cameraMove.toTarget,
          e,
        );
        camera.position
          .copy(controls.target)
          .add(offset.setFromSpherical(spherical));
        if (t === 1) cameraMove = null;
        else moving = true;
      }
      meshes.forEach((mesh) => {
        const item = p.items.find((i) => i.id === mesh.userData.id);
        if (!item) return;
        targetPosition
          .set(...item.position)
          .multiplyScalar(p.explode ? 1.6 : 1);
        const distance = mesh.position.distanceToSquared(targetPosition);
        if (distance > 1e-8) {
          mesh.position.lerp(targetPosition, alpha);
          moving = true;
        } else mesh.position.copy(targetPosition);
        const opacity = p.hidden.includes(item.id) ? 0 : p.opacity;
        if (Math.abs(mesh.material.opacity - opacity) > 0.001) {
          mesh.material.opacity += (opacity - mesh.material.opacity) * alpha;
          moving = true;
        } else mesh.material.opacity = opacity;
        mesh.visible = mesh.material.opacity > 0.001;
        targetColor.set(item.color);
        const colorDelta =
          Math.abs(mesh.material.color.r - targetColor.r) +
          Math.abs(mesh.material.color.g - targetColor.g) +
          Math.abs(mesh.material.color.b - targetColor.b);
        if (colorDelta > 0.001) {
          mesh.material.color.lerp(targetColor, alpha);
          moving = true;
        } else mesh.material.color.copy(targetColor);
        targetColor.set(
          item.id === p.selected
            ? 0x184a67
            : item.id === hovered
              ? 0x122a3b
              : 0,
        );
        const glow = mesh.material.emissive;
        const glowDelta =
          Math.abs(glow.r - targetColor.r) +
          Math.abs(glow.g - targetColor.g) +
          Math.abs(glow.b - targetColor.b);
        if (glowDelta > 0.001) {
          glow.lerp(targetColor, alpha);
          moving = true;
        } else glow.copy(targetColor);
        mesh.material.emissiveIntensity = 0.7;
      });
      const changed = controls.update(dt);
      renderer.render(scene, camera);
      rendering = false;
      if (
        moving ||
        changed ||
        controls.autoRotate ||
        Math.abs(rotationSpeed - desiredSpeed) > 0.001
      ) {
        requestRender();
      } else {
        // Starting a new interaction must not include time spent idle.
        lastTime = 0;
      }
    }
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down = [0, 0];
    function hit(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(
        meshes.filter((m) => m.visible && m.material.opacity > 0.05),
      )[0]?.object.userData.id as string | undefined;
    }
    const start = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (
        e.button !== 0 ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5
      )
        return;
      const id = hit(e);
      if (id) live.current.onSelect(id);
    };
    const hover = (e: PointerEvent) => {
      if (e.buttons || e.pointerType === "touch") return;
      const id = hit(e) || "";
      if (id !== hovered) {
        hovered = id;
        renderer.domElement.style.cursor = id ? "pointer" : "grab";
        requestRender();
      }
    };
    const leave = () => {
      hovered = "";
      renderer.domElement.style.cursor = "grab";
      requestRender();
    };
    const controlStart = () => {
      cameraMove = null;
      interacting = true;
      requestRender();
    };
    const controlEnd = () => {
      interacting = false;
      requestRender();
    };
    controls.addEventListener("start", controlStart);
    controls.addEventListener("end", controlEnd);
    controls.addEventListener("change", requestRender);
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerleave", leave);
    const resize = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestRender();
    });
    resize.observe(host);
    function suspendOrResume() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      requestRender();
    }
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      suspendOrResume();
    });
    intersection.observe(host);
    const changeMotion = () => {
      reduced = motion.matches;
      if (reduced) rotationSpeed = 0;
      requestRender();
    };
    motion.addEventListener("change", changeMotion);
    document.addEventListener("visibilitychange", suspendOrResume);
    requestRender();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      wake.current = () => {};
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", changeMotion);
      document.removeEventListener("visibilitychange", suspendOrResume);
      controls.removeEventListener("start", controlStart);
      controls.removeEventListener("end", controlEnd);
      controls.removeEventListener("change", requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      renderer.domElement.removeEventListener("pointermove", hover);
      renderer.domElement.removeEventListener("pointerleave", leave);
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [geometryKey]);
  return (
    <div className="scene-wrap">
      <div className="scene" ref={root} />
      <div className="viewport-label">
        3D PERSPECTIVE <span>WEBGL</span>
      </div>
      <div className="model-disclaimer">
        SIMPLIFIED EDUCATIONAL MODEL
        <br />
        <small>Schematic geometry · not anatomical reconstruction</small>
      </div>
      {error && <p className="render-error">{error}</p>}
      <button
        className="capture"
        onClick={() => {
          const canvas = root.current?.querySelector("canvas");
          if (canvas) screenshot(canvas);
        }}
      >
        Export PNG
      </button>
    </div>
  );
}
