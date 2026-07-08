"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import {
  Store,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  Phone,
  MapPin,
  Globe,
  Share2,
  Camera,
  Loader2,
  Sparkles,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

type OnboardingStep = "business" | "category" | "contact" | "verify" | "share" | "complete";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: "goods" | "service";
  description: string | null;
}

const defaultCategories: Category[] = [
  // Goods categories
  { id: "1", name: "Fashion & Style", slug: "fashion", type: "goods", description: "Clothing, accessories, and fashion items" },
  { id: "2", name: "Food & Beverages", slug: "food", type: "goods", description: "Food, drinks, and culinary products" },
  { id: "3", name: "Tech & Electronics", slug: "tech", type: "goods", description: "Electronics, gadgets, and tech accessories" },
  // Service categories
  { id: "4", name: "Makeup & Beauty", slug: "makeup", type: "service", description: "Makeup artistry and beauty services" },
  { id: "5", name: "Photography & Videography", slug: "photography", type: "service", description: "Professional photo and video services" },
  { id: "6", name: "Tailoring & Sewing", slug: "tailoring", type: "service", description: "Custom tailoring and alterations" },
  { id: "7", name: "Hair Styling", slug: "hair", type: "service", description: "Hair care and styling services" },
  { id: "8", name: "Event Planning", slug: "events", type: "service", description: "Event coordination and planning" },
  { id: "9", name: "Tutoring & Coaching", slug: "tutoring", type: "service", description: "Educational and coaching services" },
  { id: "10", name: "Home & Auto Repair", slug: "repair", type: "service", description: "Home maintenance and auto repair" },
];

