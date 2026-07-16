export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type AppRole = "owner" | "admin" | "secretary" | "teacher" | "finance";
export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          currency: string;
          timezone: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          currency?: string;
          timezone?: string;
          locale?: string;
        };
        Update: Partial<Database["public"]["Tables"]["institutions"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; full_name: string; phone?: string | null };
        Update: { full_name?: string; phone?: string | null };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          role: AppRole;
          status: "active" | "suspended";
          created_at: string;
        };
        Insert: {
          institution_id: string;
          user_id: string;
          role: AppRole;
          status?: "active" | "suspended";
        };
        Update: { role?: AppRole; status?: "active" | "suspended" };
        Relationships: [
          {
            foreignKeyName: "memberships_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_institution: {
        Args: { institution_name: string; institution_slug: string };
        Returns: string;
      };
    };
    Enums: { app_role: AppRole; membership_status: "active" | "suspended" };
    CompositeTypes: Record<string, never>;
  };
}
