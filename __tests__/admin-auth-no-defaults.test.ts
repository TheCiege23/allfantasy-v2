import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf-8")
}

describe("admin auth defaults", () => {
  it("does not hardcode a default admin password", () => {
    expect(read("lib/adminSession.ts")).not.toContain("admin123")
    expect(read("app/api/auth/login/route.ts")).not.toContain("admin123")
  })

  it("/admin is server-protected and dashboard does not host admin widgets", () => {
    const adminPage = read("app/admin/page.tsx")
    const dashboardPage = read("app/dashboard/page.tsx")

    expect(adminPage).toContain("requireAdmin")
    expect(adminPage).toContain('redirect("/admin-login?next=/admin")')
    expect(dashboardPage).not.toContain("AiUsageMonitorPanel")
    expect(dashboardPage).not.toContain("AI Ops Monitor")
  })
})
