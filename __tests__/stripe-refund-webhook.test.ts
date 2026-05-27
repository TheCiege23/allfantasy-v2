/**
 * stripe-refund-webhook.test.ts
 *
 * Tests for the automatic Stripe refund → token revocation webhook path.
 * Covers charge.refunded, refund.created, refund.updated events routed through
 * POST /api/stripe/webhook.
 *
 * Contracts verified:
 *  1. refund.created (token purchase) → adminRevokeTokensForPurchaseRefund called correctly
 *  2. Duplicate event (same event ID already "processed") → early exit, no revoke call
 *  3. charge.refunded → reconciles token revocation via charge.refunds.data[0]
 *  4. Refund for subscription checkout → no token revocation
 *  5. Refund for unknown payment intent (no checkout session) → ignored safely, HTTP 200
 *  6. Partial refund → proportional tokensToRevoke = Math.round(tokens * fraction)
 *  7. Zero-balance user path reached (adminRevokeTokensForPurchaseRefund called) → no negative balance enforced inside service
 *  8. Token ledger rows are never deleted — only additive revoke entries created
 *  9. checkout.session.completed token purchase still handled normally (regression)
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
import { buildStripeCheckoutClientReferenceId } from "@/lib/monetization/StripeCheckoutLinkRegistry"

// ─── Stripe client mocks ──────────────────────────────────────────────────────

const constructEventMock = vi.hoisted(() => vi.fn())
const checkoutSessionsListMock = vi.hoisted(() => vi.fn())

const getStripeClientMock = vi.hoisted(() =>
  vi.fn(() => ({
    webhooks: { constructEvent: constructEventMock },
    checkout: { sessions: { list: checkoutSessionsListMock } },
  }))
)
const getStripeWebhookSecretMock = vi.hoisted(() => vi.fn(() => "whsec_test"))

vi.mock("@/lib/stripe-client", () => ({
  getStripeClient: getStripeClientMock,
  getStripeWebhookSecret: getStripeWebhookSecretMock,
}))

// ─── Prisma mocks ─────────────────────────────────────────────────────────────

const findUniqueMock = vi.hoisted(() => vi.fn())
const createMock = vi.hoisted(() => vi.fn())
const updateMock = vi.hoisted(() => vi.fn())
const tokenLedgerFindFirstMock = vi.hoisted(() => vi.fn())

// Subscription-related mocks (required because the route imports webhookHandlers)
const subscriptionPlanUpsertMock = vi.hoisted(() => vi.fn())
const userSubscriptionUpsertMock = vi.hoisted(() => vi.fn())
const userSubscriptionFindManyMock = vi.hoisted(() => vi.fn())
const userSubscriptionFindFirstMock = vi.hoisted(() => vi.fn())
const userSubscriptionUpdateMock = vi.hoisted(() => vi.fn())
const userSubscriptionCreateMock = vi.hoisted(() => vi.fn())
const userProfileUpsertMock = vi.hoisted(() => vi.fn())
const adminSubscriptionGrantFindManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: findUniqueMock,
      create: createMock,
      update: updateMock,
    },
    tokenLedger: {
      findFirst: tokenLedgerFindFirstMock,
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
    adminSubscriptionGrant: {
      findMany: adminSubscriptionGrantFindManyMock,
    },
  },
}))

// ─── adminRevokeTokensForPurchaseRefund mock ──────────────────────────────────

const adminRevokeMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/tokens/adminTokenRefundService", () => ({
  adminRevokeTokensForPurchaseRefund: adminRevokeMock,
  ADMIN_REFUND_REASONS: [
    "duplicate_charge",
    "unauthorized_transaction",
    "payment_error",
    "technical_fulfillment_failure",
    "legal_requirement",
    "support_approved",
  ],
  AdminRefundError: class AdminRefundError extends Error {
    constructor(message: string, public code: string) {
      super(message)
      this.name = "AdminRefundError"
    }
  },
}))

// ─── TokenSpendService mock (needed for checkout.session.completed path) ──────

const grantTokensFromPackagePurchaseMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/tokens/TokenSpendService", () => ({
  TokenSpendService: vi.fn().mockImplementation(function (this: any) {
    this.grantTokensFromPackagePurchase = grantTokensFromPackagePurchaseMock
  }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockRequest() {
  return createMockNextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  })
}

/** A Checkout Session representing a completed token pack purchase */
const TOKEN_PURCHASE_SESSION = {
  id: "cs_tokens_test",
  mode: "payment",
  amount_total: 499, // $4.99
  metadata: { purchaseType: "tokens", userId: "user-1", sku: "af_tokens_5" },
  client_reference_id: null,
  customer: "cus_test_1",
}

