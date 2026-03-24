import { describe, expect, it } from "vitest"
import { getAdminNavItem, showAdminNav } from "@/lib/navigation"

describe("admin nav visibility resolver", () => {
  it("shows admin navigation only for admin users", () => {
    expect(showAdminNav(true)).toBe(true)
    expect(showAdminNav(false)).toBe(false)
  })

  it("returns canonical admin nav item", () => {
    const item = getAdminNavItem()
    expect(item.href).toBe("/admin")
    expect(item.label).toBe("Admin")
  })
})
