"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Lenis from "@studio-freight/lenis";
import "../app/styles/megaphone-scroller.css";

export default function MegaphoneScrollerPage() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollTimelineRef = useRef(null);

  useEffect(() => {
    // Prevent SSR execution
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const isMobile = window.innerWidth <= 768;

    // Disable scroll-behavior: smooth on html to prevent Lenis smooth scroll conflicts
    const htmlEl = document.documentElement;
    const oldScrollBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = "auto";

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
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(5.8, 3.8, 6.8);

    const fillLight = new THREE.DirectionalLight(0xf2f5ff, 0.8);
    fillLight.position.set(-4.2, 2.1, 3.4);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(-6.2, 1.2, -4.8);

    scene.add(ambient, keyLight, fillLight, rimLight);

    // 3. OrbitControls (disabled initially)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go too far under the model

    // 4. Model Loading
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const loader = new GLTFLoader();
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

        loadedObject.position.sub(center);
        const longestAxis = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.6 / longestAxis;
        loadedObject.scale.setScalar(scale);

        modelGroup.add(loadedObject);

        // Model is loaded, trigger intro animation
        introAnimation();
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
        modelGroup.add(mesh);
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
          modelGroup.rotation,
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
      .to(modelGroup.rotation, { y: 0, ease: "none" }, "<");

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
      .to(camera.position, { x: -0.07, y: isMobile ? 3 : 5.45, z: isMobile ? -1.1 : -3.7, ease: "none" })
      .to(target, { x: isMobile ? -0.4 : -0.04, y: isMobile ? -3.8 : -0.52, z: 0.61, ease: "none" }, "<");

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
      .to(camera.position, { x: -5.5, y: 1.7, z: 5, ease: "none" })
      .to(target, { x: 0.04, y: 0.2, z: 0.6, ease: "none" }, "<");

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
      .to(target, { x: -0.2, y: -0.1, z: 0.5, ease: "none" }, "<");

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
      .to(camera.position, { x: -0.3, y: -0.3, z: -4.85, ease: "none" })
      .to(target, { x: isMobile ? -0.1 : -0.9, y: -0.17, z: 0.1, ease: "none" }, "<");


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
          x: -0.3,
          y: -0.3,
          z: -4.85,
          duration: 1.2,
          ease: "power4.out",
        })
        .to(
          target,
          {
            x: isMobile ? -0.1 : -0.9,
            y: -0.17,
            z: 0.1,
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
      modelGroup.traverse((node) => {
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
        <p>Loading Megaphone... Please wait</p>
        <div className="progress" />
      </div>

      {/* Header */}
      <section className="header">
        <div className="header--container">
          <div className="header--brand">LESAAL</div>
          <ul className="header--menu">
            <li>Features</li>
            <li>Experience it</li>
            <li>Buy now</li>
          </ul>
        </div>
      </section>

      {/* Section 1 (Hero) */}
      <section className="section cam-view-1">
        <div className="hero--container">
          <div className="hero--content">
            <h2>Always announce like a</h2>
            <h1>Pro</h1>
            <p>Discover our most advanced megaphone and audio series yet: blazing fast connectivity, incredible sound projection, superb battery stabilization, sharp audio quality, and so much more.</p>
            <button className="button button-know-more">Know more</button>
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
            <h2>Outstanding</h2>
            <h1>Performance</h1>
            <p>The Megaphone 01 is perfect for content creators and presenters looking to take their outreach to the next level. Featuring a high-efficiency 15W amplifier, a 24-hour rechargeable battery, and lightning-fast Bluetooth syncing, the Megaphone 01 brings some of the best features to a sleek, lightweight design.</p>
            <div className="performance--media">
              <img src="/images/performance_video.jpg" alt="performance video thumbnail" onError={(e) => { e.target.style.display = "none"; }} />
              <svg width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: "pointer" }}>
                <path d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4 4 12.954 4 24s8.954 20 20 20Z" stroke="#be1921" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m18 15 14 9-14 9V15Z" stroke="#be1921" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 (Power) */}
      <section className="section cam-view-3">
        <div className="power--container">
          <div className="power--content">
            <h2>Features that bring you</h2>
            <h1>Power</h1>
            <p>The easy-to-carry Megaphone 01 packs advanced features into a lightweight, compact design. Pair with a wireless microphone for a high-performance setup that fits easily and comfortably in your hand.</p>
          </div>
          <div className="power--features--img">
            <div style={{ background: "rgba(255,255,255,0.7)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "18px", color: "#be1921", marginBottom: "12px" }}>Megaphone 01 specs</h3>
              <ul style={{ margin: 0, padding: "0 0 0 16px", listStyleType: "disc", color: "#444", fontSize: "14px", lineHeight: "1.8" }}>
                <li>15 Watts Max Output Power</li>
                <li>Bluetooth 5.2 Audio Streaming</li>
                <li>Built-in Siren and Recording Mode</li>
                <li>IPX5 Weather Resistant Chassis</li>
                <li>Lithium-Ion USB-C Rechargeable Battery</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 (Projection) */}
      <section className="section cam-view-4">
        <div className="autofocus--container">
          <div className="autofocus--content">
            <h1>Smart, speedy <strong>voice projection</strong></h1>
            <p>Our Dual-Cone projection technology with ambient noise control lets you keep your voice clear while it filters out background noise for crystal clear audio projection.</p>
          </div>
        </div>
      </section>

      {/* Section 5 (Connectivity) */}
      <section className="section cam-view-connectivity">
        <div className="connectivity--container">
          <div className="connectivity--content">
            <h2>Seamless</h2>
            <h1>Connectivity</h1>
            <p>Sync with your smartphone, tablet, or wireless microphone in less than a second. With Bluetooth 5.2, project audio directly from your streaming apps, pre-recorded alerts, or voice clips at a range of up to 50 meters.</p>
          </div>
        </div>
      </section>

      {/* Section 6 (Durability) */}
      <section className="section cam-view-durability">
        <div className="durability--container">
          <div className="durability--content">
            <h2>Built for the</h2>
            <h1>Elements</h1>
            <p>Rain or shine, the Megaphone 01 keeps going. Engineered with an IPX5 water-resistant casing and impact-absorbing bumpers, it is built to survive drops, splashes, and extreme temperatures without losing sound projection.</p>
          </div>
        </div>
      </section>

      {/* Section 7 (Recording) */}
      <section className="section cam-view-recording">
        <div className="recording--container">
          <div className="recording--content">
            <h2>Record &</h2>
            <h1>Playback</h1>
            <p>Capture up to 240 seconds of high-fidelity voice memo directly on the internal storage and loop it on repeat. Need immediate attention? Toggle the built-in alert siren with a single tactile button.</p>
          </div>
        </div>
      </section>

      {/* Section 8 (Explore) */}
      <section className="section cam-view-5">
        <div className="explore--container">
          <div className="explore--content">
            <h1>Interactive<strong><br />3D gallery</strong></h1>
            <button className="button button-explore">Explore</button>
          </div>
        </div>
      </section>

      {/* Exit Container */}
      <div className="exit--container">
        <button className="button--secondary button--body">View Wireframe</button>
        <button className="button--secondary button--exit">Exit</button>
      </div>

      {/* WebGi Canvas Container */}
      <div id="webgi-canvas-container" ref={containerRef}>
        <canvas id="webgi-canvas" ref={canvasRef} />
      </div>
    </div>
  );
}
