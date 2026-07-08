"use client";

import { useState, useEffect } from "react";

/**
 * Hook that detects whether the user prefers reduced motion.
 * Respects the `prefers-reduced-motion: reduce` media query.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook that detects device capability tier for deciding
 * whether to render 3D content or a static fallback.
 * Returns "low" for mobile / data-saver, "high" for desktop.
 */
export type DeviceTier = "low" | "high";

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("high");

  useEffect(() => {
    const checkTier = () => {
      // Check for data-saver
      const connection = (navigator as any).connection;
      const isDataSaver =
        connection?.saveData === true;

      // Check for mobile / low-end device
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      const isLowMemory =
        (navigator as any).deviceMemory !== undefined &&
        (navigator as any).deviceMemory < 4;

      if (isDataSaver || (isMobile && isLowMemory)) {
        setTier("low");
      } else {
        setTier("high");
      }
    };

    checkTier();
  }, []);

  return tier;
}
