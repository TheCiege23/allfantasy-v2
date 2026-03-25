import { describe, expect, it } from "vitest"
import { getShareUrl } from "@/lib/podcast-engine/PodcastDistributionService"

describe("PodcastDistributionService.getShareUrl", () => {
  it("builds share URL from full base URL", () => {
    expect(getShareUrl("ep1", "https://allfantasy.ai/")).toBe("https://allfantasy.ai/podcast/ep1")
  })

  it("normalizes host-only base URL", () => {
    expect(getShareUrl("ep2", "localhost:3000")).toBe("https://localhost:3000/podcast/ep2")
  })

  it("falls back to canonical domain when base URL invalid", () => {
    expect(getShareUrl("ep3", "")).toBe("https://allfantasy.ai/podcast/ep3")
  })
})
