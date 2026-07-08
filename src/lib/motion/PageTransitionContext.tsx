"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PageTransitionContextValue {
  /** Play the exit animation and return a promise that resolves when done.
   *  Call this before navigating to a new page. */
  playExit: () => Promise<void>;
  /** True while the exit animation is playing. */
  isExiting: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(
  null
);

/**
 * Provides a shared page-transition context for dashboard pages.
 * Wraps children in a container that GSAP animates:
 *  - **Entrance** (per-page): quick fade + slight slide-up triggered
 *    by route changes (via `usePathname`)
 *  - **Exit**: fade + slight slide-down when `playExit()` is called
 *
 * Place this once in a layout to give all descendant pages
 * consistent transition behaviour.
 */
export function PageTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const entranceTl = useRef<gsap.core.Timeline | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const prefersReduced = useReducedMotion();
  const pathname = usePathname();

  // Entrance animation – re-triggers on every route change (per-page)
  useEffect(() => {
    if (prefersReduced) return;
    if (!container.current) return;

    // Kill any running entrance timeline
    entranceTl.current?.kill();

    // Reset opacity in case a previous exit animation hid the container
    gsap.set(container.current, { clearProps: "all" });

    entranceTl.current = gsap.timeline();
    entranceTl.current
      .set(container.current, { autoAlpha: 0, y: 12, scale: 0.98 })
      .to(container.current, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });

    return () => {
      entranceTl.current?.kill();
    };
  }, [pathname, prefersReduced]);

  const playExit = useCallback(async (): Promise<void> => {
    if (prefersReduced) return;

    // Kill any running entrance animation to avoid conflicts
    entranceTl.current?.kill();

    setIsExiting(true);

    return new Promise<void>((resolve) => {
      gsap.to(container.current, {
        autoAlpha: 0,
        y: -12,
        scale: 0.98,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setIsExiting(false);
          resolve();
        },
      });
    });
  }, [prefersReduced]);

  return (
    <PageTransitionContext.Provider value={{ playExit, isExiting }}>
      <div ref={container} className="min-h-screen">
        {children}
      </div>
    </PageTransitionContext.Provider>
  );
}

/**
 * Hook to access the page transition context.
 * Throws if used outside of a <PageTransitionProvider>.
 */
export function usePageTransition(): PageTransitionContextValue {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    throw new Error(
      "usePageTransition must be used within a <PageTransitionProvider>"
    );
  }
  return ctx;
}
