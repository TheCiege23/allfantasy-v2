import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 240_000 })

async function gotoWithRetry(page: Parameters<typeof test>[0]["page"], url: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      return
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      const canRetry =
        attempt < 2 &&
        (message.includes("net::ERR_ABORTED") || message.includes("interrupted by another navigation"))
      if (!canRetry) throw error
      await page.waitForTimeout(200)
    }
  }
}

test.describe("@content automated blog click audit", () => {
  test("audits blog generation, seo preview, draft edit/save, schedule/publish lifecycle, filters, and mobile preview actions", async ({
    page,
  }) => {
    const generateBodies: Array<Record<string, unknown>> = []
    const generateAndSaveBodies: Array<Record<string, unknown>> = []
    const saveDraftBodies: Array<Record<string, unknown>> = []
    const publishActionBodies: Array<Record<string, unknown>> = []

    let autoDraftSequence = 0

    const articles: Array<{
      articleId: string
      title: string
      slug: string
      sport: string
      category: string
      excerpt: string | null
      body: string
      seoTitle: string | null
      seoDescription: string | null
      tags: string[]
      publishStatus: "draft" | "scheduled" | "published"
      publishedAt: string | null
      createdAt: string
      updatedAt: string
    }> = [
      {
        articleId: "article-1",
        title: "Initial Draft Article",
        slug: "initial-draft-article",
        sport: "NFL",
        category: "weekly_strategy",
        excerpt: "Initial excerpt",
        body: "# Initial title\n\nInitial body",
        seoTitle: "Initial SEO title",
        seoDescription: "Initial SEO description",
        tags: ["AllFantasy", "Strategy"],
        publishStatus: "draft",
        publishedAt: null,
        createdAt: new Date(Date.now() - 60_000).toISOString(),
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    ]

    const publishLogsByArticleId = new Map<
      string,
      Array<{ publishId: string; actionType: string; status: string; createdAt: string }>
    >()
    publishLogsByArticleId.set("article-1", [])
    let publishLogSequence = 0

    const appendPublishLog = (articleId: string, actionType: string, status: string) => {
      publishLogSequence += 1
      const entry = {
        publishId: `publish-log-${publishLogSequence}`,
        actionType,
        status,
        createdAt: new Date().toISOString(),
      }
      const existing = publishLogsByArticleId.get(articleId) ?? []
      publishLogsByArticleId.set(articleId, [entry, ...existing])
      return entry
    }

    const listArticles = (url: URL) => {
      const status = url.searchParams.get("status") ?? ""
      const sport = url.searchParams.get("sport") ?? ""
      const category = url.searchParams.get("category") ?? ""
      return articles.filter((article) => {
        if (status && article.publishStatus !== status) return false
        if (sport && article.sport !== sport) return false
        if (category && article.category !== category) return false
        return true
      })
    }

    await page.addInitScript(() => {
      ;(window as any).__blogWindowOpenUrls = []
      const originalOpen = window.open
      window.open = function (...args: Parameters<typeof window.open>) {
        ;(window as any).__blogWindowOpenUrls.push(String(args[0] ?? ""))
        return null
      }
      ;(window as any).__blogOriginalOpen = originalOpen
    })

    await page.route("**/blog/*", async (route) => {
      const url = route.request().url()
      if (url.includes("/blog/draft/")) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body><main data-testid='mock-blog-public-page'>Mock Blog Page</main></body></html>",
      })
    })

    await page.route("**/api/blog/generate", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      generateBodies.push(body)
      const slug = String(body.category ?? "article").toLowerCase().replace(/_/g, "-")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draft: {
            title: `Generated ${String(body.category ?? "Article")}`,
            slug: `${slug}-${String(body.sport ?? "nfl").toLowerCase()}`,
            excerpt: "Generated excerpt",
            body: "# Generated heading\n\nGenerated article body for preview",
            seoTitle: "Generated SEO title",
            seoDescription: "Generated SEO description",
            tags: ["AllFantasy", "SEO"],
          },
          seo: {
            title: "Generated SEO Title | AllFantasy Blog",
            description: "Generated SEO description",
            canonical: "https://allfantasy.ai/blog/generated-slug",
          },
          internalLinks: [
            { anchor: "Trade Analyzer", href: "/tools/trade-analyzer", reason: "Tool" },
            { anchor: "Blog", href: "/blog", reason: "Blog index" },
          ],
        }),
      })
    })

    await page.route("**/api/blog/generate-and-save", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      generateAndSaveBodies.push(body)
      autoDraftSequence += 1
      const articleId = `article-auto-${autoDraftSequence}`
      const slug = `generated-auto-${autoDraftSequence}`
      const now = new Date().toISOString()
      articles.unshift({
        articleId,
        title: `Generated And Saved ${autoDraftSequence}`,
        slug,
        sport: String(body.sport ?? "NFL"),
        category: String(body.category ?? "weekly_strategy"),
        excerpt: "Auto-saved excerpt",
        body: "# Auto saved body\n\nGenerated and saved body",
        seoTitle: "Auto SEO title",
        seoDescription: "Auto SEO description",
        tags: ["AllFantasy", "Auto"],
        publishStatus: "draft",
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      publishLogsByArticleId.set(articleId, [])
      appendPublishLog(articleId, "save_draft", "success")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          articleId,
          slug,
          article: {
            articleId,
            slug,
            publishStatus: "draft",
            updatedAt: now,
          },
        }),
      })
    })

    await page.route("**/api/blog*", async (route) => {
      const request = route.request()
      if (request.method() === "GET") {
        const url = new URL(request.url())
        const listed = listArticles(url).map((article) => ({
          articleId: article.articleId,
          title: article.title,
          slug: article.slug,
          sport: article.sport,
          category: article.category,
          excerpt: article.excerpt,
          publishStatus: article.publishStatus,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        }))
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ articles: listed }),
        })
        return
      }

      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
      saveDraftBodies.push(body)
      autoDraftSequence += 1
      const articleId = `article-saved-${autoDraftSequence}`
      const draft = (body.draft ?? {}) as Record<string, unknown>
      const now = new Date().toISOString()
      const next = {
        articleId,
        title: String(draft.title ?? "Saved Draft"),
        slug: String(draft.slug ?? `saved-${autoDraftSequence}`),
        sport: String(body.sport ?? "NFL"),
        category: String(body.category ?? "weekly_strategy"),
        excerpt: typeof draft.excerpt === "string" ? draft.excerpt : "Saved excerpt",
        body: typeof draft.body === "string" ? draft.body : "# Saved body",
        seoTitle: typeof draft.seoTitle === "string" ? draft.seoTitle : "Saved SEO title",
        seoDescription: typeof draft.seoDescription === "string" ? draft.seoDescription : "Saved SEO description",
        tags: Array.isArray(draft.tags) ? (draft.tags as string[]) : ["AllFantasy"],
        publishStatus: "draft" as const,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      articles.unshift(next)
      publishLogsByArticleId.set(articleId, [])
      appendPublishLog(articleId, "save_draft", "success")

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          articleId,
          slug: next.slug,
          article: {
            articleId,
            title: next.title,
            slug: next.slug,
            publishStatus: next.publishStatus,
            updatedAt: next.updatedAt,
          },
        }),
      })
    })

    await page.route("**/api/blog/*/internal-links", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [
            { anchor: "Trade Analyzer", href: "/tools/trade-analyzer", reason: "Tool" },
            { anchor: "Fantasy Football", href: "/sports/fantasy-football", reason: "Sport landing" },
          ],
        }),
      })
    })

    await page.route("**/api/blog/*/publish", async (route) => {
      const request = route.request()
      const parts = request.url().split("/")
      const articleId = parts[parts.length - 2] ?? "article-1"
      const article = articles.find((entry) => entry.articleId === articleId)
      if (!article) {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) })
        return
      }

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            article: {
              articleId: article.articleId,
              publishStatus: article.publishStatus,
              publishedAt: article.publishedAt,
            },
            logs: publishLogsByArticleId.get(articleId) ?? [],
          }),
        })
        return
      }

      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
      publishActionBodies.push(body)
      const action = String(body.action ?? "publish")
      if (action === "schedule") {
        const scheduledAt = String(body.scheduledAt ?? new Date(Date.now() + 3600_000).toISOString())
        article.publishStatus = "scheduled"
        article.publishedAt = scheduledAt
        article.updatedAt = new Date().toISOString()
        appendPublishLog(articleId, "schedule", "scheduled")
      } else if (action === "unpublish") {
        article.publishStatus = "draft"
        article.publishedAt = null
        article.updatedAt = new Date().toISOString()
        appendPublishLog(articleId, "unpublish", "success")
      } else {
        article.publishStatus = "published"
        article.publishedAt = new Date().toISOString()
        article.updatedAt = new Date().toISOString()
        appendPublishLog(articleId, "publish", "success")
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          article: {
            articleId: article.articleId,
            publishStatus: article.publishStatus,
            publishedAt: article.publishedAt,
          },
          logs: publishLogsByArticleId.get(articleId) ?? [],
        }),
      })
    })

    await page.route("**/api/blog/*", async (route) => {
      const request = route.request()
      if (
        request.url().includes("/publish") ||
        request.url().includes("/internal-links") ||
        request.url().includes("/generate")
      ) {
        await route.fallback()
        return
      }
      const articleId = request.url().split("/").pop() ?? "article-1"
      const article = articles.find((entry) => entry.articleId === articleId)
      if (!article) {
        await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) })
        return
      }
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ article }),
        })
        return
      }

      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
      if (typeof body.title === "string") article.title = body.title
      if (typeof body.slug === "string") article.slug = body.slug
      if (typeof body.excerpt === "string") article.excerpt = body.excerpt
      if (typeof body.body === "string") article.body = body.body
      if (typeof body.seoTitle === "string") article.seoTitle = body.seoTitle
      if (typeof body.seoDescription === "string") article.seoDescription = body.seoDescription
      if (Array.isArray(body.tags)) article.tags = body.tags.filter((entry): entry is string => typeof entry === "string")
      article.updatedAt = new Date().toISOString()
      appendPublishLog(articleId, "save_draft", "success")

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, article }),
      })
    })

    await gotoWithRetry(page, "/e2e/admin-dashboard?tab=blog")
    const openButton = page.getByTestId("admin-open-dashboard-button")
    const generateButton = page.getByTestId("admin-blog-generate-article-button")
    for (let i = 0; i < 20; i += 1) {
      if (await generateButton.isVisible().catch(() => false)) break
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click().catch(() => {})
      }
      await page.waitForTimeout(300)
    }
    await expect(generateButton).toBeVisible({ timeout: 20_000 })

    await page.getByTestId("admin-blog-sport-selector").selectOption("SOCCER")
    await expect(page.getByTestId("admin-blog-sport-selector")).toHaveValue("SOCCER")
    await page.getByTestId("admin-blog-category-selector").selectOption("waiver_wire")
    await expect(page.getByTestId("admin-blog-category-selector")).toHaveValue("waiver_wire")
    await page.getByTestId("admin-blog-topic-selector").selectOption({ index: 1 })

    await page.getByTestId("admin-blog-generate-article-button").click()
    await expect.poll(() => generateBodies.length).toBe(1)
    expect(generateBodies[0]).toMatchObject({ sport: "SOCCER", category: "waiver_wire" })
    await expect(page.getByTestId("admin-blog-slug-preview")).toBeVisible()

    await page.getByTestId("admin-blog-preview-article-button").click()
    await expect(page.getByTestId("admin-blog-article-preview-panel")).toBeVisible()
    await page.getByTestId("admin-blog-seo-preview-toggle").click()
    await expect(page.getByTestId("admin-blog-seo-preview-panel")).toBeVisible()
    await expect(page.getByTestId("admin-blog-internal-link-preview-panel")).toBeVisible()

    await page.getByTestId("admin-blog-save-draft-button").click()
    await expect.poll(() => saveDraftBodies.length).toBe(1)

    await page.getByTestId("admin-blog-generate-and-save-button").click()
    await expect.poll(() => generateAndSaveBodies.length).toBe(1)

    await page.getByTestId("admin-blog-status-filter").selectOption("draft")
    await page.getByTestId("admin-blog-sport-filter").selectOption("NFL")
    await page.getByTestId("admin-blog-category-filter").selectOption("weekly_strategy")
    await page.getByTestId("admin-blog-refresh-button").click()

    await page.getByTestId("admin-blog-article-card-click-article-1").evaluate((element) => {
      const anchor = element as HTMLAnchorElement
      anchor.addEventListener(
        "click",
        (event) => {
          event.preventDefault()
          ;(window as any).__blogAnchorClickHref = anchor.getAttribute("href")
        },
        { once: true }
      )
      anchor.click()
    })
    const clickedHref = await page.evaluate(() => (window as any).__blogAnchorClickHref as string | undefined)
    expect(clickedHref ?? "").toContain("/blog/initial-draft-article")

    const editDraftButton = page.getByTestId("admin-blog-edit-draft-button-article-1")
    await expect(editDraftButton).toBeVisible()
    await expect(editDraftButton).toHaveAttribute("href", "/blog/draft/article-1")
    const editHref = await editDraftButton.getAttribute("href")
    await gotoWithRetry(page, editHref || "/blog/draft/article-1")
    await expect(page).toHaveURL(/\/blog\/draft\/article-1/)

    const draftBackButton = page.getByTestId("blog-draft-back-button")
    if (await draftBackButton.isVisible().catch(() => false)) {
      await expect(draftBackButton).toBeVisible()
    }
    await page.getByTestId("blog-draft-preview-tab-button").click()
    await expect(page.getByTestId("blog-draft-preview-panel")).toBeVisible()
    await page.getByTestId("blog-draft-edit-tab-button").click()
    await expect(page.getByTestId("blog-draft-title-input")).toBeVisible()

    await page.getByTestId("blog-draft-title-input").fill("Updated Draft Title")
    await page.getByTestId("blog-draft-slug-input").fill("updated-draft-title")
    await expect(page.getByTestId("blog-draft-slug-preview")).toContainText("/blog/updated-draft-title")
    await page.getByTestId("blog-draft-seo-preview-toggle").click()
    await expect(page.getByTestId("blog-draft-seo-preview-panel")).toBeVisible()
    await expect(page.getByTestId("blog-internal-link-panel")).toBeVisible()
    await page.getByTestId("blog-internal-link-refresh-button").click()

    await page.getByTestId("blog-draft-save-button").click()
    await expect.poll(() => publishLogsByArticleId.get("article-1")?.some((log) => log.actionType === "save_draft")).toBeTruthy()

    const future = new Date(Date.now() + 90 * 60_000)
    const local = `${future.getFullYear()}-${`${future.getMonth() + 1}`.padStart(2, "0")}-${`${future.getDate()}`.padStart(2, "0")}T${`${future.getHours()}`.padStart(2, "0")}:${`${future.getMinutes()}`.padStart(2, "0")}`
    await page.getByTestId("blog-draft-schedule-input").fill(local)
    await page.getByTestId("blog-draft-schedule-publish-button").click()
    await expect.poll(() => articles.find((a) => a.articleId === "article-1")?.publishStatus).toBe("scheduled")

    await page.getByTestId("blog-draft-unpublish-button").click()
    await expect.poll(() => articles.find((a) => a.articleId === "article-1")?.publishStatus).toBe("draft")

    await page.getByTestId("blog-draft-publish-button").click()
    await expect.poll(() => articles.find((a) => a.articleId === "article-1")?.publishStatus).toBe("published")

    await page.getByTestId("blog-draft-refresh-button").click()
    await expect(page.getByTestId("blog-draft-publish-log-panel")).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId("blog-draft-mobile-preview-action")).toBeVisible()
    await page.getByTestId("blog-draft-mobile-preview-action").click()
    await expect(page).toHaveURL(/\/blog\/updated-draft-title\?preview=1/)

    await gotoWithRetry(page, "/e2e/admin-dashboard?tab=blog")
    const openButtonMobile = page.getByTestId("admin-open-dashboard-button")
    const refreshButtonMobile = page.getByTestId("admin-blog-refresh-button")
    for (let i = 0; i < 20; i += 1) {
      if (await refreshButtonMobile.isVisible().catch(() => false)) break
      if (await openButtonMobile.isVisible().catch(() => false)) {
        await openButtonMobile.click().catch(() => {})
      }
      await page.waitForTimeout(300)
    }
    const draftForMobile = articles.find((entry) => entry.publishStatus === "draft")
    expect(draftForMobile).toBeTruthy()
    const mobilePreviewSelector = `admin-blog-mobile-preview-action-${draftForMobile?.articleId}`
    await expect(page.getByTestId(mobilePreviewSelector)).toBeVisible()
    await page.getByTestId(mobilePreviewSelector).click()
    const mobileOpenUrls = await page.evaluate(() => (window as any).__blogWindowOpenUrls as string[])
    expect(mobileOpenUrls.some((url) => url.includes("/blog/"))).toBe(true)

    expect(publishActionBodies.some((body) => body.action === "schedule")).toBe(true)
    expect(publishActionBodies.some((body) => body.action === "publish")).toBe(true)
    expect(publishActionBodies.some((body) => body.action === "unpublish")).toBe(true)
  })
})
