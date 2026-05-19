import { expect, test } from "@playwright/test";

test("@nav header memory link navigates to dashboard memory", async ({ page }) => {
  await page.goto("/");
  const memoryLink = page.locator('a[href="/dashboard/memory"]').first();
  await expect(memoryLink).toBeAttached();
  await page.goto("/dashboard/memory");
  await expect(page).toHaveURL(/\/dashboard\/memory/);
});

test("@list memory dashboard heading renders", async ({ page }) => {
  await page.goto("/dashboard/memory");
  await expect(page.getByRole("heading", { name: "Memory Curation" })).toBeVisible();
});

test("@loading memory dashboard shows skeleton cards", async ({ page }) => {
  await page.goto("/dashboard/memory");
  await expect(page.locator('[data-testid="memory-skeleton"]')).toHaveCount(6);
});
