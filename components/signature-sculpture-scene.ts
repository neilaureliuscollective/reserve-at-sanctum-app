import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Priority } from "@aethelios/concierge-core";
import { buildSignatureSculpture } from "./signature-sculpture-model";

export function createSignatureScene(
  host: HTMLElement,
  world: Priority,
  unavailable: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const canvas = renderer.domElement;
  canvas.className = "signature-sculpture__canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.z = 4.8;
  const model = buildSignatureSculpture(world);
  scene.add(model.root);
  const room = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer);
  let environment: THREE.WebGLRenderTarget | undefined;
  let frame = 0,
    active = false,
    disposed = false,
    last = 0,
    time = 0,
    count = 0,
    slow = 0,
    x = 0,
    y = 0,
    targetX = 0,
    targetY = 0;
  const coarse = matchMedia("(pointer: coarse)").matches;
  let ratio = Math.min(devicePixelRatio, coarse ? 1 : 1.5);
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, host.getBoundingClientRect().width);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, width, false);
  };
  const observer = new ResizeObserver(resize);
  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("webglcontextlost", lost);
    model.dispose();
    environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  const lost = () => {
    dispose();
    unavailable();
  };
  canvas.addEventListener("webglcontextlost", lost);
  try {
    environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.add(new THREE.AmbientLight("#fff0d8", 0.65));
    const key = new THREE.DirectionalLight("#fff0ce", 3);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#bdd9c3", 1.3);
    fill.position.set(3, -1, 2);
    scene.add(fill);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    observer.observe(host);
    resize();
    renderer.render(scene, camera);
    canvas.dataset.renderCount = "1";
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    const interval = 1000 / (coarse ? 24 : 30);
    const animate = (now: number) => {
      frame = 0;
      if (!active || disposed) return;
      frame = requestAnimationFrame(animate);
      if (now - last < interval) return;
      const gap = last ? now - last : interval,
        dt = Math.min(gap / 1000, 0.15);
      slow = gap > 100 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 30) {
        lost();
        return;
      }
      if (slow > 12 && ratio > 0.8) {
        ratio = 0.8;
        resize();
      }
      last = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 4);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      model.animate(time, x, y);
      key.position.x = -3 + Math.sin(time * 0.2) * 0.7;
      renderer.render(scene, camera);
      canvas.dataset.renderCount = String(++count + 1);
    };
    return {
      setActive(next: boolean) {
        if (disposed || active === next) return;
        active = next;
        last = 0;
        if (active) frame = requestAnimationFrame(animate);
        else {
          cancelAnimationFrame(frame);
          frame = 0;
          targetX = targetY = 0;
        }
      },
      setPointer(px: number, py: number) {
        if (!coarse) {
          targetX = THREE.MathUtils.clamp(px, -0.5, 0.5);
          targetY = THREE.MathUtils.clamp(py, -0.5, 0.5);
        }
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    room.dispose();
    pmrem.dispose();
  }
}
