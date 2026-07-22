"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Turnstile } from "@/components/ui/Turnstile";
import { toast } from "sonner";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify CAPTCHA if configured
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
        throw new Error("Please complete the security check");
      }
      if (captchaToken) {
        const captchaRes = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: captchaToken }),
        });
        const captchaResult = await captchaRes.json();
        if (!captchaResult.success) {
          throw new Error("Security check failed. Please try again.");
        }
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }

      setSubmitted(true);
      toast.success("Message sent successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-accent-success" />
        </div>
        <h3 className="text-lg font-bold text-brand-navy mb-2">
          Message Sent!
        </h3>
        <p className="text-gray-600">
          Thank you for reaching out. We&apos;ll get back to you as soon as
          possible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          placeholder="Your full name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject *
        </label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          placeholder="What is this about?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message *
        </label>
        <textarea
          required
          rows={5}
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
          placeholder="Tell us how we can help..."
        />
      </div>
      <Turnstile onVerify={setCaptchaToken} />
      <Button variant="gold" size="lg" className="w-full" loading={loading}>
        <Send className="h-4 w-4" />
        Send Message
      </Button>
    </form>
  );
}
