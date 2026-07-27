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
import { ChevronLeft, Loader2, Save, User, Mail, Lock } from "lucide-react";

export default function BuyerSettingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      setLoading(true);
      const { data: rawProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const profile = rawProfile as any;
      if (profile) setFullName(profile.full_name || "");
      setLoading(false);
    };

    fetchUser();
  }, [user, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error: updateError } = await (supabase
        .from("users")
        .update({ full_name: fullName.trim() } as never)
        .eq("id", user.id) as never);

      if (updateError) throw updateError;

      toast.success("Account settings updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
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
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            <div className="flex items-center gap-3 mb-8">
              <Link href="/dashboard/buyer" className="text-gray-400 hover:text-brand-navy">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-brand-navy font-display">
                  Buyer Account Settings
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your personal details and account preferences
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chukwuma Eze"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email is tied to your login provider.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link href="/dashboard/buyer">
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="gold" size="lg" loading={saving}>
                  <Save className="h-5 w-5" /> Save Preferences
                </Button>
              </div>
            </form>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
