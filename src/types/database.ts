export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ad_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          duration_days: number
          ends_at: string | null
          id: string
          paystack_reference: string | null
          price_paid: number
          starts_at: string | null
          status: string
          target_ids: string[]
          target_type: string
          vendor_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_days: number
          ends_at?: string | null
          id?: string
          paystack_reference?: string | null
          price_paid?: number
          starts_at?: string | null
          status?: string
          target_ids?: string[]
          target_type: string
          vendor_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_days?: number
          ends_at?: string | null
          id?: string
          paystack_reference?: string | null
          price_paid?: number
          starts_at?: string | null
          status?: string
          target_ids?: string[]
          target_type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_allowlist: {
        Row: {
          claimed: boolean | null
          claimed_by: string | null
          created_at: string | null
          id: string
          identifier: string
          identifier_type: string | null
          linked_user_id: string | null
        }
        Insert: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          identifier_type?: string | null
          linked_user_id?: string | null
        }
        Update: {
          claimed?: boolean | null
          claimed_by?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string | null
          linked_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_allowlist_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_allowlist_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          timestamp: string
        }
        Insert: {
          action: string
          admin_user_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      company_ads: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string
          destination_url: string
          ends_at: string
          id: string
          is_active: boolean
          starts_at: string
          title: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by: string
          destination_url: string
          ends_at: string
          id?: string
          is_active?: boolean
          starts_at: string
          title: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string
          destination_url?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          vendor_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          vendor_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          pitch: string | null
          reviewed_by: string | null
          role_interest: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          pitch?: string | null
          reviewed_by?: string | null
          role_interest: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          pitch?: string | null
          reviewed_by?: string | null
          role_interest?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category_id: string | null
          contact_click_count: number
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          image_urls: string[]
          is_featured: boolean
          is_promoted: boolean
          is_service: boolean
          price: number | null
          price_period: string | null
          promoted_until: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          status_reason: string | null
          tags: string[]
          title: string
          updated_at: string
          vendor_id: string
          view_count: number
        }
        Insert: {
          category_id?: string | null
          contact_click_count?: number
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean
          is_promoted?: boolean
          is_service?: boolean
          price?: number | null
          price_period?: string | null
          promoted_until?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          status_reason?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          vendor_id: string
          view_count?: number
        }
        Update: {
          category_id?: string | null
          contact_click_count?: number
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean
          is_promoted?: boolean
          is_service?: boolean
          price?: number | null
          price_period?: string | null
          promoted_until?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          status_reason?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          vendor_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payment_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          currency: string
          id: string
          method: string
          payment_reference: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount: number
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          payment_reference?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          payment_reference?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payment_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payment_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          receiver_id: string
          sender_id: string
          subject: string | null
          vendor_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          receiver_id: string
          sender_id: string
          subject?: string | null
          vendor_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      provider_credentials: {
        Row: {
          id: string
          key_name: string
          key_value: string
          previous_value: string | null
          service: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key_name: string
          key_value: string
          previous_value?: string | null
          service: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key_name?: string
          key_value?: string
          previous_value?: string | null
          service?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          rate_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          rate_key: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          rate_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_email: string | null
          referred_id: string | null
          referred_name: string | null
          referrer_id: string
          referrer_type: string
          reward_granted: boolean
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_name?: string | null
          referrer_id: string
          referrer_type: string
          reward_granted?: boolean
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_name?: string | null
          referrer_id?: string
          referrer_type?: string
          reward_granted?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          buyer_id: string
          created_at: string
          id: string
          rating: number
          vendor_id: string
          vendor_reply: string | null
        }
        Insert: {
          body?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          rating: number
          vendor_id: string
          vendor_reply?: string | null
        }
        Update: {
          body?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          rating?: number
          vendor_id?: string
          vendor_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          buyer_id: string
          created_at: string
          filters: Json | null
          id: string
          notify_on_match: boolean
          query: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          filters?: Json | null
          id?: string
          notify_on_match?: boolean
          query: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          filters?: Json | null
          id?: string
          notify_on_match?: boolean
          query?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          id: string
          key: string
          previous_value: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          previous_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          previous_value?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_activities: {
        Row: {
          activity_type: string
          actor_avatar: string | null
          actor_name: string
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_name: string | null
          target_type: string | null
          target_url: string | null
        }
        Insert: {
          activity_type: string
          actor_avatar?: string | null
          actor_name: string
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_name?: string | null
          target_type?: string | null
          target_url?: string | null
        }
        Update: {
          activity_type?: string
          actor_avatar?: string | null
          actor_name?: string
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_name?: string | null
          target_type?: string | null
          target_url?: string | null
        }
        Relationships: []
      }
      sub_admin_permissions: {
        Row: {
          granted: boolean
          id: string
          permission_key: string
          sub_admin_id: string
        }
        Insert: {
          granted?: boolean
          id?: string
          permission_key: string
          sub_admin_id: string
        }
        Update: {
          granted?: boolean
          id?: string
          permission_key?: string
          sub_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_admin_permissions_sub_admin_id_fkey"
            columns: ["sub_admin_id"]
            isOneToOne: false
            referencedRelation: "sub_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_admins: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          previous_role: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          previous_role?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          previous_role?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_admins_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paystack_customer_code: string | null
          paystack_plan_code: string | null
          paystack_subscription_code: string | null
          paystack_transaction_reference: string | null
          price_paid: number
          status: string
          tier: string
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_plan_code?: string | null
          paystack_subscription_code?: string | null
          paystack_transaction_reference?: string | null
          price_paid: number
          status?: string
          tier: string
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_plan_code?: string | null
          paystack_subscription_code?: string | null
          paystack_transaction_reference?: string | null
          price_paid?: number
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          error_detail: string | null
          id: string
          occurred_at: string
          resolved_at: string | null
          severity: string
          source: string
        }
        Insert: {
          error_detail?: string | null
          id?: string
          occurred_at?: string
          resolved_at?: string | null
          severity: string
          source: string
        }
        Update: {
          error_detail?: string | null
          id?: string
          occurred_at?: string
          resolved_at?: string | null
          severity?: string
          source?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_complaints: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          reason: string
          resolved_by: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          reason: string
          resolved_by?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          reason?: string
          resolved_by?: string | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_complaints_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_complaints_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          address: string | null
          average_response_time: number | null
          business_name: string
          category_id: string | null
          city: string | null
          complaint_count: number
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          gallery_urls: string[]
          id: string
          is_sponsored: boolean
          is_verified: boolean
          is_vip: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          phone: string | null
          slug: string
          social_links: Json | null
          sponsored_until: string | null
          state: string | null
          store_hours: Json | null
          subscription_status: string
          trial_decision: string | null
          trial_decision_made: boolean
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
          verified_badge_granted_at: string | null
          video_url: string | null
          vip_invited_by: string | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          average_response_time?: number | null
          business_name: string
          category_id?: string | null
          city?: string | null
          complaint_count?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          gallery_urls?: string[]
          id?: string
          is_sponsored?: boolean
          is_verified?: boolean
          is_vip?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          phone?: string | null
          slug: string
          social_links?: Json | null
          sponsored_until?: string | null
          state?: string | null
          store_hours?: Json | null
          subscription_status?: string
          trial_decision?: string | null
          trial_decision_made?: boolean
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
          verified_badge_granted_at?: string | null
          video_url?: string | null
          vip_invited_by?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          average_response_time?: number | null
          business_name?: string
          category_id?: string | null
          city?: string | null
          complaint_count?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          gallery_urls?: string[]
          id?: string
          is_sponsored?: boolean
          is_verified?: boolean
          is_vip?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          phone?: string | null
          slug?: string
          social_links?: Json | null
          sponsored_until?: string | null
          state?: string | null
          store_hours?: Json | null
          subscription_status?: string
          trial_decision?: string | null
          trial_decision_made?: boolean
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
          verified_badge_granted_at?: string | null
          video_url?: string | null
          vip_invited_by?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_vip_invited_by_fkey"
            columns: ["vip_invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_invitations: {
        Row: {
          claimed: boolean
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          invited_by: string
          linked_user_id: string | null
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          id?: string
          identifier: string
          identifier_type: string
          invited_by: string
          linked_user_id?: string | null
        }
        Update: {
          claimed?: boolean
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          invited_by?: string
          linked_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_invitations_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_verified_paystack_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_customer_code?: string
          p_period_end?: string
          p_period_start?: string
          p_plan_code?: string
          p_reference: string
          p_subscription_code?: string
          p_user_id: string
          p_vendor_id: string
        }
        Returns: Json
      }
      approve_manual_payment: {
        Args: {
          p_admin_id: string
          p_admin_note?: string
          p_request_id: string
        }
        Returns: Json
      }
      consume_rate_limit: {
        Args: { p_limit: number; p_rate_key: string; p_window_seconds: number }
        Returns: boolean
      }
      record_listing_contact_click: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      record_listing_view: { Args: { p_listing_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
