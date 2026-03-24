import { expect, test } from "@playwright/test"
import type { PlatformChatMessage, PlatformChatThread } from "@/types/platform-shared"

test.describe("@db @messaging home chat dock moderation click audit", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" })

  test("audits report/block/unblock/mute interactions in HomeChatDock", async ({ page }) => {
    const profileState: Record<string, unknown> = {
      userId: "dock-audit-user",
      username: "dockaudit",
      email: "dock.audit@example.com",
      displayName: "Dock Audit",
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      preferredSports: ["NFL", "NHL", "NBA", "MLB", "NCAAB", "NCAAF", "SOCCER"],
    }

    const dmThreadId = "dock-dm-thread"
    const dmPartnerId = "dock-user-2"
    let isMuted = false
    let blockedUsers: Array<{ userId: string; username: string | null; displayName: string | null }> = []
    let reportMessageCalls = 0
    let reportUserCalls = 0
    let blockCalls = 0
    let unblockCalls = 0
    let muteCalls = 0

    const threads = (): PlatformChatThread[] => [
      {
        id: "league-room:league-1",
        threadType: "league",
        productType: "app",
        title: "League Chat",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        memberCount: 10,
        context: { leagueId: "league-1", sport: "NFL" },
      },
      {
        id: dmThreadId,
        threadType: "dm",
        productType: "shared",
        title: "Alex DM",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        memberCount: 2,
        context: { otherUserId: dmPartnerId, otherUsername: "alex", otherDisplayName: "Alex", isMuted },
      },
      {
        id: "ai-thread-1",
        threadType: "ai",
        productType: "legacy",
        title: "AI Chat",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        memberCount: 1,
        context: { sport: "NFL" },
      },
    ]

    const messagesByThread: Record<string, PlatformChatMessage[]> = {
      [dmThreadId]: [
        {
          id: "dock-msg-1",
          threadId: dmThreadId,
          senderUserId: dmPartnerId,
          senderName: "Alex",
          senderUsername: "alex",
          messageType: "text",
          body: "Dock moderation audit message",
          createdAt: new Date().toISOString(),
        },
      ],
      "league-room:league-1": [],
      "ai-thread-1": [],
    }

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "user-1", name: "Dock Audit", email: "dock.audit@example.com" },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      })
    })

    await page.route("**/api/user/settings", async (route) => {
      if (route.request().method() !== "GET") return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profile: profileState, settings: {} }),
      })
    })

    await page.route("**/api/user/profile", async (route) => {
      if (route.request().method() !== "GET") return route.fallback()
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profileState) })
    })

    await page.route("**/api/shared/notifications?**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notifications: [] }) })
    })

    await page.route("**/api/shared/chat/**", async (route) => {
      const req = route.request()
      const method = req.method()
      const url = new URL(req.url())
      const path = url.pathname

      if (path === "/api/shared/chat/threads" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "ok", threads: threads() }),
        })
      }

      if (path === "/api/shared/chat/blocked" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "ok", blockedUsers }),
        })
      }

      if (path === "/api/shared/chat/league-meta" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            meta: {
              lastViewed: new Date().toISOString(),
              bestTeam: "Audit Team",
              worstTeam: "Bench Mob",
              bestPlayer: "Player One",
              streak: "W2",
            },
          }),
        })
      }

      if (path === "/api/shared/chat/block" && method === "POST") {
        blockCalls += 1
        blockedUsers = [{ userId: dmPartnerId, username: "alex", displayName: "Alex" }]
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) })
      }

      if (path === "/api/shared/chat/unblock" && method === "POST") {
        unblockCalls += 1
        blockedUsers = []
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok" }) })
      }

      if (path === "/api/shared/chat/report/message" && method === "POST") {
        reportMessageCalls += 1
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", reportId: "dock-msg-report" }) })
      }

      if (path === "/api/shared/chat/report/user" && method === "POST") {
        reportUserCalls += 1
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", reportId: "dock-user-report" }) })
      }

      const threadMatch = path.match(/^\/api\/shared\/chat\/threads\/([^/]+)(?:\/(.*))?$/)
      if (!threadMatch) return route.fallback()
      const threadId = decodeURIComponent(threadMatch[1] ?? "")
      const rest = threadMatch[2] ?? ""

      if (rest === "messages" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            messages: messagesByThread[threadId] ?? [],
            hiddenBlockedCount: blockedUsers.length > 0 && threadId === dmThreadId ? 1 : 0,
          }),
        })
      }

      if (rest === "messages" && method === "POST") {
        let body: Record<string, unknown> = {}
        try {
          body = (req.postDataJSON() as Record<string, unknown>) ?? {}
        } catch {
          body = {}
        }
        const created: PlatformChatMessage = {
          id: `dock-msg-${Date.now()}`,
          threadId,
          senderUserId: "user-1",
          senderName: "Dock Audit",
          messageType: typeof body?.messageType === "string" ? body.messageType : "text",
          body: typeof body?.body === "string" ? body.body : "",
          createdAt: new Date().toISOString(),
        }
        messagesByThread[threadId] = [...(messagesByThread[threadId] ?? []), created]
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", message: created }) })
      }

      if (rest === "mute" && method === "POST") {
        muteCalls += 1
        let body: Record<string, unknown> = {}
        try {
          body = (req.postDataJSON() as Record<string, unknown>) ?? {}
        } catch {
          body = {}
        }
        isMuted = Boolean(body?.muted)
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", muted: isMuted }) })
      }

      return route.fallback()
    })

    await page.goto("/e2e/home-chat-dock-audit")
    await page.waitForTimeout(1000)
    const dbConfigErrorVisible = await page
      .getByText("DATABASE_URL is not set. Add it to your local environment and Vercel project settings.")
      .isVisible()
      .catch(() => false)
    test.skip(dbConfigErrorVisible, "HomeChatDock moderation audit unavailable without DATABASE_URL in web server environment")

    const launcher = page.locator("button.fixed.bottom-4.right-4").first()
    await launcher.waitFor({ state: "visible" })
    let opened = false
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.evaluate(() => {
        const button = document.querySelector("button.fixed.bottom-4.right-4") as HTMLButtonElement | null
        button?.click()
      })
      opened = await page.getByText("AllFantasy Chat").isVisible().catch(() => false)
      if (opened) break
      await page.waitForTimeout(250)
    }
    expect(opened).toBe(true)

    await page.getByRole("button", { name: "DMs" }).click()
    await expect(page.getByText("Dock moderation audit message")).toBeVisible()

    const openActions = async () => {
      await page.locator('button[aria-label="Message actions"]').first().click()
    }

    await openActions()
    await page.getByRole("button", { name: "Report message" }).click()
    await expect(page.getByRole("heading", { name: "Report message" })).toBeVisible()
    await page.locator("select").first().selectOption("harassment")
    await page.getByRole("button", { name: "Submit report" }).click()
    await expect(page.getByText("Report submitted. Thank you.")).toBeVisible()
    expect(reportMessageCalls).toBeGreaterThan(0)

    await openActions()
    await page.getByRole("button", { name: "Report Alex" }).click()
    await expect(page.getByRole("heading", { name: "Report user" })).toBeVisible()
    await page.locator("select").first().selectOption("spam")
    await page.getByRole("button", { name: "Submit report" }).click()
    await expect(page.getByText("Report submitted. Thank you.")).toBeVisible()
    expect(reportUserCalls).toBeGreaterThan(0)

    await openActions()
    await page.getByRole("button", { name: "Block Alex" }).click()
    await expect(page.getByRole("heading", { name: "Block user?" })).toBeVisible()
    await page.getByRole("button", { name: "Block", exact: true }).click()
    expect(blockCalls).toBeGreaterThan(0)

    await page.getByRole("button", { name: /Blocked users/i }).first().click()
    await expect(page.getByRole("button", { name: "Unblock" }).first()).toBeVisible()
    await page.getByRole("button", { name: "Unblock" }).first().click()
    expect(unblockCalls).toBeGreaterThan(0)

    await page.getByRole("button", { name: "Mute chat" }).click()
    await expect(page.getByRole("button", { name: "Unmute chat" })).toBeVisible()
    expect(muteCalls).toBeGreaterThan(0)
  })
})
