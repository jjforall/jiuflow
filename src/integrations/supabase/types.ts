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
      admin_audit_log: {
        Row: {
          accessed_at: string
          action: string
          admin_user_id: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          action: string
          admin_user_id: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          action?: string
          admin_user_id?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
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
            foreignKeyName: "brothers_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brothers_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brothers_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrities: {
        Row: {
          avatar_url: string | null
          belt_history: Json | null
          bio: string | null
          bio_ar: string | null
          bio_de: string | null
          bio_en: string | null
          bio_es: string | null
          bio_fr: string | null
          bio_hi: string | null
          bio_it: string | null
          bio_ja: string | null
          bio_ko: string | null
          bio_pt: string | null
          bio_ru: string | null
          bio_zh: string | null
          created_at: string | null
          display_name: string
          featured: boolean | null
          home_dojo: string | null
          id: string
          organization_id: string | null
          slug: string | null
          social_links: Json | null
          sort_order: number | null
          stats: Json | null
          titles: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          bio_ar?: string | null
          bio_de?: string | null
          bio_en?: string | null
          bio_es?: string | null
          bio_fr?: string | null
          bio_hi?: string | null
          bio_it?: string | null
          bio_ja?: string | null
          bio_ko?: string | null
          bio_pt?: string | null
          bio_ru?: string | null
          bio_zh?: string | null
          created_at?: string | null
          display_name: string
          featured?: boolean | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          slug?: string | null
          social_links?: Json | null
          sort_order?: number | null
          stats?: Json | null
          titles?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          bio_ar?: string | null
          bio_de?: string | null
          bio_en?: string | null
          bio_es?: string | null
          bio_fr?: string | null
          bio_hi?: string | null
          bio_it?: string | null
          bio_ja?: string | null
          bio_ko?: string | null
          bio_pt?: string | null
          bio_ru?: string | null
          bio_zh?: string | null
          created_at?: string | null
          display_name?: string
          featured?: boolean | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          slug?: string | null
          social_links?: Json | null
          sort_order?: number | null
          stats?: Json | null
          titles?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_applications: {
        Row: {
          belt_history: Json | null
          bio: string | null
          created_at: string
          display_name: string
          email: string | null
          home_dojo: string | null
          id: string
          organization_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          titles: Json | null
          updated_at: string
          username: string | null
        }
        Insert: {
          belt_history?: Json | null
          bio?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          titles?: Json | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          belt_history?: Json | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          titles?: Json | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_edit_requests: {
        Row: {
          avatar_url: string | null
          belt_history: Json | null
          bio: string | null
          celebrity_id: string
          created_at: string
          display_name: string | null
          home_dojo: string | null
          id: string
          organization_id: string | null
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_links: Json | null
          status: string
          titles: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          celebrity_id: string
          created_at?: string
          display_name?: string | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          titles?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          celebrity_id?: string
          created_at?: string
          display_name?: string | null
          home_dojo?: string | null
          id?: string
          organization_id?: string | null
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          titles?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_edit_requests_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_edit_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_edit_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_edit_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_follows: {
        Row: {
          celebrity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          celebrity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          celebrity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_follows_celebrity_id_fkey"
            columns: ["celebrity_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
        ]
      }
      celebrity_lineage: {
        Row: {
          belt_level: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          instructor_id: string
          notes: string | null
          started_at: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          belt_level?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          instructor_id: string
          notes?: string | null
          started_at?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          belt_level?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          instructor_id?: string
          notes?: string | null
          started_at?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrity_lineage_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrity_lineage_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "celebrities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          author_email: string | null
          content: string
          content_ja: string | null
          content_pt: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          title_ja: string | null
          title_pt: string | null
          updated_at: string | null
        }
        Insert: {
          author_email?: string | null
          content: string
          content_ja?: string | null
          content_pt?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          title_ja?: string | null
          title_pt?: string | null
          updated_at?: string | null
        }
        Update: {
          author_email?: string | null
          content?: string
          content_ja?: string | null
          content_pt?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          title_ja?: string | null
          title_pt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      community_categories: {
        Row: {
          created_at: string
          description: string | null
          description_ja: string | null
          description_pt: string | null
          icon: string | null
          id: string
          name: string
          name_ja: string
          name_pt: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          icon?: string | null
          id?: string
          name: string
          name_ja: string
          name_pt: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          icon?: string | null
          id?: string
          name?: string
          name_ja?: string
          name_pt?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_id: string
          content: string
          content_ar: string | null
          content_de: string | null
          content_en: string | null
          content_es: string | null
          content_fr: string | null
          content_hi: string | null
          content_it: string | null
          content_ja: string | null
          content_ko: string | null
          content_pt: string | null
          content_ru: string | null
          content_zh: string | null
          created_at: string
          id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_fr?: string | null
          content_hi?: string | null
          content_it?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_zh?: string | null
          created_at?: string
          id?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_fr?: string | null
          content_hi?: string | null
          content_it?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_zh?: string | null
          created_at?: string
          id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_ranks: {
        Row: {
          created_at: string
          id: string
          likes_received: number
          post_count: number
          rank_level: string
          thread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          likes_received?: number
          post_count?: number
          rank_level?: string
          thread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          likes_received?: number
          post_count?: number
          rank_level?: string
          thread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      community_threads: {
        Row: {
          author_id: string
          category_id: string
          content: string
          content_ar: string | null
          content_de: string | null
          content_en: string | null
          content_es: string | null
          content_fr: string | null
          content_hi: string | null
          content_it: string | null
          content_ja: string | null
          content_ko: string | null
          content_pt: string | null
          content_ru: string | null
          content_zh: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          title: string
          title_ar: string | null
          title_de: string | null
          title_en: string | null
          title_es: string | null
          title_fr: string | null
          title_hi: string | null
          title_it: string | null
          title_ja: string | null
          title_ko: string | null
          title_pt: string | null
          title_ru: string | null
          title_zh: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_fr?: string | null
          content_hi?: string | null
          content_it?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_zh?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          title: string
          title_ar?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_fr?: string | null
          title_hi?: string | null
          title_it?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_zh?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_fr?: string | null
          content_hi?: string | null
          content_it?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_zh?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          title?: string
          title_ar?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_fr?: string | null
          title_hi?: string | null
          title_it?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_zh?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "community_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      dojos: {
        Row: {
          access_info: string | null
          access_info_ja: string | null
          access_info_pt: string | null
          blog_url: string | null
          classes: Json | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ja: string | null
          description_pt: string | null
          email: string | null
          facebook: string | null
          facilities: Json | null
          faq: Json | null
          features: Json | null
          gallery: Json | null
          id: string
          instagram: string | null
          instructors: Json | null
          is_verified: boolean | null
          line: string | null
          location: string | null
          logo_url: string | null
          media_coverage: Json | null
          mission: string | null
          mission_ja: string | null
          mission_pt: string | null
          name: string
          name_ja: string
          name_pt: string
          news: Json | null
          online_resources: string | null
          online_resources_ja: string | null
          online_resources_pt: string | null
          opening_hours: Json | null
          perks: Json | null
          phone: string | null
          pricing: Json | null
          rules: string | null
          rules_ja: string | null
          rules_pt: string | null
          safety_measures: string | null
          safety_measures_ja: string | null
          safety_measures_pt: string | null
          schedule: Json | null
          slug: string | null
          target_audience: string | null
          target_audience_ja: string | null
          target_audience_pt: string | null
          testimonials: Json | null
          trial_info: Json | null
          twitter: string | null
          updated_at: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          access_info?: string | null
          access_info_ja?: string | null
          access_info_pt?: string | null
          blog_url?: string | null
          classes?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          email?: string | null
          facebook?: string | null
          facilities?: Json | null
          faq?: Json | null
          features?: Json | null
          gallery?: Json | null
          id?: string
          instagram?: string | null
          instructors?: Json | null
          is_verified?: boolean | null
          line?: string | null
          location?: string | null
          logo_url?: string | null
          media_coverage?: Json | null
          mission?: string | null
          mission_ja?: string | null
          mission_pt?: string | null
          name: string
          name_ja: string
          name_pt: string
          news?: Json | null
          online_resources?: string | null
          online_resources_ja?: string | null
          online_resources_pt?: string | null
          opening_hours?: Json | null
          perks?: Json | null
          phone?: string | null
          pricing?: Json | null
          rules?: string | null
          rules_ja?: string | null
          rules_pt?: string | null
          safety_measures?: string | null
          safety_measures_ja?: string | null
          safety_measures_pt?: string | null
          schedule?: Json | null
          slug?: string | null
          target_audience?: string | null
          target_audience_ja?: string | null
          target_audience_pt?: string | null
          testimonials?: Json | null
          trial_info?: Json | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          access_info?: string | null
          access_info_ja?: string | null
          access_info_pt?: string | null
          blog_url?: string | null
          classes?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          email?: string | null
          facebook?: string | null
          facilities?: Json | null
          faq?: Json | null
          features?: Json | null
          gallery?: Json | null
          id?: string
          instagram?: string | null
          instructors?: Json | null
          is_verified?: boolean | null
          line?: string | null
          location?: string | null
          logo_url?: string | null
          media_coverage?: Json | null
          mission?: string | null
          mission_ja?: string | null
          mission_pt?: string | null
          name?: string
          name_ja?: string
          name_pt?: string
          news?: Json | null
          online_resources?: string | null
          online_resources_ja?: string | null
          online_resources_pt?: string | null
          opening_hours?: Json | null
          perks?: Json | null
          phone?: string | null
          pricing?: Json | null
          rules?: string | null
          rules_ja?: string | null
          rules_pt?: string | null
          safety_measures?: string | null
          safety_measures_ja?: string | null
          safety_measures_pt?: string | null
          schedule?: Json | null
          slug?: string | null
          target_audience?: string | null
          target_audience_ja?: string | null
          target_audience_pt?: string | null
          testimonials?: Json | null
          trial_info?: Json | null
          twitter?: string | null
          updated_at?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
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
      favorite_dojos: {
        Row: {
          created_at: string
          dojo_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dojo_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dojo_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_dojos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_dojos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "public_dojos"
            referencedColumns: ["id"]
          },
        ]
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
      music_tracks: {
        Row: {
          artist: string | null
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
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
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_records: {
        Row: {
          created_at: string
          difficulty_rating: number | null
          duration_minutes: number | null
          id: string
          notes: string | null
          practice_date: string
          proficiency_level: number | null
          repetition_count: number | null
          success_rating: number | null
          technique_id: string | null
          updated_at: string
          user_id: string
          user_video_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          practice_date?: string
          proficiency_level?: number | null
          repetition_count?: number | null
          success_rating?: number | null
          technique_id?: string | null
          updated_at?: string
          user_id: string
          user_video_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty_rating?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          practice_date?: string
          proficiency_level?: number | null
          repetition_count?: number | null
          success_rating?: number | null
          technique_id?: string | null
          updated_at?: string
          user_id?: string
          user_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_records_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_records_user_video_id_fkey"
            columns: ["user_video_id"]
            isOneToOne: false
            referencedRelation: "user_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      printful_orders: {
        Row: {
          cart_items: Json
          created_at: string
          customer_email: string | null
          error_message: string | null
          id: string
          printful_order_id: string | null
          shipping_address: Json | null
          shipping_name: string | null
          status: string
          stripe_session_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          cart_items: Json
          created_at?: string
          customer_email?: string | null
          error_message?: string | null
          id?: string
          printful_order_id?: string | null
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          stripe_session_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          cart_items?: Json
          created_at?: string
          customer_email?: string | null
          error_message?: string | null
          id?: string
          printful_order_id?: string | null
          shipping_address?: Json | null
          shipping_name?: string | null
          status?: string
          stripe_session_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          belt_history: Json | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          education: Json | null
          email: string | null
          favorite_fighters: Json | null
          favorite_techniques: Json | null
          hobbies: Json | null
          home_dojo: string | null
          hometown: string | null
          id: string
          is_public: boolean
          marital_status: string | null
          organization_id: string | null
          social_links: Json | null
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
          date_of_birth?: string | null
          display_name?: string | null
          education?: Json | null
          email?: string | null
          favorite_fighters?: Json | null
          favorite_techniques?: Json | null
          hobbies?: Json | null
          home_dojo?: string | null
          hometown?: string | null
          id: string
          is_public?: boolean
          marital_status?: string | null
          organization_id?: string | null
          social_links?: Json | null
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
          date_of_birth?: string | null
          display_name?: string | null
          education?: Json | null
          email?: string | null
          favorite_fighters?: Json | null
          favorite_techniques?: Json | null
          hobbies?: Json | null
          home_dojo?: string | null
          hometown?: string | null
          id?: string
          is_public?: boolean
          marital_status?: string | null
          organization_id?: string | null
          social_links?: Json | null
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
          dojo_friends_code: string | null
          dojo_friends_uses: number
          id: string
          updated_at: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          dojo_friends_code?: string | null
          dojo_friends_uses?: number
          id?: string
          updated_at?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          dojo_friends_code?: string | null
          dojo_friends_uses?: number
          id?: string
          updated_at?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
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
          trial_end: string | null
          trial_start: string | null
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
          trial_end?: string | null
          trial_start?: string | null
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
          trial_end?: string | null
          trial_start?: string | null
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
          is_sample: boolean
          name: string
          name_ja: string
          name_pt: string
          series_name: string | null
          series_order: number | null
          series_prefix: string | null
          thumbnail_url: string | null
          thumbnail_url_ja: string | null
          thumbnail_url_pt: string | null
          updated_at: string | null
          video_metadata: Json | null
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
          is_sample?: boolean
          name: string
          name_ja: string
          name_pt: string
          series_name?: string | null
          series_order?: number | null
          series_prefix?: string | null
          thumbnail_url?: string | null
          thumbnail_url_ja?: string | null
          thumbnail_url_pt?: string | null
          updated_at?: string | null
          video_metadata?: Json | null
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
          is_sample?: boolean
          name?: string
          name_ja?: string
          name_pt?: string
          series_name?: string | null
          series_order?: number | null
          series_prefix?: string | null
          thumbnail_url?: string | null
          thumbnail_url_ja?: string | null
          thumbnail_url_pt?: string | null
          updated_at?: string | null
          video_metadata?: Json | null
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
      user_dojos: {
        Row: {
          created_at: string
          dojo_id: string
          id: string
          joined_at: string | null
          relationship_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dojo_id: string
          id?: string
          joined_at?: string | null
          relationship_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dojo_id?: string
          id?: string
          joined_at?: string | null
          relationship_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dojos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dojos_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "public_dojos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dojos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dojos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "user_nfts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          share_token: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_type: string
          video_url: string
          view_count: number
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          price?: number | null
          share_token?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_type: string
          video_url: string
          view_count?: number
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          price?: number | null
          share_token?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string
          view_count?: number
          visibility?: string
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
            foreignKeyName: "video_purchases_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      weekly_topics: {
        Row: {
          created_at: string
          description: string | null
          description_ja: string | null
          description_pt: string | null
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
          title_ja: string
          title_pt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
          title_ja: string
          title_pt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          title_ja?: string
          title_pt?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_dojos: {
        Row: {
          access_info: string | null
          access_info_ja: string | null
          access_info_pt: string | null
          blog_url: string | null
          classes: Json | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          description_ja: string | null
          description_pt: string | null
          facebook: string | null
          facilities: Json | null
          faq: Json | null
          features: Json | null
          gallery: Json | null
          id: string | null
          instagram: string | null
          instructors: Json | null
          is_verified: boolean | null
          location: string | null
          logo_url: string | null
          media_coverage: Json | null
          mission: string | null
          mission_ja: string | null
          mission_pt: string | null
          name: string | null
          name_ja: string | null
          name_pt: string | null
          news: Json | null
          online_resources: string | null
          online_resources_ja: string | null
          online_resources_pt: string | null
          opening_hours: Json | null
          perks: Json | null
          pricing: Json | null
          rules: string | null
          rules_ja: string | null
          rules_pt: string | null
          safety_measures: string | null
          safety_measures_ja: string | null
          safety_measures_pt: string | null
          schedule: Json | null
          slug: string | null
          target_audience: string | null
          target_audience_ja: string | null
          target_audience_pt: string | null
          testimonials: Json | null
          trial_info: Json | null
          twitter: string | null
          updated_at: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          access_info?: string | null
          access_info_ja?: string | null
          access_info_pt?: string | null
          blog_url?: string | null
          classes?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          facebook?: string | null
          facilities?: Json | null
          faq?: Json | null
          features?: Json | null
          gallery?: Json | null
          id?: string | null
          instagram?: string | null
          instructors?: Json | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          media_coverage?: Json | null
          mission?: string | null
          mission_ja?: string | null
          mission_pt?: string | null
          name?: string | null
          name_ja?: string | null
          name_pt?: string | null
          news?: Json | null
          online_resources?: string | null
          online_resources_ja?: string | null
          online_resources_pt?: string | null
          opening_hours?: Json | null
          perks?: Json | null
          pricing?: Json | null
          rules?: string | null
          rules_ja?: string | null
          rules_pt?: string | null
          safety_measures?: string | null
          safety_measures_ja?: string | null
          safety_measures_pt?: string | null
          schedule?: Json | null
          slug?: string | null
          target_audience?: string | null
          target_audience_ja?: string | null
          target_audience_pt?: string | null
          testimonials?: Json | null
          trial_info?: Json | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          access_info?: string | null
          access_info_ja?: string | null
          access_info_pt?: string | null
          blog_url?: string | null
          classes?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          description_ja?: string | null
          description_pt?: string | null
          facebook?: string | null
          facilities?: Json | null
          faq?: Json | null
          features?: Json | null
          gallery?: Json | null
          id?: string | null
          instagram?: string | null
          instructors?: Json | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          media_coverage?: Json | null
          mission?: string | null
          mission_ja?: string | null
          mission_pt?: string | null
          name?: string | null
          name_ja?: string | null
          name_pt?: string | null
          news?: Json | null
          online_resources?: string | null
          online_resources_ja?: string | null
          online_resources_pt?: string | null
          opening_hours?: Json | null
          perks?: Json | null
          pricing?: Json | null
          rules?: string | null
          rules_ja?: string | null
          rules_pt?: string | null
          safety_measures?: string | null
          safety_measures_ja?: string | null
          safety_measures_pt?: string | null
          schedule?: Json | null
          slug?: string | null
          target_audience?: string | null
          target_audience_ja?: string | null
          target_audience_pt?: string | null
          testimonials?: Json | null
          trial_info?: Json | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          belt_history: Json | null
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          display_name: string | null
          favorite_fighters: Json | null
          favorite_techniques: Json | null
          hobbies: Json | null
          home_dojo: string | null
          hometown: string | null
          id: string | null
          is_public: boolean | null
          organization_id: string | null
          social_links: Json | null
          titles: Json | null
          training_locations: Json | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_fighters?: Json | null
          favorite_techniques?: Json | null
          hobbies?: Json | null
          home_dojo?: string | null
          hometown?: string | null
          id?: string | null
          is_public?: boolean | null
          organization_id?: string | null
          social_links?: Json | null
          titles?: Json | null
          training_locations?: Json | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          belt_history?: Json | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_fighters?: Json | null
          favorite_techniques?: Json | null
          hobbies?: Json | null
          home_dojo?: string | null
          hometown?: string | null
          id?: string | null
          is_public?: boolean | null
          organization_id?: string | null
          social_links?: Json | null
          titles?: Json | null
          training_locations?: Json | null
          username?: string | null
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
      calculate_community_rank: {
        Args: {
          likes_received: number
          post_count: number
          thread_count: number
        }
        Returns: string
      }
      can_apply_for_brothers: { Args: { user_uuid: string }; Returns: boolean }
      generate_referral_code: { Args: never; Returns: string }
      get_printful_orders_masked: {
        Args: never
        Returns: {
          cart_items: Json
          created_at: string
          customer_email: string
          error_message: string
          id: string
          printful_order_id: string
          shipping_address: Json
          shipping_name: string
          status: string
          stripe_session_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_access: {
        Args: {
          p_action: string
          p_details?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      reject_brothers_application: {
        Args: { application_id: string; reason: string }
        Returns: undefined
      }
      validate_referral_code: { Args: { code_to_check: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user" | "staff" | "celebrity"
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
      app_role: ["admin", "user", "staff", "celebrity"],
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
