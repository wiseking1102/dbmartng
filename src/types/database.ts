export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          role: "buyer" | "vendor" | "admin" | "sub_admin";
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          role: "buyer" | "vendor" | "admin" | "sub_admin";
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          phone?: string | null;
          role?: "buyer" | "vendor" | "admin" | "sub_admin";
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      vendor_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          category_id: string | null;
          email: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          website: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          is_verified: boolean;
          verified_badge_granted_at: string | null;
          is_vip: boolean;
          vip_invited_by: string | null;
          subscription_status: "trial" | "pro" | "free" | "payment_failed" | "suspended";
          trial_started_at: string;
          trial_ends_at: string;
          trial_decision_made: boolean;
          trial_decision: "pro" | "free" | null;
          average_response_time: number | null;
          store_hours: Json | null;
          complaint_count: number;
          social_links: Json | null;
          gallery_urls: string[];
          video_url: string | null;
          is_sponsored: boolean;
          sponsored_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          category_id?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          website?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_verified?: boolean;
          subscription_status?: "trial" | "pro" | "free" | "payment_failed" | "suspended";
          trial_started_at?: string;
          trial_ends_at?: string;
          store_hours?: Json | null;
          social_links?: Json | null;
          gallery_urls?: string[];
        };
        Update: {
          business_name?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          category_id?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          website?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          is_verified?: boolean;
          subscription_status?: "trial" | "pro" | "free" | "payment_failed" | "suspended";
          trial_decision_made?: boolean;
          trial_decision?: "pro" | "free" | null;
          average_response_time?: number | null;
          store_hours?: Json | null;
          complaint_count?: number;
          social_links?: Json | null;
          gallery_urls?: string[];
          video_url?: string | null;
          is_sponsored?: boolean;
          sponsored_until?: string | null;
        };
      };
      listings: {
        Row: {
          id: string;
          vendor_id: string;
          title: string;
          slug: string;
          description: string | null;
          price: number | null;
          price_period: string | null;
          category_id: string | null;
          image_urls: string[];
          status: "pending_review" | "approved" | "rejected" | "flagged";
          status_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          is_featured: boolean;
          featured_until: string | null;
          is_promoted: boolean;
          promoted_until: string | null;
          is_service: boolean;
          tags: string[];
          view_count: number;
          contact_click_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          title: string;
          slug: string;
          description?: string | null;
          price?: number | null;
          price_period?: string | null;
          category_id?: string | null;
          image_urls?: string[];
          status?: "pending_review" | "approved" | "rejected" | "flagged";
          is_service?: boolean;
          tags?: string[];
        };
        Update: {
          title?: string;
          description?: string | null;
          price?: number | null;
          price_period?: string | null;
          category_id?: string | null;
          image_urls?: string[];
          status?: "pending_review" | "approved" | "rejected" | "flagged";
          status_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          is_featured?: boolean;
          featured_until?: string | null;
          is_promoted?: boolean;
          promoted_until?: string | null;
          tags?: string[];
          view_count?: number;
          contact_click_count?: number;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: "goods" | "service";
          description: string | null;
          icon: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type: "goods" | "service";
          description?: string | null;
          icon?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          icon?: string | null;
          image_url?: string | null;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          vendor_id: string;
          subject: string | null;
          body: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          vendor_id: string;
          subject?: string | null;
          body: string;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };
      favorites: {
        Row: {
          id: string;
          buyer_id: string;
          vendor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          vendor_id: string;
        };
        Update: {};
      };
      subscriptions: {
        Row: {
          id: string;
          vendor_id: string;
          user_id: string;
          paystack_customer_code: string | null;
          paystack_subscription_code: string | null;
          paystack_plan_code: string | null;
          tier: "trial" | "pro" | "free";
          status: "active" | "cancelled" | "past_due" | "payment_failed";
          price_paid: number;
          currency: string;
          current_period_start: string;
          current_period_end: string;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          user_id: string;
          paystack_customer_code?: string | null;
          paystack_subscription_code?: string | null;
          paystack_plan_code?: string | null;
          tier: "trial" | "pro" | "free";
          status: "active" | "cancelled" | "past_due" | "payment_failed";
          price_paid: number;
          currency?: string;
          current_period_start: string;
          current_period_end: string;
        };
        Update: {
          paystack_customer_code?: string | null;
          paystack_subscription_code?: string | null;
          paystack_plan_code?: string | null;
          tier?: "trial" | "pro" | "free";
          status?: "active" | "cancelled" | "past_due" | "payment_failed";
          price_paid?: number;
          current_period_start?: string;
          current_period_end?: string;
          cancelled_at?: string | null;
        };
      };
      admin_allowlist: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: "email" | "phone";
          claimed: boolean;
          linked_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          identifier_type: "email" | "phone";
          claimed?: boolean;
          linked_user_id?: string | null;
        };
        Update: {
          claimed?: boolean;
          linked_user_id?: string | null;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_user_id: string;
          action: string;
          target_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          action: string;
          target_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          timestamp?: string;
        };
        Update: {};
      };
      sub_admins: {
        Row: {
          id: string;
          user_id: string;
          invited_by: string;
          status: "invited" | "active" | "revoked";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          invited_by: string;
          status?: "invited" | "active" | "revoked";
        };
        Update: {
          status?: "invited" | "active" | "revoked";
        };
      };
      sub_admin_permissions: {
        Row: {
          id: string;
          sub_admin_id: string;
          permission_key: string;
          granted: boolean;
        };
        Insert: {
          id?: string;
          sub_admin_id: string;
          permission_key: string;
          granted?: boolean;
        };
        Update: {
          granted?: boolean;
        };
      };
      job_applications: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          role_interest: string;
          pitch: string | null;
          status: "pending" | "reviewed" | "invited" | "rejected";
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          phone?: string | null;
          role_interest: string;
          pitch?: string | null;
          status?: "pending" | "reviewed" | "invited" | "rejected";
        };
        Update: {
          status?: "pending" | "reviewed" | "invited" | "rejected";
          reviewed_by?: string | null;
        };
      };
      ad_requests: {
        Row: {
          id: string;
          vendor_id: string;
          target_type: "listing" | "bundle" | "account";
          target_ids: string[];
          status: "pending" | "approved" | "rejected" | "expired";
          duration_days: number;
          price_paid: number;
          paystack_reference: string | null;
          approved_by: string | null;
          approved_at: string | null;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          target_type: "listing" | "bundle" | "account";
          target_ids: string[];
          status?: "pending" | "approved" | "rejected" | "expired";
          duration_days: number;
          price_paid?: number;
          paystack_reference?: string | null;
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "expired";
          paystack_reference?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
        };
      };
      company_ads: {
        Row: {
          id: string;
          title: string;
          banner_url: string | null;
          destination_url: string;
          created_by: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          banner_url?: string | null;
          destination_url: string;
          created_by: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          banner_url?: string | null;
          destination_url?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
        };
      };
      platform_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_by?: string | null;
        };
        Update: {
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      site_content: {
        Row: {
          id: string;
          key: string;
          value: string;
          previous_value: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          previous_value?: string | null;
          updated_by?: string | null;
        };
        Update: {
          value?: string;
          previous_value?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      provider_credentials: {
        Row: {
          id: string;
          service: string;
          key_name: string;
          key_value: string;
          previous_value: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          service: string;
          key_name: string;
          key_value: string;
          updated_by?: string | null;
        };
        Update: {
          key_value?: string;
          previous_value?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          payload: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          payload?: Json | null;
        };
        Update: {
          read_at?: string | null;
        };
      };
      system_alerts: {
        Row: {
          id: string;
          source: string;
          error_detail: string | null;
          severity: "info" | "warning" | "critical";
          resolved_at: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          error_detail?: string | null;
          severity: "info" | "warning" | "critical";
        };
        Update: {
          resolved_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          buyer_id: string;
          vendor_id: string;
          rating: number;
          body: string | null;
          vendor_reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          vendor_id: string;
          rating: number;
          body?: string | null;
        };
        Update: {
          vendor_reply?: string | null;
        };
      };
      vendor_complaints: {
        Row: {
          id: string;
          vendor_id: string;
          buyer_id: string;
          reason: string;
          status: "open" | "investigating" | "resolved" | "dismissed";
          resolved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          buyer_id: string;
          reason: string;
          status?: "open" | "investigating" | "resolved" | "dismissed";
        };
        Update: {
          status?: "open" | "investigating" | "resolved" | "dismissed";
          resolved_by?: string | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referrer_type: "buyer" | "vendor";
          referred_id: string | null;
          referred_email: string | null;
          code: string;
          status: "pending" | "converted" | "rewarded" | "expired";
          reward_granted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referrer_type: "buyer" | "vendor";
          referred_id?: string | null;
          referred_email?: string | null;
          code: string;
          status?: "pending" | "converted" | "rewarded" | "expired";
          reward_granted?: boolean;
        };
        Update: {
          referred_id?: string | null;
          status?: "pending" | "converted" | "rewarded" | "expired";
          reward_granted?: boolean;
        };
      };
      processed_webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
        };
        Update: {};
      };
      vip_invitations: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: "email" | "phone";
          invited_by: string;
          claimed: boolean;
          linked_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          identifier_type: "email" | "phone";
          invited_by: string;
          claimed?: boolean;
          linked_user_id?: string | null;
        };
        Update: {
          claimed?: boolean;
          linked_user_id?: string | null;
        };
      };
      social_activities: {
        Row: {
          id: string;
          activity_type: "purchase" | "review" | "signup" | "listing_added" | "vendor_joined" | "inquiry_sent" | "badge_earned";
          actor_name: string;
          actor_avatar: string | null;
          actor_role: "buyer" | "vendor" | null;
          target_name: string | null;
          target_type: "vendor" | "listing" | "review" | null;
          target_url: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_type: "purchase" | "review" | "signup" | "listing_added" | "vendor_joined" | "inquiry_sent" | "badge_earned";
          actor_name: string;
          actor_avatar?: string | null;
          actor_role?: "buyer" | "vendor" | null;
          target_name?: string | null;
          target_type?: "vendor" | "listing" | "review" | null;
          target_url?: string | null;
          metadata?: Json;
        };
        Update: {};
      };
      saved_searches: {
        Row: {
          id: string;
          buyer_id: string;
          query: string;
          filters: Json | null;
          notify_on_match: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          query: string;
          filters?: Json | null;
          notify_on_match?: boolean;
        };
        Update: {
          query?: string;
          filters?: Json | null;
          notify_on_match?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
