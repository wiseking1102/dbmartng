"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Send, Briefcase, Users, GraduationCap, Target } from "lucide-react";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { Turnstile } from "@/components/ui/Turnstile";

export default function CareersPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleInterest: "",
    pitch: "",
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

      // Submit to Supabase job_applications table
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit application");
      }

      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-navy font-display mb-4">
              Work With Us
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join the DBMartNG team and help us build the future of business
              discovery in Nigeria.
            </p>
          </div>
        </section>

        {/* Why Join */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <StaggerEntrance>
            <div className="grid md:grid-cols-4 gap-6 mb-16">
              {[
                {
                  icon: Target,
                  title: "Impact",
                  desc: "Help thousands of Nigerian businesses get discovered online.",
                },
                {
                  icon: Users,
                  title: "Culture",
                  desc: "Work with a passionate, remote-first team across Nigeria.",
                },
                {
                  icon: GraduationCap,
                  title: "Growth",
                  desc: "Learn new skills and take on real responsibility from day one.",
                },
                {
                  icon: Briefcase,
                  title: "Flexibility",
                  desc: "Remote work, flexible hours, and meaningful equity options.",
                },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-brand-gold" />
                  </div>
                  <h3 className="font-bold text-brand-navy mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Info */}
              <div>
                <h2 className="text-2xl font-bold text-brand-navy font-display mb-4">
                  Open Roles
                </h2>
                <p className="text-gray-600 mb-6">
                  We&apos;re always looking for talented people to join our team.
                  Even if you don&apos;t see a specific role listed, send us your
                  application and tell us how you can contribute.
                </p>
                <div className="space-y-4">
                  {[
                    "Community & Vendor Success Manager",
                    "Content & Social Media Associate",
                    "Junior Full-Stack Developer",
                    "Quality Assurance & Moderation Associate",
                  ].map((role) => (
                    <div
                      key={role}
                      className="glass rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-brand-gold shrink-0" />
                        <span className="font-medium text-brand-navy">{role}</span>
                      </div>
                      <span className="text-xs text-brand-slate bg-brand-slate/10 px-2 py-1 rounded-full">
                        Remote
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Form */}
              <div className="glass rounded-2xl p-8">
                <h2 className="text-xl font-bold text-brand-navy mb-6">
                  Apply Now
                </h2>

                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
                      <Send className="h-8 w-8 text-accent-success" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-navy mb-2">
                      Application Received!
                    </h3>
                    <p className="text-gray-600">
                      Thank you for your interest. We&apos;ll review your
                      application and get back to you soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        placeholder="080 1234 5678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role Interest *
                      </label>
                      <select
                        required
                        value={formData.roleInterest}
                        onChange={(e) => setFormData({ ...formData, roleInterest: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                      >
                        <option value="">Select a role</option>
                        <option value="community">Community & Vendor Success Manager</option>
                        <option value="content">Content & Social Media Associate</option>
                        <option value="developer">Junior Full-Stack Developer</option>
                        <option value="qa">Quality Assurance Associate</option>
                        <option value="other">Other / Not listed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Pitch *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.pitch}
                        onChange={(e) => setFormData({ ...formData, pitch: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
                        placeholder="Tell us why you'd be a great fit for DBMartNG..."
                      />
                    </div>
                    <Turnstile onVerify={setCaptchaToken} />
                    <Button variant="gold" size="lg" className="w-full" loading={loading}>
                      <Send className="h-4 w-4" />
                      Submit Application
                    </Button>
                  </form>
                )}
              </div>
            </div>
            </StaggerEntrance>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
