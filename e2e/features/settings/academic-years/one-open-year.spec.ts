import { test, expect } from "../../../fixtures/auth.fixture";
import { openSettings } from "../../../helpers/settings.navigation";

test("YEAR-04 expose une seule année en cours dans le contexte global", async ({
  adminPage,
}) => {
  await openSettings(adminPage, "annees-scolaires");
  await expect(adminPage.getByText(/Paramétrage affiché/)).toBeVisible();
  await expect(adminPage.locator(".settings-year-context strong")).toHaveCount(
    1,
  );
});