const categoryTypes = [
  { id: "goods", label: "I sell products", icon: "🛍️", description: "Fashion, food, electronics, etc." },
  { id: "service", label: "I offer services", icon: "💼", description: "Makeup, photography, tailoring, etc." },
  { id: "both", label: "Both products & services", icon: "🏪", description: "My business offers both" },
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("business");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryType, setCategoryType] = useState<"goods" | "service" | "both" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // OTP
  const [otpPhone, setOtpPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  // Share (honor system)
  const [shareAcknowledged, setShareAcknowledged] = useState(false);

  const steps = ["business", "category", "contact", "verify", "share"];
  const stepLabels = ["Business", "Category", "Contact", "Verify", "Share"];
  const currentStepIndex = steps.indexOf(currentStep);

  // Redirect if not vendor
  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  const canProceedFromBusiness =
    businessName.trim().length >= 2;

  const handleSubmitBusiness = () => {
    if (!canProceedFromBusiness) return;
    setCurrentStep("category");
    setError(null);
  };

  const handleSubmitCategory = () => {
    if (!selectedCategory) return;
    setCurrentStep("contact");
    setError(null);
  };

  const handleSubmitContact = () => {
    setCurrentStep("verify");
    setError(null);
  };

  const handleSendOTP = async () => {
    const phoneToUse = whatsappNumber || contactPhone;
    if (!phoneToUse) {
      setError("Please enter a phone number first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phoneToUse,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      setOtpPhone(phoneToUse);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: otpPhone,
        token: otpCode,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      setOtpVerified(true);
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const slug = slugify(businessName) + "-" + Math.random().toString(36).slice(2, 6);

      const response = await fetch("/api/vendor/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          businessName: businessName.trim(),
          slug,
          description: description.trim() || null,
          categoryId: selectedCategory || null,
          email: contactEmail || null,
          phone: contactPhone || null,
          whatsappNumber: whatsappNumber || null,
          website: website || null,
          address: address || null,
          city: city || null,
          state: state || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create profile");

      setCurrentStep("complete");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    const profileUrl = `https://dbmart.ng/vendors/${slugify(businessName)}`;
    const caption = `I just listed my business on DBMartNG! Find me at ${profileUrl} — the best place to discover and connect with Nigerian businesses. 🚀`;

    switch (platform) {
      case "whatsapp-status":
        // WhatsApp doesn't support direct API sharing to status
        window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank");
        break;
      case "tiktok":
        window.open("https://www.tiktok.com/", "_blank");
        break;
      case "snapchat":
        window.open("https://www.snapchat.com/", "_blank");
        break;
      default:
        break;
    }
  };

  const handleFinish = () => {
    router.push("/dashboard/vendor");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-brand-navy font-semibold">Loading...</div>
      </div>
    );
  }

  const renderProgressBar = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        {stepLabels.map((label, i) => (
          <div
            key={label}
            className={`text-xs font-medium transition-colors ${
              i <= currentStepIndex
                ? "text-brand-navy"
                : "text-gray-300"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-brand-gold rounded-full transition-all duration-500"
          style={{
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );

  const renderBackButton = (target: OnboardingStep) => (
    <button
      onClick={() => {
        setCurrentStep(target);
        setError(null);
      }}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mb-6 transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );

  return (
    <div className="min-h-screen bg-surface-secondary animate-fade-in">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <Image
              src="/brand/logo-flat.png"
              alt="DBMartNG"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <span className="text-sm font-medium text-gray-500">
            Vendor Onboarding
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {currentStep !== "complete" && renderProgressBar()}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Business Info */}
        {currentStep === "business" && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-brand-gold" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-2">
                Tell Us About Your Business
              </h1>
              <p className="text-gray-500">
                This information will appear on your public profile page.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. TechZone NG"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-lg font-semibold"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell buyers what your business offers, what makes you unique, and why they should choose you..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {description.length}/500 characters
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={!canProceedFromBusiness}
                  onClick={handleSubmitBusiness}
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Category Selection */}
        {currentStep === "category" && (
          <div className="animate-fade-in">
            {renderBackButton("business")}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-brand-gold" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-2">
                What Do You Offer?
              </h1>
              <p className="text-gray-500">
                Choose the category that best describes your business.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
              {/* Category type selector */}
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {categoryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setCategoryType(type.id as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      categoryType === type.id
                        ? "border-brand-gold bg-brand-gold/5"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-sm text-brand-navy">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Category list */}
              {categoryType && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select your specific category
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                    {defaultCategories
                      .filter(
                        (cat) =>
                          categoryType === "both" || cat.type === categoryType
                      )
                      .map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedCategory === cat.id
                              ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                              : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div className="font-medium text-sm text-brand-navy">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {cat.description}
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={!selectedCategory}
                  onClick={handleSubmitCategory}
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === "contact" && (
          <div className="animate-fade-in">
            {renderBackButton("category")}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-brand-gold" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-2">
                How Can Customers Reach You?
              </h1>
              <p className="text-gray-500">
                These details will be shown on your public profile.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="business@example.com"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="080 1234 5678"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  WhatsApp Number (for one-click chat)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gold" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+234 801 234 5678"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Buyers will be able to contact you directly via WhatsApp with one tap.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Website (optional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Lagos"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={handleSubmitContact}
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Phone OTP Verification */}
        {currentStep === "verify" && (
          <div className="animate-fade-in">
            {renderBackButton("contact")}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-brand-gold" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-2">
                Verify Your Phone Number
              </h1>
              <p className="text-gray-500">
                We need to verify your phone number before your listing goes live.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8">
              {!otpVerified ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number to Verify
                    </label>
                    <input
                      type="tel"
                      value={otpPhone || whatsappNumber || contactPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      placeholder="080 1234 5678"
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                      disabled={otpSent}
                    />
                  </div>

                  {!otpSent ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleSendOTP}
                      loading={loading}
                    >
                      Send Verification Code
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 text-center">
                          Enter the 6-digit code sent to {otpPhone}
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full h-14 px-4 text-center text-3xl tracking-[0.5em] font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleVerifyOTP}
                        loading={loading}
                        disabled={otpCode.length < 4}
                      >
                        Verify Phone
                      </Button>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="w-full text-center text-sm text-brand-navy font-semibold hover:text-brand-gold"
                      >
                        Resend code
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-accent-success" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-navy mb-2">
                    Phone Verified!
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Your phone number has been verified successfully.
                  </p>
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={() => setCurrentStep("share")}
                  >
                    Continue
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Share-to-Social (Honor System) */}
        {currentStep === "share" && (
          <div className="animate-fade-in">
            {renderBackButton("verify")}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-brand-gold" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-2">
                Spread the Word!
              </h1>
              <p className="text-gray-500">
                Let your community know you&apos;re on DBMartNG.
              </p>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10">
                <p className="text-sm text-gray-600 font-medium mb-2">
                  Share this message:
                </p>
                <p className="text-sm text-gray-500 bg-white rounded-lg p-3 border border-gray-100 italic">
                  &ldquo;I just listed my business on DBMartNG! Find me at{" "}
                  <span className="text-brand-gold font-semibold">
                    dbmart.ng/vendors/{slugify(businessName) || "your-business"}
                  </span>{" "}
                  — the best place to discover and connect with Nigerian
                  businesses. 🚀&rdquo;
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#25D366]/20 bg-[#25D366]/5 hover:border-[#25D366] hover:bg-[#25D366]/10 transition-all"
                >
                  <MessageSquare className="h-6 w-6 text-[#25D366]" />
                  <div className="text-left">
                    <div className="font-semibold text-sm text-brand-navy">
                      Share to WhatsApp
                    </div>
                    <div className="text-xs text-gray-400">
                      Send to a contact or group
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleShare("whatsapp-status")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#25D366]/20 bg-[#25D366]/5 hover:border-[#25D366] hover:bg-[#25D366]/10 transition-all"
                >
                  <Share2 className="h-6 w-6 text-[#25D366]" />
                  <div className="text-left">
                    <div className="font-semibold text-sm text-brand-navy">
                      WhatsApp Status
                    </div>
                    <div className="text-xs text-gray-400">
                      Share as a status update
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleShare("tiktok")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                >
                  <span className="text-2xl">🎵</span>
                  <div className="text-left">
                    <div className="font-semibold text-sm text-brand-navy">
                      TikTok
                    </div>
                    <div className="text-xs text-gray-400">
                      Share to TikTok
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleShare("snapchat")}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                >
                  <span className="text-2xl">👻</span>
                  <div className="text-left">
                    <div className="font-semibold text-sm text-brand-navy">
                      Snapchat
                    </div>
                    <div className="text-xs text-gray-400">
                      Share to Snapchat
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareAcknowledged}
                    onChange={(e) => setShareAcknowledged(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />
                  <span className="text-sm text-gray-500">
                    I&apos;ve shared my business listing. (This is optional —
                    you can complete onboarding without sharing.)
                  </span>
                </label>

                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={handleCompleteOnboarding}
                  loading={loading}
                >
                  Complete Onboarding
                  <Sparkles className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Complete */}
        {currentStep === "complete" && (
          <div className="animate-scale-in text-center py-12">
            <div className="w-24 h-24 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-accent-success" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
              Welcome to DBMartNG!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Your business profile has been created successfully.
            </p>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Your profile is now under review. Once approved by our team, it
              will be visible to buyers across Nigeria. You&apos;ll receive a
              notification when it&apos;s live.
            </p>

            <div className="glass rounded-2xl p-6 max-w-sm mx-auto mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-accent-success animate-pulse-soft" />
                <span className="text-sm font-medium text-brand-navy">
                  30-day free trial active
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-brand-gold animate-pulse-soft" />
                <span className="text-sm font-medium text-brand-navy">
                  Profile pending admin review
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="gold" size="xl" onClick={handleFinish}>
                Go to Dashboard
              </Button>
              <Link href={`/vendors/${slugify(businessName)}`}>
                <Button variant="outline" size="xl">
                  Preview Profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
