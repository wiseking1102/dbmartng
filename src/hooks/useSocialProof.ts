"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface SocialActivity {
  id: string;
  activity_type: "purchase" | "review" | "signup" | "listing_added" | "vendor_joined" | "inquiry_sent" | "badge_earned";
  actor_name: string;
  actor_avatar: string | null;
  actor_role: "buyer" | "vendor" | null;
  target_name: string | null;
  target_type: "vendor" | "listing" | "review" | null;
  target_url: string | null;
  created_at: string;
}

const ACTIVITY_MESSAGES: Record<string, (a: SocialActivity) => { title: string; description: string }> = {
  purchase: (a) => ({
    title: `${a.actor_name} just made a purchase 🛍️`,
    description: a.target_name ? `From ${a.target_name}` : "",
  }),
  review: (a) => ({
    title: `${a.actor_name} left a review ⭐`,
    description: a.target_name ? `On ${a.target_name}` : "",
  }),
  signup: (a) => ({
    title: `${a.actor_name} just joined DBMartNG 👋`,
    description: "Welcome to the community!",
  }),
  listing_added: (a) => ({
    title: `${a.actor_name} added a new listing 🆕`,
    description: a.target_name || "",
  }),
  vendor_joined: (a) => ({
    title: `${a.actor_name} is now on DBMartNG 🎉`,
    description: "A new vendor has joined the marketplace!",
  }),
  inquiry_sent: (a) => ({
    title: `${a.actor_name} sent an inquiry 💬`,
    description: a.target_name ? `To ${a.target_name}` : "",
  }),
  badge_earned: (a) => ({
    title: `${a.actor_name} earned a badge 🏅`,
    description: a.target_name || "",
  }),
};

export function useSocialProof() {
  const supabase = useRef(createClient());
  const [isListening, setIsListening] = useState(true);
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isListening) return;

    const channel = supabase.current
      .channel("social-proof-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "social_activities",
        },
        (payload: RealtimePostgresChangesPayload<SocialActivity>) => {
          const activity = payload.new as SocialActivity;

          // Deduplicate
          if (shownIds.current.has(activity.id)) return;
          shownIds.current.add(activity.id);

          const formatter = ACTIVITY_MESSAGES[activity.activity_type];
          if (!formatter) return;

          const { title, description } = formatter(activity);

          toast(title, {
            description: description || undefined,
            duration: 5000,
            position: "bottom-left",
            action: activity.target_url
              ? {
                  label: "View",
                  onClick: () => window.open(activity.target_url!, "_blank"),
                }
              : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [isListening]);

  const pause = useCallback(() => setIsListening(false), []);
  const resume = useCallback(() => {
    shownIds.current.clear();
    setIsListening(true);
  }, []);

  return { pause, resume, isListening };
}
