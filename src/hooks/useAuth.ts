"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  role: "buyer" | "vendor" | "admin" | "sub_admin" | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const supabase = supabaseRef.current;
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = (profile as { role: string | null } | null)?.role || null;

        setState({
          user: session.user,
          role: role as AuthState["role"],
          loading: false,
          isAdmin: role === "admin",
        });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = (profile as { role: string | null } | null)?.role || null;

        setState({
          user: session.user,
          role: role as AuthState["role"],
          loading: false,
          isAdmin: role === "admin",
        });
      } else {
        setState({ user: null, role: null, loading: false, isAdmin: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  }, []);

  const checkAdminAllowlist = useCallback(
    async (email: string): Promise<{ detected: boolean; claimed: boolean }> => {
      try {
        const response = await fetch("/api/auth/check-allowlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email }),
        });
        const data = await response.json();
        return {
          detected: data.detected,
          claimed: data.claimed,
        };
      } catch {
        return { detected: false, claimed: false };
      }
    },
    []
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userToRedirect = data?.user;
      if (userToRedirect) {
        // Fetch the user's actual role from the database
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", userToRedirect.id)
          .single();

        const role = (profile as { role: string | null } | null)?.role;

        if (role === "admin" || role === "sub_admin") {
          router.push("/dashboard/admin");
        } else if (role === "vendor") {
          router.push("/dashboard/vendor");
        } else if (role === "buyer") {
          router.push("/dashboard/buyer");
        } else {
          // Fallback: check admin allowlist for admin setup flow
          const { detected, claimed } = await checkAdminAllowlist(email);
          if (detected && claimed) {
            router.push("/dashboard/admin");
          } else {
            router.push("/");
          }
        }
      } else {
        // If no user returned but no error, redirect to home as fallback
        router.push("/");
      }

      router.refresh();
    },
    [router, checkAdminAllowlist]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, role: "buyer" | "vendor", referralCode?: string) => {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      });

      if (error) throw error;

      if (data.user) {
        const response = await fetch("/api/auth/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            role,
            fullName: data.user.user_metadata?.full_name || null,
            referralCode: referralCode || null,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create user");

        if (referralCode) {
          router.push(`/referral/welcome?ref=${referralCode}`);
        } else {
          router.push(role === "vendor" ? "/onboarding" : "/");
        }
      }
      return { isAdminSetup: false };
    },
    [router]
  );

  const signInWithPhone = useCallback(
    async (phone: string) => {
      const supabase = supabaseRef.current;
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      return true;
    },
    []
  );

  const verifyPhoneOTP = useCallback(
    async (phone: string, token: string, referralCode?: string) => {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) throw error;

      if (data.user) {
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!existingProfile) {
          await fetch("/api/auth/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              phone,
              role: "vendor",
              fullName: null,
              referralCode: referralCode || null,
            }),
          });
        }

        if (referralCode) {
          router.push(`/referral/welcome?ref=${referralCode}`);
        } else {
          router.push("/onboarding");
        }
      }
      return data.user;
    },
    [router]
  );

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  return {
    ...state,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithPhone,
    verifyPhoneOTP,
    signOut,
    checkAdminAllowlist,
  };
}