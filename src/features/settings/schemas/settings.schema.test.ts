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
});
