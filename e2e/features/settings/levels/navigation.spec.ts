import { test, expect } from "../../../fixtures/auth.fixture";
import { openSettings } from "../../../helpers/settings.navigation";

test("LEVEL-01 sépare les rubriques Cycles et Niveaux", async ({
  adminPage,
}) => {
  await openSettings(adminPage, "niveaux");
  await expect(adminPage.getByRole("link", { name: "Cycles" })).toBeVisible();
  await expect(adminPage.getByRole("link", { name: "Niveaux" })).toBeVisible();
  await expect(
    adminPage.getByText(/Les onglets suivent automatiquement/),
  ).toBeVisible();
});
