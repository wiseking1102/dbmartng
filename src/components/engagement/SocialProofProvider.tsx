"use client";

import { useEffect, useRef } from "react";
import { useSocialProof } from "@/hooks/useSocialProof";

/**
 * Renders nothing visible — just activates the social proof realtime
 * subscription so toasts fire from anywhere in the app.
 */
export function SocialProofProvider() {
  const { pause, resume, isListening } = useSocialProof();
  const visibilityRef = useRef(false);

  // Pause social proof when the tab is hidden (reduces noise)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      if (hidden && visibilityRef.current) {
        pause();
        visibilityRef.current = false;
      } else if (!hidden && !visibilityRef.current) {
        resume();
        visibilityRef.current = true;
      }
    };

    visibilityRef.current = !document.hidden;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pause, resume]);

  return null;
}
