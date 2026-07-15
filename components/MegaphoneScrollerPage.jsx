"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import Lenis from "@studio-freight/lenis";
import Link from "next/link";
import "../app/styles/megaphone-scroller.css";

export default function MegaphoneScrollerPage() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollTimelineRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Temporary overlay log catcher for debugging client-side loader errors
    const errorHandler = (event) => {
      const errorDiv = document.createElement("div");
      errorDiv.className = "debug-error-overlay";
      errorDiv.style.position = "fixed";
      errorDiv.style.top = "0";
      errorDiv.style.left = "0";
      errorDiv.style.width = "100%";
      errorDiv.style.backgroundColor = "rgba(255, 0, 0, 0.95)";
      errorDiv.style.color = "white";
      errorDiv.style.padding = "20px";
      errorDiv.style.zIndex = "999999";
      errorDiv.style.fontFamily = "monospace";
      errorDiv.style.whiteSpace = "pre-wrap";
      errorDiv.innerText = `Client Error: ${event.message}\nAt: ${event.filename}:${event.lineno}:${event.colno}\nError object: ${event.error ? event.error.stack : 'None'}`;
      document.body.appendChild(errorDiv);
    };
    const rejectionHandler = (event) => {
      const errorDiv = document.createElement("div");
      errorDiv.className = "debug-error-overlay";
      errorDiv.style.position = "fixed";
      errorDiv.style.top = "0";
      errorDiv.style.left = "0";
      errorDiv.style.width = "100%";
      errorDiv.style.backgroundColor = "rgba(255, 0, 0, 0.95)";
      errorDiv.style.color = "white";
      errorDiv.style.padding = "20px";
      errorDiv.style.zIndex = "999999";
      errorDiv.style.fontFamily = "monospace";
      errorDiv.style.whiteSpace = "pre-wrap";
      errorDiv.innerText = `Client Unhandled Rejection: ${event.reason}`;
      document.body.appendChild(errorDiv);
    };

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const msg = args.map(a => typeof a === 'object' ? String(a) : String(a)).join(' ');
      const errorDiv = document.createElement("div");
      errorDiv.className = "debug-error-overlay";
      errorDiv.style.position = "fixed";
      errorDiv.style.top = "0";
      errorDiv.style.left = "0";
      errorDiv.style.width = "100%";
      errorDiv.style.backgroundColor = "rgba(200, 50, 0, 0.95)";
      errorDiv.style.color = "white";
      errorDiv.style.padding = "20px";
      errorDiv.style.zIndex = "999999";
      errorDiv.style.fontFamily = "monospace";
      errorDiv.style.whiteSpace = "pre-wrap";
      errorDiv.innerText = `Console Error: ${msg}`;
      document.body.appendChild(errorDiv);
    };

    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      const msg = args.map(a => typeof a === 'object' ? String(a) : String(a)).join(' ');
      const errorDiv = document.createElement("div");
      errorDiv.className = "debug-error-overlay";
      errorDiv.style.position = "fixed";
      errorDiv.style.bottom = "0";
      errorDiv.style.left = "0";
      errorDiv.style.width = "100%";
      errorDiv.style.backgroundColor = "rgba(200, 150, 0, 0.95)";
      errorDiv.style.color = "white";
      errorDiv.style.padding = "20px";
      errorDiv.style.zIndex = "999999";
      errorDiv.style.fontFamily = "monospace";
      errorDiv.style.whiteSpace = "pre-wrap";
      errorDiv.innerText = `Console Warn: ${msg}`;
      document.body.appendChild(errorDiv);
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    const isMobile = window.innerWidth <= 768;

    // Disable scroll-behavior: smooth on html to prevent Lenis smooth scroll conflicts
    const htmlEl = document.documentElement;
    const oldScrollBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = "auto";

    // Disable body scroll while loading and reset position to top
    document.body.style.overflowY = "hidden";
    window.scrollTo(0, 0);

    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.3,
    });
    lenis.on("scroll", ScrollTrigger.update);

    let lenisRafId;
    const lenisRaf = (time) => {
      lenis.raf(time);
      lenisRafId = requestAnimationFrame(lenisRaf);
    };
    lenisRafId = requestAnimationFrame(lenisRaf);

    // 1. Scene, Camera, Renderer setup
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    // Initial camera position & target coordinates
    camera.position.set(3.6, -0.04, -3.93);
    const target = new THREE.Vector3(8.16, -0.13, 0.51);
    camera.lookAt(target);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;

    // 2. Softer, Low-Contrast Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5.8, 3.8, 6.8);

    const fillLight = new THREE.DirectionalLight(0xf2f5ff, 1.2);
    fillLight.position.set(-4.2, 2.1, 3.4);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-6.2, 1.2, -4.8);

    scene.add(ambient, keyLight, fillLight, rimLight);

    // 3. OrbitControls (disabled initially)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go too far under the model

    // 4. Model Loading
    const modelsContainer = new THREE.Group();
    scene.add(modelsContainer);

    const megaphoneGroup = new THREE.Group();
    modelsContainer.add(megaphoneGroup);

    const cameraModelGroup = new THREE.Group();
    modelsContainer.add(cameraModelGroup);

    const loader = new GLTFLoader();
    
    // Load megaphone
    loader.load(
      "/3d_megaphone/Megaphone_01_4k.gltf",
      (gltf) => {
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
              material.normalScale = new THREE.Vector2(1.1, 1.1);
            }
            // Soft matte materials with low metalness to reduce contrast
            material.roughness = 0.65;
            material.metalness = 0.05;
            material.needsUpdate = true;
          });
        });

        // Auto centering and scaling
        const box = new THREE.Box3().setFromObject(loadedObject);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const longestAxis = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.6 / longestAxis;
        loadedObject.scale.setScalar(scale);
        loadedObject.position.copy(center).multiplyScalar(-scale);

        megaphoneGroup.add(loadedObject);

        loader.load(
          "/sigma_bf_camera.gltf",
          (gltfCam) => {
            const loadedCamObject = gltfCam.scene;

            // Load custom textures for camera body, lens, and glass
            const textureLoader = new THREE.TextureLoader();
            
            const cameraLensTexture = textureLoader.load("/sigma_camera_texture.jpg");
            cameraLensTexture.colorSpace = THREE.SRGBColorSpace;

            const cameraBodyTexture = textureLoader.load("/sigma_camera_body_texture.jpg");
            cameraBodyTexture.colorSpace = THREE.SRGBColorSpace;

            const cameraGlassTexture = textureLoader.load("/sigma_camera_glass_texture.png");
            cameraGlassTexture.colorSpace = THREE.SRGBColorSpace;

            loadedCamObject.traverse((node) => {
              if (!node.isMesh) return;
              node.castShadow = false;
              node.receiveShadow = false;

              if (node.geometry?.attributes?.uv && !node.geometry.attributes.uv2) {
                node.geometry.setAttribute("uv2", node.geometry.attributes.uv);
              }

              // Trace parent hierarchy to see if this mesh belongs to the lens assembly or glass
              let isLens = false;
              let isGlass = false;
              let temp = node;
              while (temp) {
                const name = (temp.name || "").toLowerCase();
                if (name.includes("glass")) {
                  isGlass = true;
                }
                if (name.includes("lens") || name.includes("glass")) {
                  isLens = true;
                }
                temp = temp.parent;
              }

              const materials = Array.isArray(node.material) ? node.material : [node.material];
              materials.forEach((material) => {
                if (!material) return;
                
                // Map the appropriate texture depending on whether it is glass, lens, or body
                if (isGlass) {
                  material.map = cameraGlassTexture;
                  material.roughness = 0.1; // Extremely glossy
                  material.metalness = 0.9; // Highly reflective
                  material.transparent = true;
                  material.opacity = 0.92; // Slightly translucent to show internal reflection/pattern
                } else if (isLens) {
                  material.map = cameraLensTexture;
                  material.roughness = 0.35;
                  material.metalness = 0.25;
                } else {
                  material.map = cameraBodyTexture;
                  material.roughness = 0.35;
                  material.metalness = 0.25;
                }
                
                if (material.emissiveMap) {
                  material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                  material.emissiveMap.needsUpdate = true;
                }
                if (material.normalMap) {
                  material.normalScale = new THREE.Vector2(1.1, 1.1);
                }
                material.needsUpdate = true;
              });
            });

            // Set rotations to 0 initially since GLTF is Y-up by default
            loadedCamObject.rotation.set(0, 0, 0);

            // Auto centering and scaling for camera model
            const boxCam = new THREE.Box3().setFromObject(loadedCamObject);
            const sizeCam = new THREE.Vector3();
            const centerCam = new THREE.Vector3();
            boxCam.getSize(sizeCam);
            boxCam.getCenter(centerCam);

            const longestAxisCam = Math.max(sizeCam.x, sizeCam.y, sizeCam.z) || 1;
            const scaleCam = 2.5 / longestAxisCam;
            loadedCamObject.scale.setScalar(scaleCam);
            loadedCamObject.position.copy(centerCam).multiplyScalar(-scaleCam);

            cameraModelGroup.add(loadedCamObject);
            cameraModelGroup.scale.set(0, 0, 0); // Hide initially
            cameraModelGroup.position.set(0, 8, 0); // Start off-screen
            cameraModelGroup.rotation.set(0, 0, -Math.PI * 2); // Start with Z rotation offset (a full spin)

            // Both loaded, trigger intro
            introAnimation();
          },
          null,
          (err) => {
            console.error("Error loading Camera GLTF model:", err);
            introAnimation();
          }
        );
      },
      (xhr) => {
        const total = xhr.total || 435000;
        const progressRatio = Math.min(xhr.loaded / total, 1);
        const progressBar = document.querySelector(".progress");
        if (progressBar) {
          progressBar.style.transform = `scaleX(${progressRatio})`;
        }
      },
      (err) => {
        console.error("Error loading GLTF megaphone:", err);
        // Fallback placeholder box
        const geom = new THREE.BoxGeometry(2, 2, 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0xbe1921, wireframe: true });
        const mesh = new THREE.Mesh(geom, mat);
        megaphoneGroup.add(mesh);
        introAnimation();
      }
    );

    // 5. Scroll & Interactive Animations
    function introAnimation() {
      const introTL = gsap.timeline({
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      });
      introTL
        .to(".loader", {
          x: "150%",
          duration: 0.8,
          ease: "power4.inOut",
          delay: 0.8,
        })
        .fromTo(
          camera.position,
          { x: 3.6, y: -0.04, z: -3.93 },
          { x: isMobile ? -3.6 : -2.3, y: -0.04, z: isMobile ? -3.93 : -5.23, duration: 3.5, ease: "power2.out" },
          "-=0.8"
        )
        .fromTo(
          target,
          { x: 3.16, y: -0.13, z: 0.51 },
          { x: isMobile ? -0.1 : 2.16, y: -0.13, z: isMobile ? 0.51 : -0.79, duration: 3.5, ease: "power2.out" },
          "-=3.5"
        )
        .fromTo(
          megaphoneGroup.rotation,
          { y: 0 },
          { y: isMobile ? 0 : -1.8, duration: 3.5, ease: "power2.out" },
          "-=3.5"
        )
        .fromTo(
          ".header--container",
          { opacity: 0, y: "-100%" },
          { opacity: 1, y: "0%", ease: "power1.inOut", duration: 0.8 },
          "-=1"
        )
        .fromTo(
          ".hero--scroller",
          { opacity: 0, y: "150%" },
          { opacity: 1, y: "0%", ease: "power4.inOut", duration: 1 },
          "-=1"
        )
        .fromTo(
          ".hero--content",
          { opacity: 0, x: "-50%" },
          { opacity: 1, x: "0%", ease: "power4.inOut", duration: 1.5, onComplete: setupScrollAnimation },
          "-=1"
        );
    }

    function setupScrollAnimation() {
      // Force scroll to top at start to guarantee page begins on the first slide
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true });

      // Enable page scrolling
      document.body.style.overflowY = "auto";
      const loaderEl = document.querySelector(".loader");
      if (loaderEl) loaderEl.style.display = "none";

      // --- CAMERA ROTATIONS ON SCROLL ---

      // Section 2 (Performance) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-2",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: isMobile ? -2.5 : -3.5, y: isMobile ? 0.2 : 0.3, z: isMobile ? -3.5 : -5.5, ease: "none" })
      .to(target, { x: isMobile ? 0.1 : -2.2, y: -0.1, z: isMobile ? 0.9 : 0.0, ease: "none" }, "<")
      .to(megaphoneGroup.rotation, { y: 0, ease: "none" }, "<");

      // Section 3 (Power) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-3",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: isMobile ? 0.0 : 0.4, y: isMobile ? 0.15 : 0.2, z: isMobile ? 4.8 : 4.0, ease: "none" })
      .to(target, { x: isMobile ? 0.0 : -0.1, y: isMobile ? 0.0 : -0.1, z: 0.0, ease: "none" }, "<")
      .to(megaphoneGroup.position, { y: -8, ease: "none" }, "<")
      .to(megaphoneGroup.scale, { x: 0, y: 0, z: 0, ease: "none" }, "<")
      .to(cameraModelGroup.position, { x: 0, y: 0, z: 0, ease: "none" }, "<")
      .to(cameraModelGroup.scale, { x: 1, y: 1, z: 1, ease: "none" }, "<")
      .to(cameraModelGroup.rotation, { z: 0, ease: "none" }, "<");

      // Section 4 (Projection) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-4",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
        .to(camera.position, { x: -3.2, y: 1.25, z: 3.75, ease: "none" })
        .to(target, { x: 3.3, y: 0.25, z: 0.6, ease: "none" }, "<");

      // Section 5 (Connectivity) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-connectivity",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: 2.2, y: 0.8, z: -4.5, ease: "none" })
      .to(target, { x: -0.2, y: -0.1, z: 0.5, ease: "none" }, "<")
      .to(cameraModelGroup.position, { y: -8, ease: "none" }, "<")
      .to(cameraModelGroup.scale, { x: 0, y: 0, z: 0, ease: "none" }, "<");

      // Section 6 (Durability) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-durability",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: -1.5, y: -0.4, z: 3.8, ease: "none" })
      .to(target, { x: 0.3, y: 0.1, z: -0.1, ease: "none" }, "<");

      // Section 7 (Recording) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-recording",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: 4.5, y: -2.2, z: 2.5, ease: "none" })
      .to(target, { x: -0.5, y: 0.3, z: -0.2, ease: "none" }, "<");

      // Section 7.5 (Clients) Camera rotation (Intermediate camera movement while camera is hidden)
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-clients",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: 2.0, y: -1.2, z: -1.0, ease: "none" })
      .to(target, { x: -0.7, y: -0.1, z: 0.0, ease: "none" }, "<");

      // Section 8 (Explore) Camera rotation
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-5",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: isMobile ? 0.0 : 1.5, y: 0.8, z: isMobile ? -3.5 : -2.5, ease: "none" })
      .to(target, { x: 0.0, y: 0.0, z: 0.0, ease: "none" }, "<")
      .to(megaphoneGroup.position, { y: 0, ease: "none" }, "<")
      .to(megaphoneGroup.scale, { x: 1, y: 1, z: 1, ease: "none" }, "<")
      .to(megaphoneGroup.rotation, { y: 1.8, ease: "none" }, "<");

      // Section 9 (Contact) Camera rotation (Transition out the megaphone)
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-contact",
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      })
      .to(camera.position, { x: 0.0, y: 0.0, z: -5.0, ease: "none" })
      .to(target, { x: 0.0, y: 0.0, z: 0.0, ease: "none" }, "<")
      .to(megaphoneGroup.position, { y: -8, ease: "none" }, "<")
      .to(megaphoneGroup.scale, { x: 0, y: 0, z: 0, ease: "none" }, "<");


      // --- CONTENT FADE IN / FADE OUT ON SCROLL ---

      // Fade out Hero content as we scroll down
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-1",
          start: "top top",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".hero--content", { opacity: 0, y: -80, ease: "none" })
      .to(".hero--scroller", { opacity: 0, y: 80, ease: "none" }, "<");

      // Fade in/out Performance content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-2",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".performance--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-2",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".performance--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in/out Power content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-3",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".power--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" })
      .fromTo(".power--features--img", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" }, "<");

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-3",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".power--content", { opacity: 0, y: -80, ease: "none" })
      .to(".power--features--img", { opacity: 0, y: -80, ease: "none" }, "<");

      // Fade in/out Projection content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-4",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".autofocus--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-4",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".autofocus--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in/out Connectivity content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-connectivity",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".connectivity--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-connectivity",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".connectivity--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in/out Durability content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-durability",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".durability--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-durability",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".durability--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in/out Recording content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-recording",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".recording--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-recording",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".recording--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in/out Clients content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-clients",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".clients--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-clients",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".clients--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in Explore content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-5",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".explore--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });

      // Fade out Explore content as we scroll to Contact
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-5",
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
        }
      })
      .to(".explore--content", { opacity: 0, y: -80, ease: "none" });

      // Fade in Contact content
      gsap.timeline({
        scrollTrigger: {
          trigger: ".cam-view-contact",
          start: "top bottom",
          end: "top center",
          scrub: true,
        }
      })
      .fromTo(".contact--content", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "none" });
    }

    // explore gallery mode transition
    let exploreLoopId;
    function startExplore() {
      lenis.stop();

      const exploreView = document.querySelector(".cam-view-5");
      const canvasView = canvasRef.current;
      const canvasContainer = containerRef.current;
      const header = document.querySelector(".header");

      if (exploreView) exploreView.style.pointerEvents = "none";
      if (canvasView) {
        canvasView.style.pointerEvents = "all";
        canvasView.style.touchAction = "none";
      }
      if (canvasContainer) canvasContainer.style.zIndex = "5";
      if (header) header.style.position = "fixed";

      document.body.style.overflowY = "hidden";
      document.body.style.cursor = "grab";

      const tlExplore = gsap.timeline({
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      });
      tlExplore
        .to(camera.position, {
          x: 5,
          y: 0.3,
          z: -4.5,
          duration: 2.2,
          ease: "power4.out",
        })
        .to(
          target,
          {
            x: -0.26,
            y: -0.2,
            z: 0.9,
            duration: 2.2,
            ease: "power4.out",
          },
          "-=2.2"
        )
        .fromTo(".header", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power4.out" }, "-=2.2")
        .to(
          ".explore--content",
          {
            opacity: 0,
            x: "130%",
            duration: 1.2,
            ease: "power4.out",
            onComplete: () => {
              const exitContainer = document.querySelector(".exit--container");
              if (exitContainer) exitContainer.style.display = "flex";
              controls.target.copy(target);
              controls.enabled = true;

              // Start on-demand render loop for OrbitControls
              const exploreLoop = () => {
                if (!controls.enabled) return;
                exploreLoopId = requestAnimationFrame(exploreLoop);
                controls.update();
                renderer.render(scene, camera);
              };
              exploreLoop();
            },
          },
          "-=2.2"
        );
    }

    function exitExplore() {
      lenis.start();

      controls.enabled = false;
      cancelAnimationFrame(exploreLoopId);

      const exploreView = document.querySelector(".cam-view-5");
      const canvasView = canvasRef.current;
      const canvasContainer = containerRef.current;
      const header = document.querySelector(".header");
      const exitContainer = document.querySelector(".exit--container");

      if (exploreView) exploreView.style.pointerEvents = "all";
      if (canvasView) {
        canvasView.style.pointerEvents = "none";
        canvasView.style.touchAction = "auto";
      }
      if (canvasContainer) canvasContainer.style.zIndex = "0";
      if (exitContainer) exitContainer.style.display = "none";
      if (header) header.style.position = "absolute";

      document.body.style.overflowY = "auto";
      document.body.style.cursor = "default";

      const tlExit = gsap.timeline({
        onUpdate: () => {
          camera.lookAt(target);
          renderer.render(scene, camera);
        }
      });
      tlExit
        .to(camera.position, {
          x: isMobile ? 0.0 : 1.5,
          y: 0.8,
          z: isMobile ? -3.5 : -2.5,
          duration: 1.2,
          ease: "power4.out",
        })
        .to(
          target,
          {
            x: 0.0,
            y: 0.0,
            z: 0.0,
            duration: 1.2,
            ease: "power4.out",
          },
          "-=1.2"
        )
        .to(
          ".explore--content",
          {
            opacity: 1,
            x: "0%",
            duration: 0.6,
            ease: "power4.out",
          },
          "-=0.6"
        );

      // Reset wireframe if enabled
      setWireframe(false);
    }

    let wireframeActive = false;
    function setWireframe(val) {
      wireframeActive = val;
      modelsContainer.traverse((node) => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((mat) => {
          if (mat) mat.wireframe = val;
        });
      });
      const bodyBtn = document.querySelector(".button--body");
      if (bodyBtn) bodyBtn.innerHTML = val ? "View Solid" : "View Wireframe";
    }

    // Attach button listeners
    const exploreBtn = document.querySelector(".button-explore");
    if (exploreBtn) exploreBtn.addEventListener("click", startExplore);

    const exitBtn = document.querySelector(".button--exit");
    if (exitBtn) exitBtn.addEventListener("click", exitExplore);

    const bodyBtn = document.querySelector(".button--body");
    if (bodyBtn) {
      bodyBtn.addEventListener("click", () => {
        setWireframe(!wireframeActive);
      });
    }

    // 6. Window Resizing
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    };
    window.addEventListener("resize", handleResize);

    // Initial render
    camera.lookAt(target);
    renderer.render(scene, camera);

    // 7. Cleanup on unmount
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
      const overlays = document.querySelectorAll(".debug-error-overlay");
      overlays.forEach((o) => o.remove());

      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(lenisRafId);
      cancelAnimationFrame(exploreLoopId);
      lenis.destroy();
      controls.dispose();
      renderer.dispose();
      htmlEl.style.scrollBehavior = oldScrollBehavior;

      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

      // Clean up DOM listeners
      if (exploreBtn) exploreBtn.removeEventListener("click", startExplore);
      if (exitBtn) exitBtn.removeEventListener("click", exitExplore);

      scene.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((mat) => mat?.dispose?.());
      });
    };
  }, []);

  return (
    <div className="megaphone-scroller-body">
      {/* Loader */}
      <div className="loader">
        <div className="header--brand">LESAAL</div>
        <p>Loading LESAAL Agency... Please wait</p>
        <div className="progress" />
      </div>

      {/* Header */}
      <section className="header">
        <div className="header--container">
          <div className="header--brand">LESAAL</div>
          <ul className="header--menu">
            <li>Services</li>
            <li>Case Studies</li>
            <li>
              <Link href="/admin/login">Login</Link>
            </li>
            <li>
              <Link href="/signup">Register</Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 1 (Hero) */}
      <section className="section cam-view-1">
        <div className="hero--container">
          <div className="hero--content">
            <h2>Amplify your brand's</h2>
            <h1>Voice</h1>
            <p>Welcome to LESAAL. We are a premier digital marketing and creative agency. Using data-driven strategies and storytelling, we help brands scale their audience, optimize conversions, and drive sustainable growth.</p>
            <button className="button button-know-more">Our Services</button>
          </div>
        </div>

        <div className="hero--scroller--container">
          <div className="hero--scroller">
            <p className="hero--scroller--text">Start scrolling to explore</p>
            <svg className="bounce" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 33a15 15 0 1 0 0-30 15 15 0 0 0 0 30Z" stroke="#929292" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m12 18 6 6 6-6M18 12v12" stroke="#929292" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </section>

      {/* Section 2 (Performance) */}
      <section className="section cam-view-2">
        <div className="performance--container">
          <div className="performance--content">
            <h2>Outreach & Amplification</h2>
            <h1>Performance</h1>
            <p>We design campaigns that scale. Our performance marketing strategies amplify your message across search, social, and programmatic channels, blending creative assets with media buying to ensure your brand stands out in a crowded market.</p>
          </div>
        </div>
      </section>

      {/* Section 3 (Power) */}
      <section className="section cam-view-3">
        <div className="power--container">
          <div className="power--content">
            <h2>Aesthetics that bring you</h2>
            <h1>Vision</h1>
            <p>We capture your brand's essence. From corporate video production and product photography to UI/UX and full brand identities, our creative studio design setups tell stories that leave a lasting impression.</p>
          </div>
          <div className="power--features--img">
            <div style={{ background: "rgba(255,255,255,0.7)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "18px", color: "#be1921", marginBottom: "12px" }}>LESAAL Creative Specs</h3>
              <ul style={{ margin: 0, padding: "0 0 0 16px", listStyleType: "disc", color: "#444", fontSize: "14px", lineHeight: "1.8" }}>
                <li>Full Brand Identity Design & Strategy</li>
                <li>High-End Video Production & Editing</li>
                <li>Custom UI/UX & Web App Engineering</li>
                <li>Social Media & Growth Campaigns</li>
                <li>Data Analytics & PR Management</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 (Projection) */}
      <section className="section cam-view-4">
        <div className="autofocus--container">
          <div className="autofocus--content">
            <h1>Laser-focused <strong>targeting</strong></h1>
            <p>Our AI-powered audience segmentation and deep learning let you keep your target prospects in view, dynamically optimizing ad spend to capture high-intent buyers in real time.</p>
          </div>
        </div>
      </section>

      {/* Section 5 (Connectivity) */}
      <section className="section cam-view-connectivity">
        <div className="connectivity--container">
          <div className="connectivity--content">
            <h2>Omnichannel</h2>
            <h1>Integration</h1>
            <p>Connect your entire marketing ecosystem. We integrate CRMs, email marketing flows, ad accounts, and analytics pipelines to ensure you can track the entire customer journey in a single unified dashboard.</p>
          </div>
        </div>
      </section>

      {/* Section 6 (Durability) */}
      <section className="section cam-view-durability">
        <div className="durability--container">
          <div className="durability--content">
            <h2>Built for</h2>
            <h1>Growth</h1>
            <p>Our marketing strategies are built to survive changes in algorithms and market trends. We focus on search engine optimization (SEO), brand authority, and community building, creating a durable foundation for long-term growth.</p>
          </div>
        </div>
      </section>

      {/* Section 7 (Recording) */}
      <section className="section cam-view-recording">
        <div className="recording--container">
          <div className="recording--content">
            <h2>Transparent</h2>
            <h1>Analytics</h1>
            <p>Know exactly where every dollar goes. With custom real-time reporting dashboards and multi-touch attribution modeling, you can monitor conversions, track client acquisitions, and optimize campaigns instantly.</p>
          </div>
        </div>
      </section>

      {/* Section 7.5 (Our Clients) */}
      <section className="section cam-view-clients">
        <div className="clients--container">
          <div className="clients--content">
            <h2>Trusted by the best</h2>
            <h1>Our Clients</h1>
            <p className="clients--subtitle">We partner with leading brands and enterprises globally to amplify their growth and market share.</p>
            
            <div className="clients--grid">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="client--card">
                  <div className="client--logo--placeholder">
                    <span className="client--logo--text">Client {i + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 (Explore) */}
      <section className="section cam-view-5">
        <div className="explore--container">
          <div className="explore--content">
            <h1>Interactive<strong><br />agency tour</strong></h1>
            <button className="button button-explore">Explore</button>
          </div>
        </div>
      </section>

      {/* Section 9 (Contact Us) */}
      <section className="section cam-view-contact">
        <div className="contact--container">
          <div className="contact--content">
            <h2>Get in Touch</h2>
            <h1>Contact Us</h1>
            <p className="contact--subtitle">Ready to grow your brand? Contact LESAAL Agency today and let's discuss your next campaign.</p>
            
            <form className="contact--form" onSubmit={(e) => e.preventDefault()}>
              <div className="form--group">
                <input type="text" placeholder="Name" required className="form--input" />
              </div>
              <div className="form--group">
                <input type="email" placeholder="Email Address" required className="form--input" />
              </div>
              <div className="form--group">
                <textarea placeholder="Your Message" rows="5" required className="form--input form--textarea"></textarea>
              </div>
              <button type="submit" className="button button-contact">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* Exit Container */}
      <div className="exit--container">
        <button className="button--secondary button--body">View Abstract Model</button>
        <button className="button--secondary button--exit">Exit</button>
      </div>

      {/* WebGi Canvas Container */}
      <div id="webgi-canvas-container" ref={containerRef}>
        <canvas id="webgi-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}
