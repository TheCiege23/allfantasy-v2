import { beforeEach, describe, expect, it, vi } from "vitest"
import { XSocialPublishProvider } from "@/lib/social-clips-grok/publish-providers/XSocialPublishProvider"
import { InstagramSocialPublishProvider } from "@/lib/social-clips-grok/publish-providers/InstagramSocialPublishProvider"
import { FacebookSocialPublishProvider } from "@/lib/social-clips-grok/publish-providers/FacebookSocialPublishProvider"

const baseRequest = {
  assetId: "asset-1",
  userId: "user-1",
  mode: "manual" as const,
  publishText: "Weekly winners from AllFantasy",
  assetTitle: "Weekly winners",
  assetMetadata: {},
  target: {
    platform: "x",
    accountIdentifier: "@user",
    autoPostingEnabled: false,
    connected: true,
    providerConfigured: true,
  },
}

describe("Social publish provider adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.X_PUBLISH_ACCESS_TOKEN
    delete process.env.X_PUBLISH_API_KEY
    delete process.env.INSTAGRAM_PUBLISH_ACCESS_TOKEN
    delete process.env.SOCIAL_PUBLISH_TOKEN
    delete process.env.FACEBOOK_PUBLISH_ACCESS_TOKEN
  })

  it("publishes successfully via X provider", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-token"
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "tweet-123" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    )

    const provider = new XSocialPublishProvider()
    const result = await provider.publish({
      ...baseRequest,
      platform: "x",
      target: { ...baseRequest.target, platform: "x" },
    })
    expect(result).toMatchObject({
      status: "success",
      message: "Published to X",
    })
  })

  it("returns failed for instagram when media url is missing", async () => {
    process.env.INSTAGRAM_PUBLISH_ACCESS_TOKEN = "ig-token"
    const provider = new InstagramSocialPublishProvider()
    const result = await provider.publish({
      ...baseRequest,
      platform: "instagram",
      target: { ...baseRequest.target, platform: "instagram", accountIdentifier: "ig-user-1" },
      assetMetadata: {},
    })
    expect(result).toEqual({
      status: "failed",
      message: "Instagram publishing requires a media URL",
      responseMetadata: { reason: "missing_media_url" },
    })
  })

  it("publishes successfully via Facebook provider", async () => {
    process.env.FACEBOOK_PUBLISH_ACCESS_TOKEN = "fb-token"
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "fb-post-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )

    const provider = new FacebookSocialPublishProvider()
    const result = await provider.publish({
      ...baseRequest,
      platform: "facebook",
      target: { ...baseRequest.target, platform: "facebook", accountIdentifier: "page-1" },
    })
    expect(result).toMatchObject({
      status: "success",
      message: "Published to Facebook",
    })
  })
})
