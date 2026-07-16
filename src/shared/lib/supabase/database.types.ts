export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type AppRole =
  | "owner"
  | "admin"
  | "secretary"
  | "teacher"
  | "finance"
  | "parent"
  | "student";
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
          period_system: string;
          period_count: number;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          sort_order?: number;
          is_active?: boolean;
          period_system?: string;
          period_count?: number;
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
      academic_year_levels: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          level_id: string;
          cycle_name_snapshot: string;
          level_name_snapshot: string;
          sort_order: number;
          is_active: boolean;
          cloned_from_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          level_id: string;
          cycle_name_snapshot?: string;
          level_name_snapshot?: string;
          sort_order?: number;
          is_active?: boolean;
          cloned_from_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_year_levels"]["Insert"]
        >;
        Relationships: [];
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
      subjects: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
        Relationships: [];
      };
      annual_subjects: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_level_id: string;
          subject_id: string;
          subject_name_snapshot: string;
          coefficient: number;
          weekly_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_level_id: string;
          subject_id: string;
          subject_name_snapshot?: string;
          coefficient?: number;
          weekly_hours?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["annual_subjects"]["Insert"]
        >;
        Relationships: [];
      };
      assessment_types: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          code: string;
          weight: number;
          scale: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          code: string;
          weight?: number;
          scale?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["assessment_types"]["Insert"]
        >;
        Relationships: [];
      };
      grading_formulas: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          expression: string;
          description: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          expression: string;
          description?: string | null;
          is_default?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["grading_formulas"]["Insert"]
        >;
        Relationships: [];
      };
      financial_rules: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          code: string;
          amount: number;
          due_day: number | null;
          frequency: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          code: string;
          amount: number;
          due_day?: number | null;
          frequency?: string;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["financial_rules"]["Insert"]
        >;
        Relationships: [];
      };
      academic_year_user_assignments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          membership_id: string;
          responsibility: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          membership_id: string;
          responsibility?: string | null;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_year_user_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          institution_id: string;
          auth_user_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          auth_user_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
        Relationships: [];
      };
      person_roles: {
        Row: {
          id: string;
          institution_id: string;
          person_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          person_id: string;
          role: AppRole;
        };
        Update: Partial<Database["public"]["Tables"]["person_roles"]["Insert"]>;
        Relationships: [];
      };
      person_invitations: {
        Row: {
          id: string;
          institution_id: string;
          person_id: string;
          email: string;
          token_hash: string;
          status: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          person_id: string;
          email: string;
          token_hash: string;
          status?: string;
          expires_at: string;
          accepted_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["person_invitations"]["Insert"]
        >;
        Relationships: [];
      };
      academic_periods: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sequence: number;
          starts_on: string;
          ends_on: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sequence: number;
          starts_on: string;
          ends_on: string;
          status?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_periods"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_person_invitation: {
        Args: { raw_token: string };
        Returns: string;
      };
      create_person_invitation: {
        Args: { target_person_id: string };
        Returns: string;
      };
      save_person: {
        Args: {
          target_institution_id: string;
          target_person_id: string | null;
          person_first_name: string;
          person_last_name: string;
          person_email: string;
          person_phone: string;
          person_status: string;
          assigned_roles: AppRole[];
        };
        Returns: string;
      };
      sync_academic_year_periods: {
        Args: { target_year_id: string; target_cycle_id: string };
        Returns: number;
      };
      sync_all_academic_year_periods: {
        Args: { target_year_id: string };
        Returns: number;
      };
      clone_academic_year_configuration: {
        Args: {
          source_year_id: string;
          target_year_id: string;
          include_structure?: boolean;
          include_subjects?: boolean;
          include_assessments?: boolean;
          include_finance?: boolean;
          include_users?: boolean;
        };
        Returns: Json;
      };
      clone_academic_year_levels: {
        Args: { source_year_id: string; target_year_id: string };
        Returns: number;
      };
      create_institution: {
        Args: { institution_name: string; institution_slug: string };
        Returns: string;
      };
      set_academic_year_cycle_levels: {
        Args: {
          target_year_id: string;
          target_cycle_id: string;
          target_level_ids: string[];
        };
        Returns: number;
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
