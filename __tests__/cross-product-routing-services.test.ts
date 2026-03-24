import { describe, expect, it } from "vitest"
import {
  getLoginRedirectUrl,
  getProductSwitchHref,
  getProductSwitchItems,
  getUnauthorizedFallback,
  isPathInProduct,
} from "@/lib/routing"
import { getNotificationDestination } from "@/lib/notification-center"
import { getProductFromPath, isNavItemActive } from "@/lib/shell"
import type { PlatformNotification } from "@/types/platform-shared"

function makeNotification(
  overrides: Partial<PlatformNotification> = {}
): PlatformNotification {
  return {
    id: "n1",
    type: "notification",
    title: "Test notification",
    product: "shared",
    read: false,
    createdAt: new Date().toISOString(),
    meta: {},
    ...overrides,
  }
}

describe("cross-product routing services", () => {
  it("uses canonical switch targets for each product", () => {
    expect(getProductSwitchHref("home")).toBe("/dashboard")
    expect(getProductSwitchHref("webapp")).toBe("/app/home")
    expect(getProductSwitchHref("bracket")).toBe("/brackets")
    expect(getProductSwitchHref("legacy")).toBe("/af-legacy")

    expect(getProductSwitchItems()).toEqual([
      { productId: "home", href: "/dashboard", label: "Home" },
      { productId: "webapp", href: "/app/home", label: "WebApp" },
      { productId: "bracket", href: "/brackets", label: "Bracket" },
      { productId: "legacy", href: "/af-legacy", label: "Legacy" },
    ])
  })

  it("keeps webapp context active across /app and /leagues routes", () => {
    expect(isPathInProduct("/app/home", "webapp")).toBe(true)
    expect(isPathInProduct("/leagues/league-1", "webapp")).toBe(true)
    expect(getProductFromPath("/leagues/league-1")).toBe("webapp")
    expect(isNavItemActive("/leagues/league-1", "/app")).toBe(true)
  })

  it("returns safe unauthorized fallbacks", () => {
    expect(getUnauthorizedFallback(false, false, "/brackets")).toBe(
      getLoginRedirectUrl("/brackets")
    )
    expect(getUnauthorizedFallback(true, false, "/admin?tab=overview")).toBe(
      "/dashboard"
    )
    expect(getUnauthorizedFallback(true, false, "/settings")).toBe("/dashboard")
  })

  it("sanitizes notification deep links before routing", () => {
    const blocked = getNotificationDestination(
      makeNotification({
        product: "bracket",
        meta: { actionHref: "//evil.example/path", actionLabel: "Open now" },
      })
    )
    expect(blocked).toEqual({ href: "/brackets", label: "Open now" })

    const allowed = getNotificationDestination(
      makeNotification({
        product: "app",
        meta: { actionHref: "/app/home?sport=SOCCER", actionLabel: "Open app" },
      })
    )
    expect(allowed).toEqual({ href: "/app/home?sport=SOCCER", label: "Open app" })
  })
})
