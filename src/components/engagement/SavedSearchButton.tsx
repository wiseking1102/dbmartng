"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, BookmarkCheck, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SavedSearchButtonProps {
  query: string;
  filters?: Record<string, string>;
  className?: string;
}

export function SavedSearchButton({ query, filters = {}, className = "" }: SavedSearchButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Reset saved state when query changes
  useEffect(() => {
    setSaved(false);
  }, [query]);

  const handleSave = useCallback(async () => {
    if (!user) {
      setShowPrompt(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          query,
          filters,
          notify_on_match: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        toast.success("Search saved! We'll notify you when new matches appear.");
      } else {
        toast.error(data.error || "Failed to save search");
      }
    } catch {
      toast.error("Failed to save search");
    } finally {
      setSaving(false);
    }
  }, [user, query, filters]);

  return (
    <>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          saved
            ? "bg-accent-success/10 text-accent-success border border-accent-success/20"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent"
        } ${className}`}
        title={saved ? "Search saved" : "Save this search"}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {saved ? "Saved" : "Save Search"}
        </span>
      </button>

      {/* Sign-in prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setShowPrompt(false)} />

            <motion.div
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                onClick={() => setShowPrompt(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center">
                <Bookmark className="h-10 w-10 text-brand-gold mx-auto mb-3" />
                <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                  Save Your Search
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Sign in to save this search and get notified when new matching
                  vendors or listings appear.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Maybe Later
                  </button>
                  <a
                    href="/auth"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-navy text-sm font-semibold text-white hover:bg-brand-navy-light transition-colors text-center"
                  >
                    Sign In
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
