import {
  calculateFormulaPreview,
  type GradingFormula,
} from "./grading-formula";

export type EvaluationScoreStatus = "graded" | "absent" | "exempt" | "missing";

export interface EvaluationScore {
  assessment_type_code: string;
  score: number | null;
  scale: number;
  status: EvaluationScoreStatus;
}

export interface FormulaResolutionContext {
  academic_year_id: string;
  academic_year_cycle_id: string | null;
  academic_year_level_id: string | null;
  annual_subject_id: string | null;
  period_id: string | null;
}

export interface FormulaCalculationResult {
  formula: GradingFormula | null;
  variables: Record<string, number | null>;
  result: number | null;
  resolvedExpression: string | null;
  missing: string[];
  blocked: boolean;
  error?: string;
}

function scopeMatches(formula: GradingFormula, context: FormulaResolutionContext) {
  if (!formula.is_active || formula.academic_year_id !== context.academic_year_id) return false;
  if (formula.academic_year_cycle_id && formula.academic_year_cycle_id !== context.academic_year_cycle_id) return false;
  if (formula.academic_year_level_id && formula.academic_year_level_id !== context.academic_year_level_id) return false;
  if (formula.annual_subject_id && formula.annual_subject_id !== context.annual_subject_id) return false;

  if (formula.temporal_scope === "period") {
    return Boolean(formula.period_id && formula.period_id === context.period_id);
  }

  return formula.period_id === null;
}

function specificity(formula: GradingFormula) {
  return [
    formula.academic_year_cycle_id,
    formula.academic_year_level_id,
    formula.annual_subject_id,
    formula.temporal_scope === "period" ? formula.period_id : null,
  ].filter(Boolean).length;
}

export function resolveGradingFormula(
  formulas: GradingFormula[],
  context: FormulaResolutionContext,
) {
  const matching = formulas
    .filter((formula) => scopeMatches(formula, context))
    .sort((left, right) => {
      const specificityDifference = specificity(right) - specificity(left);
      if (specificityDifference !== 0) return specificityDifference;
      if (left.is_default !== right.is_default) return left.is_default ? -1 : 1;
      return right.version - left.version;
    });

  return matching[0] ?? null;
}

export function aggregateEvaluationVariables(
  scores: EvaluationScore[],
  variableCodes: string[],
  targetScale = 20,
) {
  const variables: Record<string, number | null> = {};

  for (const rawCode of variableCodes) {
    const code = rawCode.toUpperCase();
    const usableScores = scores.filter(
      (score) =>
        score.assessment_type_code.toUpperCase() === code &&
        score.status === "graded" &&
        score.score !== null &&
        score.scale > 0,
    );

    if (usableScores.length === 0) {
      variables[code] = null;
      continue;
    }

    const normalized = usableScores.map((score) =>
      ((score.score as number) / score.scale) * targetScale,
    );
    variables[code] = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  }

  return variables;
}

export function calculateResolvedFormula(
  formulas: GradingFormula[],
  context: FormulaResolutionContext,
  scores: EvaluationScore[],
  targetScale = 20,
): FormulaCalculationResult {
  const formula = resolveGradingFormula(formulas, context);
  if (!formula) {
    return {
      formula: null,
      variables: {},
      result: null,
      resolvedExpression: null,
      missing: [],
      blocked: true,
      error: "Aucune formule active ne correspond à ce périmètre.",
    };
  }

  const variables = aggregateEvaluationVariables(
    scores,
    formula.definition.variables,
    targetScale,
  );
  const calculation = calculateFormulaPreview(
    formula.expression,
    variables,
    formula.definition.missing_grade_policy,
  );

  return {
    formula,
    variables,
    result: calculation.result,
    resolvedExpression: calculation.resolvedExpression,
    missing: calculation.missing,
    blocked: calculation.blocked,
    error: calculation.error,
  };
}
