import { expect, test } from "@playwright/test";

const repoId = process.env.E2E_REPO_ID ?? "11111111-1111-1111-1111-111111111111";

async function mockWorkspace(page: import("@playwright/test").Page, cascaded: boolean) {
  await page.route("**/api/backend/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path.endsWith(`/repo/${repoId}/chats`) && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "session-1", title: "Session", created_at: new Date().toISOString() }]),
      });
      return;
    }

    if (path.endsWith(`/chats/session-1/messages`) && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            role: "assistant",
            content: cascaded ? "Escalated answer" : "Fast answer",
            model_used: cascaded ? "gemini-2.5-flash" : "gemma-4-26b-a4b-it",
            cascaded,
            fallback: !cascaded,
          },
        ]),
      });
      return;
    }

    if (path.endsWith(`/repo/${repoId}/branches`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ name: "main", indexed: true, is_default: true }]),
      });
      return;
    }

    if (path.endsWith(`/repo/${repoId}/index-status`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ indexed: true, chunk_count: 1 }) });
      return;
    }

    if (path.includes(`/repo/${repoId}/files/`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: "export const demo = 1;", language: "typescript" }),
      });
      return;
    }

    if (path.includes(`/repo/${repoId}/files`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: repoId,
          path: "",
          type: "directory",
          children: [{ name: "README.md", path: "README.md", type: "file" }],
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
}

test("shows Fast Mode indicator for non-cascaded response", async ({ page }) => {
  await mockWorkspace(page, false);
  await page.goto(`/repo/${repoId}`);

  await expect(page.getByText("Fast answer").first()).toBeVisible();
  await expect(page.getByTestId("escalation-indicator").first()).toBeVisible();
  await expect(page.getByText("Fast Mode").first()).toBeVisible();
});

test("shows Big Model indicator with amber pulse for cascaded response", async ({ page }) => {
  await mockWorkspace(page, true);
  await page.goto(`/repo/${repoId}`);

  await expect(page.getByText("Escalated answer").first()).toBeVisible();
  await expect(page.getByTestId("escalation-indicator").first()).toBeVisible();
  await expect(page.getByText("Big Model").first()).toBeVisible();
  await expect(page.getByTestId("escalation-indicator-dot").first()).toHaveClass(/bg-amber-500/);
});
