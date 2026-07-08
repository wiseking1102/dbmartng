"use client";

import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import { DBLogo3D } from "./DBLogo3D";
import { useReducedMotion, useDeviceTier } from "@/hooks/useReducedMotion";
import { Suspense } from "react";

/**
 * 3D Scene container for the homepage hero.
 *
 * Lazy-load this component with `next/dynamic` (`ssr: false`).
 *
 * Performance guards:
 *  - `dpr={[1, 1.5]}` caps pixel ratio on high-DPI screens.
 *  - Reduced-motion users get a static render (no rotation animation inside DBLogo3D).
 *  - Low-end / data-saver devices get a simple static fallback.
 *  - Canvas is lazy-loaded so it never blocks FCP.
 */
export function Scene3D() {
  const prefersReduced = useReducedMotion();
  const deviceTier = useDeviceTier();

  // Low-end tier → skip the 3D canvas entirely
  if (deviceTier === "low") {
    return <StaticFallback />;
  }

  // Reduced motion → render the model but without rotation (handled inside DBLogo3D)
  return (
    <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 via-transparent to-brand-navy/10 rounded-full blur-3xl" />

      <Suspense fallback={<StaticFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          camera={{ position: [0, 0, 3.5], fov: 40 }}
          shadows={false}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.4} />
          <pointLight position={[0, 3, 0]} intensity={0.3} color="#C9B037" />

          <DBLogo3D />

          <Preload all />
        </Canvas>
      </Suspense>
    </div>
  );
}

/**
 * Static fallback shown while 3D loads, on low-end devices,
 * or when prefers-reduced-motion is active.
 * Uses the flat brand logo SVG/PNG instead.
 */
function StaticFallback() {
  return (
    <div className="relative w-80 h-80 sm:w-96 sm:h-96 animate-float">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-brand-navy/20 rounded-full blur-3xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-3d.png"
        alt="DBMartNG 3D Logo"
        className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
      />
    </div>
  );
}
