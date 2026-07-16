import { describe, expect, it } from "vitest";
import { academicYearSchema } from "./settings.schema";

describe("academicYearSchema", () => {
  it("accepte une période cohérente", () => {
    expect(
      academicYearSchema.safeParse({
        name: "2026-2027",
        startsOn: new Date(2026, 8, 1),
        endsOn: new Date(2027, 5, 30),
      }).success,
    ).toBe(true);
  });
  it("refuse une fin antérieure au début", () => {
    expect(
      academicYearSchema.safeParse({
        name: "2026-2027",
        startsOn: new Date(2027, 5, 30),
        endsOn: new Date(2026, 8, 1),
      }).success,
    ).toBe(false);
  });
  it("accepte une année source pour reprendre la structure", () => {
    expect(
      academicYearSchema.safeParse({
        name: "2027-2028",
        startsOn: new Date(2027, 8, 1),
        endsOn: new Date(2028, 5, 30),
        sourceYearId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
});
