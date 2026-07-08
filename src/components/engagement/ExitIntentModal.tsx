"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, ArrowRight, Sparkles, ShoppingBag, Search } from "lucide-react";
import Link from "next/link";
import { useExitIntent } from "@/hooks/useExitIntent";

interface ExitIntentModalProps {
  /** Override default options */
  cooldownMs?: number;
  enabled?: boolean;
}

export function ExitIntentModal({
  cooldownMs = 24 * 60 * 60 * 1000,
  enabled = true,
}: ExitIntentModalProps) {
  const { showModal, dismiss, snooze } = useExitIntent({
    cooldownMs,
    enabled,
    threshold: 30,
    scrollTrigger: true,
    scrollDepth: 25,
  });

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0" onClick={snooze} />

          <motion.div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={snooze}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 text-gray-400 hover:text-gray-600 hover:bg-white transition-all"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Gradient header */}
            <div className="bg-gradient-to-br from-brand-navy to-brand-navy-dark px-8 pt-10 pb-16 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-gold/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-gold/5 rounded-full blur-3xl" />

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-gold/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Sparkles className="h-8 w-8 text-brand-gold" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-display mb-2">
                  Wait! Before You Go
                </h2>
                <p className="text-brand-gold-light/80 text-sm max-w-sm mx-auto">
                  Don&apos;t miss out on Nigeria&apos;s fastest growing business
                  marketplace
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 pb-8 -mt-8 relative">
              {/* Offer cards */}
              <div className="space-y-3">
                <Link
                  href="/browse"
                  onClick={snooze}
                  className="block glass rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0 group-hover:bg-brand-navy/10 transition-colors">
                      <Search className="h-6 w-6 text-brand-navy" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy text-sm mb-0.5">
                        Browse Verified Vendors
                      </h3>
                      <p className="text-sm text-gray-500">
                        Discover hundreds of trusted businesses across Nigeria
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold mt-2 group-hover:gap-1.5 transition-all">
                        Start browsing <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/pricing"
                  onClick={snooze}
                  className="block glass rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                      <ShoppingBag className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy text-sm mb-0.5">
                        List Your Business
                      </h3>
                      <p className="text-sm text-gray-500">
                        Join as a vendor and reach thousands of customers
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold mt-2 group-hover:gap-1.5 transition-all">
                        See plans <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>

                <a
                  href="mailto:support@dbmart.ng"
                  className="block glass rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-info/5 flex items-center justify-center shrink-0 group-hover:bg-accent-info/10 transition-colors">
                      <Mail className="h-6 w-6 text-accent-info" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy text-sm mb-0.5">
                        Have Questions?
                      </h3>
                      <p className="text-sm text-gray-500">
                        We&apos;re here to help — reach out to our support team
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-gold mt-2 group-hover:gap-1.5 transition-all">
                        Email us <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </a>
              </div>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="w-full mt-4 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                Don&apos;t show this again
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
