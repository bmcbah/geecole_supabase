import { test as base, expect, type Page } from "@playwright/test";

type AuthFixtures = { adminPage: Page };

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page }, use) => {
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(
      !email || !password,
      "E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD sont requis",
    );
    await page.goto("/connexion");
    await page.getByLabel(/e-mail/i).fill(email!);
    await page.getByLabel(/mot de passe/i).fill(password!);
    await page.getByRole("button", { name: /se connecter/i }).click();
    await expect(page).not.toHaveURL(/connexion/);
    await use(page);
  },
});
export { expect };
