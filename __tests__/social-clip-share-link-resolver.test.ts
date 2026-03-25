import { describe, expect, it } from "vitest"
import {
  getClipPageUrl,
  getTwitterShareUrl,
  getFacebookShareUrl,
  getCopyLinkPayload,
} from "@/lib/social-clips/ShareLinkResolver"

describe("ShareLinkResolver", () => {
  it("builds canonical clip page URL", () => {
    const url = getClipPageUrl("clip_123", "https://allfantasy.ai")
    expect(url).toBe("https://allfantasy.ai/clips/clip_123")
  })

  it("builds Twitter intent URL with encoded params", () => {
    const shareUrl = getTwitterShareUrl(
      "https://allfantasy.ai/clips/clip_123",
      "Biggest upset of the week"
    )

    const parsed = new URL(shareUrl)
    expect(parsed.origin + parsed.pathname).toBe("https://twitter.com/intent/tweet")
    expect(parsed.searchParams.get("url")).toBe("https://allfantasy.ai/clips/clip_123")
    expect(parsed.searchParams.get("text")).toBe("Biggest upset of the week")
  })

  it("builds Facebook share URL with encoded clip URL", () => {
    const shareUrl = getFacebookShareUrl("https://allfantasy.ai/clips/clip_123")
    const parsed = new URL(shareUrl)

    expect(parsed.origin + parsed.pathname).toBe("https://www.facebook.com/sharer/sharer.php")
    expect(parsed.searchParams.get("u")).toBe("https://allfantasy.ai/clips/clip_123")
  })

  it("builds copy payload with title and URL", () => {
    const payload = getCopyLinkPayload(
      "https://allfantasy.ai/clips/clip_123",
      "Weekly League Winners"
    )
    expect(payload).toBe("Weekly League Winners\nhttps://allfantasy.ai/clips/clip_123")
  })
})
