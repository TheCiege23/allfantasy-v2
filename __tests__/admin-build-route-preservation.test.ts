import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const source = fs.readFileSync(
  path.join(process.cwd(), "scripts", "vercel-next-build.cjs"),
  "utf8",
)

describe("vercel build preserves admin routes", () => {
  it("does not exclude app/admin from the production route tree", () => {
    expect(source).not.toContain("path.join('app', 'admin'),")
  })

  it("keeps the live admin API endpoints that the admin UI calls", () => {
    expect(source).toContain("path.join('app', 'api', 'admin', 'bootstrap', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'status', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'production-health', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'email', 'broadcast', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'sports', 'sync', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'sports', 'provider-team-reconciliation', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'ai', 'provider-health', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'ai', 'audit-logs', 'route.ts')")
    expect(source).toContain("path.join('app', 'api', 'admin', 'world-cup', 'actions', 'route.ts')")
  })
})
