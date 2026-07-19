export interface AssessmentType {
  id: string;
  institution_id: string;
  academic_year_id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  scale: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentTypeInput {
  name: string;
  code: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  scale: number;
  is_active: boolean;
}
