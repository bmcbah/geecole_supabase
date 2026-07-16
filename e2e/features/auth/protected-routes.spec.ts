import { test, expect } from "@playwright/test";

test("AUTH-03 redirige une session anonyme vers la connexion", async ({
  page,
}) => {
  await page.goto("/parametrage/cycles");
  await expect(page).toHaveURL(/connexion/);
});
