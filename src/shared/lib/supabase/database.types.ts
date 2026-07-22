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
      enrollment_policies: {
        Row: {
          institution_id: string;
          allow_pre_registration: boolean;
          allow_direct_enrollment: boolean;
          require_payment_before_confirmation: boolean;
          require_class_assignment: boolean;
          count_pre_registration_in_capacity: boolean;
          capacity_mode: "information" | "warning" | "blocking";
          allow_missing_documents: boolean;
          student_number_pattern: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          institution_id: string;
          allow_pre_registration?: boolean;
          allow_direct_enrollment?: boolean;
          require_payment_before_confirmation?: boolean;
          require_class_assignment?: boolean;
          count_pre_registration_in_capacity?: boolean;
          capacity_mode?: "information" | "warning" | "blocking";
          allow_missing_documents?: boolean;
          student_number_pattern?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["enrollment_policies"]["Insert"]
        >;
        Relationships: [];
      };
      school_classes: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_level_id: string;
          name: string;
          code: string;
          capacity: number | null;
          room: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_level_id: string;
          name: string;
          code: string;
          capacity?: number | null;
          room?: string | null;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["school_classes"]["Insert"]
        >;
        Relationships: [];
      };
      class_assignments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          enrollment_id: string;
          class_id: string;
          starts_on: string;
          ends_on: string | null;
          end_reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          enrollment_id: string;
          class_id: string;
          starts_on?: string;
          ends_on?: string | null;
          end_reason?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["class_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      document_requirements: {
        Row: {
          id: string;
          institution_id: string;
          catalog_id: string | null;
          name: string;
          code: string;
          required_for_pre_registration: boolean;
          required_for_confirmation: boolean;
          expires: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          catalog_id?: string | null;
          name: string;
          code: string;
          required_for_pre_registration?: boolean;
          required_for_confirmation?: boolean;
          expires?: boolean;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["document_requirements"]["Insert"]
        >;
        Relationships: [];
      };
      student_documents: {
        Row: {
          id: string;
          institution_id: string;
          student_id: string;
          enrollment_id: string | null;
          requirement_id: string;
          status: "missing" | "provided" | "not_applicable" | "rejected";
          file_path: string | null;
          notes: string | null;
          received_on: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          student_id: string;
          enrollment_id?: string | null;
          requirement_id: string;
          status?: "missing" | "provided" | "not_applicable" | "rejected";
          file_path?: string | null;
          notes?: string | null;
          received_on?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["student_documents"]["Insert"]
        >;
        Relationships: [];
      };
      reenrollment_policies: {
        Row: {
          institution_id: string;
          allow_early_preparation: boolean;
          allow_direct_confirmation: boolean;
          debt_mode: "information" | "warning" | "blocking";
          require_academic_decision: boolean;
          allow_decision_override: boolean;
          repeat_mode: "allowed" | "exception" | "forbidden";
          require_class_assignment: boolean;
          auto_generate_fees: boolean;
          allow_batch: boolean;
          batch_result_status: "draft" | "pre_registered" | "confirmed";
          require_active_next_cycle: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          institution_id: string;
          allow_early_preparation?: boolean;
          allow_direct_confirmation?: boolean;
          debt_mode?: "information" | "warning" | "blocking";
          require_academic_decision?: boolean;
          allow_decision_override?: boolean;
          repeat_mode?: "allowed" | "exception" | "forbidden";
          require_class_assignment?: boolean;
          auto_generate_fees?: boolean;
          allow_batch?: boolean;
          batch_result_status?: "draft" | "pre_registered" | "confirmed";
          require_active_next_cycle?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["reenrollment_policies"]["Insert"]
        >;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          institution_id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          other_names: string | null;
          gender: string;
          birth_date: string | null;
          birth_date_is_approximate: boolean;
          birth_place: string | null;
          nationality: string;
          address: string | null;
          photo_url: string | null;
          birth_certificate_number: string | null;
          previous_school: string | null;
          previous_level: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          gender: string;
          birth_date?: string | null;
          birth_place?: string | null;
          address?: string | null;
          photo_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [];
      };
      guardians: {
        Row: {
          id: string;
          institution_id: string;
          first_name: string;
          last_name: string;
          primary_phone: string;
          secondary_phone: string | null;
          address: string | null;
          occupation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          first_name: string;
          last_name: string;
          primary_phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["guardians"]["Insert"]>;
        Relationships: [];
      };
      student_guardians: {
        Row: {
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary_contact: boolean;
          is_financial_responsible: boolean;
          is_emergency_contact: boolean;
          can_pick_up: boolean;
          receives_communications: boolean;
        };
        Insert: {
          student_id: string;
          guardian_id: string;
          relationship: string;
          is_primary_contact?: boolean;
          is_financial_responsible?: boolean;
          is_emergency_contact?: boolean;
          can_pick_up?: boolean;
          receives_communications?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["student_guardians"]["Insert"]
        >;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          student_id: string;
          academic_year_level_id: string;
          status: string;
          admission_date: string;
          origin: string;
          level_name_snapshot: string;
          cycle_name_snapshot: string;
          cancellation_reason: string | null;
          source_enrollment_id: string | null;
          academic_decision: string | null;
          decision_reason: string | null;
          policy_snapshot: Json;
          confirmed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          student_id: string;
          academic_year_level_id: string;
          status?: string;
          admission_date?: string;
          origin?: string;
          level_name_snapshot: string;
          cycle_name_snapshot: string;
          source_enrollment_id?: string | null;
          academic_decision?: string | null;
          decision_reason?: string | null;
          policy_snapshot?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
        Relationships: [];
      };
      cycle_catalog: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          icon: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          icon?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["cycle_catalog"]["Insert"]
        >;
        Relationships: [];
      };
      institution_cycles: {
        Row: {
          id: string;
          institution_id: string;
          catalog_cycle_id: string;
          academic_cycle_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          catalog_cycle_id: string;
          academic_cycle_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["institution_cycles"]["Insert"]
        >;
        Relationships: [];
      };
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
          subjects_period_scope: string;
          grading_scale: number;
          pass_average: number;
          ranking_enabled: boolean;
          absences_on_report: boolean;
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
          subjects_period_scope?: string;
          grading_scale?: number;
          pass_average?: number;
          ranking_enabled?: boolean;
          absences_on_report?: boolean;
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
      academic_year_cycles: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sort_order: number;
          period_system: string;
          period_count: number;
          is_active: boolean;
          created_at: string;
          subjects_period_scope: string;
          grading_scale: number;
          pass_average: number;
          ranking_enabled: boolean;
          absences_on_report: boolean;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          name: string;
          code: string;
          sort_order?: number;
          period_system?: string;
          period_count?: number;
          is_active?: boolean;
          subjects_period_scope?: string;
          grading_scale?: number;
          pass_average?: number;
          ranking_enabled?: boolean;
          absences_on_report?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_year_cycles"]["Insert"]
        >;
        Relationships: [];
      };
      academic_year_levels: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_cycle_id: string;
          cycle_id: string;
          level_id: string;
          cycle_name_snapshot: string;
          level_name_snapshot: string;
          level_code_snapshot: string;
          sort_order: number;
          is_active: boolean;
          cloned_from_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          academic_year_cycle_id?: string;
          cycle_id: string;
          level_id: string;
          cycle_name_snapshot?: string;
          level_name_snapshot?: string;
          level_code_snapshot?: string;
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
          class_structure_mode: "levels_and_classes" | "classes_as_levels";
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
          class_structure_mode?: "levels_and_classes" | "classes_as_levels";
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
          is_owner: boolean;
          status: "active" | "suspended";
          valid_from: string;
          valid_until: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          is_owner?: boolean;
          status?: "active" | "suspended";
          valid_from?: string;
          valid_until?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
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
      permissions: {
        Row: {
          id: string;
          code: string;
          module: string;
          resource: string;
          action: string;
          label: string;
          description: string;
          sensitivity: "standard" | "sensitive" | "system";
          is_assignable: boolean;
          is_active: boolean;
          requires_delegation: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["permissions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      access_profiles: {
        Row: {
          id: string;
          institution_id: string;
          source_template_id: string | null;
          source_template_version: number | null;
          code: string;
          name: string;
          description: string;
          is_standard: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          source_template_id?: string | null;
          source_template_version?: number | null;
          code: string;
          name: string;
          description?: string;
          is_standard?: boolean;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["access_profiles"]["Insert"]>;
        Relationships: [];
      };
      access_profile_permissions: {
        Row: {
          access_profile_id: string;
          permission_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          access_profile_id: string;
          permission_id: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["access_profile_permissions"]["Insert"]>;
        Relationships: [];
      };
      membership_access_profiles: {
        Row: {
          id: string;
          membership_id: string;
          access_profile_id: string;
          is_active: boolean;
          valid_from: string;
          valid_until: string | null;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          membership_id: string;
          access_profile_id: string;
          is_active?: boolean;
          valid_from?: string;
          valid_until?: string | null;
          assigned_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["membership_access_profiles"]["Insert"]>;
        Relationships: [];
      };
      grade_levels: {
        Row: {
          id: string;
          institution_id: string;
          cycle_id: string;
          catalog_id: string | null;
          name: string;
          code: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          capacity: number | null;
          next_level_id: string | null;
          repeat_allowed: boolean;
        };
        Insert: {
          id?: string;
          institution_id: string;
          cycle_id: string;
          catalog_id?: string | null;
          name: string;
          code: string;
          sort_order?: number;
          is_active?: boolean;
          capacity?: number | null;
          next_level_id?: string | null;
          repeat_allowed?: boolean;
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
          catalog_id: string | null;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          catalog_id?: string | null;
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
          applies_all_periods: boolean;
          period_ids: string[];
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
          applies_all_periods?: boolean;
          period_ids?: string[];
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
          catalog_id: string | null;
          name: string;
          code: string;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          catalog_id?: string | null;
          name: string;
          code: string;
          weight?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["assessment_types"]["Insert"]
        >;
        Relationships: [];
      };
      assessment_type_catalog: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["assessment_type_catalog"]["Insert"]
        >;
        Relationships: [];
      };
      grading_formula_series: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          code: string;
          name: string;
          formula_type: "course_average";
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          code: string;
          name: string;
          formula_type?: "course_average";
          description?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["grading_formula_series"]["Insert"]
        >;
        Relationships: [];
      };
      grading_formula_versions: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          series_id: string;
          version: number;
          rules: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          series_id: string;
          version: number;
          rules: Json;
          created_by?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      grading_formula_assignments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          formula_version_id: string;
          cycle_id: string | null;
          academic_year_level_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          formula_version_id: string;
          cycle_id?: string | null;
          academic_year_level_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["grading_formula_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      grading_formulas: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          name: string;
          code: string;
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
          code: string;
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
          fee_type: string;
          is_mandatory: boolean;
          discount_allowed: boolean;
          amount_editable: boolean;
          installment_count: number;
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
          fee_type?: string;
          is_mandatory?: boolean;
          discount_allowed?: boolean;
          amount_editable?: boolean;
          installment_count?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["financial_rules"]["Insert"]
        >;
        Relationships: [];
      };
      financial_rule_levels: {
        Row: {
          financial_rule_id: string;
          academic_year_level_id: string;
          institution_id: string;
          academic_year_id: string;
        };
        Insert: {
          financial_rule_id: string;
          academic_year_level_id: string;
          institution_id: string;
          academic_year_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["financial_rule_levels"]["Insert"]
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
      person_access_profiles: {
        Row: {
          id: string;
          institution_id: string;
          person_id: string;
          access_profile_id: string;
          valid_from: string;
          valid_until: string | null;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          person_id: string;
          access_profile_id: string;
          valid_from?: string;
          valid_until?: string | null;
          assigned_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["person_access_profiles"]["Insert"]>;
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
      pedagogical_assignments: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id: string | null;
          teacher_id: string;
          role: string;
          coefficient: number;
          all_periods: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id?: string | null;
          teacher_id: string;
          role?: string;
          coefficient?: number;
          all_periods?: boolean;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["pedagogical_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      pedagogical_assignment_periods: {
        Row: { assignment_id: string; period_id: string };
        Insert: { assignment_id: string; period_id: string };
        Update: Partial<
          Database["public"]["Tables"]["pedagogical_assignment_periods"]["Insert"]
        >;
        Relationships: [];
      };
      gradebook_notes: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id: string;
          period_id: string;
          note_type_id: string;
          teacher_id: string;
          label: string;
          code: string;
          note_date: string;
          scale_snapshot: number;
          internal_comment: string | null;
          is_locked: boolean;
          is_published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id: string;
          period_id: string;
          note_type_id: string;
          teacher_id: string;
          label: string;
          code: string;
          note_date?: string;
          scale_snapshot?: number;
          internal_comment?: string | null;
          is_locked?: boolean;
          is_published?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["gradebook_notes"]["Insert"]
        >;
        Relationships: [];
      };
      note_results: {
        Row: {
          id: string;
          institution_id: string;
          note_id: string;
          student_id: string;
          value: number | null;
          status: "absent" | "exempt" | "postponed" | null;
          comment: string | null;
          is_makeup: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          note_id: string;
          student_id: string;
          value?: number | null;
          status?: "absent" | "exempt" | "postponed" | null;
          comment?: string | null;
          is_makeup?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["note_results"]["Insert"]>;
        Relationships: [];
      };
      subject_appreciations: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          class_id: string;
          subject_id: string;
          student_id: string;
          appreciation: string;
          author_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          class_id: string;
          subject_id: string;
          student_id: string;
          appreciation: string;
          author_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["subject_appreciations"]["Insert"]
        >;
        Relationships: [];
      };
      notes_audit_log: {
        Row: {
          id: number;
          institution_id: string;
          academic_year_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          before_data: Json | null;
          after_data: Json | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      pedagogical_settings: {
        Row: {
          institution_id: string;
          academic_year_id: string;
          appreciations_required: boolean;
          ranking_displayed: boolean;
          coefficients_displayed: boolean;
          average_decimal_places: number;
          notifications_enabled: boolean;
          multiple_teachers_enabled: boolean;
          validation_roles: AppRole[];
          publication_roles: AppRole[];
          bulletin_title: string;
          bulletin_orientation: string;
          bulletin_show_rank: boolean;
          bulletin_show_appreciations: boolean;
          bulletin_teacher_signature_label: string;
          bulletin_direction_signature_label: string;
          bulletin_footer: string;
          updated_at: string;
        };
        Insert: {
          institution_id: string;
          academic_year_id: string;
          appreciations_required?: boolean;
          ranking_displayed?: boolean;
          coefficients_displayed?: boolean;
          average_decimal_places?: number;
          notifications_enabled?: boolean;
          multiple_teachers_enabled?: boolean;
          validation_roles?: AppRole[];
          publication_roles?: AppRole[];
          bulletin_title?: string;
          bulletin_orientation?: string;
          bulletin_show_rank?: boolean;
          bulletin_show_appreciations?: boolean;
          bulletin_teacher_signature_label?: string;
          bulletin_direction_signature_label?: string;
          bulletin_footer?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["pedagogical_settings"]["Insert"]
        >;
        Relationships: [];
      };
      bulletin_generation_batches: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          scope_type: string;
          scope_ids: string[];
          options: Json;
          status: "running" | "completed" | "partial" | "failed";
          total_count: number;
          generated_count: number;
          warning_count: number;
          blocked_count: number;
          initiated_by: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          scope_type: string;
          scope_ids?: string[];
          options?: Json;
          status?: "running" | "completed" | "partial" | "failed";
          total_count?: number;
          generated_count?: number;
          warning_count?: number;
          blocked_count?: number;
          initiated_by?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["bulletin_generation_batches"]["Insert"]
        >;
        Relationships: [];
      };
      bulletin_versions: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          enrollment_id: string;
          student_id: string;
          class_id: string;
          batch_id: string;
          version: number;
          status:
            | "generated"
            | "pending_validation"
            | "validated"
            | "rejected"
            | "published"
            | "replaced";
          snapshot: Json;
          validation_comment: string | null;
          validated_by: string | null;
          validated_at: string | null;
          published_by: string | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          period_id: string;
          enrollment_id: string;
          student_id: string;
          class_id: string;
          batch_id: string;
          version?: number;
          status?:
            | "generated"
            | "pending_validation"
            | "validated"
            | "rejected"
            | "published"
            | "replaced";
          snapshot?: Json;
          validation_comment?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          published_by?: string | null;
          published_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["bulletin_versions"]["Insert"]
        >;
        Relationships: [];
      };
      bulletin_generation_items: {
        Row: {
          id: string;
          institution_id: string;
          batch_id: string;
          enrollment_id: string;
          student_id: string;
          class_id: string | null;
          status: "generated" | "warning" | "blocked";
          issue_code: string | null;
          message: string | null;
          bulletin_version_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          batch_id: string;
          enrollment_id: string;
          student_id: string;
          class_id?: string | null;
          status: "generated" | "warning" | "blocked";
          issue_code?: string | null;
          message?: string | null;
          bulletin_version_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["bulletin_generation_items"]["Insert"]
        >;
        Relationships: [];
      };
      cycle_responsibility_types: {
        Row: {
          id: string;
          institution_id: string;
          name: string;
          code: string;
          description: string | null;
          can_validate_bulletins: boolean;
          can_manage_periods: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          name: string;
          code: string;
          description?: string | null;
          can_validate_bulletins?: boolean;
          can_manage_periods?: boolean;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["cycle_responsibility_types"]["Insert"]
        >;
        Relationships: [];
      };
      cycle_responsibilities: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          responsibility_type_id: string;
          person_id: string;
          capacity: "holder" | "acting" | "deputy";
          starts_on: string;
          ends_on: string | null;
          replaced_person_id: string | null;
          status: "draft" | "active" | "closed" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          academic_year_id: string;
          cycle_id: string;
          responsibility_type_id: string;
          person_id: string;
          capacity?: "holder" | "acting" | "deputy";
          starts_on: string;
          ends_on?: string | null;
          replaced_person_id?: string | null;
          status?: "draft" | "active" | "closed" | "archived";
        };
        Update: Partial<
          Database["public"]["Tables"]["cycle_responsibilities"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      notes_average_controls: {
        Row: {
          id: string;
          institution_id: string;
          academic_year_id: string;
          class_id: string;
          class_name: string;
          subject_name: string;
          teacher_name: string;
          coefficient: number;
          notes_count: number;
          postponed_count: number;
          state: "ready" | "incomplete" | "not_started";
        };
        Relationships: [];
      };
    };
    Functions: {
      save_cycle_responsibility: {
        Args: {
          target_id: string | null;
          target_institution_id: string;
          target_year_id: string;
          target_cycle_id: string;
          target_type_id: string;
          target_person_id: string;
          target_capacity: string;
          target_starts_on: string;
          target_ends_on: string | null;
          target_replaced_person_id: string | null;
        };
        Returns: string;
      };
      save_grading_formula_version: {
        Args: {
          target_institution_id: string;
          target_year_id: string;
          target_series_id: string | null;
          formula_name: string;
          formula_code: string;
          formula_expression: string;
          formula_rounding: number;
          scope_type: "cycle" | "level";
          scope_id: string;
        };
        Returns: string;
      };
      install_assessment_type_catalog: {
        Args: { target_institution_id: string; target_year_id: string };
        Returns: number;
      };
      install_grade_level_catalog: {
        Args: { target_institution_id: string };
        Returns: number;
      };
      install_subject_catalog: {
        Args: { target_institution_id: string };
        Returns: number;
      };
      install_student_document_catalog: {
        Args: { target_institution_id: string };
        Returns: number;
      };
      change_academic_period_status: {
        Args: { target_period_id: string; target_status: string };
        Returns: void;
      };
      change_enrollment_status: {
        Args: {
          target_enrollment_id: string;
          target_status: string;
          change_reason?: string | null;
        };
        Returns: void;
      };
      assign_enrollment_to_class: {
        Args: {
          target_enrollment: string;
          target_class: string;
          change_reason?: string | null;
        };
        Returns: string;
      };
      create_school_class: {
        Args: {
          target_year_id: string;
          target_annual_level_id: string | null;
          target_annual_cycle_id: string | null;
          class_name: string;
          class_code: string;
          class_capacity?: number | null;
          class_room?: string | null;
        };
        Returns: string;
      };
      create_student_enrollment: {
        Args: {
          target_institution_id: string;
          target_academic_year_id: string;
          target_annual_level_id: string;
          student_first_name: string;
          student_last_name: string;
          student_gender: string;
          student_birth_date: string | null;
          student_birth_place: string;
          student_address: string;
          guardian_first_name: string;
          guardian_last_name: string;
          guardian_phone: string;
          guardian_relationship: string;
          enrollment_kind: string;
        };
        Returns: string;
      };
      reenroll_student: {
        Args: {
          source_enrollment: string;
          target_academic_year: string;
          target_annual_level: string;
          target_decision: string;
          target_enrollment_status: string;
          target_reason?: string | null;
        };
        Returns: string;
      };
      batch_reenroll_students: {
        Args: { source_enrollments: string[]; target_academic_year: string };
        Returns: Json;
      };
      link_student_guardian: {
        Args: {
          target_student_id: string;
          target_guardian_id: string;
          guardian_relationship: string;
          primary_contact?: boolean;
          financial_responsible?: boolean;
          emergency_contact?: boolean;
          pickup_allowed?: boolean;
          communications_enabled?: boolean;
        };
        Returns: void;
      };
      create_and_link_guardian: {
        Args: {
          target_student_id: string;
          guardian_first_name: string;
          guardian_last_name: string;
          guardian_phone: string;
          guardian_relationship: string;
          primary_contact?: boolean;
          financial_responsible?: boolean;
          emergency_contact?: boolean;
        };
        Returns: string;
      };
      set_institution_cycle: {
        Args: {
          target_institution_id: string;
          target_catalog_cycle_id: string;
          target_active: boolean;
          target_year_id: string | null;
        };
        Returns: string;
      };
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
          assigned_access_profile_ids: string[];
        };
        Returns: string;
      };
      delete_person: {
        Args: { target_person_id: string; deletion_reason?: string | null };
        Returns: undefined;
      };
      get_my_authorization_summary: {
        Args: { target_institution_id: string };
        Returns: Json;
      };
      sync_academic_year_periods: {
        Args: { target_year_id: string; target_cycle_id: string };
        Returns: number;
      };
      sync_all_academic_year_periods: {
        Args: { target_year_id: string };
        Returns: number;
      };
      save_academic_year_cycle: {
        Args: {
          target_year_id: string;
          target_annual_cycle_id: string | null;
          cycle_name: string;
          cycle_code: string;
          cycle_sort_order: number;
          cycle_period_system: string;
          cycle_period_count: number;
          cycle_is_active: boolean;
          cycle_subjects_period_scope: string;
          cycle_grading_scale: number;
          cycle_pass_average: number;
          cycle_ranking_enabled: boolean;
          cycle_absences_on_report: boolean;
        };
        Returns: string;
      };
      set_financial_rule_levels: {
        Args: { target_rule_id: string; target_level_ids: string[] };
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
      set_annual_level_subjects: {
        Args: { target_year_level_id: string; target_subject_ids: string[] };
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
