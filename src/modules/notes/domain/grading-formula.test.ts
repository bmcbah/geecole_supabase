import { describe, expect, it } from "vitest";
import {
  calculateCourseAverage,
  listFormulaVariables,
} from "./grading-formula";

describe("calculateCourseAverage", () => {
  it("évalue l'expression avec les types de notes comme variables", () => {
    const result = calculateCourseAverage(
      [
        { value: 10, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 18, scale: 20, assessmentTypeCode: "COMPO" },
      ],
      { expression: "(DEVOIR + COMPO * 2) / 3", rounding: 2 },
    );
    expect(result).toEqual({ average: 15.33, missingTypeCodes: [] });
  });

  it("calcule le cas affiché avec la moyenne de chaque type", () => {
    const result = calculateCourseAverage(
      [
        { value: 17, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 14.5, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 16, scale: 20, assessmentTypeCode: "INTERRO" },
      ],
      { expression: "(DEVOIR + INTERRO * 2) / 3", rounding: 2 },
    );
    expect(result.average).toBe(15.92);
  });

  it("refuse une formule qui produit une moyenne hors barème", () => {
    const result = calculateCourseAverage(
      [
        { value: 17, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 14.5, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 16, scale: 20, assessmentTypeCode: "INTERRO" },
      ],
      { expression: "(DEVOIR + INTERRO * 2) / 2", rounding: 2 },
    );
    expect(result.average).toBeNull();
    expect(result.error).toContain("Résultat hors barème");
  });

  it("utilise la moyenne des évaluations d'un même type", () => {
    const result = calculateCourseAverage(
      [
        { value: 6, scale: 10, assessmentTypeCode: "DS" },
        { value: 16, scale: 20, assessmentTypeCode: "DS" },
      ],
      { expression: "DS" },
    );
    expect(result.average).toBe(14);
  });

  it("bloque lorsqu'une variable requise ne possède aucune note", () => {
    const result = calculateCourseAverage(
      [{ value: 15, scale: 20, assessmentTypeCode: "DS" }],
      { expression: "(DS + COMPO * 2) / 3" },
    );
    expect(result).toEqual({ average: null, missingTypeCodes: ["COMPO"] });
  });

  it("refuse le code JavaScript et la division par zéro", () => {
    expect(
      calculateCourseAverage([], { expression: "alert(1)" }).average,
    ).toBeNull();
    expect(calculateCourseAverage([], { expression: "1 / 0" }).error).toBe(
      "Division par zéro",
    );
  });

  it("extrait les variables sans doublon", () => {
    expect(listFormulaVariables("(devoir + DEVOIR + compo) / 3")).toEqual([
      "DEVOIR",
      "COMPO",
    ]);
  });
});
