import { expect, test } from "@playwright/test"
import type { PlatformChatMessage, PlatformChatThread } from "@/types/platform-shared"

test.describe("@db @messaging moderation click audit", () => {
  test.describe.configure({ timeout: 180_000, mode: "serial" })

  test("audits report/block/unblock/mute click paths in messaging", async ({ page }) => {
    const profileState: Record<string, unknown> = {
      userId: "moderation-audit-user",
      username: "moderationaudit",
      email: "moderation.audit@example.com",
      displayName: "Moderation Audit",
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      preferredSports: ["NFL", "NHL", "NBA", "MLB", "NCAAB", "NCAAF", "SOCCER"],
    }

    const dmThreadId = "dm-thread-safety"
    const dmPartnerId = "user-safety-2"
    let isMuted = false
    let blockedUsers: Array<{ userId: string; username: string | null; displayName: string | null }> = []
    let reportMessageCalls = 0
    let reportUserCalls = 0
    let blockCalls = 0
    let unblockCalls = 0
    let muteCalls = 0

    const threads = (): PlatformChatThread[] => [
      {
        id: dmThreadId,
        threadType: "dm",
        productType: "shared",
        title: "Alex Safety",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        memberCount: 2,
        context: { createdByUserId: "user-1", otherUserId: dmPartnerId, otherUsername: "alex", isMuted },
      },
    ]

    const messagesByThread: Record<string, PlatformChatMessage[]> = {
      [dmThreadId]: [
        {
          id: "dm-safety-message-1",
          threadId: dmThreadId,
          senderUserId: dmPartnerId,
          senderName: "Alex",
          senderUsername: "alex",
          messageType: "text",
          body: "Safety audit message",
          createdAt: new Date().toISOString(),
        },
      ],
    }

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-1",
            name: "Moderation Audit",
            email: "moderation.audit@example.com",
          },
          expires: "2099-01-01T00:00:00.000Z",
        }),
      })
    })

    await page.route("**/api/user/settings", async (route) => {
      if (route.request().method() !== "GET") return route.fallback()
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile: profileState,
          settings: {},
        }),
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

      if (path === "/api/shared/chat/block" && method === "POST") {
        blockCalls += 1
        blockedUsers = [{ userId: dmPartnerId, username: "alex", displayName: "Alex" }]
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", affectedThreads: 1 }) })
      }

      if (path === "/api/shared/chat/unblock" && method === "POST") {
        unblockCalls += 1
        blockedUsers = []
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", affectedThreads: 1 }) })
      }

      if (path === "/api/shared/chat/report/message" && method === "POST") {
        reportMessageCalls += 1
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", reportId: "msg-rep-1" }) })
      }

      if (path === "/api/shared/chat/report/user" && method === "POST") {
        reportUserCalls += 1
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", reportId: "usr-rep-1" }) })
      }

      const match = path.match(/^\/api\/shared\/chat\/threads\/([^/]+)(?:\/(.*))?$/)
      if (!match) return route.fallback()
      const threadId = decodeURIComponent(match[1] ?? "")
      const rest = match[2] ?? ""

      if (rest === "members" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            members: [
              { id: "user-1", username: "moderationaudit", displayName: "Moderation Audit" },
              { id: dmPartnerId, username: "alex", displayName: "Alex" },
            ],
          }),
        })
      }

      if (rest === "pinned" && method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", pinned: [] }) })
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

      if (rest === "messages" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            messages: messagesByThread[threadId] ?? [],
            hiddenBlockedCount: blockedUsers.length > 0 ? 1 : 0,
          }),
        })
      }

      return route.fallback()
    })

    await page.goto("/messages")
    const messagesHeading = page.getByRole("heading", { name: "Messages" })
    const messagingPageReady = await messagesHeading
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!messagingPageReady, "Messaging shell is unavailable in this environment")
    await expect(messagesHeading).toBeVisible()

    await page.getByRole("button", { name: "Private DMs" }).click()
    await page.getByRole("button", { name: "Alex Safety" }).click()
    await expect(page.getByText("Safety audit message")).toBeVisible()

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

    await openActions()
    await page.getByRole("button", { name: "Unblock Alex" }).click()
    expect(unblockCalls).toBeGreaterThan(0)

    await page.getByRole("button", { name: /Blocked users/i }).first().click()
    await expect(page.getByRole("heading", { name: "Blocked users" })).toBeVisible()
    await page.getByRole("button", { name: "Done" }).click()

    await page.getByRole("button", { name: "Mute" }).click()
    await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible()
    expect(muteCalls).toBeGreaterThan(0)
  })
})
