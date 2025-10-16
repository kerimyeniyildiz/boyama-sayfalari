import { expect, test } from "@playwright/test";

test.describe("Kamu sayfaları", () => {
  test("ana sayfa yüklenir", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /yaratıcı boyama dünyası/i })).toBeVisible();
  });

  test("arama formu görüntülenir", async ({ page }) => {
    await page.goto("/ara");
    await expect(page.getByLabel("Anahtar kelime")).toBeVisible();
  });
});
