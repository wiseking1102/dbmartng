"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 3D DB-monogram shopping cart logo for the homepage hero.
 *
 * Constructs a stylised cart silhouette from primitive geometries:
 *  - A rounded cart body (box with bevel/chamfer via CylinderGeometry segments)
 *  - Two wheels (torus geometries)
 *  - A handle / D-B letterform accent (extruded shapes)
 *
 * The entire assembly rotates slowly in the render loop.
 * Falls back to a static gradient when prefers-reduced-motion is active.
 */

const BRAND_NAVY = new THREE.Color("#0B3C7B");
const BRAND_GOLD = new THREE.Color("#C9B037");
const BRAND_GOLD_LIGHT = new THREE.Color("#d4c04d");

export function DBLogo3D() {
  const groupRef = useRef<THREE.Group>(null);
  const prefersReduced = useReducedMotion();

  // ── Shared materials (memoised so they don't recreate every frame) ──
  const cartBodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: BRAND_NAVY,
        metalness: 0.6,
        roughness: 0.2,
        clearcoat: 0.4,
      }),
    []
  );

  const goldMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: BRAND_GOLD,
        metalness: 0.8,
        roughness: 0.15,
        clearcoat: 0.6,
      }),
    []
  );

  const goldAccentMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: BRAND_GOLD_LIGHT,
        metalness: 0.7,
        roughness: 0.2,
        clearcoat: 0.3,
      }),
    []
  );

  // ── Rotation animation (delta-safe) ──
  useFrame((_state, delta) => {
    if (!groupRef.current || prefersReduced) return;
    groupRef.current.rotation.y += delta * 0.3;
    // Gentle wobble
    groupRef.current.position.y = Math.sin(_state.clock.elapsedTime * 0.5) * 0.08;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ─── Shopping Cart Body ─── */}
      {/* Main cart basket — a rounded box-like shape */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.6, 0.9, 1.1]} />
        <primitive object={cartBodyMat} />
      </mesh>

      {/* Cart front panel — slightly recessed */}
      <mesh position={[0, 0.15, 0.56]} castShadow>
        <boxGeometry args={[1.4, 0.7, 0.05]} />
        <primitive object={goldAccentMat} />
      </mesh>

      {/* ─── Wheels ─── */}
      {/* Left wheel */}
      <mesh position={[-0.7, -0.35, 0.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.2, 0.06, 12, 16]} />
        <primitive object={goldMat} />
      </mesh>
      {/* Right wheel */}
      <mesh position={[0.7, -0.35, 0.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.2, 0.06, 12, 16]} />
        <primitive object={goldMat} />
      </mesh>

      {/* ─── Handle / Letterform accent ─── */}
      {/* Upright handle (like the stem of a 'D') */}
      <mesh position={[-0.65, 0.7, 0]} castShadow>
        <boxGeometry args={[0.08, 0.55, 0.08]} />
        <primitive object={goldMat} />
      </mesh>

      {/* Curved handle top */}
      <mesh position={[-0.4, 0.95, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.45, 0.08, 0.08]} />
        <primitive object={goldMat} />
      </mesh>

      {/* 'B' accent — horizontal bar */}
      <mesh position={[0.25, 0.45, 0.56]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <primitive object={goldAccentMat} />
      </mesh>

      {/* 'B' accent — bottom bar */}
      <mesh position={[0.25, -0.05, 0.56]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <primitive object={goldAccentMat} />
      </mesh>

      {/* ─── Ambient glow ring ─── */}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.9, 32]} />
        <meshBasicMaterial
          color={BRAND_GOLD}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ─── Subtle particle sparkles ─── */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.3 + Math.random() * 0.3;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, Math.sin(angle) * 0.8 + 0.1, Math.sin(angle) * radius * 0.3]}
            scale={0.02 + Math.random() * 0.02}
          >
            <sphereGeometry args={[0.5, 6, 6]} />
            <meshBasicMaterial color={BRAND_GOLD} transparent opacity={0.3 + Math.random() * 0.3} />
          </mesh>
        );
      })}
    </group>
  );
}
