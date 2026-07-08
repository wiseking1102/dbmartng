"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Save,
  RefreshCw,
  ChevronLeft,
  Loader2,
  DollarSign,
  Mail,
  Shield,
  Sliders,
  CreditCard,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface SettingValue {
  amount?: number;
  limit?: number;
  mode?: string;
  count?: number;
  enabled?: boolean;
  email?: string;
}

interface PaystackKeys {
  public_key: string;
  secret_key: string;
  webhook_secret: string;
}

interface PlatformSetting {
  key: string;
  label: string;
  description: string;
  category: string;
  icon: LucideIcon;
  type: "number" | "boolean" | "email" | "select";
  options?: { label: string; value: string }[];
  valueKey: string;
}

const SETTING_DEFS: PlatformSetting[] = [
  {
    key: "pro_subscription_price",
    label: "Pro Subscription Price",
    description: "Monthly price for Pro tier subscription",
    category: "Pricing",
    icon: DollarSign,
    type: "number",
    valueKey: "amount",
  },
  {
    key: "free_tier_listing_limit",
    label: "Free Tier Listing Limit",
    description: "Maximum listings allowed on Free tier",
    category: "Pricing",
    icon: Sliders,
    type: "number",
    valueKey: "limit",
  },
  {
    key: "ad_base_price",
    label: "Ad Base Price",
    description: "Base price for vendor ad/sponsorship campaigns",
    category: "Pricing",
    icon: CreditCard,
    type: "number",
    valueKey: "amount",
  },
  {
    key: "sponsored_slots_mode",
    label: "Sponsored Slot Mode",
    description: "Whether sponsored slots are limited or unlimited",
    category: "Features",
    icon: Sliders,
    type: "select",
    options: [
      { label: "Limited", value: "limited" },
      { label: "Unlimited", value: "unlimited" },
    ],
    valueKey: "mode",
  },
  {
    key: "sponsored_slots_mode",
    label: "Sponsored Slots Count",
    description: "Number of sponsored slots when mode is limited",
    category: "Features",
    icon: Sliders,
    type: "number",
    valueKey: "count",
  },
  {
    key: "admin_2fa_required",
    label: "Admin 2FA Required",
    description: "Require OTP verification for admin logins",
    category: "Security",
    icon: Shield,
    type: "boolean",
    valueKey: "enabled",
  },
  {
    key: "transactional_from_email",
    label: "Transactional From Email",
    description: "Sender email for automated notifications",
    category: "Email",
    icon: Mail,
    type: "email",
    valueKey: "email",
  },
  {
    key: "support_email",
    label: "Support Email",
    description: "Public-facing support email address",
    category: "Email",
    icon: Mail,
    type: "email",
    valueKey: "email",
  },
];

