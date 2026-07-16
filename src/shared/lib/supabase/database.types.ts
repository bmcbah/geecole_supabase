export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type AppRole = "owner" | "admin" | "secretary" | "teacher" | "finance";
export type AcademicYearStatus = "preparation" | "open" | "closed" | "archived";
export interface Database {
  public: {
    Tables: {
      academic_cycles: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_cycles"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "academic_cycles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_years: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          starts_on: string;
          ends_on: string;
          status: AcademicYearStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          starts_on: string;
          ends_on: string;
          status?: AcademicYearStatus;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_years"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "academic_years_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
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
      grade_levels: {
        Row: {
          id: string;
          institution_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["grade_levels"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "grade_levels_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grade_levels_cycle_fk";
            columns: ["cycle_id"];
            isOneToOne: false;
            referencedRelation: "academic_cycles";
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
    Enums: {
      academic_year_status: AcademicYearStatus;
      app_role: AppRole;
      membership_status: "active" | "suspended";
    };
    CompositeTypes: Record<string, never>;
  };
}
