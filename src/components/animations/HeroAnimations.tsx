"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the homepage content and applies GSAP ScrollTrigger animations:
 *  - Hero entrance: staged text reveal (badge, headline, description, search bar, CTA)
 *  - Stats counter: count-up animation on the stats bar when it scrolls into view
 *  - Category cards: staggered fade-in on scroll
 *  - Featured vendors: staggered card reveal on scroll
 *  - "How It Works" steps: staggered reveal
 *  - CTA section: fade-in on scroll
 */
export function HeroAnimations({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced) return;

      // ─── Hero Entrance (staged text reveal) ───
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

      heroTl
        .fromTo(
          ".hero-badge",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 }
        )
        .fromTo(
          ".hero-headline",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1 },
          "-=0.3"
        )
        .fromTo(
          ".hero-description",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1 },
          "-=0.2"
        )
        .fromTo(
          ".hero-search",
          { y: 20, opacity: 0, scale: 0.98 },
          { y: 0, opacity: 1, scale: 1 },
          "-=0.2"
        )
        .fromTo(
          ".hero-cta",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1 },
          "-=0.15"
        );

      // ─── Stats Counter ───
      const statsTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".stats-section",
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });

      statsTl
        .fromTo(
          ".stats-section",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
        )
        .fromTo(
          ".stat-item",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: "power2.out" },
          "-=0.3"
        );

      // ─── Count-up on stat numbers ───
      gsap.utils.toArray<HTMLElement>(".stat-value").forEach((el) => {
        const raw = el.innerText;
        const num = parseInt(raw.replace(/[^0-9]/g, ""));
        if (isNaN(num)) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
          onEnter: () => {
            gsap.fromTo(
              el,
              { textContent: "0" },
              {
                textContent: num.toString(),
                duration: 1.5,
                ease: "power2.out",
                snap: { textContent: 1 },
              }
            );
          },
        });
      });

      // ─── Category Cards ───
      gsap.fromTo(
        ".category-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".categories-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Featured Vendors ───
      gsap.fromTo(
        ".featured-card",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".featured-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── "How It Works" Steps ───
      gsap.fromTo(
        ".how-it-works-step",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".how-it-works-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Final CTA ───
      gsap.fromTo(
        ".cta-section",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cta-section",
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
