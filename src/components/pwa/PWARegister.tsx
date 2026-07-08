"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA offline support.
 * Only runs in the browser, not during SSR.
 */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.warn("[PWA] Service worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
