export type MissingGradePolicy = "ignore" | "block";

export interface GradingFormulaComponent {
  assessment_type_id: string;
  weight: number;
}

export interface GradingFormulaDefinition {
  method: "weighted_average";
  missing_grade_policy: MissingGradePolicy;
  components: GradingFormulaComponent[];
}

export interface GradingFormula {
  id: string;
  institution_id: string;
  academic_year_id: string;
  name: string;
  code: string;
  expression: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  version: number;
  definition: GradingFormulaDefinition;
  created_at: string;
  updated_at: string;
}

export interface GradingFormulaInput {
  name: string;
  code: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  definition: GradingFormulaDefinition;
}

export interface FormulaPreviewInput {
  assessment_type_id: string;
  score: number | null;
  scale: number;
}

export function calculateFormulaPreview(
  formula: GradingFormulaDefinition,
  grades: FormulaPreviewInput[],
  targetScale = 20,
) {
  const gradeByType = new Map(grades.map((grade) => [grade.assessment_type_id, grade]));
  let weightedTotal = 0;
  let totalWeight = 0;
  const missing: string[] = [];

  formula.components.forEach((component) => {
    const grade = gradeByType.get(component.assessment_type_id);
    if (!grade || grade.score === null) {
      missing.push(component.assessment_type_id);
      return;
    }

    const normalized = grade.scale > 0 ? (grade.score / grade.scale) * targetScale : 0;
    weightedTotal += normalized * component.weight;
    totalWeight += component.weight;
  });

  if (formula.missing_grade_policy === "block" && missing.length > 0) {
    return { result: null, missing, blocked: true };
  }

  return {
    result: totalWeight > 0 ? weightedTotal / totalWeight : null,
    missing,
    blocked: false,
  };
}
