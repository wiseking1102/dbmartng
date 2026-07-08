import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "DBMartNG Privacy Policy — how we collect, use, store, and protect your personal data when you use our platform.",
  openGraph: {
    title: "Privacy Policy — DBMartNG",
    description:
      "How DBMartNG collects, uses, and protects your personal data.",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-brand-navy font-display mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Last updated: {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <div className="prose prose-gray max-w-none space-y-8">
              <Section title="1. Introduction">
                <p>
                  DBMartNG (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This
                  Privacy Policy explains how we collect, use, disclose, and
                  safeguard your personal data when you use our platform and
                  services.
                </p>
              </Section>

              <Section title="2. Information We Collect">
                <h4 className="font-semibold text-brand-navy mt-4 mb-2">2.1 Information You Provide</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
                  <li><strong>Profile Information:</strong> Business name, description, address, website, social media links, logo, and images.</li>
                  <li><strong>Listing Information:</strong> Product/service details, prices, descriptions, and images.</li>
                  <li><strong>Communications:</strong> Messages sent to vendors or support, and any correspondence with us.</li>
                  <li><strong>Payment Information:</strong> Payment data is processed by Paystack and is not stored on our servers.</li>
                </ul>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">2.2 Information Collected Automatically</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Usage Data:</strong> Pages visited, search queries, time spent on the platform.</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device type.</li>
                  <li><strong>Cookies:</strong> We use cookies and similar tracking technologies to enhance your experience.</li>
                </ul>
              </Section>

              <Section title="3. How We Use Your Information">
                <ul className="list-disc pl-6 space-y-2">
                  <li>To provide, maintain, and improve our platform and services.</li>
                  <li>To facilitate connections between buyers and vendors.</li>
                  <li>To process subscription payments and manage vendor accounts.</li>
                  <li>To send transactional notifications (e.g., subscription updates, messages).</li>
                  <li>To detect, prevent, and address fraud, spam, and abuse.</li>
                  <li>To comply with legal obligations and enforce our Terms of Service.</li>
                  <li>To analyze platform usage and improve user experience.</li>
                  <li>To send marketing communications only with your explicit consent.</li>
                </ul>
              </Section>

              <Section title="4. How We Share Your Information">
                <p>We may share your information in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>With Other Users:</strong> Vendor profile information is publicly visible. Messages are shared between the sender and recipient.</li>
                  <li><strong>With Service Providers:</strong> We share data with Paystack (payment processing), Supabase (database hosting), and Supabase Storage (file storage).</li>
                  <li><strong>For Legal Reasons:</strong> If required by law or to protect our rights and safety.</li>
                  <li><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent.</li>
                </ul>
                <p className="mt-4">
                  We do not sell your personal data to third parties.
                </p>
              </Section>

              <Section title="5. Data Storage & Security">
                <p>
                  We implement appropriate technical and organizational measures
                  to protect your personal data, including encryption in transit
                  and at rest, access controls, and regular security audits.
                </p>
                <p className="mt-4">
                  Your data is stored on secure servers provided by Supabase
                  (database) and Supabase Storage (file storage). Payment
                  information is processed and stored by Paystack and is never
                  stored on our own servers.
                </p>
              </Section>

              <Section title="6. Data Retention">
                <p>
                  We retain your personal data for as long as your account is
                  active or as needed to provide services. After account
                  deletion, we retain data only as required by law or for
                  legitimate business purposes (e.g., fraud prevention, legal
                  obligations). You may request deletion of your data at any
                  time.
                </p>
              </Section>

              <Section title="7. Your Rights">
                <p>Under applicable data protection laws, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                  <li><strong>Erasure:</strong> Request deletion of your personal data, subject to legal obligations.</li>
                  <li><strong>Restriction:</strong> Request restriction of processing your data.</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service provider.</li>
                  <li><strong>Objection:</strong> Object to the processing of your data for marketing purposes.</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, contact us at{" "}
                  <a
                    href="mailto:support@dbmart.ng"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    support@dbmart.ng
                  </a>
                  .
                </p>
              </Section>

              <Section title="8. Cookies">
                <p>
                  We use cookies and similar tracking technologies to enhance
                  your browsing experience, analyze platform traffic, and
                  remember your preferences. You can manage cookie preferences
                  through your browser settings. Essential cookies are required
                  for the platform to function properly.
                </p>
              </Section>

              <Section title="9. Third-Party Links">
                <p>
                  The Platform may contain links to third-party websites
                  (vendor websites, social media, payment gateways). We are not
                  responsible for the privacy practices of these third parties.
                  We encourage you to review their privacy policies before
                  providing any personal data.
                </p>
              </Section>

              <Section title="10. Children&apos;s Privacy">
                <p>
                  The Platform is not intended for individuals under the age of
                  18. We do not knowingly collect personal data from children.
                  If we become aware that a child has provided us with personal
                  data, we will take steps to delete it.
                </p>
              </Section>

              <Section title="11. Changes to This Policy">
                <p>
                  We may update this Privacy Policy from time to time. We will
                  notify you of material changes via email or platform
                  notification. We encourage you to review this policy
                  periodically.
                </p>
              </Section>

              <Section title="12. Contact Us">
                <p>
                  If you have questions or concerns about this Privacy Policy or
                  our data practices, please contact us at:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@dbmart.ng"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    support@dbmart.ng
                  </a>
                  <br />
                  <strong>Platform:</strong> DBMartNG
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
