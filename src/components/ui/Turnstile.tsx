"use client";

import { useEffect, useRef, useCallback } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark";
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 * Loads the Turnstile script on mount using the onload callback pattern.
 * Renders nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.
 *
 * Requires NEXT_PUBLIC_TURNSTILE_SITE_KEY env var.
 */
export function Turnstile({ onVerify, theme = "light" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (containerRef.current && window.turnstile && siteKey) {
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerifyRef.current(token),
        theme,
      });
    }
  }, [siteKey, theme]);

  useEffect(() => {
    if (!siteKey) return; // Not configured — render nothing

    // Set the global onload callback BEFORE the script loads
    window.onloadTurnstileCallback = renderWidget;

    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      window.onloadTurnstileCallback = undefined;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [siteKey, renderWidget]);

  if (!siteKey) {
    // Silently render nothing when not configured — allows dev without CAPTCHA
    return null;
  }

  return <div ref={containerRef} />;
}
