import { describe, expect, it } from "vitest"
import {
  getProtectedNavStateFullShell,
  getProtectedNavStateMinimalShell,
} from "@/lib/navigation"

describe("protected nav resolver", () => {
  it("shows authenticated-only controls in full shell", () => {
    const authed = getProtectedNavStateFullShell(true, false)
    expect(authed.showPrimaryNav).toBe(true)
    expect(authed.showUserMenu).toBe(true)
    expect(authed.showAuthLinks).toBe(false)

    const guest = getProtectedNavStateFullShell(false, false)
    expect(guest.showPrimaryNav).toBe(false)
    expect(guest.showUserMenu).toBe(false)
    expect(guest.showAuthLinks).toBe(true)
  })

  it("always keeps primary nav available in minimal shell", () => {
    const guest = getProtectedNavStateMinimalShell(false, false)
    expect(guest.showPrimaryNav).toBe(true)
    expect(guest.showUserMenu).toBe(false)
    expect(guest.showAuthLinks).toBe(true)
  })

  it("includes admin nav item when admin", () => {
    const adminState = getProtectedNavStateFullShell(true, true)
    expect(adminState.primaryItems.some((item) => item.href === "/admin")).toBe(true)
  })
})
