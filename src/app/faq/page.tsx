import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { FAQPageJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Find answers to frequently asked questions about DBMartNG — sign up, business listing, pricing, payments, refunds, verified badges, and more.",
  openGraph: {
    title: "FAQ — DBMartNG",
    description:
      "Frequently asked questions about DBMartNG. Everything you need to know about using Nigeria's premier business directory.",
  },
};

const faqs = [
  {
    q: "How do I sign up on DBMartNG?",
    a: "Signing up is quick and free. Click the 'Get Started' button on the homepage, choose whether you're a buyer or a vendor, and fill out the registration form. You'll receive a confirmation email to verify your account. Once verified, you're good to go!",
  },
  {
    q: "How do I list my business on DBMartNG?",
    a: "After signing up as a vendor, you'll be guided through our onboarding process where you can add your business name, description, category, location, contact details, and product/service listings. Your profile will be live once you complete the setup. You can edit your details anytime from your dashboard.",
  },
  {
    q: "How much does it cost to use DBMartNG?",
    a: "DBMartNG offers a Free tier and a Pro tier. The Free tier lets you create a basic profile with up to 5 listings at no cost. The Pro tier (₦5,000/month) unlocks unlimited listings, analytics, messaging, promoted placements, and more. Every new vendor gets a 30-day full-access trial — no credit card required.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept debit/credit cards, bank transfers, USSD, mobile money (OPay, PalmPay, Kuda), and QR payments — all processed securely through Paystack. All prices are in Nigerian Naira (NGN).",
  },
  {
    q: "What is your refund policy?",
    a: "We don't offer refunds for subscription fees once a billing period has started. However, you can cancel your Pro subscription at any time and your access continues until the end of the current billing period. You'll then be moved to the Free tier automatically — no data is lost.",
  },
  {
    q: "How do I contact a vendor on DBMartNG?",
    a: "You can reach vendors through multiple channels displayed on their profile — phone call, email, WhatsApp deep-link, or the in-site messaging system (available to Pro vendors). Simply visit a vendor's profile page and choose your preferred contact method.",
  },
  {
    q: "What does the verified badge mean?",
    a: "The verified badge indicates that a vendor's business identity has been confirmed by the DBMartNG team. Verification may include confirming the business name, location, contact details, and proof of operation. Verified vendors appear more prominently in search results and earn greater trust from buyers.",
  },
  {
    q: "How do I delete my account?",
    a: "You can request account deletion from your dashboard settings. Go to Settings → Account → Delete Account. Once confirmed, your profile, listings, and personal data will be permanently removed within 30 days as per our privacy policy. If you need help, contact us at hello@dbmart.ng.",
  },
];

export default function FAQPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <FAQPageJsonLd
        questions={faqs.map((faq) => ({
          question: faq.q,
          answer: faq.a,
        }))}
      />
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-navy font-display mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about using DBMartNG. Can&apos;t find
              your answer?{" "}
              <Link
                href="/contact"
                className="text-brand-gold hover:underline font-medium"
              >
                Contact us
              </Link>
              .
            </p>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-16 bg-surface-secondary">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="glass rounded-2xl p-6 group cursor-pointer"
                >
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

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-brand-navy font-display mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Our team is happy to help. Reach out and we&apos;ll get back to
              you as soon as possible.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/contact">
                <Button variant="gold" size="lg">
                  Contact Us
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
