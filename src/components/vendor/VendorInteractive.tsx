"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export type VendorInteractiveVendor = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Client island for the vendor profile sidebar.
 *
 * Contains everything that needs browser interactivity:
 * - "Send a Message" form (posts to the secure /api/messages route)
 * - QR code toggle
 * - Share button (Web Share API with clipboard fallback)
 */
export default function VendorInteractive({
  vendor,
}: {
  vendor: VendorInteractiveVendor;
}) {
  const [showQR, setShowQR] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleMessageSubmit = async () => {
    if (!messageText.trim()) {
      return;
    }

    setSendingMessage(true);

    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(
          "Please sign in to send a message to this vendor."
        );
        return;
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          vendorId: vendor.id,
          body: messageText.trim(),
          senderName: senderName.trim() || undefined,
          senderEmail: senderEmail.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to send message"
        );
      }

      setMessageText("");
      setMessageSent(true);
      toast.success(`Message sent to ${vendor.name}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to send message";

      toast.error(errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleShare = async () => {
    const profileUrl = `https://dbmart.ng/vendors/${vendor.slug}`;
    const shareData = {
      title: vendor.name,
      text: `${vendor.name} on DBMartNG`,
      url: profileUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied to clipboard");
    } catch {
      // User cancelled the share sheet — not an error
    }
  };

  return (
    <>
      {/* Message Form */}
      <div
        id="message-form"
        className="glass rounded-2xl p-6"
      >
        <h3 className="font-bold text-brand-navy mb-4">
          Send a Message
        </h3>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          />

          <input
            type="email"
            placeholder="Your email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          />

          <textarea
            rows={4}
            placeholder="Write your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
          />

          <Button
            variant="gold"
            size="sm"
            className="w-full"
            onClick={handleMessageSubmit}
            disabled={sendingMessage || !messageText.trim()}
          >
            <Send className="h-4 w-4" />
            {sendingMessage
              ? "Sending..."
              : messageSent
                ? "Message Sent"
                : "Send Message"}
          </Button>
        </div>
      </div>

      {/* Share + QR */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-brand-navy mb-4">
          Share
        </h3>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQR(!showQR)}
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>

        {showQR && (
          <div className="mt-4 flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center max-w-full">
              {/* QR generated lazily — small profile QR via QR service fallback */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  `https://dbmart.ng/vendors/${vendor.slug}`
                )}`}
                alt="Vendor profile QR code"
                width={160}
                height={160}
                className="mx-auto"
              />
              <p className="mt-2 text-xs text-gray-500">
                Scan to visit this vendor profile
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