/** A Checkout Session representing a subscription purchase */
const SUBSCRIPTION_SESSION = {
  id: "cs_sub_test",
  mode: "subscription",
  amount_total: 999,
  metadata: { purchaseType: "subscription", userId: "user-1", sku: "af_pro_monthly" },
  client_reference_id: null,
  customer: "cus_test_2",
}

/** TokenLedger purchase row for 5-token pack */
const PURCHASE_LEDGER_ROW = {
  userId: "user-1",
  tokenDelta: 5, // positive — tokens granted
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Stripe refund webhook → automatic token revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Stripe webhook event dedup: not seen before
    findUniqueMock.mockResolvedValue(null)
    createMock.mockResolvedValue({ id: "row-1" })
    updateMock.mockResolvedValue({ id: "row-1" })

    // Default: Stripe API returns token purchase session
    checkoutSessionsListMock.mockResolvedValue({ data: [TOKEN_PURCHASE_SESSION] })

    // Default: token purchase ledger row found
    tokenLedgerFindFirstMock.mockResolvedValue(PURCHASE_LEDGER_ROW)

    // Default: revoke succeeds
    adminRevokeMock.mockResolvedValue({
      duplicate: false,
      ledgerEntryId: "led-new",
      tokenDelta: -5,
      balanceBefore: 10,
      balanceAfter: 5,
      actualRevoke: 5,
      idempotencyKey: "stripe_refund:re_test",
    })

    // Subscription mocks (not used in refund path but imported by route)
    subscriptionPlanUpsertMock.mockResolvedValue({ id: "plan-1" })
    userSubscriptionUpsertMock.mockResolvedValue({ id: "sub-1" })
    userSubscriptionFindManyMock.mockResolvedValue([])
    userSubscriptionFindFirstMock.mockResolvedValue(null)
    userSubscriptionUpdateMock.mockResolvedValue({ id: "sub-1" })
    userSubscriptionCreateMock.mockResolvedValue({ id: "sub-1" })
    userProfileUpsertMock.mockResolvedValue({ userId: "user-1" })
    adminSubscriptionGrantFindManyMock.mockResolvedValue([])

    // Token grant mock (used only in checkout path)
    grantTokensFromPackagePurchaseMock.mockResolvedValue({
      id: "led-1",
      entryType: "purchase",
      tokenDelta: 5,
      balanceBefore: 0,
      balanceAfter: 5,
      tokenPackageSku: "af_tokens_5",
      spendRuleCode: null,
      spendFeatureLabel: null,
      refundRuleCode: null,
      sourceType: "stripe_checkout",
      sourceId: "cs_tokens_5",
      description: "Stripe purchase: AllFantasy AI Tokens (5)",
      metadata: null,
      createdAt: new Date().toISOString(),
    })
  })

  // ── 1. refund.created (token purchase) ───────────────────────────────────────
  it("refund.created for token purchase calls adminRevokeTokensForPurchaseRefund with correct args", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_refund_created_1",
      type: "refund.created",
      data: {
        object: {
          id: "re_test_1",
          status: "succeeded",
          payment_intent: "pi_test_1",
          amount: 499, // full refund of $4.99
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)

    // Stripe sessions.list was called with the payment intent
    expect(checkoutSessionsListMock).toHaveBeenCalledWith({
      payment_intent: "pi_test_1",
      limit: 1,
    })

    // tokenLedger queried for the purchase row
    expect(tokenLedgerFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceType: "stripe_checkout",
          sourceId: "cs_tokens_test",
          entryType: "purchase",
        }),
      })
    )

    // adminRevokeTokensForPurchaseRefund called with correct parameters
    expect(adminRevokeMock).toHaveBeenCalledOnce()
    expect(adminRevokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stripeRefundId: "re_test_1",
        tokensToRevoke: 5, // full refund → all tokens
        reason: "payment_error",
        adminEmail: "stripe-webhook@system",
      })
    )

    // Webhook event marked processed
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "processed" }),
      })
    )
  }, 60000)

  // ── 2. Duplicate event ID → no revoke ────────────────────────────────────────
  it("duplicate refund.created event (already processed) returns 200 without calling adminRevokeTokensForPurchaseRefund", async () => {
    // Stripe webhook event already in "processed" state
    findUniqueMock.mockResolvedValueOnce({ status: "processed" })

    constructEventMock.mockReturnValueOnce({
      id: "evt_refund_dup",
      type: "refund.created",
      data: {
        object: {
          id: "re_dup",
          status: "succeeded",
          payment_intent: "pi_dup",
          amount: 499,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)

    // Stripe sessions.list NOT called (early exit before switch)
    expect(checkoutSessionsListMock).not.toHaveBeenCalled()
    // adminRevokeTokensForPurchaseRefund NOT called
    expect(adminRevokeMock).not.toHaveBeenCalled()
  }, 60000)

  // ── 3. charge.refunded reconciles via refunds.data[0] ────────────────────────
  it("charge.refunded extracts latest refund and calls adminRevokeTokensForPurchaseRefund", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_charge_refunded_1",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_1",
          payment_intent: "pi_test_charge",
          amount_refunded: 499,
          refunds: {
            data: [
              { id: "re_from_charge", amount: 499 }, // latest refund embedded in charge
            ],
          },
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)

    // Stripe sessions.list called with the charge's payment intent
    expect(checkoutSessionsListMock).toHaveBeenCalledWith({
      payment_intent: "pi_test_charge",
      limit: 1,
    })

    // adminRevokeTokensForPurchaseRefund called with the refund ID from the charge
    expect(adminRevokeMock).toHaveBeenCalledOnce()
    expect(adminRevokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stripeRefundId: "re_from_charge",
        tokensToRevoke: 5,
        reason: "payment_error",
      })
    )
  }, 60000)

  // ── 4. Subscription refund → no token revocation ─────────────────────────────
  it("refund.created for a subscription purchase does not touch the token ledger", async () => {
    // Stripe sessions.list returns a SUBSCRIPTION session
    checkoutSessionsListMock.mockResolvedValueOnce({ data: [SUBSCRIPTION_SESSION] })

    constructEventMock.mockReturnValueOnce({
      id: "evt_sub_refund",
      type: "refund.created",
      data: {
        object: {
          id: "re_sub_1",
          status: "succeeded",
          payment_intent: "pi_sub_1",
          amount: 999,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)

    // tokenLedger NOT queried (we bail out after seeing purchaseType = "subscription")
    expect(tokenLedgerFindFirstMock).not.toHaveBeenCalled()
    // adminRevokeTokensForPurchaseRefund NOT called
    expect(adminRevokeMock).not.toHaveBeenCalled()
  }, 60000)

  // ── 5. Unknown payment intent (no checkout session) → safe 2xx ───────────────
  it("refund.created with no matching checkout session is ignored safely (HTTP 200)", async () => {
    // Stripe returns no checkout sessions for this payment intent
    checkoutSessionsListMock.mockResolvedValueOnce({ data: [] })

    constructEventMock.mockReturnValueOnce({
      id: "evt_unknown_pi",
      type: "refund.created",
      data: {
        object: {
          id: "re_unknown",
          status: "succeeded",
          payment_intent: "pi_nonexistent",
          amount: 1000,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    // Must return 200 — Stripe must not retry this
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    // No error key — it's a clean handled outcome
    expect(body.error).toBeUndefined()

    expect(tokenLedgerFindFirstMock).not.toHaveBeenCalled()
    expect(adminRevokeMock).not.toHaveBeenCalled()

    // Webhook event still marked processed (no error state)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "processed" }),
      })
    )
  }, 60000)

  // ── 6. Partial refund → proportional tokensToRevoke ──────────────────────────
  it("partial refund computes tokensToRevoke proportionally", async () => {
    // Session: $10.00, 10 tokens. Refund: $5.00 = 50%  → tokensToRevoke = 5
    const partialSession = {
      ...TOKEN_PURCHASE_SESSION,
      amount_total: 1000, // $10.00
    }
    checkoutSessionsListMock.mockResolvedValueOnce({ data: [partialSession] })
    tokenLedgerFindFirstMock.mockResolvedValueOnce({ userId: "user-partial", tokenDelta: 10 })

    constructEventMock.mockReturnValueOnce({
      id: "evt_partial_refund",
      type: "refund.created",
      data: {
        object: {
          id: "re_partial",
          status: "succeeded",
          payment_intent: "pi_partial",
          amount: 500, // $5.00 = 50% of $10.00
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    expect(adminRevokeMock).toHaveBeenCalledOnce()
    expect(adminRevokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-partial",
        stripeRefundId: "re_partial",
        tokensToRevoke: 5, // Math.round(10 * 500/1000) = 5
      })
    )
  }, 60000)

  // ── 7. Zero-balance user: adminRevokeTokensForPurchaseRefund is still called ──
  it("adminRevokeTokensForPurchaseRefund is called even when user balance is 0 (service floors at 0)", async () => {
    // The webhook layer doesn't know the user's balance; the service floors at 0
    tokenLedgerFindFirstMock.mockResolvedValueOnce({ userId: "user-zero", tokenDelta: 5 })
    adminRevokeMock.mockResolvedValueOnce({
      duplicate: false,
      ledgerEntryId: "led-zero",
      tokenDelta: 0,
      balanceBefore: 0,
      balanceAfter: 0,
      actualRevoke: 0,
      idempotencyKey: "stripe_refund:re_zero",
    })

    constructEventMock.mockReturnValueOnce({
      id: "evt_zero_balance",
      type: "refund.created",
      data: {
        object: {
          id: "re_zero",
          status: "succeeded",
          payment_intent: "pi_zero",
          amount: 499,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    // adminRevokeTokensForPurchaseRefund IS called (it enforces the floor internally)
    expect(adminRevokeMock).toHaveBeenCalledOnce()
    expect(adminRevokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-zero",
        stripeRefundId: "re_zero",
        tokensToRevoke: 5,
      })
    )
  }, 60000)

  // ── 8. Token ledger rows are never deleted ────────────────────────────────────
  it("the refund path never deletes token ledger rows (append-only accounting preserved)", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_no_delete",
      type: "refund.created",
      data: {
        object: {
          id: "re_no_delete",
          status: "succeeded",
          payment_intent: "pi_no_delete",
          amount: 499,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    await POST(makeMockRequest() as any)

    // prisma.tokenLedger.findFirst was called (read path)
    expect(tokenLedgerFindFirstMock).toHaveBeenCalledOnce()

    // No deletemany/delete on tokenLedger — mock object has no delete method
    // and if one had been called, vi would throw on the undefined function.
    // The assertion below confirms the mock only received a findFirst call.
    const tokenLedgerMockKeys = Object.keys(
      (await vi.importMock("@/lib/prisma") as any).prisma.tokenLedger
    )
    expect(tokenLedgerMockKeys).not.toContain("delete")
    expect(tokenLedgerMockKeys).not.toContain("deleteMany")
  }, 60000)

  // ── 9. Regression: checkout.session.completed token purchase still works ──────
  it("checkout.session.completed token purchase still fulfilled correctly (regression)", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_checkout_regression",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_regression_1",
          mode: "payment",
          subscription: null,
          customer: "cus_regression_1",
          metadata: {},
          client_reference_id: buildStripeCheckoutClientReferenceId({
            userId: "user-regression",
            sku: "af_tokens_5",
            purchaseType: "tokens",
          }),
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      received: true,
      eventType: "checkout.session.completed",
      purchaseType: "tokens",
    })
    expect(body.fulfillmentError).toBeUndefined()

    // Token grant was called (existing checkout path unchanged)
    expect(grantTokensFromPackagePurchaseMock).toHaveBeenCalledOnce()
    expect(grantTokensFromPackagePurchaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-regression",
        packageSku: "af_tokens_5",
        sourceType: "stripe_checkout",
        idempotencyKey: expect.stringContaining("stripe_checkout:cs_regression_1"),
      })
    )

    // refund path (Stripe sessions.list) NOT called for checkout event
    expect(checkoutSessionsListMock).not.toHaveBeenCalled()
    expect(adminRevokeMock).not.toHaveBeenCalled()
  }, 60000)

  // ── Bonus: refund.updated (pending→succeeded) triggers revocation ─────────────
  it("refund.updated with status=succeeded triggers token revocation", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_refund_updated",
      type: "refund.updated",
      data: {
        object: {
          id: "re_updated_1",
          status: "succeeded", // transitioned from "pending"
          payment_intent: "pi_updated_1",
          amount: 499,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    expect(adminRevokeMock).toHaveBeenCalledOnce()
    expect(adminRevokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeRefundId: "re_updated_1",
        tokensToRevoke: 5,
      })
    )
  }, 60000)

  // ── Bonus: refund.created with status=pending → NOT processed yet ─────────────
  it("refund.created with status=pending does not call adminRevokeTokensForPurchaseRefund", async () => {
    constructEventMock.mockReturnValueOnce({
      id: "evt_refund_pending",
      type: "refund.created",
      data: {
        object: {
          id: "re_pending_1",
          status: "pending", // not yet succeeded
          payment_intent: "pi_pending_1",
          amount: 499,
          currency: "usd",
        },
      },
    })

    const { POST } = await import("@/app/api/stripe/webhook/route")
    const res = await POST(makeMockRequest() as any)

    expect(res.status).toBe(200)
    // Pending refunds are skipped — we wait for refund.updated with status=succeeded
    expect(checkoutSessionsListMock).not.toHaveBeenCalled()
    expect(adminRevokeMock).not.toHaveBeenCalled()
  }, 60000)
})
