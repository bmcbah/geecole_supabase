export interface GradingFormulaAssignment {
  id: string;
  institution_id: string;
  academic_year_id: string;
  grading_formula_id: string;
  academic_cycle_id: string | null;
  academic_year_level_id: string | null;
  annual_subject_id: string | null;
  period_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradingFormulaAssignmentInput {
  grading_formula_id: string;
  academic_cycle_id: string | null;
  academic_year_level_id: string | null;
  annual_subject_id: string | null;
  period_id: string | null;
  is_active: boolean;
}

export function assignmentSpecificity(assignment: GradingFormulaAssignment) {
  return [
    assignment.period_id,
    assignment.annual_subject_id,
    assignment.academic_year_level_id,
    assignment.academic_cycle_id,
  ].filter(Boolean).length;
}

export function resolveFormulaAssignment(
  assignments: GradingFormulaAssignment[],
  context: {
    academic_cycle_id: string | null;
    academic_year_level_id: string | null;
    annual_subject_id: string | null;
    period_id: string | null;
  },
) {
  return assignments
    .filter((assignment) =>
      assignment.is_active &&
      (!assignment.academic_cycle_id || assignment.academic_cycle_id === context.academic_cycle_id) &&
      (!assignment.academic_year_level_id || assignment.academic_year_level_id === context.academic_year_level_id) &&
      (!assignment.annual_subject_id || assignment.annual_subject_id === context.annual_subject_id) &&
      (!assignment.period_id || assignment.period_id === context.period_id),
    )
    .sort((left, right) => assignmentSpecificity(right) - assignmentSpecificity(left))[0] ?? null;
}
