import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockAssetFindFirst, mockLogCreate, mockLogFindFirst, mockGetConnectedTargets } = vi.hoisted(() => ({
  mockAssetFindFirst: vi.fn(),
  mockLogCreate: vi.fn(),
  mockLogFindFirst: vi.fn(),
  mockGetConnectedTargets: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialContentAsset: {
      findFirst: mockAssetFindFirst,
    },
    socialPublishLog: {
      create: mockLogCreate,
      findFirst: mockLogFindFirst,
    },
  },
}))

vi.mock("@/lib/social-clips-grok/ConnectedSocialAccountResolver", () => ({
  getConnectedTargets: mockGetConnectedTargets,
}))

import { autoPublishApprovedAsset, publishAssetToPlatform } from "@/lib/social-clips-grok/SocialPublishService"

describe("SocialPublishService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    delete process.env.X_PUBLISH_ACCESS_TOKEN
    delete process.env.X_PUBLISH_API_KEY
  })

  it("returns provider_unavailable when platform provider is not configured", async () => {
    mockLogFindFirst.mockResolvedValueOnce(null)
    mockAssetFindFirst.mockResolvedValueOnce({
      id: "asset-1",
      userId: "user-1",
      title: "Weekly Winners",
      metadata: {},
    })
    mockGetConnectedTargets.mockResolvedValueOnce([
      {
        platform: "x",
        accountIdentifier: "@user",
        autoPostingEnabled: false,
        connected: true,
        providerConfigured: false,
      },
    ])
    mockLogCreate.mockResolvedValueOnce({ id: "log-provider-unavailable" })

    const result = await publishAssetToPlatform("asset-1", "x", "user-1")
    expect(result).toEqual({
      platform: "x",
      status: "provider_unavailable",
      logId: "log-provider-unavailable",
      message: "Posting not configured for this platform yet",
    })
  })

  it("prevents duplicate publish when a pending log already exists", async () => {
    mockLogFindFirst.mockResolvedValueOnce({
      id: "log-pending",
      status: "pending",
      createdAt: new Date(),
    })

    const result = await publishAssetToPlatform("asset-1", "x", "user-1")
    expect(result).toEqual({
      platform: "x",
      status: "pending",
      logId: "log-pending",
      message: "Publish already in progress",
    })
    expect(mockAssetFindFirst).not.toHaveBeenCalled()
    expect(mockLogCreate).not.toHaveBeenCalled()
  })

  it("publishes to X and logs success when provider credentials are configured", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-token"
    mockLogFindFirst.mockResolvedValueOnce(null)
    mockAssetFindFirst.mockResolvedValueOnce({
      id: "asset-1",
      userId: "user-1",
      title: "Weekly Winners",
      metadata: {
        shortCaption: "League champs in style",
        hashtags: ["#AllFantasy", "#NFL"],
      },
    })
    mockGetConnectedTargets.mockResolvedValueOnce([
      {
        platform: "x",
        accountIdentifier: "@user",
        autoPostingEnabled: false,
        connected: true,
        providerConfigured: true,
      },
    ])
    mockLogCreate.mockResolvedValueOnce({ id: "log-success" })
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "tweet-123" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    )

    const result = await publishAssetToPlatform("asset-1", "x", "user-1")
    expect(result).toEqual({
      platform: "x",
      status: "success",
      logId: "log-success",
      message: "Published to X",
    })
  })

  it("auto-publishes only connected auto-enabled targets", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-token"
    mockGetConnectedTargets.mockResolvedValue([
      {
        platform: "x",
        accountIdentifier: "@user",
        autoPostingEnabled: true,
        connected: true,
        providerConfigured: true,
      },
      {
        platform: "facebook",
        accountIdentifier: "fb-user",
        autoPostingEnabled: false,
        connected: true,
        providerConfigured: true,
      },
    ])
    mockLogFindFirst.mockResolvedValueOnce(null)
    mockAssetFindFirst.mockResolvedValueOnce({
      id: "asset-1",
      userId: "user-1",
      title: "Weekly Winners",
      metadata: {
        shortCaption: "Auto publish this clip",
      },
    })
    mockLogCreate.mockResolvedValueOnce({ id: "log-auto-1" })
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "tweet-auto-1" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    )

    const results = await autoPublishApprovedAsset("asset-1", "user-1")
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      platform: "x",
      status: "success",
    })
  })
})
