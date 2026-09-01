"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserRole = "buyer" | "vendor" | "admin" | "sub_admin";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
}

interface SignUpResult {
  isAdminSetup: boolean;
}

const ROLE_ROUTES: Record<UserRole, string> = {
  buyer: "/dashboard/buyer",
  vendor: "/dashboard/vendor",
  admin: "/dashboard/admin",
  sub_admin: "/dashboard/admin",
};

function isValidRole(role: unknown): role is UserRole {
  return (
    role === "buyer" ||
    role === "vendor" ||
    role === "admin" ||
    role === "sub_admin"
  );
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

  /*
   * Resolve the application role from public.users.
   *
   * The authenticated Supabase user ID is the only identifier
   * used to retrieve the role.
   */
  const resolveRole = useCallback(
    async (user: User): Promise<UserRole | null> => {
      const supabase = supabaseRef.current;

      /*
       * Profile creation and auth-session establishment can happen
       * very close together after signup.
       *
       * Retry a few times instead of immediately treating a temporary
       * missing profile as an unknown role.
       */
      const delays = [0, 300, 700, 1200];

      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, delays[attempt])
          );
        }

        const { data: profile, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && isValidRole(profile?.role)) {
          return profile.role;
        }
      }

      return null;
    },
    []
  );

  /*
   * Update local authentication state from a Supabase user.
   */
  const loadUserState = useCallback(
    async (user: User | null) => {
      if (!user) {
        setState({
          user: null,
          role: null,
          loading: false,
          isAdmin: false,
        });

        return null;
      }

      setState((previous) => ({
        ...previous,
        user,
        loading: true,
      }));

      const role = await resolveRole(user);

      setState({
        user,
        role,
        loading: false,
        isAdmin: role === "admin" || role === "sub_admin",
      });

      return role;
    },
    [resolveRole]
  );

  /*
   * Initial authentication state.
   */
  useEffect(() => {
    const supabase = supabaseRef.current;

    let mounted = true;

    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      await loadUserState(user);

      if (!mounted) return;
    };

    initialize();

    /*
     * Keep authentication state synchronized with Supabase.
     *
     * We intentionally schedule profile resolution outside the
     * auth-state callback so database work does not block the
     * Supabase auth event processing.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        if (!mounted) return;

        await loadUserState(session?.user ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserState]);

  /*
   * Navigate to the correct dashboard for a role.
   */
  const redirectByRole = useCallback(
    (role: UserRole | null) => {
      if (!role) {
        router.replace("/account");
        return;
      }

      router.replace(ROLE_ROUTES[role]);
    },
    [router]
  );

  /*
   * Google authentication.
   */
  const signInWithGoogle = useCallback(async () => {
    const supabase = supabaseRef.current;

    const type =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("type") ||
          "buyer"
        : "buyer";

    const redirectTo =
      `${window.location.origin}/api/auth/callback?type=${encodeURIComponent(
        type
      )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;
  }, []);

  /*
   * Check whether an email belongs to the admin allowlist.
   */
  const checkAdminAllowlist = useCallback(
    async (
      email: string
    ): Promise<{ detected: boolean; claimed: boolean }> => {
      try {
        const response = await fetch("/api/auth/check-allowlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: email,
          }),
        });

        const data = await response.json();

        return {
          detected: Boolean(data.detected),
          claimed: Boolean(data.claimed),
        };
      } catch {
        return {
          detected: false,
          claimed: false,
        };
      }
    },
    []
  );

  /*
   * Email/password sign-in.
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const supabase = supabaseRef.current;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      /*
       * Ask Supabase for the authoritative authenticated user.
       */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Session not established after sign-in");
      }

      /*
       * Resolve the role with retries.
       */
      const role = await resolveRole(user);

      /*
       * Update state before navigating.
       */
      setState({
        user,
        role,
        loading: false,
        isAdmin: role === "admin" || role === "sub_admin",
      });

      /*
       * Never send a user with an unknown role to the home page.
       * Send them to account so the application can recover/display
       * the appropriate state.
       */
      redirectByRole(role);
    },
    [redirectByRole, resolveRole]
  );

  /*
   * Email/password signup.
   */
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      role: string,
      referralCode?: string
    ): Promise<SignUpResult> => {
      const supabase = supabaseRef.current;

      /*
       * Only buyer/vendor signup is allowed through the normal
       * public signup endpoint.
       */
      if (role !== "buyer" && role !== "vendor") {
        if (role === "admin" || role === "sub_admin") {
          return {
            isAdminSetup: true,
          };
        }

        throw new Error("Invalid account type");
      }

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

      if (!data.user) {
        throw new Error("Account creation did not return a user");
      }

      /*
       * Create the corresponding public.users profile.
       */
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: data.user.email,
          role,
          fullName:
            data.user.user_metadata?.full_name || null,
          referralCode: referralCode || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to create user profile"
        );
      }

      /*
       * Preserve the existing referral flow.
       */
      if (referralCode) {
        router.push(
          `/referral/welcome?ref=${encodeURIComponent(referralCode)}`
        );
        return {
          isAdminSetup: false,
        };
      }

      /*
       * Vendor onboarding remains separate from the vendor dashboard.
       * Buyers go directly to their dashboard.
       */
      if (role === "vendor") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard/buyer");
      }

      return {
        isAdminSetup: false,
      };
    },
    [router]
  );

  /*
   * Phone OTP sign-in.
   */
  const signInWithPhone = useCallback(async (phone: string) => {
    const supabase = supabaseRef.current;

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw error;
  }, []);

  /*
   * Verify phone OTP and route using the actual application role.
   */
  const verifyPhoneOTP = useCallback(
    async (
      phone: string,
      token: string,
      referralCode?: string
    ) => {
      const supabase = supabaseRef.current;

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("OTP verification did not return a user");
      }

      if (referralCode) {
        await supabase.auth.updateUser({
          data: {
            referral_code: referralCode,
          },
        });
      }

      const role = await resolveRole(data.user);

      setState({
        user: data.user,
        role,
        loading: false,
        isAdmin: role === "admin" || role === "sub_admin",
      });

      redirectByRole(role);
    },
    [redirectByRole, resolveRole]
  );

  /*
   * Sign out.
   */
  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;

    await supabase.auth.signOut();

    setState({
      user: null,
      role: null,
      loading: false,
      isAdmin: false,
    });

    router.replace("/");
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