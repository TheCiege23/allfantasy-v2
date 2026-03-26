import { beforeEach, describe, expect, it } from "vitest"
import {
  getProviderForDestination,
  getFantasyMediaPublishProviders,
  resetPublishProviderCacheForTests,
} from "@/lib/fantasy-media/publish-providers/registry"

describe("Fantasy media publish provider registry", () => {
  beforeEach(() => {
    resetPublishProviderCacheForTests()
    delete process.env.X_PUBLISH_API_KEY
    delete process.env.YOUTUBE_PUBLISH_CLIENT_ID
    delete process.env.SOCIAL_PUBLISH_TOKEN
  })

  it("returns destination-specific providers", () => {
    const xProvider = getProviderForDestination("x")
    const youtubeProvider = getProviderForDestination("youtube")
    const tiktokProvider = getProviderForDestination("tiktok")

    expect(xProvider?.id).toBe("x-provider")
    expect(youtubeProvider?.id).toBe("youtube-provider")
    expect(tiktokProvider?.id).toBe("generic-social-provider")
  })

  it("exposes stable provider list for extension", () => {
    const providers = getFantasyMediaPublishProviders()
    expect(providers.map((provider) => provider.id)).toEqual([
      "x-provider",
      "youtube-provider",
      "generic-social-provider",
    ])
  })
})
