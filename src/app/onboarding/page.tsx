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
  Building2,
  Phone,
  MapPin,
  Globe,
  Share2,
  Sparkles,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

type OnboardingStep =
  | "business"
  | "category"
  | "contact"
  | "verify"
  | "share"
  | "complete";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: "goods" | "service";
  description: string | null;
}

const categoryTypes = [
  {
    id: "goods",
    label: "I sell products",
    icon: "🛍️",
    description: "Fashion, food, electronics, etc.",
  },
  {
    id: "service",
    label: "I offer services",
    icon: "💼",
    description: "Makeup, photography, tailoring, etc.",
  },
  {
    id: "both",
    label: "Both products & services",
    icon: "🏪",
    description: "My business offers both",
  },
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [currentStep, setCurrentStep] =
    useState<OnboardingStep>("business");

  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");

  const [categoryType, setCategoryType] = useState<
    "goods" | "service" | "both" | null
  >(null);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("");

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

  // Final profile URL
  const [createdSlug, setCreatedSlug] = useState("");

  // Share
  const [shareAcknowledged, setShareAcknowledged] =
    useState(false);

  const steps = [
    "business",
    "category",
    "contact",
    "verify",
    "share",
  ];

  const stepLabels = [
    "Business",
    "Category",
    "Contact",
    "Verify",
    "Share",
  ];

  const currentStepIndex = steps.indexOf(currentStep);

  /*
   * ------------------------------------------------------------
   * Authentication guard
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  /*
   * ------------------------------------------------------------
   * Load real categories from Supabase
   * ------------------------------------------------------------
   *
   * The old implementation used fake IDs such as "1", "2", "3".
   * Your categories table uses UUIDs.
   */
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);

      try {
        const { data, error: categoryError } = await supabase
          .from("categories")
          .select("id, name, slug, type, description")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (categoryError) {
          throw categoryError;
        }

        const normalizedCategories: Category[] = (
          data ?? []
        )
          .filter(
            (category) =>
              category.type === "goods" ||
              category.type === "service"
          )
          .map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            type: category.type,
            description: category.description,
          }));

        if (!cancelled) {
          setCategories(normalizedCategories);
        }
      } catch (categoryError) {
        console.error(
          "Failed to load vendor categories:",
          categoryError
        );

        if (!cancelled) {
          setError(
            "We couldn't load business categories. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const canProceedFromBusiness =
    businessName.trim().length >= 2;

  /*
   * ------------------------------------------------------------
   * Business
   * ------------------------------------------------------------
   */
  const handleSubmitBusiness = () => {
    if (!canProceedFromBusiness) {
      setError("Please enter your business name.");
      return;
    }

    if (description.length > 500) {
      setError(
        "Business description cannot exceed 500 characters."
      );
      return;
    }

    setCurrentStep("category");
    setError(null);
  };

  /*
   * ------------------------------------------------------------
   * Category
   * ------------------------------------------------------------
   */
  const handleSubmitCategory = () => {
    if (!categoryType) {
      setError("Please choose what your business offers.");
      return;
    }

    if (!selectedCategory) {
      setError("Please select a specific business category.");
      return;
    }

    const categoryExists = categories.some(
      (category) => category.id === selectedCategory
    );

    if (!categoryExists) {
      setError(
        "The selected category is no longer available. Please choose another."
      );
      return;
    }

    setCurrentStep("contact");
    setError(null);
  };

  /*
   * ------------------------------------------------------------
   * Contact
   * ------------------------------------------------------------
   */
  const handleSubmitContact = () => {
    if (!contactPhone.trim() && !whatsappNumber.trim()) {
      setError(
        "Please provide at least one phone or WhatsApp number."
      );
      return;
    }

    if (website.trim()) {
      try {
        const url = new URL(website.trim());

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError(
          "Please enter a valid website URL beginning with http:// or https://."
        );
        return;
      }
    }

    setOtpPhone(
      whatsappNumber.trim() || contactPhone.trim()
    );

    setCurrentStep("verify");
    setError(null);
  };

  /*
   * ------------------------------------------------------------
   * Send OTP
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   * We do NOT use signInWithOtp().
   *
   * The vendor is already authenticated. signInWithOtp() can
   * change the authentication identity.
   *
   * updateUser({ phone }) keeps the existing authenticated user
   * and requests verification for the phone number.
   */
  const handleSendOTP = async () => {
    const phoneToUse =
      otpPhone.trim() ||
      whatsappNumber.trim() ||
      contactPhone.trim();

    if (!phoneToUse) {
      setError("Please enter a phone number first.");
      return;
    }

    if (!user) {
      setError(
        "Your session has expired. Please sign in again."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: otpError } =
        await supabase.auth.updateUser({
          phone: phoneToUse,
        });

      if (otpError) {
        throw otpError;
      }

      setOtpPhone(phoneToUse);
      setOtpSent(true);
      setOtpCode("");
      setOtpVerified(false);
    } catch (err: unknown) {
      console.error("Phone OTP error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Verify OTP
   * ------------------------------------------------------------
   *
   * "phone_change" is important here.
   *
   * This verifies the phone number attached to the currently
   * authenticated user instead of signing another user in.
   */
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (!otpPhone.trim()) {
      setError("No phone number is waiting for verification.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } =
        await supabase.auth.verifyOtp({
          phone: otpPhone.trim(),
          token: otpCode,
          type: "phone_change",
        });

      if (verifyError) {
        throw verifyError;
      }

      /*
       * Make sure Supabase still has an authenticated session
       * after the phone-change verification.
       */
      const {
        data: { user: refreshedUser },
      } = await supabase.auth.getUser();

      if (!refreshedUser) {
        throw new Error(
          "Your session could not be confirmed after phone verification. Please sign in again."
        );
      }

      if (
        !data?.user?.phone &&
        refreshedUser.phone !== otpPhone.trim()
      ) {
        throw new Error(
          "Phone verification could not be confirmed. Please try again."
        );
      }

      setOtpVerified(true);
      setCurrentStep("share");
    } catch (err: unknown) {
      console.error("Phone verification error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Create vendor profile
   * ------------------------------------------------------------
   */
  const handleCompleteOnboarding = async () => {
    if (!user) {
      setError(
        "Your session has expired. Please sign in again."
      );
      return;
    }

    if (!otpVerified) {
      setError(
        "Please verify your phone number before completing onboarding."
      );
      setCurrentStep("verify");
      return;
    }

    if (!selectedCategory) {
      setError("Please select a business category.");
      setCurrentStep("category");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /*
       * Generate the slug once and preserve it.
       *
       * The old code generated one slug during creation but then
       * displayed a different slug during sharing/preview.
       */
      const baseSlug =
        slugify(businessName.trim()) || "business";

      const uniqueSlug =
        `${baseSlug}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

      /*
       * Get the current session.
       *
       * This is the critical fix for the previous 401 error.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "/api/vendor/create-profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            businessName: businessName.trim(),
            slug: uniqueSlug,
            description:
              description.trim() || null,
            categoryId: selectedCategory,
            email:
              contactEmail.trim() || null,
            phone:
              contactPhone.trim() || null,
            whatsappNumber:
              whatsappNumber.trim() || null,
            website:
              website.trim() || null,
            address:
              address.trim() || null,
            city:
              city.trim() || null,
            state:
              state.trim() || null,

            /*
             * The API verifies this against the actual
             * authenticated Supabase user's phone.
             */
            verifiedPhone: otpPhone.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to create vendor profile."
        );
      }

      setCreatedSlug(
        result.slug || uniqueSlug
      );

      setCurrentStep("complete");
    } catch (err: unknown) {
      console.error(
        "Vendor onboarding completion error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete onboarding."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Social sharing
   * ------------------------------------------------------------
   */
  const handleShare = async (platform: string) => {
    const finalSlug =
      createdSlug ||
      `${slugify(businessName.trim()) || "business"}`;

    const profileUrl =
      `https://dbmart.ng/vendors/${finalSlug}`;

    const caption =
      `I just listed my business on DBMartNG! ` +
      `Find me at ${profileUrl} — the best place to ` +
      `discover and connect with Nigerian businesses. 🚀`;

    switch (platform) {
      case "whatsapp-status":
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(
            caption
          )}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "tiktok":
        window.open(
          "https://www.tiktok.com/",
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "snapchat":
        window.open(
          "https://www.snapchat.com/",
          "_blank",
          "noopener,noreferrer"
        );
        break;

      default:
        break;
    }
  };

  const handleFinish = () => {
    router.push("/dashboard/vendor");
  };

  /*
   * ------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------
   */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-brand-navy font-semibold">
          Loading...
        </div>
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
            width: `${
              ((currentStepIndex + 1) /
                steps.length) *
              100
            }%`,
          }}
        />
      </div>
    </div>
  );

  const renderBackButton = (
    target: OnboardingStep
  ) => (
    <button
      type="button"
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

  const visibleCategories = categories.filter(
    (category) =>
      categoryType === "both" ||
      category.type === categoryType
  );

  return (
    <div className="min-h-screen bg-surface-secondary animate-fade-in">
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
        {currentStep !== "complete" &&
          renderProgressBar()}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
            {error}
          </div>
        )}

        {/* ================================================== */}
        {/* STEP 1: BUSINESS */}
        {/* ================================================== */}

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
                  onChange={(e) =>
                    setBusinessName(e.target.value)
                  }
                  placeholder="e.g. TechZone NG"
                  maxLength={150}
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
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Tell buyers what your business offers, what makes you unique, and why they should choose you..."
                  rows={4}
                  maxLength={500}
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

        {/* ================================================== */}
        {/* STEP 2: CATEGORY */}
        {/* ================================================== */}

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
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {categoryTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setCategoryType(
                        type.id as
                          | "goods"
                          | "service"
                          | "both"
                      );
                      setSelectedCategory("");
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      categoryType === type.id
                        ? "border-brand-gold bg-brand-gold/5"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {type.icon}
                    </div>

                    <div className="font-semibold text-sm text-brand-navy">
                      {type.label}
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>

              {categoryType && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select your specific category
                  </label>

                  {categoriesLoading ? (
                    <div className="rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                      Loading categories...
                    </div>
                  ) : visibleCategories.length === 0 ? (
                    <div className="rounded-xl border border-accent-error/20 bg-accent-error/5 p-6 text-center text-sm text-accent-error">
                      No active categories are currently available.
                      Please try again later.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-2">
                      {visibleCategories.map(
                        (category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() =>
                              setSelectedCategory(
                                category.id
                              )
                            }
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedCategory ===
                              category.id
                                ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                                : "border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <div className="font-medium text-sm text-brand-navy">
                              {category.name}
                            </div>

                            {category.description && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {
                                  category.description
                                }
                              </div>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={
                    !selectedCategory ||
                    categoriesLoading
                  }
                  onClick={handleSubmitCategory}
                >
                  Continue
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* STEP 3: CONTACT */}
        {/* ================================================== */}

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
                    onChange={(e) =>
                      setContactEmail(e.target.value)
                    }
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
                    onChange={(e) =>
                      setContactPhone(e.target.value)
                    }
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
                    onChange={(e) =>
                      setWhatsappNumber(e.target.value)
                    }
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
                    onChange={(e) =>
                      setWebsite(e.target.value)
                    }
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
                      onChange={(e) =>
                        setAddress(e.target.value)
                      }
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
                    onChange={(e) =>
                      setCity(e.target.value)
                    }
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
                  onChange={(e) =>
                    setState(e.target.value)
                  }
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

        {/* ================================================== */}
        {/* STEP 4: VERIFY */}
        {/* ================================================== */}

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
                      value={otpPhone}
                      onChange={(e) => {
                        setOtpPhone(
                          e.target.value
                        );
                        setOtpSent(false);
                        setOtpCode("");
                      }}
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
                          Enter the 6-digit code sent to{" "}
                          {otpPhone}
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  6
                                )
                            )
                          }
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
                        disabled={
                          otpCode.length !== 6
                        }
                      >
                        Verify Phone
                      </Button>

                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="w-full text-center text-sm text-brand-navy font-semibold hover:text-brand-gold disabled:opacity-50"
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
                    onClick={() =>
                      setCurrentStep("share")
                    }
                  >
                    Continue
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* STEP 5: SHARE */}
        {/* ================================================== */}

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
                  &ldquo;I just listed my business on DBMartNG!
                  Find me at{" "}
                  <span className="text-brand-gold font-semibold">
                    dbmart.ng/vendors/
                    {createdSlug ||
                      `${slugify(
                        businessName
                      ) || "your-business"}`}
                  </span>{" "}
                  — the best place to discover and connect with
                  Nigerian businesses. 🚀&rdquo;
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleShare("whatsapp")
                  }
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
                  type="button"
                  onClick={() =>
                    handleShare(
                      "whatsapp-status"
                    )
                  }
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
                  type="button"
                  onClick={() =>
                    handleShare("tiktok")
                  }
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                >
                  <span className="text-2xl">
                    🎵
                  </span>

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
                  type="button"
                  onClick={() =>
                    handleShare("snapchat")
                  }
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                >
                  <span className="text-2xl">
                    👻
                  </span>

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
                    checked={
                      shareAcknowledged
                    }
                    onChange={(e) =>
                      setShareAcknowledged(
                        e.target.checked
                      )
                    }
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />

                  <span className="text-sm text-gray-500">
                    I&apos;ve shared my business listing.
                    (This is optional — you can complete
                    onboarding without sharing.)
                  </span>
                </label>

                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={
                    handleCompleteOnboarding
                  }
                  loading={loading}
                >
                  Complete Onboarding
                  <Sparkles className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* STEP 6: COMPLETE */}
        {/* ================================================== */}

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
              Your profile is now under review. Once approved by our
              team, it will be visible to buyers across Nigeria.
              You&apos;ll receive a notification when it&apos;s live.
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
              <Button
                variant="gold"
                size="xl"
                onClick={handleFinish}
              >
                Go to Dashboard
              </Button>

              {createdSlug && (
                <Link
                  href={`/vendors/${createdSlug}`}
                >
                  <Button
                    variant="outline"
                    size="xl"
                  >
                    Preview Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}