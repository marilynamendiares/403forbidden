"use client";

import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

import { useEffect, useRef } from "react";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Group,
  BufferGeometry,
  Vector3,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
} from "three";

type Props = {
  size?: number;
  speedSec?: number;
  tiltX?: number; // degrees
  tiltZ?: number; // degrees
  className?: string;
};

export default function Globe({
  size = 160,
  speedSec = 64,
  tiltX = +54,
  tiltZ = +28,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let renderer: WebGLRenderer | null = null;
    let scene: Scene | null = null;
    let camera: PerspectiveCamera | null = null;

    let tiltGroup: Group | null = null;
    let spinGroup: Group | null = null;

    let ro: ResizeObserver | null = null;

    // --- renderer
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    const dpr = Math.min(3, window.devicePixelRatio || 1);
renderer.setPixelRatio(dpr);

    renderer.setSize(size, size, false);
    renderer.setClearAlpha(0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    // --- scene/camera
    scene = new Scene();
camera = new PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0, 3.2);


    // --- hierarchy
    tiltGroup = new Group();
    tiltGroup.rotation.x = (tiltX * Math.PI) / 180;
    tiltGroup.rotation.z = (tiltZ * Math.PI) / 180;

    spinGroup = new Group();
    tiltGroup.add(spinGroup);
    scene.add(tiltGroup);

    // --- Build globe lines (lat/lon)
const radius = 1;

// occluder чуть меньше, чтобы не совпадать по depth с линиями
const occluderGeom = new SphereGeometry(radius * 0.995, 32, 24);

const occluderMat = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: true,
  depthTest: true,

  // анти-z-fighting, помогает на разных GPU
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

const occluder = new Mesh(occluderGeom, occluderMat);
spinGroup.add(occluder);




// ===== wide lines (Line2) =====
const gridMat = new LineMaterial({
  color: 0xD9D9D9,
  transparent: true,
  opacity: 0.92,
  linewidth: 2.0, // <- ВОТ тут реальная толщина в px
  depthTest: true,
  depthWrite: false,
});

const outlineMat = new LineMaterial({
  color: 0xD9D9D9,
  transparent: true,
  opacity: 0.90,
  linewidth: 2.6,
  depthTest: true,
  depthWrite: false,
});

const makeLine2 = (pts: Vector3[], mat: LineMaterial) => {
  const positions: number[] = [];
  for (const p of pts) positions.push(p.x, p.y, p.z);

  const geom = new LineGeometry();
  geom.setPositions(positions);

  const line = new Line2(geom, mat);
  line.computeLineDistances();
  return line;
};

// плотнее сетка (как на рефе)
const LAT_STEP = 7.5;  // было 10
const LON_STEP = 7.5;  // было 10
const PAR_SEG = 3;     // было 4
const MER_SEG = 2.5;   // было 3

// Parallels
for (let lat = -82.5; lat <= 82.5; lat += LAT_STEP) {
  const latRad = (lat * Math.PI) / 180;
  const y = Math.sin(latRad) * radius;
  const r = Math.cos(latRad) * radius;

  const pts: Vector3[] = [];
  for (let d = 0; d <= 360; d += PAR_SEG) {
    const a = (d * Math.PI) / 180;
    pts.push(new Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  spinGroup!.add(makeLine2(pts, gridMat));
}

// Meridians
for (let lon = 0; lon < 360; lon += LON_STEP) {
  const lonRad = (lon * Math.PI) / 180;

  const pts: Vector3[] = [];
  for (let lat = -90; lat <= 90; lat += MER_SEG) {
    const latRad = (lat * Math.PI) / 180;
    const x = Math.cos(latRad) * Math.cos(lonRad) * radius;
    const y = Math.sin(latRad) * radius;
    const z = Math.cos(latRad) * Math.sin(lonRad) * radius;
    pts.push(new Vector3(x, y, z));
  }
  spinGroup!.add(makeLine2(pts, gridMat));
}

// Outline (silhouette)
const outlinePts: Vector3[] = [];
for (let d = 0; d <= 360; d += 2) {
  const a = (d * Math.PI) / 180;
  outlinePts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
}
spinGroup!.add(makeLine2(outlinePts, outlineMat));

    

// --- resize
const resize = () => {
  if (!renderer || !camera) return;

  const rect = el.getBoundingClientRect();
  const dpr = renderer.getPixelRatio();

  // w/h в CSS-пикселях, но “кратно DPR” (стабильнее линии на зуме)
  const w = Math.max(1, Math.round(rect.width * dpr)) / dpr;
  const h = Math.max(1, Math.round(rect.height * dpr)) / dpr;

  renderer.setSize(w, h, false);

  // LineMaterial.resolution = device pixels
  gridMat.resolution.set(w * dpr, h * dpr);
  outlineMat.resolution.set(w * dpr, h * dpr);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};


    ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // --- animation: rotate only spinGroup
    const omega = (Math.PI * 2) / Math.max(6, speedSec);
    let tPrev = performance.now();

    const tick = () => {
      if (!renderer || !scene || !camera || !spinGroup) return;
      const tNow = performance.now();
      const dt = (tNow - tPrev) / 1000;
      tPrev = tNow;

      spinGroup.rotation.y += omega * dt;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      ro?.disconnect();

      // dispose geometries/materials (to avoid leaks on HMR)
      try {
        spinGroup?.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) obj.material.dispose?.();
        });
        renderer?.dispose();
      } catch {
        // ignore
      }
    };
  }, [size, speedSec, tiltX, tiltZ]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        opacity: 0.95,
        filter: "drop-shadow(0 0 14px rgba(255,255,255,0.10))",
      }}
      aria-hidden
    />
  );
}
