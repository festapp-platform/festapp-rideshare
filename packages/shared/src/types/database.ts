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
    };
    Enums: Record<string, never>;
  };
}
