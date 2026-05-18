import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

test("root layout enables system theme sync", async () => {
  const layoutPath = join(process.cwd(), "src", "app", "layout.tsx")
  const source = readFileSync(layoutPath, "utf8")

  expect(source).toContain('defaultTheme="system"')
  expect(source).toContain("enableSystem={true}")
})
