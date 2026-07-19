import { describe, expect, it } from "vitest";
import { calculateFormulaPreview, type GradingFormulaDefinition } from "./grading-formula";

const formula: GradingFormulaDefinition = {
  method: "weighted_average",
  missing_grade_policy: "ignore",
  components: [
    { assessment_type_id: "devoir", weight: 1 },
    { assessment_type_id: "composition", weight: 2 },
  ],
};

describe("calculateFormulaPreview", () => {
  it("normalise les barèmes et applique les poids de l’école", () => {
    const result = calculateFormulaPreview(formula, [
      { assessment_type_id: "devoir", score: 8, scale: 10 },
      { assessment_type_id: "composition", score: 14, scale: 20 },
    ]);

    expect(result.blocked).toBe(false);
    expect(result.result).toBeCloseTo(14.6667, 3);
  });

  it("ignore une note manquante selon la règle configurée", () => {
    const result = calculateFormulaPreview(formula, [
      { assessment_type_id: "devoir", score: 12, scale: 20 },
      { assessment_type_id: "composition", score: null, scale: 20 },
    ]);

    expect(result.result).toBe(12);
    expect(result.missing).toEqual(["composition"]);
  });

  it("bloque le calcul lorsque l’école le demande", () => {
    const result = calculateFormulaPreview(
      { ...formula, missing_grade_policy: "block" },
      [
        { assessment_type_id: "devoir", score: 12, scale: 20 },
        { assessment_type_id: "composition", score: null, scale: 20 },
      ],
    );

    expect(result.blocked).toBe(true);
    expect(result.result).toBeNull();
  });
});
