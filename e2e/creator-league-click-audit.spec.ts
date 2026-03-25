import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@community creator league click audit", () => {
  test("creator profile links and creator league join buttons are wired", async ({ page }) => {
    let joinRequests = 0

    await page.route("**/api/creators**", async (route) => {
      const url = new URL(route.request().url())
      const pathname = url.pathname
      const sort = url.searchParams.get("sort")

      if (pathname === "/api/creators") {
        if (sort) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              creators: [
                {
                  userId: "user-alpha",
                  handle: "alpha-creator",
                  displayName: "Alpha Creator",
                  avatarUrl: null,
                  verified: true,
                  verificationBadge: "partner",
                  leagueCount: 4,
                  totalMembers: 120,
                  rank: 1,
                },
              ],
            }),
          })
          return
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            creators: [
              {
                id: "creator-alpha",
                userId: "user-alpha",
                handle: "alpha-creator",
                slug: "alpha-creator",
                displayName: "Alpha Creator",
                bio: "Fantasy analyst and creator host.",
                avatarUrl: null,
                bannerUrl: null,
                websiteUrl: null,
                socialHandles: null,
                isVerified: true,
                verificationBadge: "partner",
                visibility: "public",
                branding: null,
                followerCount: 42,
                leagueCount: 2,
                isFollowing: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          }),
        })
        return
      }

      if (pathname === "/api/creators/alpha-creator") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "creator-alpha",
            userId: "user-alpha",
            handle: "alpha-creator",
            slug: "alpha-creator",
            displayName: "Alpha Creator",
            bio: "Fantasy analyst and creator host.",
            avatarUrl: null,
            bannerUrl: null,
            websiteUrl: null,
            socialHandles: null,
            isVerified: true,
            verificationBadge: "partner",
            visibility: "public",
            branding: null,
            followerCount: 42,
            leagueCount: 2,
            isFollowing: false,
            isOwner: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
        return
      }

      if (pathname === "/api/creators/alpha-creator/leagues") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "creator-league-1",
              creatorId: "creator-alpha",
              type: "FANTASY",
              leagueId: "league-alpha-1",
              bracketLeagueId: null,
              name: "Alpha Public League",
              slug: "alpha-public-league",
              description: "Open league from Alpha Creator",
              sport: "NFL",
              inviteCode: "JOINALPHA",
              inviteUrl: "/creator/leagues/creator-league-1?join=JOINALPHA",
              isPublic: true,
              maxMembers: 100,
              memberCount: 22,
              joinDeadline: null,
              isMember: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        })
        return
      }

      await route.fallback()
    })

    await page.route("**/api/creator/leagues/creator-league-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "creator-league-1",
          creatorId: "creator-alpha",
          type: "FANTASY",
          leagueId: "league-alpha-1",
          bracketLeagueId: null,
          name: "Alpha Public League",
          slug: "alpha-public-league",
          description: "Open league from Alpha Creator",
          sport: "NFL",
          inviteCode: "JOINALPHA",
          inviteUrl: "/creator/leagues/creator-league-1?join=JOINALPHA",
          isPublic: true,
          maxMembers: 100,
          memberCount: 23,
          joinDeadline: null,
          isMember: false,
          creator: { slug: "alpha-creator" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })
    })

    await page.route("**/api/creator-invites/join", async (route) => {
      joinRequests += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          creatorLeagueId: "creator-league-1",
        }),
      })
    })

    await page.goto("/creators", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("creator-profile-link-alpha-creator")).toBeVisible()
    await page.getByTestId("creator-profile-link-alpha-creator").click()

    await expect(page).toHaveURL(/\/creators\/alpha-creator/, { timeout: 15_000 })
    await expect(page.getByRole("heading", { name: "Alpha Creator" })).toBeVisible()

    await expect(page.getByTestId("creator-league-view-creator-league-1")).toBeVisible()
    const joinLink = page.getByTestId("creator-league-join-creator-league-1")
    await expect(joinLink).toBeVisible()
    await expect(joinLink).toHaveAttribute("href", "/creator/leagues/creator-league-1?join=JOINALPHA")
    await joinLink.click()

    if (!/\/creator\/leagues\/creator-league-1\?join=JOINALPHA/.test(page.url())) {
      const joinHref = await joinLink.getAttribute("href")
      if (!joinHref) throw new Error("Creator league join link is missing href.")
      await page.goto(joinHref, { waitUntil: "domcontentloaded" })
    }

    await expect(page).toHaveURL(/\/creator\/leagues\/creator-league-1\?join=JOINALPHA/, {
      timeout: 15_000,
    })
    await expect(page.getByTestId("creator-league-join-result")).toContainText("You joined this league.")
    await expect.poll(() => joinRequests).toBeGreaterThan(0)

    await page.getByTestId("creator-league-back-to-profile").click()
    await expect(page).toHaveURL(/\/creators\/alpha-creator/, { timeout: 15_000 })
  })
})
