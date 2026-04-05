import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const generateBlogDraftMock = vi.hoisted(() => vi.fn())
const buildBlogSEOMock = vi.hoisted(() => vi.fn())
const suggestInternalLinksMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/automated-blog", () => ({
  generateBlogDraft: generateBlogDraftMock,
  buildBlogSEO: buildBlogSEOMock,
  suggestInternalLinks: suggestInternalLinksMock,
}))

describe("blog generate route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns draft plus seo and internal links", async () => {
    generateBlogDraftMock.mockResolvedValueOnce({
      title: "Generated Title",
      slug: "generated-title",
      excerpt: "Generated excerpt",
      body: "# Generated heading\n\nGenerated body",
      seoTitle: "Generated SEO title",
      seoDescription: "Generated SEO description",
      tags: ["AllFantasy", "NFL"],
    })
    buildBlogSEOMock.mockReturnValueOnce({
      title: "Generated SEO title | AllFantasy Blog",
      description: "Generated SEO description",
      canonical: "https://allfantasy.ai/blog/generated-title",
      ogTitle: "Generated SEO title",
      ogDescription: "Generated SEO description",
      keywords: ["fantasy sports"],
    })
    suggestInternalLinksMock.mockReturnValueOnce([
      { anchor: "Trade Analyzer", href: "/tools/trade-analyzer", reason: "Tool" },
    ])

    const { POST } = await import("@/app/api/blog/generate/route")
    const req = createMockNextRequest("http://localhost/api/blog/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sport: "NFL",
        category: "weekly_strategy",
        topicHint: "Week 7 start/sit edges",
      }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      draft: { slug: "generated-title" },
      seo: { canonical: "https://allfantasy.ai/blog/generated-title" },
      internalLinks: [{ href: "/tools/trade-analyzer" }],
    })
  })

  it("rejects invalid category", async () => {
    const { POST } = await import("@/app/api/blog/generate/route")
    const req = createMockNextRequest("http://localhost/api/blog/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sport: "NFL",
        category: "invalid_category",
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
