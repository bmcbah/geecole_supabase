import { describe, expect, it } from "vitest";
import {
  isPastOrToday,
  isValidEmail,
  isValidGuineaPhone,
  normalizeGuineaPhone,
} from "./personnel-validation";

describe("personnel validation", () => {
  it("accepts Guinean local and international phone formats", () => {
    expect(isValidGuineaPhone("622 12 34 56")).toBe(true);
    expect(isValidGuineaPhone("+224 622 12 34 56")).toBe(true);
    expect(isValidGuineaPhone("1234")).toBe(false);
    expect(normalizeGuineaPhone("+224 (622) 12-34-56")).toBe("+224622123456");
  });

  it("validates optional email and dates", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail("rh@ecole.gn")).toBe(true);
    expect(isValidEmail("rh@ecole")).toBe(false);
    expect(isPastOrToday("2999-01-01")).toBe(false);
  });
});
