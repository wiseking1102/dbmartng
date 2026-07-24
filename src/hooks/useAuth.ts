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

interface SignUpResult {
  isAdminSetup: boolean;
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
        setState({
          user: null,
          role: null,
          loading: false,
          isAdmin: false,
        });
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
        return { detected: data.detected, claimed: data.claimed };
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Session not established after sign-in");
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const role = (profile as { role: string | null } | null)?.role;

      if (role === "admin" || role === "sub_admin") {
        router.push("/dashboard/admin");
      } else if (role === "vendor") {
        router.push("/dashboard/vendor");
      } else if (role === "buyer") {
        router.push("/dashboard/buyer");
      } else {
        router.push("/");
      }
    },
    [router]
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      role: string,
      referralCode?: string
    ): Promise<SignUpResult> => {
      const supabase = supabaseRef.current;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            referral_code: referralCode,
          },
        },
      });

      if (error) throw error;

      if (role === "admin" || role === "sub_admin") {
        return { isAdminSetup: true };
      }

      return { isAdminSetup: false };
    },
    []
  );

  const signInWithPhone = useCallback(async (phone: string) => {
    const supabase = supabaseRef.current;
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) throw error;
  }, []);

  const verifyPhoneOTP = useCallback(
    async (phone: string, token: string, referralCode?: string) => {
      const supabase = supabaseRef.current;
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (error) throw error;

      if (data.user && referralCode) {
        await supabase.auth.updateUser({
          data: { referral_code: referralCode },
        });
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user!.id)
        .single();

      const role = (profile as { role: string | null } | null)?.role;

      if (role === "admin" || role === "sub_admin") {
        router.push("/dashboard/admin");
      } else if (role === "vendor") {
        router.push("/dashboard/vendor");
      } else if (role === "buyer") {
        router.push("/dashboard/buyer");
      } else {
        router.push("/");
      }
    },
    [router]
  );

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signOut();
    router.push("/");
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
