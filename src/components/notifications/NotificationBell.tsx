"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, X, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface NotificationBellProps {
  userId: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  message_received: "💬",
  listing_approved: "✅",
  listing_rejected: "❌",
  listing_flagged: "🚩",
  badge_granted: "🏅",
  badge_revoked: "❌",
  trial_ending: "⏰",
  subscription_success: "💳",
  subscription_failed: "⚠️",
  vendor_approved: "🎉",
  vendor_rejected: "📋",
  new_review: "⭐",
  admin_alert: "🔔",
  system_alert: "⚡",
};

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ userId, enabled: !!userId });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    // Navigate based on notification type
    if (notification.payload?.url) {
      window.location.href = notification.payload.url as string;
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-brand-navy hover:bg-gray-100 transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-error text-[10px] font-bold text-white animate-scale-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-brand-navy text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-400">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-gold transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse-soft text-sm text-gray-400">
                  Loading notifications...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.slice(0, 20).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-start gap-3",
                      !notification.read_at && "bg-brand-gold/[0.02]"
                    )}
                  >
                    {/* Icon */}
                    <span className="text-lg shrink-0 mt-0.5">
                      {TYPE_ICONS[notification.type] || "🔔"}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          !notification.read_at
                            ? "font-semibold text-brand-navy"
                            : "text-gray-600"
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1.5">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.read_at && (
                      <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button className="w-full text-center text-xs font-semibold text-brand-navy hover:text-brand-gold transition-colors">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
