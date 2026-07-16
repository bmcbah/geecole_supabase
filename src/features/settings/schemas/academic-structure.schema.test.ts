import { describe, expect, it } from "vitest";
import { structureItemSchema } from "./academic-structure.schema";

describe("structureItemSchema", () => {
  it("normalise le code en majuscules", () => {
    expect(
      structureItemSchema.parse({
        name: "Primaire",
        code: "prim",
        sortOrder: 1,
        isActive: true,
      }).code,
    ).toBe("PRIM");
  });
  it("refuse un ordre négatif", () => {
    expect(
      structureItemSchema.safeParse({
        name: "Primaire",
        code: "PRIM",
        sortOrder: -1,
        isActive: true,
      }).success,
    ).toBe(false);
  });
});
