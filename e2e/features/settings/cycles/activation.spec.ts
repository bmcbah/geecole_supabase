import { test, expect } from "../../../fixtures/auth.fixture";
import { openSettings } from "../../../helpers/settings.navigation";

test.describe("Cycles de l’établissement", () => {
  test("CYCLE-01 charge le référentiel depuis Supabase", async ({
    adminPage,
  }) => {
    await openSettings(adminPage, "cycles");
    const catalog = adminPage.getByTestId("cycle-catalog");
    await expect(catalog).toBeVisible();
    for (const code of ["PRESCOLAIRE", "PRIMAIRE", "COLLEGE", "LYCEE"])
      await expect(adminPage.getByTestId(`cycle-${code}`)).toBeVisible();
  });

  test("CYCLE-02 conserve une activation après rechargement", async ({
    adminPage,
  }) => {
    await openSettings(adminPage, "cycles");
    const card = adminPage.getByTestId("cycle-PRIMAIRE");
    const button = adminPage.getByTestId("toggle-PRIMAIRE");
    const wasActive = await card
      .getByText("Actif", { exact: true })
      .isVisible();
    if (!wasActive) await button.click();
    await expect(card.getByText("Actif", { exact: true })).toBeVisible();
    await adminPage.reload();
    await expect(
      adminPage
        .getByTestId("cycle-PRIMAIRE")
        .getByText("Actif", { exact: true }),
    ).toBeVisible();
  });
});
