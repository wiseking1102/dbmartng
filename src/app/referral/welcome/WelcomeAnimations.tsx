"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const EXIT_DURATION = 0.35;

/**
 * Wraps the referral welcome page and applies a staged, smooth entrance animation:
 *  - Logo drops in with a gentle scale
 *  - Card scales up from a subtle zoom
 *  - Icon, title, referrer message, divider, next steps, CTA, and teaser
 *    each slide up in sequence with staggered timing
 *
 * When `isExiting` flips to true, elements animate out in reverse and
 * `onExitComplete` is called once the last animation finishes.
 */
export function WelcomeAnimations({
  children,
  isExiting,
  onExitComplete,
}: {
  children: React.ReactNode;
  isExiting?: boolean;
  onExitComplete?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Entrance animation (runs once on mount)
  useGSAP(
    () => {
      if (prefersReduced) return;

      // Set initial state: all animated elements start hidden
      gsap.set(
        [
          ".welcome-logo",
          ".welcome-card",
          ".welcome-icon",
          ".welcome-title",
          ".welcome-message",
          ".welcome-divider",
          ".welcome-steps",
          ".welcome-cta",
          ".welcome-teaser",
        ],
        { autoAlpha: 0 }
      );

      // Slight scale-down on the card
      gsap.set(".welcome-card", { scale: 0.96, y: 10 });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.6 },
      });

      tl.to(".welcome-logo", { autoAlpha: 1, y: 0, duration: 0.5 })
        .to(".welcome-card", { autoAlpha: 1, scale: 1, y: 0, duration: 0.55 }, "-=0.15")
        .to(".welcome-icon", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.3")
        .to(".welcome-title", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.2")
        .to(".welcome-message", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.15")
        .to(".welcome-divider", { autoAlpha: 1, y: 0, duration: 0.3 }, "-=0.1")
        .to(".welcome-steps", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.05")
        .to(".welcome-cta", { autoAlpha: 1, y: 0, duration: 0.35 }, "-=0.1")
        .to(".welcome-teaser", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.1");
    },
    { scope: container }
  );

  // Exit animation (runs when isExiting flips to true)
  useEffect(() => {
    if (!isExiting) return;
    if (prefersReduced) {
      // Reduced motion: skip animation, navigate immediately
      onExitComplete?.();
      return;
    }

    const exitTl = gsap.timeline({
      defaults: { ease: "power2.in", duration: EXIT_DURATION },
      onComplete: onExitComplete,
    });

    // Animate out in reverse order with faster, tighter overlaps
    exitTl
      .to(".welcome-teaser", { autoAlpha: 0, y: 10 }, "0")
      .to(".welcome-cta", { autoAlpha: 0, y: 10 }, "-=0.05")
      .to(".welcome-steps", { autoAlpha: 0, y: 10 }, "-=0.08")
      .to(".welcome-divider", { autoAlpha: 0, y: 10 }, "-=0.08")
      .to(".welcome-message", { autoAlpha: 0, y: 10 }, "-=0.08")
      .to(".welcome-title", { autoAlpha: 0, y: -10 }, "-=0.1")
      .to(".welcome-icon", { autoAlpha: 0, y: -10, scale: 0.9 }, "-=0.08")
      .to(".welcome-card", { autoAlpha: 0, scale: 0.96, y: 10 }, "-=0.08")
      .to(".welcome-logo", { autoAlpha: 0, y: -10, duration: EXIT_DURATION * 1.2 }, "-=0.05");

    return () => {
      exitTl.kill();
    };
  }, [isExiting, prefersReduced, onExitComplete]);

  return <div ref={container}>{children}</div>;
}
