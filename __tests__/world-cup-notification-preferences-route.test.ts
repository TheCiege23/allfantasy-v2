import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const accessMock = vi.hoisted(() => vi.fn())
const getResolutionMock = vi.hoisted(() => vi.fn())
const updatePrefsMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupChallengeMemberOrManager: accessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/world-cup/worldCupNotificationPreferences", () => ({
  getWorldCupNotificationPreferenceResolution: getResolutionMock,
  updateWorldCupNotificationPreferencesForUser: updatePrefsMock,
}))

function request(body?: unknown) {
  return new Request("http://localhost/api/brackets/world-cup/c1/notification-preferences", {
    method: body ? "PATCH" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("World Cup notification preferences route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({ ok: true, user: { id: "user-1", email: "u1@example.com" } })
    accessMock.mockResolvedValue({ ok: true })
    getResolutionMock.mockResolvedValue({
      preferences: { poolMuted: false, inAppEnabled: true, smsEnabled: false },
      phoneVerified: false,
    })
    updatePrefsMock.mockResolvedValue({
      ok: true,
      preferences: { poolMuted: true, inAppEnabled: true, smsEnabled: false },
    })
  })

  it("returns current user's World Cup preferences", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/notification-preferences/route")

    const res = await GET(request(), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(getResolutionMock).toHaveBeenCalledWith("user-1", "c1")
    expect(json.preferences.poolMuted).toBe(false)
    expect(json.phoneVerificationRequiredForSms).toBe(true)
  })

  it("updates only the current user's preferences", async () => {
    const { PATCH } = await import("@/app/api/brackets/world-cup/[challengeId]/notification-preferences/route")

    const res = await PATCH(request({ poolMuted: true }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(updatePrefsMock).toHaveBeenCalledWith({
      userId: "user-1",
      challengeId: "c1",
      patch: { poolMuted: true },
    })
    expect(json.preferences.poolMuted).toBe(true)
  })

  it("does not allow commissioner override of another user's preferences", async () => {
    const { PATCH } = await import("@/app/api/brackets/world-cup/[challengeId]/notification-preferences/route")

    const res = await PATCH(request({ userId: "other-user", poolMuted: true }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(updatePrefsMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      patch: { poolMuted: true },
    }))
  })
})
