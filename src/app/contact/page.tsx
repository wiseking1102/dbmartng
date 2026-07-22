import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the DBMartNG team. Send us a message, ask a question, or share feedback. We're based in Asaba, Delta State, Nigeria.",
  openGraph: {
    title: "Contact Us — DBMartNG",
    description:
      "Have a question or need support? Reach out to the DBMartNG team. We'd love to hear from you.",
  },
};

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@dbmart.ng",
    href: "mailto:hello@dbmart.ng",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Asaba, Delta State, Nigeria",
    href: null,
  },
  {
    icon: Clock,
    label: "Response Time",
    value: "We typically respond within 24 hours",
    href: null,
  },
  {
    icon: MessageSquare,
    label: "Live Chat",
    value: "Use the chat widget on any page",
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-navy font-display mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have a question, feedback, or need support? We&apos;d love to hear
              from you. Send us a message and we&apos;ll respond as soon as we
              can.
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Contact Info */}
              <div>
                <h2 className="text-2xl font-bold text-brand-navy font-display mb-6">
                  Get in Touch
                </h2>
                <p className="text-gray-600 mb-8">
                  Whether you&apos;re a vendor looking for help, a buyer with a
                  question, or a potential partner — we&apos;re here for you.
                </p>
                <div className="space-y-6">
                  {contactInfo.map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-6 w-6 text-brand-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-brand-navy">
                          {item.label}
                        </h3>
                        {item.href ? (
                          <a
                            href={item.href}
                            className="text-gray-600 hover:text-brand-gold transition-colors"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-gray-600">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Links */}
                <div className="mt-10 glass rounded-2xl p-6">
                  <h3 className="font-bold text-brand-navy mb-3">
                    Quick Links
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link
                        href="/faq"
                        className="text-gray-600 hover:text-brand-gold transition-colors"
                      >
                        → Frequently Asked Questions
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/pricing"
                        className="text-gray-600 hover:text-brand-gold transition-colors"
                      >
                        → Pricing & Plans
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/about"
                        className="text-gray-600 hover:text-brand-gold transition-colors"
                      >
                        → About DBMartNG
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/careers"
                        className="text-gray-600 hover:text-brand-gold transition-colors"
                      >
                        → Careers
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Contact Form */}
              <div className="glass rounded-2xl p-8">
                <h2 className="text-xl font-bold text-brand-navy mb-6">
                  Send a Message
                </h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
