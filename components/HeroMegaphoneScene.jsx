"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function cubicEaseOut(t) {
  const p = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - p, 3);
}

export default function HeroMegaphoneScene({
  className = "",
  modelPath = "/3d_megaphone/Megaphone_01_4k.gltf",
  entryDurationMs = 1800,
  startX = 4.8,
  endX = -1.75,
  onReady,
  onModelError,
  onPhaseChange,
  shouldAnimate = true,
  scrollAnimation = true,
  scrollStart = "top top",
  scrollEnd = "+=140%",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = null;

    gsap.registerPlugin(ScrollTrigger);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 9.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.88);
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(5.8, 3.8, 6.8);

    const fill = new THREE.DirectionalLight(0xf2f5ff, 0.9);
    fill.position.set(-4.2, 2.1, 3.4);

    const rim = new THREE.DirectionalLight(0xffffff, 1.0);
    rim.position.set(-6.2, 1.2, -4.8);

    scene.add(ambient, key, fill, rim);

    const group = new THREE.Group();
    group.position.set(startX, -0.45, 0.2);
    group.rotation.set(0.02, Math.PI * 0.08, 0.02);
    scene.add(group);

    const fallbackGeometry = new THREE.CylinderGeometry(0.4, 1.25, 2.4, 36, 1, true);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: "#6288cf",
      metalness: 0.2,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    fallbackMesh.rotation.z = Math.PI / 2;
    fallbackMesh.visible = false;
    group.add(fallbackMesh);

    let mounted = true;
    let rafId = 0;
    const startTime = performance.now();
    let hasShownText = false;
    let scrollTimeline = null;

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        if (!mounted) return;

        const loadedObject = gltf.scene;
        loadedObject.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;

          if (node.geometry?.attributes?.uv && !node.geometry.attributes.uv2) {
            node.geometry.setAttribute("uv2", node.geometry.attributes.uv);
          }

          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (!material) return;

            if (material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
              material.map.needsUpdate = true;
            }
            if (material.emissiveMap) {
              material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
              material.emissiveMap.needsUpdate = true;
            }

            if (material.normalMap) {
              material.normalScale = new THREE.Vector2(1, 1);
            }

            if (typeof material.roughness === "number") {
              material.roughness = Math.min(1, Math.max(0.08, material.roughness * 1.02));
            }
            if (typeof material.metalness === "number") {
              material.metalness = Math.min(1, Math.max(0, material.metalness * 1.04));
            }

            material.needsUpdate = true;
          });
        });

        const box = new THREE.Box3().setFromObject(loadedObject);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        loadedObject.position.sub(center);
        const longestAxis = Math.max(size.x, size.y, size.z) || 1;
        const scale = 4.35 / longestAxis;
        loadedObject.scale.setScalar(scale);

        fallbackMesh.visible = false;
        group.add(loadedObject);
        onReady?.();
      },
      undefined,
      () => {
        if (!mounted) return;
        fallbackMesh.visible = true;
        onModelError?.();
        onReady?.();
      }
    );

    function setSize() {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    }

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    function setupScrollAnimation() {
      if (!scrollAnimation) return;

      scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: container.closest(".lp-hero") || container,
          start: scrollStart,
          end: scrollEnd,
          scrub: 1,
        },
        defaults: { ease: "none" },
      });

      scrollTimeline
        .to(group.rotation, { y: Math.PI * 0.2 }, 0)
        .to(group.position, { y: -0.18, z: -0.22 }, 0)
        .to(group.rotation, { z: -0.08 }, 0.35)
        .to(group.position, { y: 0.1, x: endX - 0.35, z: -0.45 }, 0.58)
        .to(group.rotation, { y: Math.PI * 0.33, x: -0.04 }, 0.7)
        .to(group.position, { y: 0.22, x: endX - 0.55, z: -0.65 }, 0.88)
        .to(group.rotation, { y: Math.PI * 0.41, z: -0.14 }, 0.88);
    }

    setupScrollAnimation();

    function renderFrame(now) {
      if (!mounted) return;

      const elapsed = now - startTime;
      const progress = shouldAnimate ? Math.min(1, elapsed / entryDurationMs) : 1;
      const eased = cubicEaseOut(progress);

      group.position.x = startX + (endX - startX) * eased;
      group.rotation.y = Math.PI * 0.08 + (1 - eased) * 0.12;
      group.rotation.z = 0.02 + Math.sin(now * 0.0014) * 0.015;

      if (progress < 1) {
        onPhaseChange?.("modelEntering");
      } else if (!hasShownText) {
        hasShownText = true;
        onPhaseChange?.("textReveal");
      } else {
        onPhaseChange?.("idle");
      }

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(renderFrame);
    }

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      mounted = false;
      window.cancelAnimationFrame(rafId);
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
      resizeObserver.disconnect();

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
  }, [
    endX,
    entryDurationMs,
    modelPath,
    onModelError,
    onPhaseChange,
    onReady,
    scrollAnimation,
    scrollEnd,
    scrollStart,
    shouldAnimate,
    startX,
  ]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
