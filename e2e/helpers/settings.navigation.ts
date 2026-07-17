import { expect, type Page } from "@playwright/test";

export async function openSettings(page: Page, section: string) {
  await page.goto(`/parametrage/${section}`);
  await expect(
    page.getByRole("heading", { name: "Paramétrage" }),
  ).toBeVisible();
}
