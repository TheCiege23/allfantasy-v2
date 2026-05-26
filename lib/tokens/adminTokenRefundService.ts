/**
 * adminTokenRefundService.ts
 *
 * Admin-only service for manual token purchase-refund reconciliation.
 *
 * Background:
 *   Stripe charge.refunded / refund.created / refund.updated events are not yet
 *   handled automatically by the webhook. Until automatic handling ships, admins
 *   use this service (via POST /api/admin/tokens/refund) to record purchase
 *   revocations when a Stripe refund has been issued.
 *
 * Accounting model:
 *   - The TokenLedger is APPEND-ONLY. We never delete or modify existing rows.
 *   - A purchase refund creates a REFUND ledger entry with a NEGATIVE tokenDelta.
 *   - balance is decremented but FLOORED at 0 — tokens already spent cannot be
 *     double-counted.
 *   - lifetimeRefunded is incremented to track total tokens revoked (purchase
 *     refunds + spend refunds together).
 *   - lifetimePurchased is intentionally NOT modified — it is a permanent record
 *     of tokens ever purchased.
 *   - Idempotency is enforced via idempotencyKey = "stripe_refund:{stripeRefundId}".
 *     A second call with the same Stripe refund ID returns the existing entry.
 *
 * PRE-PUBLIC-BETA task:
 *   Wire the Stripe webhook (charge.refunded, refund.created, refund.updated) to
 *   call adminRevokeTokensForPurchaseRefund automatically, using the Stripe refund
 *   ID as the idempotency key. See app/api/stripe/webhook/route.ts for the
 *   documented comment block.
 */

import { prisma } from "@/lib/prisma"
import { TOKEN_ENTRY_TYPES } from "@/lib/tokens/constants"

// ── Allowed refund reasons ────────────────────────────────────────────────────

export const ADMIN_REFUND_REASONS = [
  "duplicate_charge",
  "unauthorized_transaction",
  "payment_error",
  "technical_fulfillment_failure",
  "legal_requirement",
  "support_approved",
] as const

export type AdminRefundReason = (typeof ADMIN_REFUND_REASONS)[number]

// ── I/O types ─────────────────────────────────────────────────────────────────

export type AdminPurchaseRefundInput = {
  userId: string
  /** Stripe refund ID (re_xxx). Used as idempotency key. */
  stripeRefundId: string
  /** How many tokens to revoke. Actual revoke is capped at current balance. */
  tokensToRevoke: number
  reason: AdminRefundReason
  /** Email of the admin performing the action — stored in ledger metadata. */
  adminEmail: string
  adminNote?: string | null
}

export type AdminPurchaseRefundResult = {
  /** True if this Stripe refund ID was already reconciled. No new DB writes. */
  duplicate: boolean
  ledgerEntryId: string
  /** Negative value (or 0 if balance was already 0). */
  tokenDelta: number
  balanceBefore: number
  balanceAfter: number
  /** Tokens actually revoked (≤ tokensToRevoke, ≥ 0). */
  actualRevoke: number
  idempotencyKey: string
}

// ── Error class ───────────────────────────────────────────────────────────────

export class AdminRefundError extends Error {
  constructor(
    message: string,
    public readonly code: "USER_NOT_FOUND" | "BALANCE_FETCH_FAILED" | "UNKNOWN"
  ) {
    super(message)
    this.name = "AdminRefundError"
  }
}

// ── Core service function ─────────────────────────────────────────────────────

/**
 * Revoke purchased tokens from a user's balance to reconcile a Stripe refund.
 *
 * Safe to call multiple times with the same stripeRefundId — the second call
 * returns the existing ledger entry and takes no DB action (idempotent).
 *
 * Does NOT affect the subscription ledger or subscription state.
 */
export async function adminRevokeTokensForPurchaseRefund(
  input: AdminPurchaseRefundInput
): Promise<AdminPurchaseRefundResult> {
  const idempotencyKey = `stripe_refund:${input.stripeRefundId.trim()}`

  return (prisma as any).$transaction(async (tx: any) => {
    // ── Idempotency guard ──────────────────────────────────────────────────────
    const existing = await tx.tokenLedger.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        tokenDelta: true,
        balanceBefore: true,
        balanceAfter: true,
      },
    })
    if (existing) {
      return {
        duplicate: true,
        ledgerEntryId: existing.id,
        tokenDelta: existing.tokenDelta,
        balanceBefore: existing.balanceBefore,
        balanceAfter: existing.balanceAfter,
        actualRevoke: Math.abs(existing.tokenDelta),
        idempotencyKey,
      } satisfies AdminPurchaseRefundResult
    }

    // ── Fetch current balance ──────────────────────────────────────────────────
    const balanceRow = await tx.userTokenBalance.findUnique({
      where: { userId: input.userId.trim() },
      select: { id: true, balance: true },
    })
    if (!balanceRow) {
      throw new AdminRefundError(
        `No token balance found for userId "${input.userId}". ` +
          "The user must have previously purchased or received tokens.",
        "USER_NOT_FOUND"
      )
    }

    // ── Floor balance at 0 ────────────────────────────────────────────────────
    // If the user has already spent some or all of the tokens, we can only
    // revoke what's left. We do NOT go negative.
    const currentBalance: number = balanceRow.balance
    const actualRevoke = Math.min(input.tokensToRevoke, currentBalance)
    // Guard -0: if nothing to revoke, delta is 0 (not -0, which Object.is considers different)
    const tokenDelta = actualRevoke === 0 ? 0 : -actualRevoke
    const balanceBefore = currentBalance
    const balanceAfter = currentBalance - actualRevoke

    // ── Append-only ledger entry ───────────────────────────────────────────────
    const ledgerEntry = await tx.tokenLedger.create({
      data: {
        userId: input.userId.trim(),
        userTokenBalanceId: balanceRow.id,
        entryType: TOKEN_ENTRY_TYPES.REFUND,
        tokenDelta,       // negative
        balanceBefore,
        balanceAfter,
        sourceType: "stripe_refund",
        sourceId: input.stripeRefundId.trim(),
        idempotencyKey,
        description: [
          `Admin purchase refund: ${input.reason}.`,
          `Stripe refund ${input.stripeRefundId.trim()}.`,
          input.adminNote ? `Note: ${String(input.adminNote).slice(0, 200)}` : null,
        ]
          .filter(Boolean)
          .join(" "),
        metadata: {
          reason: input.reason,
          adminEmail: input.adminEmail,
          requestedRevoke: input.tokensToRevoke,
          actualRevoke,
          stripeRefundId: input.stripeRefundId.trim(),
        },
      },
      select: { id: true },
    })

    // ── Update UserTokenBalance ────────────────────────────────────────────────
    // Only decrement if there are tokens to actually revoke (balance > 0).
    // lifetimeRefunded is incremented to track this revocation event.
    // lifetimePurchased is NOT modified — it is a permanent historical record.
    if (actualRevoke > 0) {
      await tx.userTokenBalance.update({
        where: { id: balanceRow.id },
        data: {
          balance: { decrement: actualRevoke },
          lifetimeRefunded: { increment: actualRevoke },
        },
      })
    }

    return {
      duplicate: false,
      ledgerEntryId: ledgerEntry.id,
      tokenDelta,
      balanceBefore,
      balanceAfter,
      actualRevoke,
      idempotencyKey,
    } satisfies AdminPurchaseRefundResult
  })
}
