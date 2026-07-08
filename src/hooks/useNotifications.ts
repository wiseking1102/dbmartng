"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsOptions {
  userId: string | null;
  enabled?: boolean;
}

export function useNotifications({ userId, enabled = true }: UseNotificationsOptions) {
  const supabase = useRef(createClient());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await (supabase.current
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50) as never) as unknown as { data: Notification[] | null; error: any };

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read_at).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (enabled && userId) {
      fetchNotifications();
    }
  }, [enabled, userId, fetchNotifications]);

  // Subscribe to real-time notification inserts
  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase.current
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification;
          if (newNotification) {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const updatedNotification = payload.new as Notification;
          if (updatedNotification) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
            setUnreadCount(
              (prev) =>
                prev + (updatedNotification.read_at ? -1 : 1)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [enabled, userId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: updateError } = await supabase.current
          .from("notifications")
          .update({ read_at: new Date().toISOString() } as never)
          .eq("id", notificationId);

        if (updateError) throw updateError;

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error: updateError } = await supabase.current
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("user_id", userId)
        .is("read_at", null);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, [userId]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh: fetchNotifications,
  };
}
