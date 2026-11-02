"use client";

import React from "react";

/**
 * Client wrapper for listing contact CTAs.
 *
 * Preserves the original anchor markup/behaviour and additionally
 * fires a fire-and-forget contact_click event so the vendor's
 * contact_click_count is incremented through the trusted
 * /api/listings/events endpoint (rate-limited, server-verified).
 */
export function ContactClickLink({
  listingId,
  href,
  children,
  className,
  target,
  rel,
}: {
  listingId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}) {
  const handleClick = () => {
    try {
      fetch("/api/listings/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          type: "contact_click",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Tracking must never block the interaction. */
    }
  };

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
