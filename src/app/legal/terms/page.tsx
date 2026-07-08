import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "DBMartNG Terms of Service — the terms governing your use of our platform. DBMartNG facilitates business discovery and contact but is not a party to any off-platform transaction.",
  openGraph: {
    title: "Terms of Service — DBMartNG",
    description:
      "Terms governing use of DBMartNG. We facilitate business discovery and contact between buyers and vendors.",
  },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-brand-navy font-display mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Last updated: {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <div className="prose prose-gray max-w-none space-y-8">
              <Section title="1. Acceptance of Terms">
                <p>
                  By accessing or using DBMartNG ("the Platform"), you agree to
                  be bound by these Terms of Service. If you do not agree, you
                  may not use the Platform. These terms apply to all visitors,
                  buyers, vendors, and administrators.
                </p>
              </Section>

              <Section title="2. Description of Service">
                <p>
                  DBMartNG is an online business directory and marketplace
                  platform that facilitates the discovery and connection between
                  businesses (vendors) and potential customers (buyers). The
                  Platform provides vendors with the ability to create public
                  profiles, list products and services, and manage their online
                  presence. Buyers can browse, search, and contact vendors
                  directly.
                </p>
                <p className="mt-4 font-semibold text-brand-navy">
                  DBMartNG facilitates discovery and contact between buyers and
                  vendors but is not a party to, and does not guarantee, any
                  transaction that occurs off-platform between a buyer and a
                  vendor. All transactions, payments, and agreements are solely
                  between the buyer and the vendor.
                </p>
              </Section>

              <Section title="3. User Accounts & Registration">
                <h4 className="font-semibold text-brand-navy mt-4 mb-2">3.1 Account Types</h4>
                <p>
                  The Platform offers three account types: Buyer, Vendor, and
                  Administrator. Each account type has distinct capabilities and
                  responsibilities as described on the Platform.
                </p>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">3.2 Account Responsibilities</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                  <li>You are responsible for all activity that occurs under your account.</li>
                  <li>You must provide accurate, current, and complete information during registration.</li>
                  <li>You must notify us immediately of any unauthorized use of your account.</li>
                  <li>You may not create multiple accounts for fraudulent or deceptive purposes.</li>
                </ul>
              </Section>

              <Section title="4. Vendor Terms">
                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.1 Vendor Profiles & Listings</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Vendors are solely responsible for the accuracy and legality of their profile information and listings.</li>
                  <li>All listings are subject to review and approval by DBMartNG administrators before becoming publicly visible.</li>
                  <li>DBMartNG reserves the right to reject, flag, or remove any listing that violates these terms or platform guidelines.</li>
                  <li>Vendors must not list prohibited items or services, including but not limited to: illegal goods, counterfeit products, adult content, or prohibited services.</li>
                </ul>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.2 Subscription & Billing</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>New vendors receive a one-month full-access trial at no cost.</li>
                  <li>After the trial period, vendors may choose between a free tier (with limited features) and a paid Pro subscription.</li>
                  <li>Pro subscriptions are billed monthly via Paystack and automatically renew unless cancelled.</li>
                  <li>Vendors may cancel their subscription at any time; access continues until the end of the current billing period.</li>
                  <li>Price changes apply to new subscriptions by default; existing subscribers are grandfathered at their original price unless explicitly notified.</li>
                </ul>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.3 Vendor Verification</h4>
                <p>
                  Vendor verification is conducted manually by DBMartNG
                  administrators. A verified badge indicates that the vendor has
                  provided sufficient identifying information and has been
                  reviewed by our team. Verification does not constitute an
                  endorsement or guarantee of the vendor&apos;s products,
                  services, or business practices.
                </p>
              </Section>

              <Section title="5. Buyer Terms">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Buyers may browse and search the Platform without an account.</li>
                  <li>Creating an account allows buyers to save favorites, send messages, and manage their preferences.</li>
                  <li>Buyers agree not to use the Platform to harass vendors, submit spam, or engage in fraudulent activity.</li>
                  <li>Buyers acknowledge that DBMartNG is not a party to any transaction they enter into with a vendor.</li>
                  <li>Buyers are responsible for conducting their own due diligence before engaging with any vendor.</li>
                </ul>
              </Section>

              <Section title="6. Prohibited Conduct">
                <p>Users agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Platform for any illegal purpose or in violation of any applicable laws.</li>
                  <li>Submit false, misleading, or fraudulent information.</li>
                  <li>Harass, abuse, or harm other users.</li>
                  <li>Send spam, unsolicited messages, or engage in phishing.</li>
                  <li>Attempt to circumvent listing limits, verification processes, or payment requirements.</li>
                  <li>Scrape, copy, or reproduce Platform content without authorization.</li>
                  <li>Interfere with the proper functioning of the Platform.</li>
                  <li>Create multiple vendor accounts to bypass free-tier listing limits or prior rejection decisions.</li>
                </ul>
              </Section>

              <Section title="7. Intellectual Property">
                <p>
                  The DBMartNG name, logo, brand assets, and platform design are
                  the intellectual property of DBMartNG. Vendor-provided content
                  (listings, images, descriptions) remains the property of the
                  vendor, who grants DBMartNG a non-exclusive license to display
                  this content on the Platform.
                </p>
              </Section>

              <Section title="8. Limitation of Liability">
                <p>
                  DBMartNG provides the Platform on an &ldquo;as is&rdquo; and
                  &ldquo;as available&rdquo; basis. To the maximum extent permitted by
                  law, DBMartNG disclaims all warranties, express or implied.
                  DBMartNG shall not be liable for any damages arising from your
                  use of the Platform or any transactions between buyers and
                  vendors.
                </p>
                <p className="mt-4">
                  DBMartNG is not responsible for the quality, safety, legality,
                  or delivery of any products or services listed by vendors.
                  Any disputes regarding transactions are solely between the
                  buyer and vendor.
                </p>
              </Section>

              <Section title="9. Dispute Resolution">
                <p>
                  Disputes between buyers and vendors should first be addressed
                  directly between the parties. If a dispute cannot be resolved,
                  users may file a complaint through the Platform&apos;s reporting
                  system. DBMartNG may, at its discretion, mediate disputes but
                  is not obligated to do so. DBMartNG&apos;s role is limited to
                  light mediation — it does not arbitrate or guarantee outcomes.
                </p>
              </Section>

              <Section title="10. Termination">
                <p>
                  DBMartNG reserves the right to suspend or terminate accounts
                  that violate these terms, engage in fraudulent activity, or
                  harm the Platform or its users. Vendors whose accounts are
                  terminated for cause are not entitled to refunds of any
                  prepaid subscription fees.
                </p>
              </Section>

              <Section title="11. Changes to Terms">
                <p>
                  DBMartNG may update these Terms of Service at any time. Users
                  will be notified of material changes via email or platform
                  notification. Continued use of the Platform after changes
                  constitutes acceptance of the updated terms.
                </p>
              </Section>

              <Section title="12. Contact">
                <p>
                  For questions about these Terms of Service, please contact us
                  at{" "}
                  <a
                    href="mailto:support@dbmart.ng"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    support@dbmart.ng
                  </a>
                  .
                </p>
              </Section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-brand-navy font-display mb-3">
        {title}
      </h2>
      <div className="text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}
