import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Platform: [
    { href: "/browse", label: "Browse Vendors" },
    { href: "/pricing", label: "Pricing" },
    { href: "/categories", label: "Categories" },
    { href: "/auth?type=vendor", label: "List Your Business" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/careers", label: "Work With Us" },
    { href: "/contact", label: "Contact" },
    { href: "/about#credits", label: "Credits" },
  ],
  Legal: [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/ndpr", label: "NDPR Data Policy" },
  ],
  Support: [
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Help Center" },
    { href: "/about", label: "About DBMartNG" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-brand-navy text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/brand/logo-flat.png"
                alt="DBMartNG"
                width={36}
                height={36}
                className="h-9 w-9 brightness-0 invert"
              />
              <span className="text-xl font-bold font-display">
                DBMart<span className="text-brand-gold">NG</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Nigeria&apos;s premier business directory and marketplace — discover
              verified vendors, browse products and services, and connect
              directly with businesses near you.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-brand-gold mb-4 uppercase tracking-wider">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} DBMartNG. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Made with ❤️ in Asaba, Delta State, Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
