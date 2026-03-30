import { beforeEach, describe, expect, it, vi } from "vitest"

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
  },
}))

describe("Stripe webhook route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUniqueMock.mockResolvedValue(null)
    createMock.mockResolvedValue({ id: "row-1" })
    updateMock.mockResolvedValue({ id: "row-1" })
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
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
    const req = new Request("http://localhost/api/stripe/webhook", {
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
    const req = new Request("http://localhost/api/stripe/webhook", {
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
  })

  it("treats already processed event as idempotent duplicate", async () => {
    findUniqueMock.mockResolvedValueOnce({ status: "processed" })
    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = new Request("http://localhost/api/stripe/webhook", {
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
    const req = new Request("http://localhost/api/stripe/webhook", {
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
  })

  it("persists error status when processing fails", async () => {
    updateMock
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce({ id: "row-err" })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const req = new Request("http://localhost/api/stripe/webhook", {
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
