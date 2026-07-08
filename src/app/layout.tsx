import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { LenisProvider } from "@/lib/motion/LenisProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SocialProofProvider } from "@/components/engagement/SocialProofProvider";
import { ExitIntentModal } from "@/components/engagement/ExitIntentModal";
import { PWARegister } from "@/components/pwa/PWARegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dbmart.ng"),
  title: {
    default: "DBMartNG — Discover & Connect with Nigerian Businesses",
    template: "%s | DBMartNG",
  },
  description:
    "DBMartNG is Nigeria's premier business directory and marketplace. Discover verified vendors, browse products and services, and connect directly with businesses near you.",
  keywords: [
    "Nigeria business directory",
    "Nigerian vendors",
    "marketplace Nigeria",
    "local businesses Nigeria",
    "find vendors Nigeria",
    "DBMartNG",
  ],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "DBMartNG",
    title: "DBMartNG — Discover & Connect with Nigerian Businesses",
    description:
      "Nigeria's premier business directory and marketplace. Discover verified vendors and connect directly.",
    url: "https://dbmart.ng",
    images: [
      {
        url: "/brand/logo-3d.png",
        width: 1200,
        height: 630,
        alt: "DBMartNG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DBMartNG — Discover & Connect with Nigerian Businesses",
    description:
      "Nigeria's premier business directory and marketplace. Discover verified vendors and connect directly.",
    images: ["/brand/logo-3d.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/brand/logo-flat.png",
    apple: "/brand/logo-flat.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B3C7B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-gray-900 antialiased">
        <OrganizationJsonLd />
        <LenisProvider>
          {children}
        </LenisProvider>
        <ChatWidget />
        <SocialProofProvider />
        <ExitIntentModal />
        <PWARegister />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
