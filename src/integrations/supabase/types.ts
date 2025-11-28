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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brothers_applications: {
        Row: {
          application_year: number
          created_at: string
          id: string
          metadata: Json | null
          next_eligible_date: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_year: number
          created_at?: string
          id?: string
          metadata?: Json | null
          next_eligible_date?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_year?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          next_eligible_date?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brothers_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brothers_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          payment_status: string
          registered_at: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          payment_status?: string
          registered_at?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          payment_status?: string
          registered_at?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_public: boolean
          location: string | null
          max_participants: number | null
          organizer_id: string
          price: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          organizer_id: string
          price?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          organizer_id?: string
          price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_plan_count: {
        Row: {
          count: number
          current_price: number
          id: string
          max_count: number
          next_price: number
          updated_at: string | null
        }
        Insert: {
          count?: number
          current_price?: number
          id?: string
          max_count?: number
          next_price?: number
          updated_at?: string | null
        }
        Update: {
          count?: number
          current_price?: number
          id?: string
          max_count?: number
          next_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      lifetime_plan_count: {
        Row: {
          count: number
          id: string
          updated_at: string
        }
        Insert: {
          count?: number
          id?: string
          updated_at?: string
        }
        Update: {
          count?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          name_ja: string
          name_pt: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          name_ja: string
          name_pt: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          name_ja?: string
          name_pt?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          referral_code_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          referral_code_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          referral_code_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          belt_history: Json | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          display_name: string | null
          education: Json | null
          email: string | null
          home_dojo: string | null
          id: string
          organization_id: string | null
          stripe_customer_id: string | null
          titles: Json | null
          training_locations: Json | null
          updated_at: string
          username: string | null
          work_experience: Json | null
        }
        Insert: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          education?: Json | null
          email?: string | null
          home_dojo?: string | null
          id: string
          organization_id?: string | null
          stripe_customer_id?: string | null
          titles?: Json | null
          training_locations?: Json | null
          updated_at?: string
          username?: string | null
          work_experience?: Json | null
        }
        Update: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          education?: Json | null
          email?: string | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          stripe_customer_id?: string | null
          titles?: Json | null
          training_locations?: Json | null
          updated_at?: string
          username?: string | null
          work_experience?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_type: string | null
          referral_code_id: string | null
          status: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type?: string | null
          referral_code_id?: string | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_type?: string | null
          referral_code_id?: string | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          description_ja: string | null
          description_pt: string | null
          display_order: number | null
          hashtags: string[] | null
          id: string
          name: string
          name_ja: string
          name_pt: string
          series_name: string | null
          series_order: number | null
          thumbnail_url: string | null
          thumbnail_url_ja: string | null
          thumbnail_url_pt: string | null
          updated_at: string | null
          video_url: string | null
          video_url_ja: string | null
          video_url_pt: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          display_order?: number | null
          hashtags?: string[] | null
          id?: string
          name: string
          name_ja: string
          name_pt: string
          series_name?: string | null
          series_order?: number | null
          thumbnail_url?: string | null
          thumbnail_url_ja?: string | null
          thumbnail_url_pt?: string | null
          updated_at?: string | null
          video_url?: string | null
          video_url_ja?: string | null
          video_url_pt?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          display_order?: number | null
          hashtags?: string[] | null
          id?: string
          name?: string
          name_ja?: string
          name_pt?: string
          series_name?: string | null
          series_order?: number | null
          thumbnail_url?: string | null
          thumbnail_url_ja?: string | null
          thumbnail_url_pt?: string | null
          updated_at?: string | null
          video_url?: string | null
          video_url_ja?: string | null
          video_url_pt?: string | null
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string | null
          id: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_lang: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_lang?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_nfts: {
        Row: {
          awarded_at: string
          id: string
          metadata: Json | null
          nft_type: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          id?: string
          metadata?: Json | null
          nft_type: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          id?: string
          metadata?: Json | null
          nft_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          id: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_type: string
          video_url: string
          view_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_type: string
          video_url: string
          view_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string
          view_count?: number
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_purchases: {
        Row: {
          amount: number
          buyer_id: string
          id: string
          purchased_at: string | null
          stripe_payment_id: string | null
          video_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          video_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          id?: string
          purchased_at?: string | null
          stripe_payment_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_purchases_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "user_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      video_tips: {
        Row: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          stripe_payment_id: string | null
          video_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          stripe_payment_id?: string | null
          video_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          stripe_payment_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      video_views: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          user_id: string
          video_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          user_id: string
          video_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          user_id?: string
          video_id?: string
          view_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_referral_points: {
        Args: {
          p_amount: number
          p_description: string
          p_referral_code_id: string
          p_referred_user_id: string
        }
        Returns: undefined
      }
      can_apply_for_brothers: { Args: { user_uuid: string }; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_brothers_application: {
        Args: { application_id: string; reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
      application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "renewal_pending"
        | "renewal_approved"
        | "renewal_rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "staff"],
      application_status: [
        "pending",
        "approved",
        "rejected",
        "renewal_pending",
        "renewal_approved",
        "renewal_rejected",
      ],
    },
  },
} as const
