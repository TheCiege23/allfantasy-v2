import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Vercel build route exclusions", () => {
  it("does not exclude the production admin command center", () => {
    const source = readFileSync(
      path.join(process.cwd(), "scripts", "vercel-next-build.cjs"),
      "utf8"
    )

    expect(source).not.toContain("path.join('app', 'admin')")
    expect(source).not.toContain("path.join('app', 'api', 'admin')")
  })
})
