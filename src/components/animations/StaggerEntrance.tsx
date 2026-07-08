"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface StaggerEntranceProps {
  children: React.ReactNode;
  /** Custom className for the wrapper div */
  className?: string;
  /** Stagger delay between each child (seconds). Default: 0.07 */
  stagger?: number;
  /** Duration of each child's animation (seconds). Default: 0.4 */
  duration?: number;
  /** Starting Y offset for the slide-up. Default: 12 */
  y?: number;
}

/**
 * Staggers the entrance of direct children using GSAP.
 * Each child fades in and slides up sequentially.
 * Respects prefers-reduced-motion — renders children directly with no animation.
 *
 * @example
 * ```tsx
 * <StaggerEntrance>
 *   <Section1 />
 *   <Section2 />
 *   <Section3 />
 * </StaggerEntrance>
 * ```
 */
export default function StaggerEntrance({
  children,
  className = "",
  stagger = 0.07,
  duration = 0.4,
  y = 12,
}: StaggerEntranceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced || !containerRef.current) return;
      const items = containerRef.current.children;
      if (items.length === 0) return;

      gsap.set(items, { autoAlpha: 0, y });
      gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration,
        stagger,
        ease: "power2.out",
      });
    },
    { scope: containerRef, dependencies: [prefersReduced, stagger, duration, y] }
  );

  if (prefersReduced) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className={`stagger-entrance ${className}`}>
      {children}
    </div>
  );
}
