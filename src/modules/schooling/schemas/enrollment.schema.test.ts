import { describe, expect, it } from "vitest";
import { enrollmentSchema } from "./enrollment.schema";

const valid = { firstName: "Mamadou", lastName: "Diallo", gender: "male", birthDate: "2014-02-10", birthPlace: "Conakry", address: "Ratoma", guardianFirstName: "Aïssatou", guardianLastName: "Diallo", guardianPhone: "620000000", guardianRelationship: "mother", annualLevelId: "c2d2c8b8-06e4-4a62-b8f1-2a6dc98355b4", kind: "confirmed" };

describe("enrollmentSchema", () => {
  it("valide un dossier complet", () => expect(enrollmentSchema.safeParse(valid).success).toBe(true));
  it("refuse un dossier sans responsable", () => expect(enrollmentSchema.safeParse({ ...valid, guardianPhone: "" }).success).toBe(false));
  it("refuse un niveau invalide", () => expect(enrollmentSchema.safeParse({ ...valid, annualLevelId: "" }).success).toBe(false));
});
