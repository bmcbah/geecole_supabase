import { describe, expect, it } from "vitest";
import {
  calculateFormulaPreview,
  validateFormulaExpression,
} from "./grading-formula";

describe("grading formula expression", () => {
  it("valide une expression avec les codes autorisés", () => {
    expect(validateFormulaExpression("(EVAL + COMP * 2) / 3", ["EVAL", "COMP"])).toEqual({
      valid: true,
      variables: ["EVAL", "COMP"],
      error: null,
    });
  });

  it("refuse un code inconnu", () => {
    const result = validateFormulaExpression("EVAL + TEST", ["EVAL"]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("TEST");
  });

  it("respecte les priorités opératoires", () => {
    const result = calculateFormulaPreview(
      "(EVAL + COMP * 2) / 3",
      { EVAL: 14, COMP: 17 },
      "block",
    );
    expect(result.result).toBe(16);
    expect(result.resolvedExpression).toBe("(14 + 17 * 2) / 3");
  });

  it("bloque quand une variable manque", () => {
    const result = calculateFormulaPreview(
      "(EVAL + COMP * 2) / 3",
      { EVAL: 14, COMP: null },
      "block",
    );
    expect(result.blocked).toBe(true);
    expect(result.missing).toEqual(["COMP"]);
  });
});
