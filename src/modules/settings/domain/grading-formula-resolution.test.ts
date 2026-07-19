import { describe, expect, it } from "vitest";
import type { GradingFormula } from "./grading-formula";
import {
  aggregateEvaluationVariables,
  calculateResolvedFormula,
  resolveGradingFormula,
} from "./grading-formula-resolution";

const baseFormula: GradingFormula = {
  id: "formula-year",
  institution_id: "institution",
  academic_year_id: "year",
  name: "Formule annuelle",
  code: "ANNUAL",
  expression: "(EVAL + COMP * 2) / 3",
  description: null,
  is_default: true,
  is_active: true,
  version: 1,
  definition: {
    language_version: 1,
    missing_grade_policy: "block",
    variables: ["EVAL", "COMP"],
  },
  academic_year_cycle_id: "cycle",
  academic_year_level_id: null,
  annual_subject_id: null,
  temporal_scope: "year",
  period_id: null,
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z",
};

const context = {
  academic_year_id: "year",
  academic_year_cycle_id: "cycle",
  academic_year_level_id: "level",
  annual_subject_id: "subject",
  period_id: "period-1",
};

describe("resolveGradingFormula", () => {
  it("retient la formule la plus spécifique", () => {
    const subjectFormula: GradingFormula = {
      ...baseFormula,
      id: "formula-subject",
      is_default: false,
      academic_year_level_id: "level",
      annual_subject_id: "subject",
    };
    const periodFormula: GradingFormula = {
      ...subjectFormula,
      id: "formula-period",
      temporal_scope: "period",
      period_id: "period-1",
    };

    expect(resolveGradingFormula([baseFormula, subjectFormula, periodFormula], context)?.id)
      .toBe("formula-period");
  });

  it("ignore une formule d'une autre période", () => {
    const otherPeriod: GradingFormula = {
      ...baseFormula,
      id: "other-period",
      temporal_scope: "period",
      period_id: "period-2",
    };

    expect(resolveGradingFormula([baseFormula, otherPeriod], context)?.id)
      .toBe("formula-year");
  });
});

describe("aggregateEvaluationVariables", () => {
  it("normalise les notes avant de calculer la moyenne du type", () => {
    const values = aggregateEvaluationVariables([
      { assessment_type_code: "EVAL", score: 8, scale: 10, status: "graded" },
      { assessment_type_code: "EVAL", score: 16, scale: 20, status: "graded" },
      { assessment_type_code: "EVAL", score: null, scale: 20, status: "missing" },
    ], ["EVAL"], 20);

    expect(values.EVAL).toBe(16);
  });

  it("retourne null lorsqu'aucune note exploitable n'existe", () => {
    const values = aggregateEvaluationVariables([
      { assessment_type_code: "COMP", score: null, scale: 20, status: "absent" },
      { assessment_type_code: "COMP", score: null, scale: 20, status: "exempt" },
    ], ["COMP"]);

    expect(values.COMP).toBeNull();
  });
});

describe("calculateResolvedFormula", () => {
  it("résout la formule, agrège les variables et calcule le résultat", () => {
    const result = calculateResolvedFormula([baseFormula], context, [
      { assessment_type_code: "EVAL", score: 14, scale: 20, status: "graded" },
      { assessment_type_code: "COMP", score: 16, scale: 20, status: "graded" },
      { assessment_type_code: "COMP", score: 18, scale: 20, status: "graded" },
    ]);

    expect(result.formula?.id).toBe("formula-year");
    expect(result.variables).toEqual({ EVAL: 14, COMP: 17 });
    expect(result.result).toBe(16);
    expect(result.blocked).toBe(false);
  });

  it("bloque le calcul lorsqu'une variable obligatoire manque", () => {
    const result = calculateResolvedFormula([baseFormula], context, [
      { assessment_type_code: "EVAL", score: 14, scale: 20, status: "graded" },
    ]);

    expect(result.result).toBeNull();
    expect(result.missing).toEqual(["COMP"]);
    expect(result.blocked).toBe(true);
  });
});
