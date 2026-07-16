import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";
describe("loginSchema", () => {
  it("accepte des identifiants valides", () => {
    expect(
      loginSchema.safeParse({ email: "admin@ecole.gn", password: "motdepasse" })
        .success,
    ).toBe(true);
  });
  it("refuse un e-mail invalide", () => {
    expect(
      loginSchema.safeParse({ email: "admin", password: "motdepasse" }).success,
    ).toBe(false);
  });
});
