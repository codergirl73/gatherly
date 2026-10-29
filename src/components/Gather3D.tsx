"use client";
import { useEffect, useRef, useState } from "react";
import { TasteConstellation } from "./TasteConstellation";

const PEOPLE = ["#ff6b4a", "#6d4aff", "#14915f", "#d6409f", "#0e7ad6"];

/**
 * Gatherly's idea in 3D: five people (colored spheres) drift apart, then gather around one shared
 * center (two interlocking rings, the logo) and the group "locks in". Pointer moves tilt the scene.
 * Falls back to the 2D taste map when WebGL is unavailable or the user prefers reduced motion.
 */
export function Gather3D({ className = "", names }: { className?: string; names: string[] }) {
  const mount = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setFallback(true), 0);
      return () => clearTimeout(t);
    }
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);
        renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 1.2, 6.6);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x6d4aff, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(4, 6, 6);
        scene.add(key);
        const glow = new THREE.PointLight(0xff6b4a, 40, 14);
        scene.add(glow);

        const css = getComputedStyle(document.documentElement);
        const brand = new THREE.Color(css.getPropertyValue("--brand").trim() || "#6d4aff");
        const accent = new THREE.Color(css.getPropertyValue("--accent").trim() || "#ff6b4a");

        const world = new THREE.Group();
        scene.add(world);

        // Shared center: two interlocking rings = the Gatherly mark.
        const core = new THREE.Group();
        const ringGeo = new THREE.TorusGeometry(0.62, 0.15, 32, 96);
        const ringA = new THREE.Mesh(ringGeo, new THREE.MeshPhysicalMaterial({ color: brand, metalness: 0.35, roughness: 0.22, clearcoat: 1, emissive: brand, emissiveIntensity: 0.35 }));
        const ringB = new THREE.Mesh(ringGeo, new THREE.MeshPhysicalMaterial({ color: accent, metalness: 0.35, roughness: 0.22, clearcoat: 1, emissive: accent, emissiveIntensity: 0.35 }));
        ringA.position.x = -0.36;
        ringB.position.x = 0.36;
        ringA.rotation.y = ringB.rotation.y = Math.PI / 2.6;
        core.add(ringA, ringB);
        world.add(core);

        // People: glossy spheres on a tilted orbit, each trailing a line to the center.
        const n = Math.min(names.length || 5, PEOPLE.length);
        const people = Array.from({ length: n }, (_, i) => {
          const color = new THREE.Color(PEOPLE[i % PEOPLE.length]);
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 48, 48),
            new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0.05, clearcoat: 1, emissive: color, emissiveIntensity: 0.18 }),
          );
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
          );
          world.add(mesh, line);
          return { mesh, line, phase: (i / n) * Math.PI * 2, wobble: Math.random() * 6 };
        });

        // Shared "taste themes": small drifting crystals.
        const crystalGeo = new THREE.OctahedronGeometry(0.1);
        const crystals = Array.from({ length: 16 }, (_, i) => {
          const m = new THREE.Mesh(crystalGeo, new THREE.MeshStandardMaterial({ color: i % 2 ? brand : accent, emissive: i % 2 ? brand : accent, emissiveIntensity: 0.6, roughness: 0.3 }));
          world.add(m);
          return { m, a: Math.random() * Math.PI * 2, r: 1.2 + Math.random() * 2.6, y: (Math.random() - 0.5) * 2.4, s: 0.15 + Math.random() * 0.3 };
        });

        const resize = () => {
          const w = el.clientWidth || 1, h = el.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        resize();

        const pointer = { x: 0, y: 0 };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
          pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        };
        window.addEventListener("pointermove", onMove, { passive: true });

        let visible = true;
        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
        io.observe(el);

        const ease = (t: number) => t * t * (3 - 2 * t);
        const clock = new THREE.Clock();
        let raf = 0;
        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (!visible || document.hidden) return;
          const t = clock.getElapsedTime();
          // 8s loop: apart -> gathering -> together -> apart. `g` = how gathered the group is (0..1).
          const cycle = (t % 8) / 8;
          const g = cycle < 0.35 ? ease(cycle / 0.35) : cycle < 0.75 ? 1 : 1 - ease((cycle - 0.75) / 0.25);
          const radius = 3.1 - g * 1.5;

          people.forEach((p, i) => {
            const a = p.phase + t * (0.35 + g * 0.25);
            const x = Math.cos(a) * radius;
            const z = Math.sin(a) * radius * 0.7;
            const y = Math.sin(t * 0.9 + p.wobble) * 0.25 + Math.sin(a) * 0.5;
            p.mesh.position.set(x, y, z);
            p.mesh.scale.setScalar(1 + g * 0.12);
            const pos = p.line.geometry.attributes.position as import("three").BufferAttribute;
            pos.setXYZ(0, x, y, z);
            pos.setXYZ(1, 0, 0, 0);
            pos.needsUpdate = true;
            (p.line.material as import("three").LineBasicMaterial).opacity = 0.2 + g * 0.6;
            void i;
          });

          core.rotation.y = t * 0.6;
          core.rotation.x = Math.sin(t * 0.5) * 0.25;
          core.scale.setScalar(1 + g * 0.18 + Math.sin(t * 3) * 0.015);
          glow.intensity = 18 + g * 40;
          for (const r of [ringA, ringB]) (r.material as import("three").MeshPhysicalMaterial).emissiveIntensity = 0.25 + g * 0.7;

          crystals.forEach((c) => {
            const a = c.a + t * c.s * (1 + g);
            const rr = c.r * (1 - g * 0.35);
            c.m.position.set(Math.cos(a) * rr, c.y + Math.sin(t + c.a) * 0.15, Math.sin(a) * rr * 0.7);
            c.m.rotation.x += 0.01;
            c.m.rotation.y += 0.013;
          });

          world.rotation.y += (pointer.x * 0.35 - world.rotation.y) * 0.05;
          world.rotation.x += (pointer.y * 0.18 - world.rotation.x) * 0.05;
          renderer.render(scene, camera);
        };
        tick();
        setReady(true);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("pointermove", onMove);
          ro.disconnect();
          io.disconnect();
          scene.traverse((o) => {
            const m = o as import("three").Mesh;
            m.geometry?.dispose?.();
            const mat = m.material as import("three").Material | import("three").Material[] | undefined;
            (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) setFallback(true);
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [names]);

  if (fallback) return <TasteConstellation names={names} chips={["Atmospheric", "Cinematic", "Indie", "Expressive"]} className={className} />;
  return (
    <div className={`relative w-full ${className || "aspect-square"}`} role="img" aria-label="Five people's tastes drifting apart, then gathering around one shared plan">
      <div ref={mount} className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />
      {!ready && <div className="absolute inset-0 grid place-items-center"><div className="size-24 animate-pulse rounded-full bg-gradient-to-br from-brand to-accent opacity-40 blur-xl" /></div>}
    </div>
  );
}
