import { describe, expect, it } from "vitest"
import {
  SHELL_NAV_ITEMS,
  PRODUCT_SWITCHER_ITEMS,
  getActiveNavHref,
  isNavItemActive,
} from "@/lib/shell"

describe("active nav state resolver", () => {
  it("includes legacy in shell nav and product switcher", () => {
    expect(SHELL_NAV_ITEMS.some((item) => item.href === "/af-legacy")).toBe(true)
    expect(PRODUCT_SWITCHER_ITEMS.some((item) => item.href === "/af-legacy")).toBe(true)
  })

  it("treats legacy routes as active for af-legacy item", () => {
    expect(isNavItemActive("/af-legacy", "/af-legacy")).toBe(true)
    expect(isNavItemActive("/af-legacy?tab=chat".split("?")[0], "/af-legacy")).toBe(true)
    expect(isNavItemActive("/legacy/import", "/af-legacy")).toBe(true)
  })

  it("resolves active href for tools and legacy prefixes", () => {
    expect(getActiveNavHref("/tools/waiver-wire")).toBe("/tools-hub")
    expect(getActiveNavHref("/legacy/players")).toBe("/af-legacy")
  })
})
