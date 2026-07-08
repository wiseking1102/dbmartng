"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Tawk.to Live Chat Widget
 *
 * Injects the Tawk.to chat script into the page and provides
 * programmatic control via the Tawk_API global.
 *
 * The widget is hidden by default — use the exposed methods
 * (maximize, showWidget) to open it on user interaction.
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_TAWK_PROPERTY_ID — your Tawk.to property ID
 *   NEXT_PUBLIC_TAWK_WIDGET_ID   — your Tawk.to widget ID
 */

// Declare the Tawk_API global so TypeScript doesn't complain
declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      toggleVisibility?: () => void;
      isChatHidden?: () => boolean;
      onLoad?: () => void;
      visitor?: {
        name?: string;
        email?: string;
      };
    };
    Tawk_LoadStart?: Date;
  }
}

interface LiveChatViewProps {
  /** Called when Tawk.to script has loaded and is ready */
  onReady?: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

export function LiveChatView({ onReady, onError }: LiveChatViewProps) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const loadedRef = useRef(false);
  // ─── Inject the Tawk.to script ───
  useEffect(() => {
    // Guard: don't inject twice
    if (loadedRef.current) return;
    // Guard: check for env vars
    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

    if (!propertyId || !widgetId) {
      console.warn(
        "[LiveChat] NEXT_PUBLIC_TAWK_PROPERTY_ID and NEXT_PUBLIC_TAWK_WIDGET_ID must be set in env"
      );
      onError?.(new Error("Tawk.to is not configured. Set NEXT_PUBLIC_TAWK_PROPERTY_ID and NEXT_PUBLIC_TAWK_WIDGET_ID."));
      return;
    }

    // Already loaded by another instance
    if (document.getElementById("tawk-to-script")) {
      loadedRef.current = true;
      onReady?.();
      return;
    }

    const initTawk = () => {
      // Set up the API before the script loads
      window.Tawk_API = window.Tawk_API || {};

      // Hide the default floating bubble — we control visibility
      window.Tawk_API.onLoad = () => {
        if (window.Tawk_API?.hideWidget) {
          window.Tawk_API.hideWidget();
        }
        loadedRef.current = true;
        onReady?.();
      };

      // Set visitor info (optional — can be enriched later with user data)
      window.Tawk_API.visitor = {
        name: "DBMartNG Visitor",
        email: "",
      };

      // Inject the script
      const script = document.createElement("script");
      script.id = "tawk-to-script";
      script.async = true;
      script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");

      script.onerror = () => {
        console.error("[LiveChat] Failed to load Tawk.to script");
        onError?.(new Error("Failed to load live chat widget"));
      };

      document.body.appendChild(script);
      scriptRef.current = script;
    };

    initTawk();

    // Cleanup on unmount
    return () => {
      // Remove the script element
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
      scriptRef.current = null;
      loadedRef.current = false;

      // Remove the Tawk.to widget container if it exists
      const widgetContainer = document.getElementById("tawk-to-container");
      if (widgetContainer) {
        widgetContainer.remove();
      }

      // Clean up the API
      delete window.Tawk_API;
      delete window.Tawk_LoadStart;
    };
  }, [onReady, onError]);

  // ─── Open chat ───
  const openChat = useCallback(() => {
    if (!window.Tawk_API) return;
    if (window.Tawk_API.showWidget) {
      window.Tawk_API.showWidget();
    }
    if (window.Tawk_API.maximize) {
      window.Tawk_API.maximize();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-6 text-center">
      {/* Connection status */}
      <div className="w-16 h-16 rounded-2xl bg-accent-success/10 flex items-center justify-center mb-4">
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-accent-success" />
          <span className="absolute inset-0 w-6 h-6 rounded-full bg-accent-success animate-ping opacity-30" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-brand-navy mb-2">
        Live Support
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-[260px]">
        Connect with our support team in real-time. We typically respond within a few minutes.
      </p>

      <button
        onClick={openChat}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-navy text-white hover:bg-brand-navy-light transition-all duration-200 font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Start Live Chat
      </button>

      <p className="text-[11px] text-gray-300 mt-4">
        Powered by Tawk.to • Messages are handled by our team
      </p>
    </div>
  );
}
