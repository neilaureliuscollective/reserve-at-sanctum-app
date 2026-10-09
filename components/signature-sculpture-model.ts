import * as THREE from "three";
import type { Priority } from "@aethelios/concierge-core";

/** Original section symbols; these never replace the official LR identity. */
export function buildSignatureSculpture(world: Priority) {
  const root = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: "#c4912f",
    metalness: 1,
    roughness: 0.29,
  });
  const satin = new THREE.MeshStandardMaterial({
    color: "#9d762e",
    metalness: 1,
    roughness: 0.48,
  });
  const enamel = new THREE.MeshStandardMaterial({
    color: "#081f14",
    metalness: 0.4,
    roughness: 0.3,
  });
  const gem = new THREE.MeshStandardMaterial({
    color: "#0b3922",
    metalness: 0.25,
    roughness: 0.19,
    flatShading: true,
    emissive: "#092718",
    emissiveIntensity: 0.12,
  });
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent = root) => {
    const o = new THREE.Mesh(g, m);
    parent.add(o);
    return o;
  };
  const ring = (radius: number, tube: number, z: number, parent = root) => {
    const o = mesh(new THREE.TorusGeometry(radius, tube, 8, 72), gold, parent);
    o.position.z = z;
    return o;
  };
  const compass = (parent: THREE.Group, scale: number, z: number) => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 ? 0.09 : i % 4 ? 0.24 : 0.4;
      const x = Math.sin(a) * r,
        y = Math.cos(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const o = mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.01,
        bevelSegments: 1,
        steps: 1,
      }),
      gold,
      parent,
    );
    o.scale.setScalar(scale);
    o.position.z = z;
  };
  // Repeated leaf engraving is instanced rather than a separate draw call per leaf.
  const leaves = (parent: THREE.Group) => {
    const o = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      satin,
      16,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const side = i < 8 ? -1 : 1,
        j = i % 8,
        a = 0.35 + j * 0.13;
      dummy.position.set(side * Math.sin(a) * 0.67, -0.7 + j * 0.14, 0.245);
      dummy.scale.set(0.035, 0.085, 0.012);
      dummy.rotation.z = side * (-0.6 - j * 0.05);
      dummy.updateMatrix();
      o.setMatrixAt(i, dummy.matrix);
    }
    parent.add(o);
  };
  let balance: THREE.Group | undefined, secondary: THREE.Group | undefined;
  if (world === "presence") {
    const s = new THREE.Shape();
    s.moveTo(-0.78, 0.86);
    s.quadraticCurveTo(0, 0.65, 0.78, 0.86);
    s.lineTo(0.7, -0.1);
    s.quadraticCurveTo(0.6, -0.72, 0, -1);
    s.quadraticCurveTo(-0.6, -0.72, -0.7, -0.1);
    s.closePath();
    mesh(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.045,
        bevelSegments: 3,
        steps: 1,
      }),
      gold,
    );
    const inset = mesh(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.015,
        bevelSegments: 2,
        steps: 1,
      }),
      enamel,
    );
    inset.scale.set(0.89, 0.89, 1);
    inset.position.z = 0.18;
    leaves(root);
    compass(root, 1, 0.225);
    const crest = ring(0.46, 0.009, 0.25);
    crest.position.y = 0.06;
    const bar = mesh(new THREE.BoxGeometry(0.032, 0.3, 0.025), satin);
    bar.position.set(0, -0.64, 0.23);
  } else if (world === "performance") {
    ring(0.94, 0.052, 0);
    ring(0.83, 0.017, 0.04);
    const tick = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.018, 0.055, 0.035),
        satin,
        48,
      ),
      dummy = new THREE.Object3D();
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24;
      dummy.position.set(Math.sin(a) * 0.87, Math.cos(a) * 0.87, 0.04);
      dummy.rotation.z = -a;
      dummy.updateMatrix();
      tick.setMatrixAt(i, dummy.matrix);
    }
    root.add(tick);
    balance = new THREE.Group();
    root.add(balance);
    ring(0.63, 0.028, 0.09, balance);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const bridge = mesh(new THREE.BoxGeometry(0.1, 0.71, 0.1), gold, balance);
      bridge.position.set(Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0.12);
      bridge.rotation.z = -a;
      const bearing = mesh(new THREE.SphereGeometry(0.07, 12, 8), enamel);
      bearing.position.set(Math.sin(a) * 0.7, Math.cos(a) * 0.7, 0.13);
      bearing.scale.z = 0.5;
    }
    secondary = new THREE.Group();
    secondary.position.set(-0.25, -0.29, 0.2);
    balance.add(secondary);
    ring(0.23, 0.016, 0, secondary);
    ring(0.16, 0.012, 0, secondary);
    compass(root, 0.58, 0.23);
    const jewel = mesh(new THREE.SphereGeometry(0.074, 12, 8), gem);
    jewel.position.z = 0.28;
  } else {
    // Crown, girdle and pavilion cuts give the core a gemstone silhouette.
    const points: number[] = [];
    const cuts = [
      [0.75, 0.08],
      [0.48, 0.4],
      [0.08, 0.61],
      [-0.38, 0.37],
      [-0.7, 0.02],
    ];
    const vertex = (layer: number, index: number) => {
      const [height, radius] = cuts[layer],
        angle = (index * Math.PI) / 4;
      return [Math.sin(angle) * radius, height, Math.cos(angle) * radius];
    };
    for (let layer = 0; layer < cuts.length - 1; layer++)
      for (let i = 0; i < 8; i++) {
        const a = vertex(layer, i),
          b = vertex(layer, i + 1),
          c = vertex(layer + 1, i),
          d = vertex(layer + 1, i + 1);
        points.push(...a, ...c, ...b, ...b, ...c, ...d);
      }
    const cutGeometry = new THREE.BufferGeometry();
    cutGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    cutGeometry.computeVertexNormals();
    const crystal = mesh(cutGeometry, gem);
    crystal.scale.set(1, 1.1, 0.83);
    crystal.rotation.set(0.1, 0.4, 0.12);
    crystal.position.y = 0.15;
    ring(0.73, 0.04, -0.12);
    ring(0.74, 0.013, -0.08);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.3;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.sin(a) * 0.35, -0.86, Math.cos(a) * 0.35),
        new THREE.Vector3(Math.sin(a) * 0.79, -0.24, Math.cos(a) * 0.4),
        new THREE.Vector3(Math.sin(a) * 0.53, 0.56, Math.cos(a) * 0.32),
      ]);
      mesh(new THREE.TubeGeometry(curve, 24, 0.037, 8, false), gold);
    }
    const mount = mesh(new THREE.CylinderGeometry(0.36, 0.47, 0.15, 48), satin);
    mount.position.y = -0.86;
    const base = mesh(new THREE.CylinderGeometry(0.48, 0.51, 0.08, 48), gold);
    base.position.y = -0.97;
    const detail = new THREE.Group();
    detail.position.set(0, -0.83, 0.39);
    root.add(detail);
    compass(detail, 0.25, 0);
  }
  root.rotation.set(0.06, -0.19, 0);
  return {
    root,
    animate(time: number, px: number, py: number) {
      root.rotation.y = -0.19 + Math.sin(time * 0.19) * 0.035 + px * 0.15;
      root.rotation.x = 0.06 + Math.sin(time * 0.14) * 0.018 - py * 0.08;
      root.position.y = Math.sin(time * 0.22) * 0.012;
      if (balance) balance.rotation.z = Math.sin(time * 0.28) * 0.09;
      if (secondary) secondary.rotation.z = -Math.sin(time * 0.28) * 0.18;
      if (world === "wellness")
        gem.emissiveIntensity = 0.12 + Math.sin(time * 0.55) * 0.04;
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
      geometries.forEach((g) => g.dispose());
      [gold, satin, enamel, gem].forEach((m) => m.dispose());
    },
  };
}
