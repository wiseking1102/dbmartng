"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Store, User, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/ui/Turnstile";
import { useAuth } from "@/hooks/useAuth";

export const dynamic = "force-dynamic";

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

  const [activeReferral, setActiveReferral] = useState(referralCode);
  const [role, setRole] = useState(defaultRole);
  const [view, setView] = useState(isAdminSetup ? "signup" : "select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [detectedAdmin, setDetectedAdmin] = useState<{
    identifier: string;
    claimed: boolean;
  } | null>(null);

  // FIX: If user is already logged in, redirect to their dashboard
  // instead of showing the auth selection screen.
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        // Type assertion to fix TypeScript error
        const role = (profile as { role: string | null } | null)?.role;

        if (role === "admin" || role === "sub_admin") {
          router.replace("/dashboard/admin");
        } else if (role === "vendor") {
          router.replace("/dashboard/vendor");
        } else {
          router.replace("/dashboard");
        }
      }
    };

    checkSession();
  }, [router, supabase]);

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
      setError(err instanceof Error ? err.message : "Invalid email or password");
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
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
        throw new Error("Please complete the security check");
      }

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

      const allowlistCheck = await checkAdminAllowlist(email);
      if (allowlistCheck.detected && !allowlistCheck.claimed) {
        setSuccess("Admin identifier detected. Sending verification code to your email...");
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        });
        if (otpError) throw otpError;
        setShowOTP(true);
        setSuccess("Verification code sent to your email. Please check your inbox.");
        setDetectedAdmin({ identifier: email, claimed: false });
        setLoading(false);
        return;
      }

      const result = await signUpWithEmail(email, password, role, activeReferral);
      if (result.isAdminSetup) {
        setSuccess("Admin account setup initiated...");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (verifyError) throw verifyError;

      if (data.user) {
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
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
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
      setError(err instanceof Error ? err.message : "Failed to send OTP");
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
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-navy/5 via-white to-brand-gold/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-brand-navy">
              DBMart <span className="text-brand-gold">NG</span>
            </span>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-200">
            {success}
          </div>
        )}

        {view === "select" && (
          <>
            <h1 className="text-3xl font-bold text-center text-brand-navy mb-2">
              Welcome to DBMartNG
            </h1>
            <p className="text-center text-gray-500 mb-8">
              Choose how you'd like to get started.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setRole("vendor");
                  setView("login");
                }}
                className="w-full glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-brand-gold/10 text-brand-gold">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-navy transition-colors">
                      I'm a Vendor
                    </h3>
                    <p className="text-sm text-gray-500">List my business and manage my profile</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setRole("buyer");
                  setView("login");
                }}
                className="w-full glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-brand-navy/10 text-brand-navy">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-navy transition-colors">
                      I'm a Buyer / Customer
                    </h3>
                    <p className="text-sm text-gray-500">Browse businesses and contact vendors</p>
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
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2 mb-2">
              {role === "vendor" ? (
                <Store className="w-5 h-5 text-brand-gold" />
              ) : (
                <User className="w-5 h-5 text-brand-navy" />
              )}
              <h2 className="text-2xl font-bold text-brand-navy">
                {view === "login"
                  ? role === "vendor"
                    ? "Vendor Login"
                    : "Buyer Login"
                  : role === "vendor"
                    ? "Register Your Business"
                    : "Create Account"}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {view === "login"
                ? role === "vendor"
                  ? "Access your vendor dashboard"
                  : "Browse and connect with vendors"
                : "Join DBMartNG today"}
            </p>

            {detectedAdmin && (
              <div className="mb-4 p-2 rounded-lg bg-brand-navy/10 text-brand-navy text-xs font-medium flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Admin
              </div>
            )}

            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
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

            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full h-11 mb-4 rounded-xl border-gray-200 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.71210847 12,4.71210847 C13.6904706,4.71210847 15.2600464,5.33522114 16.4908225,6.34462545 L19.220924,3.614523 C17.3111288,1.87620371 14.7296305,0.826660156 12,0.826660156 C7.19297173,0.826660156 3.1023268,3.49326513 1.34992973,7.32902432 L5.26620003,9.76452941 Z"
                />
                <path
                  fill="#34A853"
                  d="M23.4384733,11.660475 C23.4664801,12.2175437 23.4973813,12.9911563 23.4973813,13.8210084 C23.4973813,18.3991242 21.0520224,22.2363196 16.6979719,23.6632492 L16.6979719,23.6632492 L19.6017939,20.5713339 C21.2935043,19.5334585 22.6236245,17.8361072 23.2179129,15.7194208 L23.4384733,11.660475 Z"
                />
                <path
                  fill="#4A90E2"
                  d="M12,23.1731721 C9.18080022,23.1731721 6.61296024,21.9627612 4.84938715,19.9998289 L1.00323796,22.8755716 C3.2129199,25.5125523 6.63430921,27.1170901 10.2753943,27.1170901 C12.9410031,27.1170901 15.4598484,26.2392591 17.5069152,24.7656989 L14.4195112,21.8100508 C13.2555212,22.5936387 11.8835724,23.1731721 12,23.1731721 Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.26620003,9.76452941 L1.34992973,7.32902432 C0.830767187,8.60327002 0.5,10.0607479 0.5,11.6792545 C0.5,13.1602979 0.840068026,14.5547472 1.40309927,15.8230233 L5.26620003,9.76452941 Z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {view === "signup" && !showOTP && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {detectedAdmin && !detectedAdmin.claimed && (
                  <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-200">
                    Admin identifier detected. Complete this form to set up your admin account.
                    A verification code will be sent to your email.
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-sm font-medium text-gray-700">Email address</label>
                  <Mail className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Lock className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    minLength={8}
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>

                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                  <Turnstile
                    onVerify={(token) => setCaptchaToken(token)}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  />
                )}

                <Button
                  type="submit"
                  disabled={loading || authLoading}
                  className="w-full h-11 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold"
                >
                  {loading ? "Please wait..." : (detectedAdmin && !detectedAdmin.claimed
                    ? "Set Up Admin Account"
                    : role === "vendor"
                      ? "Register Your Business"
                      : "Create Account")}
                </Button>
              </form>
            )}

            {view === "login" && !showOTP && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1 relative">
                  <label className="text-sm font-medium text-gray-700">Email address</label>
                  <Mail className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Lock className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || authLoading}
                  className="w-full h-11 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold"
                >
                  {loading ? "Please wait..." : (detectedAdmin && detectedAdmin.claimed ? "Admin Login" : "Sign In")}
                </Button>
              </form>
            )}

            {role === "vendor" && view === "login" && !showOTP && (
              <>
                <div className="relative flex items-center my-4">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-3 text-xs text-gray-400">or</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>

                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  <div className="space-y-1 relative">
                    <label className="text-sm font-medium text-gray-700">Phone number</label>
                    <Phone className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="080 1234 5678"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    variant="outline"
                    className="w-full h-11 rounded-xl border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                  >
                    Continue with Phone
                  </Button>
                </form>
              </>
            )}

            {showOTP && (
              <form
                onSubmit={detectedAdmin ? handleAdminOTPVerify : handleOTPVerify}
                className="space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-brand-navy">
                    {detectedAdmin ? "Verify Your Identity" : "Verify Phone"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Enter the verification code sent to{" "}
                    <span className="font-medium">{email || phone}</span>
                  </p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full h-14 px-4 text-center text-3xl tracking-[0.5em] font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  required
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-white font-semibold"
                >
                  {loading ? "Verifying..." : (detectedAdmin ? "Complete Setup" : "Verify & Sign In")}
                </Button>
                <p className="text-center text-xs text-gray-400">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setOtp("");
                      setShowOTP(false);
                    }}
                    className="text-brand-navy hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </form>
            )}

            {!showOTP && (
              <p className="text-center text-sm text-gray-500 mt-6">
                {view === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setView("signup");
                        setError(null);
                      }}
                      className="text-brand-navy font-semibold hover:text-brand-gold"
                    >
                      {role === "vendor" ? "Register your business" : "Create an account"}
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
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
