import { describe, expect, it } from "vitest";
import { gradeStatusLabel, normalizeGradeEntry, validateGradeEntry } from "./gradebook";

describe("gradebook domain", () => {
  it("accepts a graded score inside the assessment scale", () => {
    expect(validateGradeEntry({ enrollment_id: "e1", status: "graded", score: 14.5, comment: null }, 20)).toBeNull();
  });

  it("rejects a score above the assessment scale", () => {
    expect(validateGradeEntry({ enrollment_id: "e1", status: "graded", score: 21, comment: null }, 20)).toContain("0 et 20");
  });

  it("requires a score for a graded entry", () => {
    expect(validateGradeEntry({ enrollment_id: "e1", status: "graded", score: null, comment: null }, 20)).toBe("La note est obligatoire.");
  });

  it("removes the score from absent and exempt entries", () => {
    expect(normalizeGradeEntry({ enrollment_id: "e1", status: "absent", score: 12, comment: "  Justifié  " })).toEqual({
      enrollment_id: "e1",
      status: "absent",
      score: null,
      comment: "Justifié",
    });
  });

  it("exposes the French labels", () => {
    expect(gradeStatusLabel("missing")).toBe("Non noté");
    expect(gradeStatusLabel("exempt")).toBe("Dispensé");
  });
});
