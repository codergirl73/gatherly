"use client";
import { useEffect, useRef } from "react";

const PALETTE = ["#6d4aff", "#ff6b4a", "#14915f", "#d6409f", "#0e7ad6", "#f0b429"];

/**
 * Site-wide 3D backdrop: glossy spheres, rings and crystals drifting at different depths, with scroll
 * parallax and pointer sway. It sits behind the content at low opacity. Desktop only; off for
 * reduced-motion users; pauses when the tab is hidden.
 */
export function AmbientScene() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(max-width: 767px)").matches) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0, 14);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x6d4aff, 1.2));
        const key = new THREE.DirectionalLight(0xffffff, 2);
        key.position.set(5, 8, 8);
        scene.add(key);

        const geos = [
          new THREE.SphereGeometry(1, 40, 40),
          new THREE.TorusGeometry(0.8, 0.28, 24, 64),
          new THREE.OctahedronGeometry(1),
          new THREE.IcosahedronGeometry(1, 0),
          new THREE.TorusKnotGeometry(0.6, 0.2, 80, 12),
        ];
        const items = Array.from({ length: 20 }, (_, i) => {
          const color = new THREE.Color(PALETTE[i % PALETTE.length]);
          const mesh = new THREE.Mesh(geos[i % geos.length], new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0.1, clearcoat: 1, emissive: color, emissiveIntensity: 0.12 }));
          const depth = Math.random();
          // Keep most shapes toward the left/right edges so they frame the content instead of sitting on it.
          const side = i % 2 ? 1 : -1;
          const frac = side * (0.84 + Math.random() * 0.22); // fraction of the visible half-width: hug the screen edges
          const size = 0.35 + Math.random() * 0.7;
          mesh.scale.setScalar(size);
          scene.add(mesh);
          return { mesh, frac, baseY: Math.random() * 26, z: -10 + depth * 9, depth, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).multiplyScalar(0.6), phase: Math.random() * 6 };
        });

        const resize = () => {
          const w = innerWidth, h = innerHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        addEventListener("resize", resize);

        const pointer = { x: 0, y: 0 };
        const onMove = (e: PointerEvent) => {
          pointer.x = (e.clientX / innerWidth - 0.5) * 2;
          pointer.y = (e.clientY / innerHeight - 0.5) * 2;
        };
        addEventListener("pointermove", onMove, { passive: true });

        const RANGE = 26;
        const clock = new THREE.Clock();
        let raf = 0;
        let target = window.scrollY;
        const onScroll = () => (target = window.scrollY);
        addEventListener("scroll", onScroll, { passive: true });
        let smooth = target;

        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (document.hidden) return;
          const t = clock.getElapsedTime();
          smooth += (target - smooth) * 0.08;
          const halfH = Math.tan((40 / 2) * (Math.PI / 180)) * 14;
          for (const it of items) {
            // Nearer shapes travel faster with scroll: parallax depth.
            const y = (((it.baseY + smooth * 0.012 * (0.4 + it.depth * 1.2)) % RANGE) + RANGE) % RANGE - RANGE / 2;
            it.mesh.position.set(it.frac * halfH * camera.aspect * ((14 - it.z) / 14) + Math.sin(t * 0.4 + it.phase) * 0.35 + pointer.x * (0.3 + it.depth), y + Math.cos(t * 0.5 + it.phase) * 0.3 - pointer.y * 0.2, it.z);
            it.mesh.rotation.x += it.spin.x * 0.01;
            it.mesh.rotation.y += it.spin.y * 0.01 + 0.002;
          }
          renderer.render(scene, camera);
        };
        tick();

        cleanup = () => {
          cancelAnimationFrame(raf);
          removeEventListener("resize", resize);
          removeEventListener("pointermove", onMove);
          removeEventListener("scroll", onScroll);
          geos.forEach((g) => g.dispose());
          items.forEach((it) => (it.mesh.material as import("three").Material).dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        /* no WebGL: the page simply has no backdrop */
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={mount} aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-50 dark:opacity-60" />;
}
