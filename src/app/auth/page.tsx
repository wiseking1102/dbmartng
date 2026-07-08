"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Store, User, ArrowLeft, Check, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/ui/Turnstile";
import { useAuth } from "@/hooks/useAuth";

type AuthRole = "buyer" | "vendor";
type AuthView = "select" | "login" | "signup";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithPhone,
    verifyPhoneOTP,
    checkAdminAllowlist,
    loading: authLoading,
  } = useAuth();

  const defaultRole = (searchParams.get("type") as AuthRole) || "buyer";
  const isAdminSetup = searchParams.get("admin_setup") === "true";
  const referralCode = searchParams.get("ref") || undefined;

  // Persist referral code in a ref so it survives component re-renders
  const [activeReferral, setActiveReferral] = useState<string | undefined>(referralCode);

  const [role, setRole] = useState<AuthRole>(defaultRole);
  const [view, setView] = useState<AuthView>(isAdminSetup ? "signup" : "select");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Admin allowlist detection
  const [detectedAdmin, setDetectedAdmin] = useState<{
    identifier: string;
    claimed: boolean;
  } | null>(null);

  // Check for admin allowlist on email change (via server API route)
  const checkAllowlistForEmail = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) return;
    const result = await checkAdminAllowlist(emailValue);
    if (result.detected) {
      setDetectedAdmin({
        identifier: emailValue,
        claimed: result.claimed,
      });
    } else {
      setDetectedAdmin(null);
    }
  };

  useEffect(() => {
    if (view === "login" || view === "signup") {
      checkAllowlistForEmail(email);
    }
  }, [email, view]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validate CAPTCHA if configured
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
        throw new Error("Please complete the security check");
      }

      // Verify CAPTCHA on server
      if (captchaToken) {
        const captchaRes = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: captchaToken }),
        });
        const captchaResult = await captchaRes.json();
        if (!captchaResult.success) {
          throw new Error("Security check failed. Please try again.");
        }
      }

      // Check if identifier is in admin allowlist (unclaimed) via server API
      const allowlistCheck = await checkAdminAllowlist(email);

      if (allowlistCheck.detected && !allowlistCheck.claimed) {
        // This is an admin account setup flow (Section 3.1)
        // The FIRST step: OTP verification of ownership
        setSuccess(
          "Admin identifier detected. Sending verification code to your email..."
        );

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });

        if (otpError) throw otpError;
        setShowOTP(true);
        setSuccess("Verification code sent to your email. Please check your inbox.");
        setDetectedAdmin({ identifier: email, claimed: false });
        setLoading(false);
        return;
      }

      // Normal user signup
      const result = await signUpWithEmail(email, password, role, activeReferral);
      if (result.isAdminSetup) {
        setSuccess("Admin account setup initiated...");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Verify the OTP for admin setup
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        // Complete admin setup via server-side API (bypasses RLS)
        const response = await fetch("/api/auth/admin-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            userId: data.user.id,
            fullName,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Admin setup failed");
        }

        router.push("/dashboard/admin");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPhone(phone);
      setShowOTP(true);
      setSuccess("OTP sent to your phone!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyPhoneOTP(phone, otp, activeReferral);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8">
            <Image
              src="/brand/logo-flat.png"
              alt="DBMartNG"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-lg font-bold text-brand-navy font-display">
              DBMart<span className="text-brand-gold">NG</span>
            </span>
          </Link>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-accent-success/5 border border-accent-success/20 text-accent-success text-sm flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {view === "select" && (
            <>
              <h1 className="text-3xl font-bold text-brand-navy font-display mb-2">
                Welcome to DBMartNG
              </h1>
              <p className="text-gray-600 mb-8">
                Choose how you&apos;d like to get started.
              </p>

              <div className="space-y-4">
                {/* Vendor Option */}
                <button
                  onClick={() => {
                    setRole("vendor");
                    setView("login");
                  }}
                  className="w-full glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                      <Store className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy text-lg">
                        I&apos;m a Vendor
                      </h3>
                      <p className="text-sm text-gray-500">
                        List my business and manage my profile
                      </p>
                    </div>
                  </div>
                </button>

                {/* Buyer Option */}
                <button
                  onClick={() => {
                    setRole("buyer");
                    setView("login");
                  }}
                  className="w-full glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center shrink-0 group-hover:bg-brand-navy/10 transition-colors">
                      <User className="h-6 w-6 text-brand-navy" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-navy text-lg">
                        I&apos;m a Buyer / Customer
                      </h3>
                      <p className="text-sm text-gray-500">
                        Browse businesses and contact vendors
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {(view === "login" || view === "signup") && (
            <>
              <button
                onClick={() => {
                  setView("select");
                  setError(null);
                  setSuccess(null);
                  setShowOTP(false);
                  setDetectedAdmin(null);
                }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    role === "vendor" ? "bg-brand-gold/10" : "bg-brand-navy/5"
                  )}
                >
                  {role === "vendor" ? (
                    <Store className="h-5 w-5 text-brand-gold" />
                  ) : (
                    <User className="h-5 w-5 text-brand-navy" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-brand-navy">
                    {view === "login"
                      ? role === "vendor"
                        ? "Vendor Login"
                        : "Buyer Login"
                      : role === "vendor"
                        ? "Register Your Business"
                        : "Create Account"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {view === "login"
                      ? role === "vendor"
                        ? "Access your vendor dashboard"
                        : "Browse and connect with vendors"
                      : "Join DBMartNG today"}
                  </p>
                </div>

                {/* Admin badge - only shown when admin is detected */}
                {detectedAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-navy/5 text-brand-navy text-xs font-semibold">
                    <Lock className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>

              {/* Login/Signup Toggle */}
              <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => {
                    setView("login");
                    setError(null);
                    setShowOTP(false);
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                    view === "login"
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-gray-500 hover:text-brand-navy"
                  )}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setView("signup");
                    setError(null);
                    setShowOTP(false);
                  }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                    view === "signup"
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-gray-500 hover:text-brand-navy"
                  )}
                >
                  {role === "vendor" ? "Register" : "Sign Up"}
                </button>
              </div>

              {/* Google Login */}
              <Button
                variant="outline"
                size="lg"
                className="w-full mb-4 border-gray-200 hover:border-brand-navy"
                onClick={handleGoogleLogin}
                loading={loading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Sign Up Form */}
              {view === "signup" && !showOTP && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  {detectedAdmin && !detectedAdmin.claimed && (
                    <div className="p-3 rounded-xl bg-accent-info/5 border border-accent-info/20 text-xs text-accent-info">
                      Admin identifier detected. Complete this form to set up
                      your admin account. A verification code will be sent to
                      your email.
                    </div>
                  )}

                  <Turnstile onVerify={setCaptchaToken} />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        minLength={8}
                        className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Minimum 8 characters
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={loading}
                  >
                    {detectedAdmin && !detectedAdmin.claimed
                      ? "Set Up Admin Account"
                      : role === "vendor"
                        ? "Register Your Business"
                        : "Create Account"}
                  </Button>
                </form>
              )}

              {/* Email/Password Login */}
              {view === "login" && !showOTP && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                      required
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={loading}
                  >
                    {detectedAdmin && detectedAdmin.claimed
                      ? "Admin Login"
                      : "Sign In"}
                  </Button>
                </form>
              )}

              {/* Vendor Phone OTP Login */}
              {role === "vendor" && view === "login" && !showOTP && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <form onSubmit={handlePhoneLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="080 1234 5678"
                          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      loading={loading}
                    >
                      Continue with Phone
                    </Button>
                  </form>
                </>
              )}

              {/* OTP Verification */}
              {showOTP && (
                <form
                  onSubmit={detectedAdmin ? handleAdminOTPVerify : handleOTPVerify}
                  className="mt-6 space-y-4"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-7 w-7 text-brand-gold" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-navy mb-1">
                      {detectedAdmin ? "Verify Your Identity" : "Verify Phone"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Enter the verification code sent to{" "}
                      <span className="font-medium text-brand-navy">
                        {email || phone}
                      </span>
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full h-14 px-4 text-center text-3xl tracking-[0.5em] font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                      required
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={loading}
                  >
                    {detectedAdmin ? "Complete Setup" : "Verify & Sign In"}
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    Didn&apos;t receive the code?{" "}
                    <button
                      type="button"
                      className="text-brand-navy font-semibold hover:text-brand-gold"
                      onClick={() => {
                        setOtp("");
                        setShowOTP(false);
                      }}
                    >
                      Try again
                    </button>
                  </p>
                </form>
              )}

              {/* Bottom text */}
              {!showOTP && (
                <p className="mt-6 text-center text-sm text-gray-500">
                  {view === "login" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => {
                          setView("signup");
                          setError(null);
                        }}
                        className="text-brand-navy font-semibold hover:text-brand-gold"
                      >
                        {role === "vendor"
                          ? "Register your business"
                          : "Create an account"}
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => {
                          setView("login");
                          setError(null);
                        }}
                        className="text-brand-navy font-semibold hover:text-brand-gold"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Brand Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-navy via-brand-navy-dark to-[#041c3d] items-center justify-center p-12">
        <div className="text-center max-w-md">
          <Image
            src="/brand/logo-3d.png"
            alt="DBMartNG"
            width={200}
            height={200}
            className="mx-auto mb-8 drop-shadow-2xl animate-float"
          />
          <h2 className="text-3xl font-bold text-white font-display mb-4">
            {detectedAdmin
              ? "Admin Access"
              : role === "vendor"
                ? "Grow Your Business Online"
                : "Discover Nigerian Businesses"}
          </h2>
          <p className="text-gray-300">
            {detectedAdmin
              ? "Platform administration panel. Manage vendors, listings, subscriptions, and platform settings."
              : role === "vendor"
                ? "Join 500+ vendors already reaching customers on DBMartNG. Get a free 30-day trial with full access."
                : "Browse verified vendors, read reviews, and connect directly with businesses near you."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}