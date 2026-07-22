"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, role, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/browse", label: "Browse" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/careers", label: "Work With Us" },
  ];

  const dashboardHref =
    role === "vendor"
      ? "/dashboard/vendor"
      : role === "admin" || role === "sub_admin"
        ? "/dashboard/admin"
        : role === "buyer"
          ? "/dashboard/buyer"
          : "/auth";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-white/85 backdrop-blur-3xl shadow-lg border-b border-white/30"
          : "bg-transparent"
      )}
      style={isScrolled ? { backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(201, 176, 55, 0.03) 0%, transparent 50%)' } : {}}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/brand/logo-flat.png"
              alt="DBMartNG"
              width={40}
              height={40}
              className="h-9 w-9"
              priority
            />
            <span className="text-xl font-bold font-display hidden sm:block">
              <span className={isScrolled ? "text-brand-navy" : "text-white"}>
                DBMart<span className="text-brand-gold">NG</span>
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-sm font-medium transition-colors py-1 ${
                  isScrolled
                    ? "text-gray-700 hover:text-brand-navy"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <>
                {/* Notifications Bell */}
                <NotificationBell userId={user.id} />

                {/* Dashboard Link */}
                <Link href={dashboardHref}>
                  <Button variant="ghost" size="sm">
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline">
                      {role === "admin" || role === "sub_admin"
                        ? "Admin"
                        : role === "vendor"
                          ? "Dashboard"
                          : "Account"}
                    </span>
                  </Button>
                </Link>

                {/* Sign Out (desktop) */}
                <button
                  onClick={signOut}
                  className="hidden sm:flex p-2 rounded-lg text-gray-400 hover:text-accent-error hover:bg-red-50 transition-all"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              !loading && (
                <Link href="/auth">
                  <Button
                    variant={isScrolled ? "primary" : "outline"}
                    size="sm"
                    className={!isScrolled ? "border-white/30 text-white hover:bg-white/10" : ""}
                  >
                    Sign In
                  </Button>
                </Link>
              )
            )}

            {/* Mobile Menu Toggle */}
            <button
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isScrolled
                  ? "text-gray-700 hover:text-brand-navy hover:bg-gray-100"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>          {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden backdrop-blur-2xl border-b animate-slide-down ${
          isScrolled
            ? "bg-white/95 border-gray-100"
            : "bg-brand-navy/95 border-white/10"
        }`}>
          <div className="px-4 py-4 space-y-3">              {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 text-base font-medium transition-colors ${
                  isScrolled
                    ? "text-gray-700 hover:text-brand-navy"
                    : "text-white/80 hover:text-white"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className={isScrolled ? "border-gray-100" : "border-white/10"} />
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="block py-2 text-base font-medium text-brand-navy"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block py-2 text-base font-medium text-accent-error"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="block py-2 text-base font-medium text-brand-navy"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?type=vendor"
                  className="block py-2 text-base font-medium text-brand-gold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  List Your Business
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
