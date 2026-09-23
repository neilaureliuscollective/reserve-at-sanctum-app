"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
export function Arrival() {
  const root = useRef<HTMLElement>(null),
    mount = useRef<HTMLDivElement>(null),
    pausedRef = useRef(false),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    pausedRef.current = paused || reduced;
  }, [paused, reduced]);
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false,
      cleanup = () => {};
    async function init() {
      const THREE = await import("three");
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el!.appendChild(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.z = 9;
      const group = new THREE.Group();
      scene.add(group);
      const gold = new THREE.MeshStandardMaterial({
        color: 0xcba65f,
        metalness: 0.82,
        roughness: 0.26,
      });
      const dark = new THREE.MeshStandardMaterial({
        color: 0x0b1921,
        metalness: 0.35,
        roughness: 0.5,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.61, 0.062, 20, 120),
        gold,
      );
      group.add(ring);
      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.44, 0.017, 12, 120),
        gold,
      );
      ring2.position.z = 0.045;
      group.add(ring2);
      const disk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.57, 1.57, 0.12, 100),
        dark,
      );
      disk.rotation.x = Math.PI / 2;
      disk.position.z = -0.08;
      group.add(disk);
      const starShape = new THREE.Shape();
      starShape.moveTo(0, 0.2);
      starShape.lineTo(0.05, 0.05);
      starShape.lineTo(0.15, 0);
      starShape.lineTo(0.05, -0.05);
      starShape.lineTo(0, -0.2);
      starShape.lineTo(-0.05, -0.05);
      starShape.lineTo(-0.15, 0);
      starShape.lineTo(-0.05, 0.05);
      starShape.closePath();
      const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.04,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      for (const y of [-1.6, 1.6]) {
        const star = new THREE.Mesh(starGeo, gold);
        star.position.set(0, y, 0.09);
        group.add(star);
      }
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const tick = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.065, 0.015),
          gold,
        );
        tick.position.set(Math.sin(a) * 1.52, Math.cos(a) * 1.52, 0.06);
        tick.rotation.z = -a;
        group.add(tick);
      }
      try {
        const coords = await fetch("/images/louisiana.json").then((r) =>
          r.json(),
        );
        if (!disposed) {
          const raw = coords[0] as number[][];
          const xs = raw.map((x) => x[0]),
            ys = raw.map((x) => x[1]),
            cx = (Math.min(...xs) + Math.max(...xs)) / 2,
            cy = (Math.min(...ys) + Math.max(...ys)) / 2,
            scale = 2.05 / (Math.max(...xs) - Math.min(...xs));
          const shape = new THREE.Shape();
          raw.forEach(([x, y], i) => {
            const px = (x - cx) * scale,
              py = (y - cy) * scale;
            i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
          });
          shape.closePath();
          const map = new THREE.Mesh(
            new THREE.ExtrudeGeometry(shape, {
              depth: 0.1,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelSize: 0.028,
              bevelThickness: 0.025,
            }),
            gold,
          );
          map.position.set(0, 0.05, 0.03);
          group.add(map);
        }
      } catch {
        /* Frame remains a dimensional fallback. */
      }
      scene.add(new THREE.AmbientLight(0xc0c9dd, 1.8));
      const key = new THREE.DirectionalLight(0xffe2a7, 5);
      key.position.set(-3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x94b9ce, 2);
      rim.position.set(4, -1, 4);
      scene.add(rim);
      let x = 0,
        y = 0,
        frame = 0,
        visible = true,
        elapsed = 0,
        last = 0,
        renderedWhilePaused = false;
      const pointer = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = el!.getBoundingClientRect();
        x = (e.clientX - r.left - r.width / 2) / r.width;
        y = (e.clientY - r.top - r.height / 2) / r.height;
      };
      const resize = () => {
        renderedWhilePaused = false;
        const w = el!.clientWidth,
          h = el!.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el!);
      const io = new IntersectionObserver(
        ([e]) => (visible = e.isIntersecting),
      );
      io.observe(el!);
      function render(t: number) {
        if (disposed) return;
        frame = requestAnimationFrame(render);
        if (!visible || document.hidden) return;
        if (pausedRef.current && renderedWhilePaused) return;
        if (t - last < 33) return;
        last = t;
        if (!pausedRef.current) {
          elapsed += 0.008;
          group.rotation.y += (x * 0.22 - group.rotation.y) * 0.04;
          group.rotation.x += (-y * 0.15 - group.rotation.x) * 0.04;
          group.position.y = Math.sin(elapsed) * 0.035;
          key.position.x = -3 + Math.sin(elapsed * 0.5) * 2;
        }
        renderer.render(scene, camera);
        renderedWhilePaused = pausedRef.current;
      }
      frame = requestAnimationFrame(render);
      root.current?.addEventListener("pointermove", pointer);
      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        io.disconnect();
        root.current?.removeEventListener("pointermove", pointer);
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        gold.dispose();
        dark.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    }
    const timer = setTimeout(() => { void init().catch(() => cleanup()); }, 250);
    return () => {
      disposed = true;
      clearTimeout(timer);
      cleanup();
    };
  }, []);
  return (
    <section
      ref={root}
      className={`arrival ${paused || reduced ? "motion-paused" : ""}`}
      aria-labelledby="arrival-title"
    >
      <div className="arrival-image">
        <Image
          src="/images/reserve-grooming-concept.webp"
          alt="Concept scene of a grooming ritual at a table in warm Louisiana light"
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
        />
      </div>
      <div className="arrival-shade" />
      <div className="arrival-location" aria-hidden="true">THE ARRIVAL <span>01</span></div>
      <div className="arrival-content">
        <p className="eyebrow">
          <span className="line" /> A MEN’S SANCTUARY · EUNICE, LOUISIANA
        </p>
        <h1 id="arrival-title">
          Small-town roots.
          <br />
          <em>A bigger standard.</em>
        </h1>
        <p className="arrival-description">
          Grooming that goes deeper.
          <br />
          With room to become more, together.
        </p>
        <div className="hero-actions">
          <a className="button button-gold" href="#begin">
            Find your way in <ArrowUpRight size={18} />
          </a>
          <Link className="text-link" href="/book">
            Explore visits <ArrowUpRight size={16} />
          </Link>
        </div>
        <p className="partnership">
          FIX IT SHOP <span>×</span> GENT ASCEND COLLECTIVE
        </p>
      </div>
      <div className="seal-stage" aria-hidden="true">
        <div ref={mount} className="seal-canvas" />
        <span className="seal-caption">ROOTED IN LOUISIANA</span>
      </div>
      <div className="arrival-bottom">
        <a href="#the-place" className="scroll-cue">
          <ArrowDown size={15} /> STEP INSIDE
        </a>
        <div className="scene-controls">
          <span>Concept architecture</span>
          <button
            className="icon-button"
            onClick={() => setPaused(!paused)}
            disabled={reduced}
              aria-label={reduced ? "Motion limited by your device preference" : paused ? "Play scene motion" : "Pause scene motion"}
            aria-pressed={paused || reduced}
          >
            {paused || reduced ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </div>
    </section>
  );
}
