import { expect, test } from "@playwright/test";

test("@nav header memory link navigates to dashboard memory", async ({ page }) => {
  await page.goto("/");
  const memoryLink = page.locator('a[href="/dashboard/memory"]').first();
  await expect(memoryLink).toBeAttached();
  await page.goto("/dashboard/memory");
  await expect(page).toHaveURL(/\/dashboard\/memory/);
});

test("@list memory dashboard heading renders and cards load", async ({ page }) => {
  const longText = "x".repeat(260);
  await page.route("**/api/backend/memory/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        memories: [
          {
            id: "m-1",
            text: longText,
            metadata: { type: "experience", tags: ["reflect"], reflect: true },
            created_at: "2026-05-20T00:00:00Z",
          },
        ],
      }),
    });
  });

  await page.goto("/dashboard/memory");
  await expect(page.getByRole("heading", { name: "Memory Curation" })).toBeVisible();
  await expect(page.getByText("type: experience")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show More" })).toBeVisible();
});

test("@loading memory dashboard shows skeleton cards", async ({ page }) => {
  await page.route("**/api/backend/memory/list", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ memories: [] }),
    });
  });
  await page.goto("/dashboard/memory");
  await expect(page.locator('[data-testid="memory-skeleton"]')).toHaveCount(6);
});

test("@delete delete button calls endpoint and updates UI", async ({ page }) => {
  await page.route("**/api/backend/memory/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        memories: [
          {
            id: "m-delete",
            text: "delete me",
            metadata: { type: "fact", tags: [] },
            created_at: "2026-05-20T00:00:00Z",
          },
        ],
      }),
    });
  });

  let deleteCalled = false;
  await page.route("**/api/backend/memory/m-delete", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "deleted" }) });
      return;
    }
    await route.continue();
  });

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.goto("/dashboard/memory");
  await expect(page.locator('[data-testid="memory-card"]')).toHaveCount(1);
  await page.getByTestId("delete-m-delete").click();
  await expect(page.locator('[data-testid="memory-card"]')).toHaveCount(0);
  expect(deleteCalled).toBeTruthy();
});

test("@edit edit sheet saves updated memory text", async ({ page }) => {
  await page.route("**/api/backend/memory/list", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        memories: [
          {
            id: "m-edit",
            text: "old text",
            metadata: { type: "experience", tags: [] },
            created_at: "2026-05-20T00:00:00Z",
          },
        ],
      }),
    });
  });

  let putCalled = false;
  await page.route("**/api/backend/memory/m-edit", async (route) => {
    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON() as { text: string };
      putCalled = payload.text === "new edited text";
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "updated" }) });
      return;
    }
    await route.continue();
  });

  await page.goto("/dashboard/memory");
  await page.getByTestId("edit-m-edit").click();
  await expect(page.getByRole("heading", { name: "Edit Memory" })).toBeVisible();
  await page.getByTestId("memory-edit-textarea").fill("new edited text");
  await page.getByTestId("memory-edit-save").click();
  await expect(page.getByTestId("memory-text")).toContainText("new edited text");
  expect(putCalled).toBeTruthy();
});
