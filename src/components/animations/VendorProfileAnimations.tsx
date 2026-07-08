"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps the vendor profile page with GSAP scroll animations:
 *  - Cover image parallax on scroll
 *  - Vendor info card fade-in from bottom
 *  - Gallery images staggered grid reveal
 *  - Listings staggered card reveal
 *  - Reviews staggered reveal
 *  - Sidebar contact card fade-in
 */
export function VendorProfileAnimations({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReduced) return;

      // ─── Cover Parallax ───
      gsap.to(".vendor-cover", {
        y: "15%",
        ease: "none",
        scrollTrigger: {
          trigger: ".vendor-cover",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // ─── Vendor info card ───
      gsap.fromTo(
        ".vendor-info-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".vendor-info-card",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Gallery grid ───
      gsap.fromTo(
        ".gallery-item",
        { y: 20, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".gallery-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Listings ───
      gsap.fromTo(
        ".listing-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".listings-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Reviews ───
      gsap.fromTo(
        ".review-item",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".reviews-section",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      // ─── Sidebar ───
      gsap.fromTo(
        ".vendor-sidebar",
        { x: 30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".vendor-sidebar",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    },
    { scope: container }
  );

  return <div ref={container}>{children}</div>;
}
