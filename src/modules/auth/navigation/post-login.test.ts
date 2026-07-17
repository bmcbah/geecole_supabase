import { describe, expect, it } from "vitest";
import { getPostLoginDestination } from "./post-login";

describe("getPostLoginDestination", () => {
  it("revient à la page initialement demandée", () => {
    expect(
      getPostLoginDestination({ from: "/parametrage/annees-scolaires" }),
    ).toBe("/parametrage/annees-scolaires");
  });
  it("utilise l’établissement par défaut", () => {
    expect(getPostLoginDestination(undefined)).toBe("/etablissement");
  });
  it("refuse une redirection externe", () => {
    expect(getPostLoginDestination({ from: "//example.com" })).toBe(
      "/etablissement",
    );
  });
});
