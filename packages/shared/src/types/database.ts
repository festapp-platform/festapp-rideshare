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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
