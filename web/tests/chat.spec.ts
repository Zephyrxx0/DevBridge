import { expect, test } from "@playwright/test";

const repoId = process.env.E2E_REPO_ID ?? "11111111-1111-1111-1111-111111111111";

test("chat workspace renders sidebar landmark", async ({ page }) => {
  await page.goto(`/repo/${repoId}`);

  const sidebar = page.locator("aside, nav").first();
  await expect(sidebar).toBeVisible();
});

test("chat workspace renders chat stream region", async ({ page }) => {
  await page.goto(`/repo/${repoId}`);

  const stream = page.locator("main, [role='main'], [data-testid*='chat' i]").first();
  await expect(stream).toBeVisible();
});
