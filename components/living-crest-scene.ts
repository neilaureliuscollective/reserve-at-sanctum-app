import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export type CrestScene = {
  setActive(active: boolean): void;
  setPointer(x: number, y: number): void;
  dispose(): void;
};
const base = "/brand/legacy-reserve/living-crest/";
/** Source-derived raised geometry; no substituted monogram or letter shapes. */
export async function createCrestScene(
  host: HTMLElement,
  signal: AbortSignal,
  unavailable: () => void,
): Promise<CrestScene> {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const canvas = renderer.domElement;
  canvas.className = "living-crest__canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const textures: THREE.Texture[] = [],
    geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [];
  let environment: THREE.WebGLRenderTarget | undefined;
  let frame = 0,
    active = false,
    disposed = false,
    last = 0,
    elapsed = 0,
    count = 0;
  let targetX = 0,
    targetY = 0,
    x = 0,
    y = 0;
  const coarse = matchMedia("(pointer: coarse)").matches;
  let ratio = Math.min(devicePixelRatio, coarse ? 1 : 1.5);
  const stage = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.z = 4.7;
  const emblem = new THREE.Group();
  stage.add(emblem);
  const resize = () => {
    if (disposed) return;
    const size = Math.max(1, host.getBoundingClientRect().width);
    renderer.setPixelRatio(ratio);
    renderer.setSize(size, size, false);
  };
  const observer = new ResizeObserver(resize);
  const lost = () => {
    if (!disposed) {
      dispose();
      unavailable();
    }
  };
  canvas.addEventListener("webglcontextlost", lost);
  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    signal.removeEventListener("abort", dispose);
    canvas.removeEventListener("webglcontextlost", lost);
    textures.forEach((t) => t.dispose());
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  signal.addEventListener("abort", dispose, { once: true });
  try {
    const loader = new THREE.TextureLoader();
    const load = async (name: string) => {
      const t = await loader.loadAsync(base + name);
      if (disposed || signal.aborted) {
        t.dispose();
        throw Error("Crest loading cancelled");
      }
      textures.push(t);
      return t;
    };
    const [color, height, material] = await Promise.all([
      load("color.webp"),
      load("height.png"),
      load("material.webp"),
    ]);
    color.colorSpace = THREE.SRGBColorSpace;
    const pixels = document.createElement("canvas");
    pixels.width = 256;
    pixels.height = 256;
    const context = pixels.getContext("2d", { willReadFrequently: true });
    if (!context) throw Error("Relief sampler unavailable");
    context.drawImage(height.image, 0, 0, 256, 256);
    const data = context.getImageData(0, 0, 256, 256).data;
    const geometry = new THREE.PlaneGeometry(2, 2, 160, 160);
    geometries.push(geometry);
    const positions = geometry.attributes.position,
      uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const px = Math.min(255, Math.round(uv.getX(i) * 255)),
        py = Math.min(255, Math.round((1 - uv.getY(i)) * 255));
      positions.setZ(i, 0.045 + (data[(py * 256 + px) * 4] / 255) * 0.03);
    }
    geometry.computeVertexNormals();
    const face = new THREE.MeshStandardMaterial({
      map: color,
      metalnessMap: material,
      roughnessMap: material,
      metalness: 0.7,
      roughness: 0.8,
      transparent: true,
      alphaTest: 0.5,
      envMapIntensity: 0.3,
    });
    materials.push(face);
    emblem.add(new THREE.Mesh(geometry, face));
    const edgeGeometry = new THREE.CylinderGeometry(
      0.987,
      0.987,
      0.075,
      128,
      1,
    );
    geometries.push(edgeGeometry);
    const edge = new THREE.MeshStandardMaterial({
      color: "#c4912f",
      metalness: 0.9,
      roughness: 0.28,
    });
    materials.push(edge);
    const rim = new THREE.Mesh(edgeGeometry, edge);
    rim.rotation.x = Math.PI / 2;
    rim.position.z = -0.003;
    emblem.add(rim);
    const room = new RoomEnvironment(),
      pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    stage.environment = environment.texture;
    stage.add(new THREE.AmbientLight("#fff0cf", 0.55));
    const key = new THREE.DirectionalLight("#fff3d4", 1.1);
    key.position.set(-2, 3, 5);
    stage.add(key);
    const fill = new THREE.DirectionalLight("#bed7c4", 0.3);
    fill.position.set(3, -1, 3);
    stage.add(fill);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    observer.observe(host);
    resize();
    emblem.rotation.y = -0.1;
    emblem.rotation.x = 0.025;
    renderer.render(stage, camera);
    canvas.dataset.renderCount = "1";
    const interval = 1000 / (coarse ? 24 : 30);
    let slow = 0;
    const animate = (now: number) => {
      frame = 0;
      if (!active || disposed) return;
      frame = requestAnimationFrame(animate);
      if (now - last < interval) return;
      const dt = last ? Math.min((now - last) / 1000, 0.15) : interval / 1000;
      if (last && now - last > 100) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 30) {
        dispose();
        unavailable();
        return;
      }
      if (slow > 12 && ratio > 0.8) {
        ratio = 0.8;
        resize();
      }
      last = now;
      elapsed += dt;
      const ease = 1 - Math.exp(-dt * 4);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      emblem.rotation.y =
        -0.1 + Math.sin((elapsed * Math.PI) / 12) * 0.025 + x * 0.12;
      emblem.rotation.x =
        0.025 + Math.sin((elapsed * Math.PI) / 15) * 0.012 - y * 0.07;
      emblem.position.y = Math.sin((elapsed * Math.PI) / 10) * 0.012;
      key.position.x = -2 + Math.sin((elapsed * Math.PI) / 14) * 0.8;
      renderer.render(stage, camera);
      canvas.dataset.renderCount = String(++count + 1);
    };
    return {
      setActive(next) {
        if (disposed || active === next) return;
        active = next;
        last = 0;
        if (active) frame = requestAnimationFrame(animate);
        else {
          cancelAnimationFrame(frame);
          frame = 0;
          targetX = 0;
          targetY = 0;
        }
      },
      setPointer(px, py) {
        if (active && !coarse) {
          targetX = THREE.MathUtils.clamp(px, -0.5, 0.5);
          targetY = THREE.MathUtils.clamp(py, -0.5, 0.5);
        }
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
