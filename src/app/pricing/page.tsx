import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Check, X, HelpCircle, Star } from "lucide-react";
import { FAQPageJsonLd } from "@/components/seo/JsonLd";
import { PricingAnimations } from "@/components/animations/PricingAnimations";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose the perfect plan for your business. Free tier available with a 30-day full-access trial. No card required.",
  openGraph: {
    title: "Pricing — DBMartNG",
    description:
      "Choose the perfect plan for your business. Free tier available with a 30-day full-access trial.",
  },
};

const freeFeatures = [
  "Up to 5 product/service listings",
  "Basic business profile",
  "Public search visibility",
  "Contact via phone/email",
  "WhatsApp deep-link",
  "30-day full-access trial included",
];

const proFeatures = [
  "Unlimited product/service listings",
  "Full analytics dashboard",
  "In-site messaging inbox",
  "Featured/promoted placement eligible",
  "Tiered visibility boosts",
  "Priority customer support",
  "Ad & sponsorship eligibility",
  "Verified badge eligibility",
  "No DBMartNG branding on profile",
];

const faqs = [
  {
    q: "How does the 30-day free trial work?",
    a: "When you sign up as a vendor, you automatically get complete Pro-tier access for 30 days — no credit card required. At the end of the trial, you choose between continuing with our Free tier or subscribing to Pro.",
  },
  {
    q: "What happens after my trial ends?",
    a: "On day 30, you'll see an explicit decision screen: Continue Free (with the free-tier limits) or Continue Pro (with full features). If you take no action, you'll default to Free tier on your next login — no hard suspension or data loss.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. You can upgrade from Free to Pro at any time, or downgrade from Pro to Free when your current billing period ends. Your data and listings are always preserved.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept cards, bank transfers, USSD, mobile money (OPay, PalmPay, Kuda), and QR payments — all processed securely through Paystack.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. The price you see is the price you pay. There are no setup fees, cancellation fees, or surprise charges.",
  },
  {
    q: "Can I get a refund if I'm not satisfied?",
    a: "We don't offer refunds for subscription fees, but you can cancel your Pro subscription at any time. Your access continues until the end of the current billing period.",
  },
  {
    q: "Do you offer custom plans for large businesses?",
    a: "Yes. Contact our team for custom enterprise pricing, multi-profile management, and white-label options.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <FAQPageJsonLd
        questions={[
          { question: faqs[0].q, answer: faqs[0].a },
          { question: faqs[1].q, answer: faqs[1].a },
          { question: faqs[2].q, answer: faqs[2].a },
          { question: faqs[3].q, answer: faqs[3].a },
          { question: faqs[4].q, answer: faqs[4].a },
          { question: faqs[5].q, answer: faqs[5].a },
          { question: faqs[6].q, answer: faqs[6].a },
        ]}
      />
      <PricingAnimations>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="pricing-hero py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-navy font-display mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
              Start with a 30-day full-access trial — no credit card required.
              Then choose the plan that works for your business.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-sm text-brand-gold font-medium">
              <Star className="h-4 w-4 fill-current" />
              All prices in Nigerian Naira (NGN)
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pricing-cards pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <div className="pricing-card glass rounded-3xl p-8 border-2 border-gray-100 relative">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-brand-navy mb-2">Free</h2>
                  <p className="text-gray-500">For getting started</p>
                </div>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-brand-navy">₦0</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  After your 30-day free trial ends
                </p>
                <ul className="space-y-3 mb-8">
                  {freeFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent-success shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth?type=vendor">
                  <Button variant="outline" size="lg" className="w-full border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Pro Tier */}
              <div className="pricing-card glass rounded-3xl p-8 border-2 border-brand-gold relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-brand-gold text-brand-navy text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-brand-navy mb-2">Pro</h2>
                  <p className="text-gray-500">For growing businesses</p>
                </div>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-brand-navy">₦5,000</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Full access. Cancel anytime.
                </p>
                <ul className="space-y-3 mb-8">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-accent-success shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth?type=vendor">
                  <Button variant="gold" size="lg" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section py-16 bg-surface-secondary">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-brand-navy font-display text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="faq-item glass rounded-2xl p-6 group cursor-pointer">
                  <summary className="flex items-center justify-between text-base font-semibold text-brand-navy">
                    {faq.q}
                    <HelpCircle className="h-5 w-5 text-brand-gold shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="mt-4 text-gray-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      </PricingAnimations>
      <Footer />
    </>
  );
}
