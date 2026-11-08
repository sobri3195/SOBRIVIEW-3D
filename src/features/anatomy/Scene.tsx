import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Structure } from "../../data/anatomy";
import { screenshot } from "../../lib/export";
import { useApp } from "../../stores/useApp";
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
};
export default function Scene(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const [error, setError] = useState("");
  const prefs = useApp((s) => s.prefs);
  useEffect(() => {
    live.current = props;
  }, [props]);
  useEffect(() => {
    if (!root.current) return;
    const host = root.current;
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
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, prefs.quality === "low" ? 1 : 1.7),
    );
    renderer.setClearColor("#0b1422");
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    scene.add(new THREE.AmbientLight(0xbad9ff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(4, 6, 8);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x38bdf8, 2);
    rim.position.set(-5, 0, -5);
    scene.add(rim);
    const meshes = props.items.map((item) => {
      const geometry = new THREE.SphereGeometry(1, 32, 24);
      const material = new THREE.MeshStandardMaterial({
        color: item.color,
        transparent: true,
        opacity: live.current.opacity,
        roughness: 0.55,
        metalness: 0.08,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(...item.scale);
      mesh.position.set(...item.position);
      mesh.userData.id = item.id;
      scene.add(mesh);
      return mesh;
    });
    const grid = new THREE.GridHelper(14, 28, 0x26435c, 0x142a40);
    grid.position.y = -3;
    scene.add(grid);
    const raycaster = new THREE.Raycaster();
    let down = [0, 0];
    const start = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        meshes.filter((m) => m.visible),
      )[0];
      if (hit) live.current.onSelect(hit.object.userData.id);
    };
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    const resize = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(host);
    let frame = 0,
      lastReset = -1,
      lastView = "";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function render() {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;
      const p = live.current;
      if (lastReset !== p.reset || lastView !== p.view) {
        lastReset = p.reset;
        lastView = p.view;
        const positions: Record<string, [number, number, number]> = {
          Front: [0, 0.5, 12],
          Back: [0, 0.5, -12],
          Left: [12, 0.5, 0],
          Right: [-12, 0.5, 0],
          Superior: [0, 12, 0.01],
          Inferior: [0, -12, 0.01],
        };
        camera.position.set(...(positions[p.view] || positions.Front));
        controls.target.set(0, 0.5, 0);
        controls.update();
      }
      controls.autoRotate = p.rotate && !reduced;
      controls.autoRotateSpeed = 1;
      meshes.forEach((m, i) => {
        const item = props.items[i];
        m.visible = !p.hidden.includes(item.id);
        m.material.opacity = p.opacity;
        m.material.emissive.set(item.id === p.selected ? 0x184a67 : 0);
        m.material.emissiveIntensity = 0.7;
        const factor = p.explode ? 1.6 : 1;
        m.position.lerp(
          new THREE.Vector3(...item.position).multiplyScalar(factor),
          0.12,
        );
      });
      controls.update();
      renderer.render(scene, camera);
    }
    render();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.items, prefs.quality]);
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