export default function AdminSettingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, SettingValue>>({});
  const [paystackKeys, setPaystackKeys] = useState<PaystackKeys>({
    public_key: "",
    secret_key: "",
    webhook_secret: "",
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [paystackDirty, setPaystackDirty] = useState(false);
  const [paystackSaving, setPaystackSaving] = useState(false);
  const [paystackStatus, setPaystackStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
        // Load Paystack keys if they exist
        const psKeys = data.settings?.paystack_keys;
        if (psKeys && typeof psKeys === "object") {
          setPaystackKeys({
            public_key: (psKeys as PaystackKeys).public_key || "",
            secret_key: (psKeys as PaystackKeys).secret_key || "",
            webhook_secret: (psKeys as PaystackKeys).webhook_secret || "",
          });
          if ((psKeys as PaystackKeys).public_key) setPaystackStatus("valid");
        }
      } else {
        toast.error("Failed to load settings");
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === "admin") {
      fetchSettings();
    }
  }, [user, role]);

  const getValue = (key: string, valueKey: string): string | boolean | number => {
    const setting = settings[key];
    if (!setting) return "";
    const val = (setting as Record<string, unknown>)[valueKey];
    if (val === undefined || val === null) return "";
    return val as string | boolean | number;
  };

  const handleChange = (key: string, valueKey: string, newValue: string | boolean | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [valueKey]: newValue,
      },
    }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  };

  const handleSave = async (key: string) => {
    if (!user || !settings[key]) return;
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: settings[key],
          adminUserId: user.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${key}" updated`);
        setDirty((prev) => ({ ...prev, [key]: false }));
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save setting");
    } finally {
      setSaving(null);
    }
  };

  const handlePaystackKeysChange = (field: keyof PaystackKeys, value: string) => {
    setPaystackKeys((prev) => ({ ...prev, [field]: value }));
    setPaystackDirty(true);
    setPaystackStatus("idle");
  };

  const handleSavePaystackKeys = async () => {
    if (!user) return;
    setPaystackSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "paystack_keys",
          value: paystackKeys,
          adminUserId: user.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Paystack keys saved successfully");
        setPaystackDirty(false);
        setPaystackStatus(paystackKeys.public_key ? "valid" : "idle");
      } else {
        toast.error(data.error || "Failed to save Paystack keys");
      }
    } catch {
      toast.error("Failed to save Paystack keys");
    } finally {
      setPaystackSaving(false);
    }
  };

  const handleTestPaystackKeys = async () => {
    setPaystackStatus("testing");
    try {
      // Test the keys by calling the Paystack API
      const res = await fetch("/api/paystack/public-key");
      if (res.ok) {
        toast.success("Paystack configuration looks valid!");
        setPaystackStatus("valid");
      } else {
        toast.error("Paystack keys are not valid or configured");
        setPaystackStatus("invalid");
      }
    } catch {
      setPaystackStatus("invalid");
      toast.error("Could not verify Paystack keys");
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading admin panel...
          </div>
        </div>
      </>
    );
  }

  const categories = Array.from(new Set(SETTING_DEFS.map((d) => d.category)));

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/dashboard/admin"
                className="text-gray-400 hover:text-brand-navy transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Platform Settings
                </h1>
                <p className="text-sm text-gray-500">
                  Manage pricing, features, Paystack keys, email config, and security settings
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={fetchSettings}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* ═══ Paystack Keys Section ═══ */}
                <div>
                  <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
                    <Key className="h-5 w-5 text-brand-gold" />
                    Paystack Keys
                  </h2>
                  <div className={`glass rounded-2xl p-6 transition-all ${paystackDirty ? "border-l-4 border-brand-gold" : ""}`}>
                    <p className="text-sm text-gray-500 mb-5">
                      Enter your Paystack API keys here instead of environment variables.
                      Changes take effect immediately — no redeploy needed.
                      Get your keys from{" "}
                      <a
                        href="https://dashboard.paystack.com/#/settings/developer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-navy font-semibold hover:text-brand-gold underline"
                      >
                        Paystack Dashboard → Settings → API Keys & Webhooks
                      </a>
                    </p>

                    {/* Status indicator */}
                    {paystackStatus === "valid" && (
                      <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-accent-success/10 text-accent-success text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Paystack keys are configured
                      </div>
                    )}
                    {paystackStatus === "invalid" && (
                      <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-accent-error/10 text-accent-error text-sm font-medium">
                        <XCircle className="h-4 w-4" />
                        Paystack keys could not be verified
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Public Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Public Key
                        </label>
                        <input
                          type="text"
                          value={paystackKeys.public_key}
                          onChange={(e) => handlePaystackKeysChange("public_key", e.target.value)}
                          placeholder="pk_test_xxxxxxxxxxxx or pk_live_xxxxxxxxxxxx"
                          className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm font-mono"
                        />
                      </div>

                      {/* Secret Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Secret Key
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets ? "text" : "password"}
                            value={paystackKeys.secret_key}
                            onChange={(e) => handlePaystackKeysChange("secret_key", e.target.value)}
                            placeholder="sk_test_xxxxxxxxxxxx or sk_live_xxxxxxxxxxxx"
                            className="w-full h-10 px-3 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Webhook Secret */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Webhook Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets ? "text" : "password"}
                            value={paystackKeys.webhook_secret}
                            onChange={(e) => handlePaystackKeysChange("webhook_secret", e.target.value)}
                            placeholder="Your Paystack webhook signing secret"
                            className="w-full h-10 px-3 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
                      <Button
                        variant={paystackDirty ? "gold" : "outline"}
                        size="sm"
                        onClick={handleSavePaystackKeys}
                        disabled={paystackSaving || !paystackDirty}
                      >
                        {paystackSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Keys
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestPaystackKeys}
                        disabled={paystackSaving || !paystackKeys.public_key}
                      >
                        {paystackStatus === "testing" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSecrets(!showSecrets)}
                      >
                        {showSecrets ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {showSecrets ? "Hide Secrets" : "Show Secrets"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ═══ Platform Settings Sections ═══ */}
                {categories.map((category) => (
                  <div key={category}>
                    <h2 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
                      {category === "Pricing" && <DollarSign className="h-5 w-5 text-brand-gold" />}
                      {category === "Features" && <Sliders className="h-5 w-5 text-brand-gold" />}
                      {category === "Security" && <Shield className="h-5 w-5 text-brand-gold" />}
                      {category === "Email" && <Mail className="h-5 w-5 text-brand-gold" />}
                      {category}
                    </h2>
                    <div className="space-y-4">
                      {SETTING_DEFS.filter((d) => d.category === category).map((def) => {
                        const currentVal = getValue(def.key, def.valueKey);
                        const isDirty = dirty[def.key];

                        return (
                          <div
                            key={def.key}
                            className={`glass rounded-2xl p-6 transition-all ${
                              isDirty ? "border-l-4 border-brand-gold" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <def.icon className="h-4 w-4 text-brand-gold" />
                                  <h3 className="font-semibold text-brand-navy">
                                    {def.label}
                                  </h3>
                                  {isDirty && (
                                    <span className="text-xs text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full">
                                      Unsaved
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mb-3">
                                  {def.description}
                                </p>

                                {def.type === "boolean" ? (
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentVal === true}
                                      onChange={(e) =>
                                        handleChange(def.key, def.valueKey, e.target.checked)
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-gold rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold" />
                                    <span className="ml-3 text-sm text-gray-600">
                                      {currentVal ? "Enabled" : "Disabled"}
                                    </span>
                                  </label>
                                ) : def.type === "select" ? (
                                  <select
                                    value={currentVal as string}
                                    onChange={(e) =>
                                      handleChange(def.key, def.valueKey, e.target.value)
                                    }
                                    className="w-full max-w-xs h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                                  >
                                    {def.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : def.type === "email" ? (
                                  <input
                                    type="email"
                                    value={currentVal as string}
                                    onChange={(e) =>
                                      handleChange(def.key, def.valueKey, e.target.value)
                                    }
                                    className="w-full max-w-sm h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {def.key.includes("price") && (
                                      <span className="text-sm font-semibold text-gray-500">
                                        ₦
                                      </span>
                                    )}
                                    <input
                                      type="number"
                                      value={(currentVal as number) || ""}
                                      onChange={(e) =>
                                        handleChange(
                                          def.key,
                                          def.valueKey,
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="w-32 h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                                      min={0}
                                    />
                                  </div>
                                )}
                              </div>

                              <Button
                                variant={isDirty ? "gold" : "outline"}
                                size="sm"
                                onClick={() => handleSave(def.key)}
                                disabled={saving === def.key || !isDirty}
                                className="shrink-0"
                              >
                                {saving === def.key ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
