/**
 * Tests for adminRevokeTokensForPurchaseRefund
 * (lib/tokens/adminTokenRefundService.ts)
 *
 * Covers:
 *  1. Happy path: ledger entry created, balance decremented, lifetimeRefunded updated
 *  2. Idempotency: same stripeRefundId returns existing entry — no second DB write
 *  3. Duplicate webhook: same stripeRefundId processed twice — no double-revocation
 *  4. Balance floor: tokensToRevoke > balance → revoke only what exists, balanceAfter = 0
 *  5. Zero-balance user: tokensToRevoke = 5, balance = 0 → actualRevoke = 0, no balance update
 *  6. Unknown userId: throws AdminRefundError with code USER_NOT_FOUND
 *  7. Subscription refunds do not affect token ledger (subscription state untouched)
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const tokenLedgerFindUniqueMock = vi.hoisted(() => vi.fn())
const tokenLedgerCreateMock = vi.hoisted(() => vi.fn())
const userTokenBalanceFindUniqueMock = vi.hoisted(() => vi.fn())
const userTokenBalanceUpdateMock = vi.hoisted(() => vi.fn())
const transactionMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}))

// ─── Mock constants (keep TOKEN_ENTRY_TYPES intact) ───────────────────────────
vi.mock("@/lib/tokens/constants", () => ({
  TOKEN_ENTRY_TYPES: {
    PURCHASE: "purchase",
    SPEND: "spend",
    REFUND: "refund",
    ADJUSTMENT: "adjustment",
  },
  TOKEN_PACKAGE_SEEDS: [],
  TOKEN_SPEND_RULE_SEEDS: [],
  TOKEN_REFUND_RULE_SEEDS: [],
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** The tx object passed to $transaction callbacks */
const TX_MOCK = {
  tokenLedger: {
    findUnique: tokenLedgerFindUniqueMock,
    create: tokenLedgerCreateMock,
  },
  userTokenBalance: {
    findUnique: userTokenBalanceFindUniqueMock,
    update: userTokenBalanceUpdateMock,
  },
}

/** Wires transactionMock to call the callback with TX_MOCK and return its result */
function wireTransaction() {
  transactionMock.mockImplementation(async (cb: (tx: typeof TX_MOCK) => unknown) => {
    return cb(TX_MOCK)
  })
}

const BASE_INPUT = {
  userId: "user-abc",
  stripeRefundId: "re_test123",
  tokensToRevoke: 5,
  reason: "duplicate_charge" as const,
  adminEmail: "admin@allfantasy.ai",
  adminNote: "Test refund",
}

const MOCK_BALANCE_ROW = { id: "bal-1", balance: 10 }

const MOCK_LEDGER_ENTRY = { id: "led-1" }

