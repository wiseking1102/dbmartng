import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "NDPR Data Policy",
  description:
    "DBMartNG NDPR-compliant data handling policy — how we collect, store, and process personal data in compliance with Nigeria's Data Protection Regulation.",
  openGraph: {
    title: "NDPR Data Policy — DBMartNG",
    description:
      "Our commitment to protecting your personal data in compliance with the Nigeria Data Protection Regulation (NDPR).",
  },
};

export default function NDPRPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-brand-navy font-display mb-4">
              NDPR Data Protection Policy
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              Last updated: {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Compliance: Nigeria Data Protection Regulation (NDPR) 2019
            </p>

            <div className="prose prose-gray max-w-none space-y-8">
              <Section title="1. Scope & Applicability">
                <p>
                  This Data Protection Policy (&ldquo;Policy&rdquo;) describes how DBMartNG
                  collects, processes, stores, and protects personal data in
                  compliance with the Nigeria Data Protection Regulation (NDPR)
                  2019 and the Data Protection Act 2023.
                </p>
                <p className="mt-4">
                  This Policy applies to all personal data collected from users
                  of the DBMartNG platform, including buyers, vendors, job
                  applicants, and website visitors, regardless of where they
                  access the platform from.
                </p>
              </Section>

              <Section title="2. Data Controller Information">
                <p>
                  DBMartNG is the data controller responsible for the personal
                  data collected through the platform. For inquiries regarding
                  this Policy or data protection matters, contact our Data
                  Protection Officer at:
                </p>
                <p className="mt-2">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:dpo@dbmart.ng"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    dpo@dbmart.ng
                  </a>
                  <br />
                  <strong>Platform:</strong> DBMartNG
                  <br />
                  <strong>Jurisdiction:</strong> Federal Republic of Nigeria
                </p>
              </Section>

              <Section title="3. Lawful Basis for Processing">
                <p>
                  We process personal data only on the following lawful bases as
                  defined by the NDPR:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Consent:</strong> Where you have given explicit
                    consent for specific processing purposes (e.g., marketing
                    communications, cookies).
                  </li>
                  <li>
                    <strong>Contractual Necessity:</strong> Processing required
                    to fulfill our obligations under our Terms of Service (e.g.,
                    account management, subscription billing).
                  </li>
                  <li>
                    <strong>Legal Obligation:</strong> Processing necessary to
                    comply with applicable laws and regulations.
                  </li>
                  <li>
                    <strong>Legitimate Interests:</strong> Processing for our
                    legitimate business interests, such as fraud prevention,
                    platform improvement, and security, provided these do not
                    override your fundamental rights.
                  </li>
                </ul>
              </Section>

              <Section title="4. Categories of Data Subjects">
                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.1 Vendors</h4>
                <p>
                  Vendors provide business and personal data including names,
                  contact information, business details, identification
                  documents (in future KYC upgrades), and payment information
                  (processed by Paystack).
                </p>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.2 Buyers</h4>
                <p>
                  Buyers provide names, email addresses, and any information
                  shared in messages to vendors. Account creation is optional
                  for browsing.
                </p>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.3 Job Applicants</h4>
                <p>
                  Job applicants provide names, contact details, work history,
                  and other information submitted through the &ldquo;Work With
                  Us&rdquo; application form.
                </p>

                <h4 className="font-semibold text-brand-navy mt-4 mb-2">4.4 Website Visitors</h4>
                <p>
                  Visitors who browse the platform without creating an account
                  may have limited data collected through cookies and analytics
                  tools.
                </p>
              </Section>

              <Section title="5. Data Collection Principles">
                <p>We adhere to the following NDPR data collection principles:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Lawfulness, Fairness, and Transparency:</strong> Data is collected lawfully, fairly, and transparently.</li>
                  <li><strong>Purpose Limitation:</strong> Data is collected for specified, explicit, and legitimate purposes.</li>
                  <li><strong>Data Minimization:</strong> We collect only data that is adequate, relevant, and limited to what is necessary.</li>
                  <li><strong>Accuracy:</strong> We take reasonable steps to ensure data is accurate and kept up to date.</li>
                  <li><strong>Storage Limitation:</strong> Data is kept only as long as necessary for the purposes collected.</li>
                  <li><strong>Integrity and Confidentiality:</strong> Data is processed securely against unauthorized access, loss, or damage.</li>
                </ul>
              </Section>

              <Section title="6. Data Subject Rights">
                <p>
                  Under the NDPR, data subjects in Nigeria have the following
                  rights:
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    <strong>Right to be Informed:</strong> You have the right
                    to be informed about the collection and use of your personal
                    data (this Policy fulfills this obligation).
                  </li>
                  <li>
                    <strong>Right of Access:</strong> You have the right to
                    request access to the personal data we hold about you.
                  </li>
                  <li>
                    <strong>Right to Rectification:</strong> You have the right
                    to request correction of inaccurate or incomplete data.
                  </li>
                  <li>
                    <strong>Right to Erasure (Right to be Forgotten):</strong>{" "}
                    You have the right to request deletion of your personal
                    data, subject to our legal obligations.
                  </li>
                  <li>
                    <strong>Right to Restrict Processing:</strong> You have the
                    right to request restriction of processing in certain
                    circumstances.
                  </li>
                  <li>
                    <strong>Right to Data Portability:</strong> You have the
                    right to receive your data in a structured, commonly used
                    format and transmit it to another controller.
                  </li>
                  <li>
                    <strong>Right to Object:</strong> You have the right to
                    object to processing based on legitimate interests or direct
                    marketing.
                  </li>
                  <li>
                    <strong>Rights Related to Automated Decision Making:</strong>{" "}
                    You have the right not to be subject to decisions based
                    solely on automated processing.
                  </li>
                </ul>
              </Section>

              <Section title="7. Data Security Measures">
                <p>
                  We implement the following technical and organizational
                  measures to protect personal data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256).</li>
                  <li>Row Level Security (RLS) policies in our database ensuring users can only access their own data.</li>
                  <li>Service-role API routes isolated from client-side access.</li>
                  <li>Regular security audits and vulnerability assessments.</li>
                  <li>Access controls limiting data access to authorized personnel only.</li>
                  <li>Webhook signature verification to prevent unauthorized payment data access.</li>
                  <li>Rate limiting on messaging to prevent spam and abuse.</li>
                  <li>Automated content moderation to filter prohibited content.</li>
                </ul>
              </Section>

              <Section title="8. Data Breach Notification">
                <p>
                  In the event of a personal data breach that poses a risk to
                  the rights and freedoms of data subjects, DBMartNG will notify
                  the Nigeria Data Protection Commission (NDPC) within 72 hours
                  of becoming aware of the breach. Affected data subjects will
                  also be notified without undue delay.
                </p>
              </Section>

              <Section title="9. Cross-Border Data Transfer">
                <p>
                  Your personal data may be stored and processed on servers
                  located in Nigeria and other jurisdictions where our service
                  providers operate (including the United States, EU, and
                  others). Where data is transferred outside Nigeria, we ensure
                  appropriate safeguards are in place, including Standard
                  Contractual Clauses or equivalent mechanisms compliant with
                  the NDPR.
                </p>
              </Section>

              <Section title="10. Data Retention Schedule">
                <p>
                  We retain personal data according to the following schedule:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Active accounts:</strong> Retained for the duration of account activity plus 90 days.</li>
                  <li><strong>Deleted accounts:</strong> Anonymized or deleted within 30 days of deletion request, except where retention is required by law.</li>
                  <li><strong>Payment records:</strong> Retained for 6 years as required by financial regulations.</li>
                  <li><strong>Communication logs:</strong> Retained for 2 years.</li>
                  <li><strong>Analytics data:</strong> Retained for 26 months.</li>
                </ul>
              </Section>

              <Section title="11. Complaints & Enforcement">
                <p>
                  If you believe we have violated your data protection rights,
                  you have the right to lodge a complaint with the Nigeria Data
                  Protection Commission (NDPC):
                </p>
                <p className="mt-2">
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://ndpc.gov.ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    ndpc.gov.ng
                  </a>
                  <br />
                  <strong>Email:</strong> hello@ndpc.gov.ng
                </p>
                <p className="mt-4">
                  Before filing a complaint with the NDPC, we encourage you to
                  contact us first at{" "}
                  <a
                    href="mailto:dpo@dbmart.ng"
                    className="text-brand-navy font-semibold hover:text-brand-gold"
                  >
                    dpo@dbmart.ng
                  </a>{" "}
                  so we can address your concerns.
                </p>
              </Section>

              <Section title="12. Policy Review">
                <p>
                  This Policy is reviewed annually or whenever there are
                  material changes to our data processing activities or
                  applicable regulations. The most current version is always
                  available on this page.
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
