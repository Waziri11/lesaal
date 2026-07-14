"use client";

import { useEffect, useRef } from "react";
import { animate, createTimer, stagger } from "animejs";
import { getInstances } from "animejs/adapters/three";
import * as THREE from "three";

const MAX_PIXEL_RATIO = 1.8;
const GRID_SIZE = 6;
const GRID_LAYOUT = [GRID_SIZE, GRID_SIZE, GRID_SIZE];
const BASE_SCENE_SPAN = 2;

const readPalette = (container) => {
  const computed = window.getComputedStyle(container);
  const cssVars = ["--blue-600", "--blue-500", "--blue-400", "--blue-300", "--blue-100"];
  const fallback = ["#003A8C", "#004AAD", "#2268C8", "#5590E0", "#C4D8F8", "#7EC8FF", "#89B8FF"];
  const fromCss = cssVars.map((name) => computed.getPropertyValue(name).trim()).filter(Boolean);
  return fromCss.length ? [...fromCss, ...fallback].slice(0, 7) : fallback;
};

export default function HeroEyesScene({ className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera.position.set(0, 0, 1.7);
    scene.add(camera);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(2, 3, 4);
    const fillLight = new THREE.DirectionalLight(0x9cc8ff, 1.05);
    fillLight.position.set(-2.5, -1.4, 1.8);
    scene.add(ambientLight, keyLight, fillLight);

    const cellSize = BASE_SCENE_SPAN / GRID_SIZE;
    const spread = (((GRID_SIZE - 1) / 2) * cellSize) * 0.96;
    const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, GRID_SIZE ** 3);
    mesh.position.set(-0.28, 0.02, -0.18);
    scene.add(mesh);

    const instances = getInstances(mesh).filter(Boolean);
    const palette = readPalette(container);
    const gridAxis = (axis, span = spread) => stagger([-span, span], { grid: GRID_LAYOUT, axis });

    const meshSpin = animate(mesh, {
      rotateY: 360,
      rotateX: 360,
      duration: 24000,
      loop: true,
      ease: "linear",
    });

    const instancePulse = animate(instances, {
      color: palette,
      x: [gridAxis("x", spread * 0.26), gridAxis("x")],
      y: [gridAxis("y", spread * 0.26), gridAxis("y")],
      z: [gridAxis("z", spread * 0.26), gridAxis("z")],
      scale: [0.11, 0.25, 0.11],
      delay: stagger([0, 3000], { grid: GRID_LAYOUT, from: "center", reversed: true }),
      duration: 2000,
      loopDelay: 500,
      loop: true,
      alternate: true,
      ease: "inOutQuad",
    });

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    const rootRotation = mesh.rotation.clone();

    const updatePointer = (event) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeY = (event.clientY - rect.top) / rect.height;

      pointerTarget.set(
        THREE.MathUtils.clamp((relativeX - 0.5) * 2, -1, 1),
        THREE.MathUtils.clamp((0.5 - relativeY) * 2, -1, 1)
      );
    };

    const resetPointer = () => pointerTarget.set(0, 0);

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", updatePointer, { passive: true });
    window.addEventListener("pointerleave", resetPointer, { passive: true });

    const setSceneLayout = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const isMobile = width < 720;
      const isTablet = width >= 720 && width < 1100;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      if (isMobile) {
        camera.position.z = 1.95;
        mesh.position.set(-0.12, 0.02, -0.2);
        mesh.scale.set(0.86, 0.86, 0.86);
      } else if (isTablet) {
        camera.position.z = 1.82;
        mesh.position.set(-0.2, 0.02, -0.18);
        mesh.scale.set(0.93, 0.93, 0.93);
      } else {
        camera.position.z = 1.7;
        mesh.position.set(-0.28, 0.02, -0.18);
        mesh.scale.set(1, 1, 1);
      }
    };

    setSceneLayout();

    let resizeObserver = null;
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(setSceneLayout);
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", setSceneLayout);
    }

    const renderTimer = createTimer({
      onUpdate: () => {
        pointer.lerp(pointerTarget, 0.1);
        mesh.rotation.x = rootRotation.x + pointer.y * 0.2;
        mesh.rotation.y = rootRotation.y + pointer.x * 0.2;
        renderer.render(scene, camera);
      },
    });

    return () => {
      renderTimer.cancel();
      meshSpin.cancel();
      instancePulse.cancel();

      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", updatePointer);
      window.removeEventListener("pointerleave", resetPointer);

      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", setSceneLayout);
      }

      scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((mat) => mat?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });

      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
