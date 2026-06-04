import { readdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf-8")
}

function routeFiles(dir: string): string[] {
  const absolute = resolve(process.cwd(), dir)
  return readdirSync(absolute).flatMap((entry) => {
    const rel = `${dir}/${entry}`.replaceAll("\\", "/")
    const full = resolve(process.cwd(), rel)
    if (statSync(full).isDirectory()) return routeFiles(rel)
    return entry === "route.ts" ? [rel] : []
  })
}

describe("admin API server-side protection", () => {
  it("keeps every /api/admin route behind an explicit server gate", () => {
    const adminApiRoutes = routeFiles("app/api/admin")

    for (const route of adminApiRoutes) {
      const source = read(route)
      const hasAdminGate =
        source.includes("requireAdmin(") ||
        source.includes("requireAdminOrBearer(") ||
        source.includes("getAdminAccessState(")
      const hasBootstrapGate =
        route.includes("/bootstrap/") &&
        source.includes("ADMIN_BOOTSTRAP_ENABLED") &&
        source.includes("ADMIN_BOOTSTRAP_PASSWORD")

      expect(
        hasAdminGate || hasBootstrapGate,
        `${route} must be protected by admin auth or explicit bootstrap env gating`
      ).toBe(true)
    }
  })
})
