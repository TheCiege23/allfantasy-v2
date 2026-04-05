import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
import { buildStripeCheckoutClientReferenceId } from "@/lib/monetization/StripeCheckoutLinkRegistry"

const constructEventMock = vi.hoisted(() => vi.fn())
const getStripeClientMock = vi.hoisted(() =>
  vi.fn(() => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }))
)
const getStripeWebhookSecretMock = vi.hoisted(() => vi.fn(() => "whsec_test"))

const findUniqueMock = vi.hoisted(() => vi.fn())
const createMock = vi.hoisted(() => vi.fn())
const updateMock = vi.hoisted(() => vi.fn())
const subscriptionPlanUpsertMock = vi.hoisted(() => vi.fn())
const userSubscriptionUpsertMock = vi.hoisted(() => vi.fn())
const userSubscriptionFindManyMock = vi.hoisted(() => vi.fn())
const userSubscriptionFindFirstMock = vi.hoisted(() => vi.fn())
const userSubscriptionUpdateMock = vi.hoisted(() => vi.fn())
const userSubscriptionCreateMock = vi.hoisted(() => vi.fn())
const userProfileUpsertMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/stripe-client", () => ({
  getStripeClient: getStripeClientMock,
  getStripeWebhookSecret: getStripeWebhookSecretMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
    },
    subscriptionPlan: {
      upsert: subscriptionPlanUpsertMock,
    },
    userSubscription: {
      upsert: userSubscriptionUpsertMock,
      findMany: userSubscriptionFindManyMock,
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: userSubscriptionFindFirstMock,
      update: userSubscriptionUpdateMock,
      create: userSubscriptionCreateMock,
      delete: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    userProfile: {
      upsert: userProfileUpsertMock,
    },
  },
}))

describe("Stripe webhook route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUniqueMock.mockResolvedValue(null)
    createMock.mockResolvedValue({ id: "row-1" })
    updateMock.mockResolvedValue({ id: "row-1" })
    subscriptionPlanUpsertMock.mockResolvedValue({ id: "plan-1" })
    userSubscriptionUpsertMock.mockResolvedValue({ id: "sub-1" })
    userSubscriptionFindManyMock.mockResolvedValue([])
    userSubscriptionFindFirstMock.mockResolvedValue(null)
    userSubscriptionUpdateMock.mockResolvedValue({ id: "sub-1" })
    userSubscriptionCreateMock.mockResolvedValue({ id: "sub-1" })
    userProfileUpsertMock.mockResolvedValue({ userId: "u1" })
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          mode: "subscription",
          subscription: "sub_test_1",
          customer: "cus_test_1",
          metadata: {
            purchaseType: "subscription",
            userId: "u1",
            sku: "af_pro_monthly",
          },
        },
      },
    })
  })

  it("returns 400 when stripe-signature header is missing", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: "Missing stripe-signature header",
    })
  })

  it("routes known purchaseType and marks webhook event processed", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      eventType: "checkout.session.completed",
      purchaseType: "subscription",
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0]).toMatchObject({
      data: { eventId: "evt_1", type: "checkout.session.completed", status: "processing" },
    })
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      where: { eventId: "evt_1" },
      data: expect.objectContaining({
        status: "processed",
        purchaseType: "subscription",
      }),
    })
    expect(subscriptionPlanUpsertMock).toHaveBeenCalledTimes(1)
    expect(userSubscriptionUpsertMock).toHaveBeenCalledTimes(1)
  })

  it("treats already processed event as idempotent duplicate", async () => {
    findUniqueMock.mockResolvedValueOnce({ status: "processed" })
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ received: true, duplicate: true })
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("safely accepts unknown purchaseType and still marks processed", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_unknown",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_unknown",
          metadata: { purchaseType: "mystery_value" },
        },
      },
    })
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      purchaseType: "mystery_value",
    })
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "evt_unknown" },
        data: expect.objectContaining({ status: "processed", purchaseType: "mystery_value" }),
      })
    )
    expect(subscriptionPlanUpsertMock).not.toHaveBeenCalled()
    expect(userSubscriptionUpsertMock).not.toHaveBeenCalled()
  })

  it("resolves purchase context from client_reference_id when metadata is missing", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_client_ref_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_client_ref_1",
          mode: "subscription",
          subscription: "sub_client_ref_1",
          customer: "cus_client_ref_1",
          metadata: {},
          client_reference_id: buildStripeCheckoutClientReferenceId({
            userId: "user-ref-1",
            sku: "af_pro_monthly",
            purchaseType: "subscription",
          }),
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      purchaseType: "subscription",
    })
    expect(userSubscriptionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-ref-1",
          sku: "af_pro_monthly",
        }),
      })
    )
  })

  it("persists error status when processing fails", async () => {
    updateMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce({ id: "row-err" })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = createMockNextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig_test" },
      body: "{}",
    })
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toMatchObject({
      error: "write failed",
    })
    expect(updateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { eventId: "evt_1" },
        data: expect.objectContaining({ status: "error", purchaseType: "subscription" }),
      })
    )
  })
})
