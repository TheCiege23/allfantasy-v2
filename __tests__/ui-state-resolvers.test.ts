import { describe, expect, it } from "vitest"
import {
  resolveFallbackRoute,
  resolveNoResultsState,
  resolveRecoveryActions,
} from "@/lib/ui-state"

describe("ui-state resolvers", () => {
  it("resolves canonical fallback routes", () => {
    expect(resolveFallbackRoute("dashboard")).toEqual({
      href: "/dashboard",
      label: "Go to dashboard",
    })
    expect(resolveFallbackRoute("create_league")).toEqual({
      href: "/create-league",
      label: "Create league",
    })
    expect(resolveFallbackRoute("join_bracket")).toEqual({
      href: "/brackets/join",
      label: "Join bracket challenge",
    })
  })

  it("returns actionable recovery actions by context", () => {
    const dashboardActions = resolveRecoveryActions("dashboard")
    expect(dashboardActions.map((action) => action.href)).toEqual([
      "/create-league",
      "/import",
      "/messages?tab=ai&sport=NFL&source=fallback",
    ])

    const notificationsActions = resolveRecoveryActions("notifications")
    expect(notificationsActions[0]?.href).toBe("/dashboard")
  })

  it("distinguishes no-results states for search and notifications", () => {
    const search = resolveNoResultsState({ context: "search", query: "mahomes" })
    expect(search.title).toContain("mahomes")
    expect(search.actions.some((action) => action.action === "clear_query")).toBe(true)

    const notifications = resolveNoResultsState({ context: "notifications" })
    expect(notifications.title).toBe("No notifications yet")
    expect(notifications.actions.map((action) => action.href)).toContain("/settings")
  })
})