// ─── Import under test (after mocks are hoisted) ──────────────────────────────
const { adminRevokeTokensForPurchaseRefund, AdminRefundError } = await import(
  "@/lib/tokens/adminTokenRefundService"
)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("adminRevokeTokensForPurchaseRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wireTransaction()
  })

  // 1. Happy path ──────────────────────────────────────────────────────────────
  it("creates a REFUND ledger entry and decrements the balance", async () => {
    tokenLedgerFindUniqueMock.mockResolvedValue(null) // no duplicate
    userTokenBalanceFindUniqueMock.mockResolvedValue(MOCK_BALANCE_ROW)
    tokenLedgerCreateMock.mockResolvedValue(MOCK_LEDGER_ENTRY)
    userTokenBalanceUpdateMock.mockResolvedValue({})

    const result = await adminRevokeTokensForPurchaseRefund(BASE_INPUT)

    expect(result.duplicate).toBe(false)
    expect(result.ledgerEntryId).toBe("led-1")
    expect(result.tokenDelta).toBe(-5) // negative
    expect(result.balanceBefore).toBe(10)
    expect(result.balanceAfter).toBe(5)
    expect(result.actualRevoke).toBe(5)
    expect(result.idempotencyKey).toBe("stripe_refund:re_test123")

    // Ledger entry created with correct shape
    expect(tokenLedgerCreateMock).toHaveBeenCalledOnce()
    const createCall = tokenLedgerCreateMock.mock.calls[0][0]
    expect(createCall.data.entryType).toBe("refund")
    expect(createCall.data.tokenDelta).toBe(-5)
    expect(createCall.data.sourceType).toBe("stripe_refund")
    expect(createCall.data.sourceId).toBe("re_test123")
    expect(createCall.data.idempotencyKey).toBe("stripe_refund:re_test123")
    expect(createCall.data.metadata.reason).toBe("duplicate_charge")
    expect(createCall.data.metadata.adminEmail).toBe("admin@allfantasy.ai")
    expect(createCall.data.metadata.actualRevoke).toBe(5)

    // Balance updated correctly
    expect(userTokenBalanceUpdateMock).toHaveBeenCalledOnce()
    const updateCall = userTokenBalanceUpdateMock.mock.calls[0][0]
    expect(updateCall.data.balance).toEqual({ decrement: 5 })
    expect(updateCall.data.lifetimeRefunded).toEqual({ increment: 5 })
  })

  // 2. Idempotency — same refund ID returns existing entry ────────────────────
  it("returns the existing ledger entry when stripeRefundId is a duplicate", async () => {
    const existingEntry = {
      id: "led-existing",
      tokenDelta: -5,
      balanceBefore: 10,
      balanceAfter: 5,
    }
    tokenLedgerFindUniqueMock.mockResolvedValue(existingEntry)

    const result = await adminRevokeTokensForPurchaseRefund(BASE_INPUT)

    expect(result.duplicate).toBe(true)
    expect(result.ledgerEntryId).toBe("led-existing")
    expect(result.actualRevoke).toBe(5) // Math.abs(-5)

    // No new ledger row or balance update
    expect(tokenLedgerCreateMock).not.toHaveBeenCalled()
    expect(userTokenBalanceUpdateMock).not.toHaveBeenCalled()
  })

  // 3. Duplicate webhook — second call with same refund ID does not double-refund
  it("does not double-revoke when the same Stripe refund event arrives twice", async () => {
    // First call: no duplicate, creates entry
    tokenLedgerFindUniqueMock.mockResolvedValueOnce(null)
    userTokenBalanceFindUniqueMock.mockResolvedValueOnce(MOCK_BALANCE_ROW)
    tokenLedgerCreateMock.mockResolvedValueOnce(MOCK_LEDGER_ENTRY)
    userTokenBalanceUpdateMock.mockResolvedValueOnce({})

    const first = await adminRevokeTokensForPurchaseRefund(BASE_INPUT)
    expect(first.duplicate).toBe(false)
    expect(first.actualRevoke).toBe(5)

    // Second call: finds the existing entry, no DB writes
    const existingEntry = {
      id: "led-1",
      tokenDelta: -5,
      balanceBefore: 10,
      balanceAfter: 5,
    }
    tokenLedgerFindUniqueMock.mockResolvedValueOnce(existingEntry)

    const second = await adminRevokeTokensForPurchaseRefund(BASE_INPUT)
    expect(second.duplicate).toBe(true)
    expect(second.ledgerEntryId).toBe("led-1")

    // tokenLedger.create called exactly once across both calls
    expect(tokenLedgerCreateMock).toHaveBeenCalledOnce()
    // userTokenBalance.update called exactly once
    expect(userTokenBalanceUpdateMock).toHaveBeenCalledOnce()
  })

  // 4. Balance floor — tokensToRevoke exceeds current balance ─────────────────
  it("floors balanceAfter at 0 when tokensToRevoke exceeds current balance", async () => {
    const lowBalanceRow = { id: "bal-2", balance: 3 } // only 3 tokens
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(lowBalanceRow)
    tokenLedgerCreateMock.mockResolvedValue({ id: "led-2" })
    userTokenBalanceUpdateMock.mockResolvedValue({})

    const result = await adminRevokeTokensForPurchaseRefund({
      ...BASE_INPUT,
      tokensToRevoke: 10, // user only has 3
    })

    expect(result.actualRevoke).toBe(3)    // capped at balance
    expect(result.tokenDelta).toBe(-3)
    expect(result.balanceBefore).toBe(3)
    expect(result.balanceAfter).toBe(0)    // floored at 0

    const updateCall = userTokenBalanceUpdateMock.mock.calls[0][0]
    expect(updateCall.data.balance).toEqual({ decrement: 3 }) // not 10
    expect(updateCall.data.lifetimeRefunded).toEqual({ increment: 3 })
  })

  // 5. Zero-balance user — no balance update needed ───────────────────────────
  it("creates ledger entry with 0 tokenDelta when user balance is already 0", async () => {
    const zeroBalanceRow = { id: "bal-3", balance: 0 }
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(zeroBalanceRow)
    tokenLedgerCreateMock.mockResolvedValue({ id: "led-3" })

    const result = await adminRevokeTokensForPurchaseRefund({
      ...BASE_INPUT,
      tokensToRevoke: 5,
    })

    expect(result.actualRevoke).toBe(0)
    expect(result.tokenDelta).toBe(0)
    expect(result.balanceBefore).toBe(0)
    expect(result.balanceAfter).toBe(0)

    // Balance update NOT called when actualRevoke is 0
    expect(userTokenBalanceUpdateMock).not.toHaveBeenCalled()

    // Ledger row still created for the audit trail
    expect(tokenLedgerCreateMock).toHaveBeenCalledOnce()
    const createCall = tokenLedgerCreateMock.mock.calls[0][0]
    expect(createCall.data.tokenDelta).toBe(0)
    expect(createCall.data.metadata.actualRevoke).toBe(0)
    expect(createCall.data.metadata.requestedRevoke).toBe(5)
  })

  // 6. Unknown userId — throws AdminRefundError ────────────────────────────────
  it("throws AdminRefundError with USER_NOT_FOUND when userId has no balance row", async () => {
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(null) // no balance row

    await expect(
      adminRevokeTokensForPurchaseRefund({ ...BASE_INPUT, userId: "unknown-user" })
    ).rejects.toThrow(AdminRefundError)

    await expect(
      adminRevokeTokensForPurchaseRefund({ ...BASE_INPUT, userId: "unknown-user" })
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" })
  })

  // 7. Subscription refunds do not affect token ledger ────────────────────────
  it("does not touch subscription tables — only token ledger and balance", async () => {
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(MOCK_BALANCE_ROW)
    tokenLedgerCreateMock.mockResolvedValue(MOCK_LEDGER_ENTRY)
    userTokenBalanceUpdateMock.mockResolvedValue({})

    await adminRevokeTokensForPurchaseRefund({
      ...BASE_INPUT,
      reason: "duplicate_charge",
    })

    // Only token-related mocks should have been called
    expect(tokenLedgerCreateMock).toHaveBeenCalledOnce()
    expect(userTokenBalanceUpdateMock).toHaveBeenCalledOnce()

    // Verify no subscription-model calls exist on the tx object
    // (TX_MOCK does not include userSubscription — any call would throw)
    // This passes simply by the test not throwing.
  })

  // 8. adminNote is included in description ───────────────────────────────────
  it("includes adminNote in the ledger description when provided", async () => {
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(MOCK_BALANCE_ROW)
    tokenLedgerCreateMock.mockResolvedValue(MOCK_LEDGER_ENTRY)
    userTokenBalanceUpdateMock.mockResolvedValue({})

    await adminRevokeTokensForPurchaseRefund({
      ...BASE_INPUT,
      adminNote: "Customer confirmed duplicate via email",
    })

    const createCall = tokenLedgerCreateMock.mock.calls[0][0]
    expect(createCall.data.description).toContain(
      "Customer confirmed duplicate via email"
    )
  })

  // 9. adminNote omitted — description has no 'null' string ────────────────────
  it("omits Note from description when adminNote is not provided", async () => {
    tokenLedgerFindUniqueMock.mockResolvedValue(null)
    userTokenBalanceFindUniqueMock.mockResolvedValue(MOCK_BALANCE_ROW)
    tokenLedgerCreateMock.mockResolvedValue(MOCK_LEDGER_ENTRY)
    userTokenBalanceUpdateMock.mockResolvedValue({})

    await adminRevokeTokensForPurchaseRefund({
      ...BASE_INPUT,
      adminNote: null,
    })

    const createCall = tokenLedgerCreateMock.mock.calls[0][0]
    expect(createCall.data.description).not.toContain("Note:")
    expect(createCall.data.description).not.toContain("null")
  })
})
