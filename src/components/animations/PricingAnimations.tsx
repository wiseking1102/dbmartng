"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the pricing page content with GSAP scroll animations:
 *  - Hero title fade-in
 *  - Pricing cards staggered reveal from bottom
 *  - FAQ items staggered accordion entrance
 */
export function PricingAnimations({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced) return;

      // ─── Hero section ───
      gsap.fromTo(
        ".pricing-hero",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-hero",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Pricing Cards ───
      gsap.fromTo(
        ".pricing-card",
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "back.out(1.4)",
          scrollTrigger: {
            trigger: ".pricing-cards",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── FAQ Section ───
      gsap.fromTo(
        ".faq-item",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".faq-section",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: container }
  );

  return <div ref={container}>{children}</div>;
}
