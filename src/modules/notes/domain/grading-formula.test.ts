import { describe, expect, it } from "vitest";
import { calculateCourseAverage } from "./grading-formula";

describe("calculateCourseAverage", () => {
  it("applies weights configured by assessment type", () => {
    const result = calculateCourseAverage(
      [
        { value: 10, scale: 20, assessmentTypeCode: "DEVOIR" },
        { value: 18, scale: 20, assessmentTypeCode: "COMPO" },
      ],
      { weights: { DEVOIR: 1, COMPO: 2 }, rounding: 2 },
    );
    expect(result).toEqual({ average: 15.33, missingTypeCodes: [] });
  });

  it("normalizes different scales to twenty", () => {
    const result = calculateCourseAverage(
      [
        { value: 8, scale: 10, assessmentTypeCode: "ORAL" },
        { value: 16, scale: 20, assessmentTypeCode: "DS" },
      ],
      { weights: { ORAL: 1, DS: 1 }, rounding: 2 },
    );
    expect(result.average).toBe(16);
  });

  it("blocks calculation when a used type has no configured weight", () => {
    const result = calculateCourseAverage(
      [{ value: 15, scale: 20, assessmentTypeCode: "TP" }],
      { weights: { DS: 1 } },
    );
    expect(result).toEqual({ average: null, missingTypeCodes: ["TP"] });
  });
});
