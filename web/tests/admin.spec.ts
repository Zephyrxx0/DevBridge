import { expect, test } from "@playwright/test";

const apiBase = process.env.E2E_API_URL ?? "http://localhost:8000";
const fakeRepoId = "11111111-1111-1111-1111-111111111111";

test("admin endpoints require authentication", async ({ request }) => {
  const response = await request.get(`${apiBase}/admin/repo/${fakeRepoId}/reports`);
  expect([401, 403]).toContain(response.status());
});

test("reports endpoint rejects path traversal filenames", async ({ request }) => {
  const response = await request.get(`${apiBase}/admin/reports/..%2F..%2Fetc%2Fpasswd`, {
    headers: {
      "X-Internal-Auth": process.env.INTERNAL_AUTH_TOKEN ?? "",
    },
  });

  expect([400, 404]).toContain(response.status());
});
