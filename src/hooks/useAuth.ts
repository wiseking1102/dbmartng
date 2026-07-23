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

      // CRITICAL FIX: Wait for session to fully establish before redirecting.
      // This ensures cookies are set so middleware sees the session on the
      // next request and does NOT bounce the user back to /auth.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("Session not established after sign-in");
      }

      // Now fetch profile and redirect
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
      } else {
        router.push("/dashboard");
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
    signOut,
    checkAdminAllowlist,
  };
}
