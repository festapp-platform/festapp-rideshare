/**
 * Database types for Supabase.
 *
 * Run `supabase gen types typescript --local > packages/shared/src/types/database.ts`
 * to regenerate from the actual database schema.
 *
 * This placeholder matches the Supabase generated types shape so that
 * code referencing Database["public"]["Tables"]["profiles"] will typecheck.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          phone: string | null;
          bio: string | null;
          social_links: Record<string, unknown>;
          rating_avg: number;
          rating_count: number;
          user_role: string;
          id_verified: boolean;
          id_document_url: string | null;
          account_status: string;
          suspended_until: string | null;
          completed_rides_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          social_links?: Record<string, unknown>;
          rating_avg?: number;
          rating_count?: number;
          user_role?: string;
          id_verified?: boolean;
          id_document_url?: string | null;
          account_status?: string;
          suspended_until?: string | null;
          completed_rides_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          social_links?: Record<string, unknown>;
          rating_avg?: number;
          rating_count?: number;
          user_role?: string;
          id_verified?: boolean;
          id_document_url?: string | null;
          account_status?: string;
          suspended_until?: string | null;
          completed_rides_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string;
          make: string;
          model: string;
          color: string;
          license_plate: string;
          photo_url: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          make: string;
          model: string;
          color: string;
          license_plate: string;
          photo_url?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          make?: string;
          model?: string;
          color?: string;
          license_plate?: string;
          photo_url?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rides: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry: unknown | null;
          route_encoded_polyline: string | null;
          departure_time: string;
          seats_total: number;
          seats_available: number;
          suggested_price_czk: number | null;
          price_czk: number | null;
          distance_meters: number | null;
          duration_seconds: number | null;
          luggage_size: string;
          booking_mode: string;
          preferences: Record<string, unknown>;
          notes: string | null;
          status: string;
          recurring_pattern_id: string | null;
          event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id?: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          departure_time: string;
          seats_total: number;
          seats_available: number;
          suggested_price_czk?: number | null;
          price_czk?: number | null;
          distance_meters?: number | null;
          duration_seconds?: number | null;
          luggage_size?: string;
          booking_mode?: string;
          preferences?: Record<string, unknown>;
          notes?: string | null;
          status?: string;
          recurring_pattern_id?: string | null;
          event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string | null;
          origin_location?: unknown;
          origin_address?: string;
          destination_location?: unknown;
          destination_address?: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          departure_time?: string;
          seats_total?: number;
          seats_available?: number;
          suggested_price_czk?: number | null;
          price_czk?: number | null;
          distance_meters?: number | null;
          duration_seconds?: number | null;
          luggage_size?: string;
          booking_mode?: string;
          preferences?: Record<string, unknown>;
          notes?: string | null;
          status?: string;
          recurring_pattern_id?: string | null;
          event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rides_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      ride_waypoints: {
        Row: {
          id: string;
          ride_id: string;
          location: unknown;
          address: string;
          order_index: number;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          location: unknown;
          address: string;
          order_index: number;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          location?: unknown;
          address?: string;
          order_index?: number;
          type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ride_waypoints_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_ride_patterns: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry: unknown | null;
          route_encoded_polyline: string | null;
          day_of_week: number;
          departure_time: string;
          seats_total: number;
          price_czk: number | null;
          booking_mode: string;
          is_active: boolean;
          generate_weeks_ahead: number;
          last_generated_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id?: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          day_of_week: number;
          departure_time: string;
          seats_total?: number;
          price_czk?: number | null;
          booking_mode?: string;
          is_active?: boolean;
          generate_weeks_ahead?: number;
          last_generated_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string | null;
          origin_location?: unknown;
          origin_address?: string;
          destination_location?: unknown;
          destination_address?: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          day_of_week?: number;
          departure_time?: string;
          seats_total?: number;
          price_czk?: number | null;
          booking_mode?: string;
          is_active?: boolean;
          generate_weeks_ahead?: number;
          last_generated_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_ride_patterns_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_ride_patterns_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorite_routes: {
        Row: {
          id: string;
          user_id: string;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          label: string | null;
          alert_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          label?: string | null;
          alert_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          origin_location?: unknown;
          origin_address?: string;
          destination_location?: unknown;
          destination_address?: string;
          label?: string | null;
          alert_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_routes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          ride_id: string;
          passenger_id: string;
          seats_booked: number;
          status: string;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          passenger_id: string;
          seats_booked?: number;
          status?: string;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          passenger_id?: string;
          seats_booked?: number;
          status?: string;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey";
            columns: ["passenger_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_conversations: {
        Row: {
          id: string;
          booking_id: string;
          ride_id: string;
          driver_id: string;
          passenger_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          ride_id: string;
          driver_id: string;
          passenger_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          ride_id?: string;
          driver_id?: string;
          passenger_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_conversations_ride_id_fkey";
            columns: ["ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_conversations_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_conversations_passenger_id_fkey";
            columns: ["passenger_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "chat_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          revealed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          revealed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          revealed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string;
          ride_id: string | null;
          booking_id: string | null;
          review_id: string | null;
          description: string;
          status: string;
          admin_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id: string;
          ride_id?: string | null;
          booking_id?: string | null;
          review_id?: string | null;
          description: string;
          status?: string;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string;
          ride_id?: string | null;
          booking_id?: string | null;
          review_id?: string | null;
          description?: string;
          status?: string;
          admin_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_actions: {
        Row: {
          id: string;
          user_id: string;
          admin_id: string;
          action_type: string;
          reason: string;
          report_id: string | null;
          duration_days: number | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          admin_id: string;
          action_type: string;
          reason: string;
          report_id?: string | null;
          duration_days?: number | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          admin_id?: string;
          action_type?: string;
          reason?: string;
          report_id?: string | null;
          duration_days?: number | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_stats_daily: {
        Row: {
          date: string;
          total_users: number;
          new_users: number;
          active_users: number;
          total_rides: number;
          completed_rides: number;
          cancelled_rides: number;
          total_bookings: number;
          total_reviews: number;
          average_rating: number | null;
          total_reports: number;
          open_reports: number;
          created_at: string;
        };
        Insert: {
          date: string;
          total_users?: number;
          new_users?: number;
          active_users?: number;
          total_rides?: number;
          completed_rides?: number;
          cancelled_rides?: number;
          total_bookings?: number;
          total_reviews?: number;
          average_rating?: number | null;
          total_reports?: number;
          open_reports?: number;
          created_at?: string;
        };
        Update: {
          date?: string;
          total_users?: number;
          new_users?: number;
          active_users?: number;
          total_rides?: number;
          completed_rides?: number;
          cancelled_rides?: number;
          total_bookings?: number;
          total_reviews?: number;
          average_rating?: number | null;
          total_reports?: number;
          open_reports?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          creator_id: string;
          name: string;
          description: string | null;
          location_address: string;
          location: unknown;
          event_date: string;
          event_end_date: string | null;
          status: string;
          admin_notes: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          name: string;
          description?: string | null;
          location_address: string;
          location: unknown;
          event_date: string;
          event_end_date?: string | null;
          status?: string;
          admin_notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          name?: string;
          description?: string | null;
          location_address?: string;
          location?: unknown;
          event_date?: string;
          event_end_date?: string | null;
          status?: string;
          admin_notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      badge_definitions: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          threshold: number | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          threshold?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          category?: string;
          threshold?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badge_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      route_streaks: {
        Row: {
          id: string;
          user_id: string;
          origin_address: string;
          destination_address: string;
          current_streak: number;
          longest_streak: number;
          last_ride_week: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          origin_address: string;
          destination_address: string;
          current_streak?: number;
          longest_streak?: number;
          last_ride_week: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          origin_address?: string;
          destination_address?: string;
          current_streak?: number;
          longest_streak?: number;
          last_ride_week?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      route_intents: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry: unknown | null;
          route_encoded_polyline: string | null;
          seats_total: number;
          price_czk: number | null;
          booking_mode: string;
          notes: string | null;
          status: string;
          confirmed_ride_id: string | null;
          subscriber_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id?: string | null;
          origin_location: unknown;
          origin_address: string;
          destination_location: unknown;
          destination_address: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          seats_total?: number;
          price_czk?: number | null;
          booking_mode?: string;
          notes?: string | null;
          status?: string;
          confirmed_ride_id?: string | null;
          subscriber_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string | null;
          origin_location?: unknown;
          origin_address?: string;
          destination_location?: unknown;
          destination_address?: string;
          route_geometry?: unknown | null;
          route_encoded_polyline?: string | null;
          seats_total?: number;
          price_czk?: number | null;
          booking_mode?: string;
          notes?: string | null;
          status?: string;
          confirmed_ride_id?: string | null;
          subscriber_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_intents_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_intents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_intents_confirmed_ride_id_fkey";
            columns: ["confirmed_ride_id"];
            isOneToOne: false;
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
        ];
      };
      route_intent_subscriptions: {
        Row: {
          id: string;
          route_intent_id: string;
          subscriber_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          route_intent_id: string;
          subscriber_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          route_intent_id?: string;
          subscriber_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_intent_subscriptions_route_intent_id_fkey";
            columns: ["route_intent_id"];
            isOneToOne: false;
            referencedRelation: "route_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_intent_subscriptions_subscriber_id_fkey";
            columns: ["subscriber_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          push_booking_requests: boolean;
          push_booking_confirmations: boolean;
          push_booking_cancellations: boolean;
          push_new_messages: boolean;
          push_ride_reminders: boolean;
          push_route_alerts: boolean;
          email_booking_confirmations: boolean;
          email_ride_reminders: boolean;
          email_cancellations: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_booking_requests?: boolean;
          push_booking_confirmations?: boolean;
          push_booking_cancellations?: boolean;
          push_new_messages?: boolean;
          push_ride_reminders?: boolean;
          push_route_alerts?: boolean;
          email_booking_confirmations?: boolean;
          email_ride_reminders?: boolean;
          email_cancellations?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          push_booking_requests?: boolean;
          push_booking_confirmations?: boolean;
          push_booking_cancellations?: boolean;
          push_new_messages?: boolean;
          push_ride_reminders?: boolean;
          push_route_alerts?: boolean;
          email_booking_confirmations?: boolean;
          email_ride_reminders?: boolean;
          email_cancellations?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_phone_verified: {
        Args: { user_id: string };
        Returns: boolean;
      };
      nearby_rides: {
        Args: {
          origin_lat: number;
          origin_lng: number;
          dest_lat: number;
          dest_lng: number;
          search_date: string;
          radius_km?: number;
          max_results?: number;
        };
        Returns: {
          ride_id: string;
          driver_id: string;
          driver_name: string;
          driver_avatar: string | null;
          driver_rating: number;
          driver_rating_count: number;
          driver_completed_rides_count: number;
          vehicle_make: string | null;
          vehicle_model: string | null;
          vehicle_color: string | null;
          origin_address: string;
          destination_address: string;
          departure_time: string;
          seats_available: number;
          price_czk: number | null;
          distance_meters: number | null;
          duration_seconds: number | null;
          booking_mode: string;
          origin_distance_m: number;
          dest_distance_m: number;
        }[];
      };
      book_ride_instant: {
        Args: {
          p_ride_id: string;
          p_passenger_id: string;
          p_seats?: number;
        };
        Returns: string;
      };
      request_ride_booking: {
        Args: {
          p_ride_id: string;
          p_passenger_id: string;
          p_seats?: number;
        };
        Returns: string;
      };
      respond_to_booking: {
        Args: {
          p_booking_id: string;
          p_driver_id: string;
          p_accept: boolean;
        };
        Returns: undefined;
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_user_id: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      cancel_ride: {
        Args: {
          p_ride_id: string;
          p_driver_id: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      complete_ride: {
        Args: {
          p_ride_id: string;
          p_driver_id: string;
        };
        Returns: undefined;
      };
      get_driver_reliability: {
        Args: {
          p_driver_id: string;
        };
        Returns: {
          total_rides_completed: number;
          total_rides_cancelled: number;
          cancellation_rate: number;
          total_bookings_received: number;
        }[];
      };
      send_chat_message: {
        Args: {
          p_conversation_id: string;
          p_content: string;
          p_message_type?: string;
        };
        Returns: string;
      };
      mark_messages_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: undefined;
      };
      get_or_create_conversation: {
        Args: {
          p_booking_id: string;
        };
        Returns: string;
      };
      get_unread_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      submit_review: {
        Args: {
          p_booking_id: string;
          p_rating: number;
          p_comment?: string | null;
        };
        Returns: string;
      };
      get_pending_reviews: {
        Args: Record<string, never>;
        Returns: {
          booking_id: string;
          ride_id: string;
          other_user_id: string;
          other_user_name: string;
          other_user_avatar: string | null;
          origin_address: string;
          destination_address: string;
          ride_completed_at: string;
        }[];
      };
      block_user: {
        Args: { p_blocked_id: string };
        Returns: undefined;
      };
      unblock_user: {
        Args: { p_blocked_id: string };
        Returns: undefined;
      };
      get_blocked_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          blocked_at: string;
        }[];
      };
      report_user: {
        Args: {
          p_reported_user_id: string;
          p_description: string;
          p_ride_id?: string | null;
          p_booking_id?: string | null;
          p_review_id?: string | null;
        };
        Returns: string;
      };
      admin_warn_user: {
        Args: {
          p_user_id: string;
          p_reason: string;
          p_report_id?: string | null;
        };
        Returns: string;
      };
      admin_suspend_user: {
        Args: {
          p_user_id: string;
          p_reason: string;
          p_duration_days: number;
          p_report_id?: string | null;
        };
        Returns: string;
      };
      admin_ban_user: {
        Args: {
          p_user_id: string;
          p_reason: string;
          p_cancel_rides?: boolean;
          p_report_id?: string | null;
        };
        Returns: string;
      };
      admin_unban_user: {
        Args: {
          p_user_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      admin_resolve_report: {
        Args: {
          p_report_id: string;
          p_status: string;
          p_admin_notes?: string | null;
        };
        Returns: undefined;
      };
      start_ride: {
        Args: {
          p_ride_id: string;
          p_driver_id: string;
        };
        Returns: undefined;
      };
      admin_approve_event: {
        Args: {
          p_event_id: string;
        };
        Returns: undefined;
      };
      admin_reject_event: {
        Args: {
          p_event_id: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      get_user_impact: {
        Args: {
          p_user_id?: string;
        };
        Returns: {
          total_rides_completed: number;
          total_co2_saved_kg: number;
          total_money_saved_czk: number;
          total_distance_km: number;
          total_passengers_carried: number;
        }[];
      };
      get_user_badges: {
        Args: {
          p_user_id?: string;
        };
        Returns: {
          badge_id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          threshold: number;
          earned_at: string;
        }[];
      };
      get_route_streaks: {
        Args: {
          p_user_id?: string;
        };
        Returns: {
          id: string;
          origin_address: string;
          destination_address: string;
          current_streak: number;
          longest_streak: number;
          last_ride_week: string;
        }[];
      };
      get_event_rides: {
        Args: {
          p_event_id: string;
        };
        Returns: {
          ride_id: string;
          driver_id: string;
          driver_name: string;
          driver_avatar: string | null;
          driver_rating: number;
          origin_address: string;
          destination_address: string;
          departure_time: string;
          seats_available: number;
          price_czk: number | null;
          booking_mode: string;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

// Derived types for convenience
export type ChatConversation =
  Database['public']['Tables']['chat_conversations']['Row'];
export type ChatMessage =
  Database['public']['Tables']['chat_messages']['Row'];
export type NotificationPreferencesRow =
  Database['public']['Tables']['notification_preferences']['Row'];

// Phase 6 derived types
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type UserBlock = Database['public']['Tables']['user_blocks']['Row'];
export type ModerationAction =
  Database['public']['Tables']['moderation_actions']['Row'];
export type PlatformStatDaily =
  Database['public']['Tables']['platform_stats_daily']['Row'];
export type PendingReview =
  Database['public']['Functions']['get_pending_reviews']['Returns'][number];

// Phase 8 derived types
export type Event = Database['public']['Tables']['events']['Row'];
export type EventRide =
  Database['public']['Functions']['get_event_rides']['Returns'][number];

// Gamification derived types
export type BadgeDefinition = Database['public']['Tables']['badge_definitions']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];
export type RouteStreak = Database['public']['Tables']['route_streaks']['Row'];
export type UserImpact =
  Database['public']['Functions']['get_user_impact']['Returns'][number];
export type UserBadgeResult =
  Database['public']['Functions']['get_user_badges']['Returns'][number];
export type RouteStreakResult =
  Database['public']['Functions']['get_route_streaks']['Returns'][number];
