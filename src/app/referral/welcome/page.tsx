import type { Metadata } from "next";
import { ReferralWelcomeClient } from "./WelcomeClient";

interface WelcomePageProps {
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({
  searchParams,
}: WelcomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const referralCode = params.ref;

  const description = referralCode
    ? "You've joined DBMartNG via a referral link. Start exploring verified Nigerian businesses, connect with vendors, and discover products and services near you."
    : "Welcome to DBMartNG! Start exploring verified Nigerian businesses, connect with vendors, and discover products and services near you.";

  return {
    title: "Welcome",
    description,
    openGraph: {
      title: "Welcome | DBMartNG",
      description,
      url: "https://dbmart.ng/referral/welcome",
      images: [
        {
          url: "/brand/logo-3d.png",
          width: 1200,
          height: 630,
          alt: "DBMartNG — Welcome!",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Welcome | DBMartNG",
      description,
      images: ["/brand/logo-3d.png"],
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ReferralWelcomePage() {
  return <ReferralWelcomeClient />;
}
