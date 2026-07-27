"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Store,
  ChevronLeft,
  Loader2,
  Save,
  MapPin,
  Phone,
  Globe,
  Clock,
  Image as ImageIcon,
} from "lucide-react";

export default function VendorSettingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || (role !== "vendor" && role !== "admin" && role !== "sub_admin"))) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);
      const { data: rawProfile } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const profile = rawProfile as any;
      if (profile) {
        setBusinessName(profile.business_name || "");
        setDescription(profile.description || "");
        setPhone(profile.phone || "");
        setWhatsappNumber(profile.whatsapp_number || "");
        setWebsite(profile.website || "");
        setAddress(profile.address || "");
        setCity(profile.city || "");
        setStateName(profile.state || "");
        setLogoUrl(profile.logo_url || "");
        setCoverImageUrl(profile.cover_image_url || "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!businessName.trim()) return toast.error("Business name is required");

    setSaving(true);
    try {
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const updateData = {
        business_name: businessName.trim(),
        description: description.trim(),
        phone: phone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        website: website.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        logo_url: logoUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await (supabase
        .from("vendor_profiles")
        .update(updateData as never)
        .eq("user_id", user.id) as never);

      if (updateError) throw updateError;

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            <div className="flex items-center gap-3 mb-8">
              <Link href="/dashboard/vendor" className="text-gray-400 hover:text-brand-navy">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-brand-navy font-display">
                  Business Profile Settings
                </h1>
                <p className="text-sm text-gray-500">
                  Update your public business info, contact numbers, and store branding
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  General Information
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Business Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>
              </div>

              {/* Branding */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Logo & Branding URLs
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Cover Banner Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Contact & Location
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2348012345678"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/dashboard/vendor">
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="gold" size="lg" loading={saving}>
                  <Save className="h-5 w-5" /> Save Changes
                </Button>
              </div>
            </form>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
