import { expect, test } from "@playwright/test";

test("landing hero shows premium polish requirements", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /learn any codebase/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Building" })).toBeVisible();

  const gradientText = page.locator("text=Modern Premium Polish").first();
  await expect(gradientText).toBeVisible();
});
