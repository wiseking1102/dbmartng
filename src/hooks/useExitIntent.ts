"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ExitIntentOptions {
  /** Sensitivity threshold (how far up the mouse must go before triggering) */
  threshold?: number;
  /** Once dismissed, cooldown in ms before it can trigger again */
  cooldownMs?: number;
  /** Whether to track scroll depth as an additional trigger */
  scrollTrigger?: boolean;
  /** Scroll depth percentage (0-100) to consider as exit intent */
  scrollDepth?: number;
  /** Whether exit intent is enabled */
  enabled?: boolean;
}

export function useExitIntent(options: ExitIntentOptions = {}) {
  const {
    threshold = 50,
    cooldownMs = 24 * 60 * 60 * 1000, // 24 hours
    scrollTrigger = true,
    scrollDepth = 30,
    enabled = true,
  } = options;

  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastShown = useRef(0);
  const hasScrolledPast = useRef(false);

  // Check localStorage for dismissal
  useEffect(() => {
    if (!enabled) return;
    try {
      const dismissed = localStorage.getItem("exit-intent-dismissed");
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < cooldownMs) {
          setIsDismissed(true);
        }
      }
    } catch {
      // localStorage not available
    }
  }, [enabled, cooldownMs]);

  // Mouse leave detection
  useEffect(() => {
    if (!enabled || isDismissed) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > threshold) return;
      if (Date.now() - lastShown.current < 30000) return; // 30s min between triggers
      if (showModal) return;

      lastShown.current = Date.now();
      setShowModal(true);
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [enabled, isDismissed, threshold, showModal]);

  // Scroll depth detection
  useEffect(() => {
    if (!enabled || !scrollTrigger || isDismissed) return;

    const handleScroll = () => {
      if (hasScrolledPast.current) return;
      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercent > scrollDepth) {
        hasScrolledPast.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled, scrollTrigger, scrollDepth, isDismissed]);

  const dismiss = useCallback(() => {
    setShowModal(false);
    setIsDismissed(true);
    try {
      localStorage.setItem("exit-intent-dismissed", String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  const snooze = useCallback(() => {
    setShowModal(false);
    lastShown.current = Date.now();
  }, []);

  const reset = useCallback(() => {
    setIsDismissed(false);
    lastShown.current = 0;
    hasScrolledPast.current = false;
    try {
      localStorage.removeItem("exit-intent-dismissed");
    } catch {
      // ignore
    }
  }, []);

  return {
    showModal,
    dismiss,
    snooze,
    reset,
    isDismissed,
  };
}
