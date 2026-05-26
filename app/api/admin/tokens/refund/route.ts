/**
 * POST /api/admin/tokens/refund
 *
 * Admin-only endpoint for manual token purchase-refund reconciliation.
 *
 * Use this when a Stripe refund has been issued for a token purchase and tokens
 * must be revoked from the user's balance. This preserves the append-only ledger:
 * a REFUND entry with a negative tokenDelta is created rather than modifying or
 * deleting any existing rows.
 *
 * Idempotency: the same Stripe refund ID can be submitted multiple times — the
 * second call returns HTTP 409 with the existing ledger entry and takes no action.
 *
 * Does NOT:
 *  - Delete token ledger rows
 *  - Affect subscription state or subscription cancellation
 *  - Change Stripe checkout fulfillment
 *  - Automatically process Stripe webhook refund events
 *    (see app/api/stripe/webhook/route.ts for that PRE-PUBLIC-BETA task)
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import {
  ADMIN_REFUND_REASONS,
  AdminRefundError,
  adminRevokeTokensForPurchaseRefund,
  type AdminRefundReason,
} from "@/lib/tokens/adminTokenRefundService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // ── Admin gate ─────────────────────────────────────────────────────────────
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    userId,
    stripeRefundId,
    tokensToRevoke,
    reason,
    adminNote,
  } = body as {
    userId?: unknown
    stripeRefundId?: unknown
    tokensToRevoke?: unknown
    reason?: unknown
    adminNote?: unknown
  }

  // ── Input validation ────────────────────────────────────────────────────────
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }
  if (
    !stripeRefundId ||
    typeof stripeRefundId !== "string" ||
    !stripeRefundId.trim()
  ) {
    return NextResponse.json({ error: "stripeRefundId is required" }, { status: 400 })
  }
  if (
    typeof tokensToRevoke !== "number" ||
    !Number.isInteger(tokensToRevoke) ||
    tokensToRevoke < 1 ||
    tokensToRevoke > 1000
  ) {
    return NextResponse.json(
      { error: "tokensToRevoke must be a positive integer between 1 and 1000" },
      { status: 400 }
    )
  }
  if (!reason || !ADMIN_REFUND_REASONS.includes(reason as AdminRefundReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${ADMIN_REFUND_REASONS.join(", ")}` },
      { status: 400 }
    )
  }
  if (adminNote !== undefined && adminNote !== null && typeof adminNote !== "string") {
    return NextResponse.json({ error: "adminNote must be a string or null" }, { status: 400 })
  }

  // ── Execute reconciliation ─────────────────────────────────────────────────
  try {
    const result = await adminRevokeTokensForPurchaseRefund({
      userId: String(userId).trim(),
      stripeRefundId: String(stripeRefundId).trim(),
      tokensToRevoke: tokensToRevoke as number,
      reason: reason as AdminRefundReason,
      adminEmail: gate.user.email ?? "unknown",
      adminNote: adminNote ? String(adminNote) : null,
    })

    if (result.duplicate) {
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          message:
            "This Stripe refund ID has already been reconciled. No changes made.",
          entry: {
            id: result.ledgerEntryId,
            tokenDelta: result.tokenDelta,
            balanceBefore: result.balanceBefore,
            balanceAfter: result.balanceAfter,
            idempotencyKey: result.idempotencyKey,
          },
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: `Revoked ${result.actualRevoke} token(s) from user ${String(userId).trim()}. Balance: ${result.balanceBefore} → ${result.balanceAfter}.`,
      entry: {
        id: result.ledgerEntryId,
        tokenDelta: result.tokenDelta,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        idempotencyKey: result.idempotencyKey,
      },
      balanceAfter: result.balanceAfter,
    })
  } catch (err: unknown) {
    if (err instanceof AdminRefundError) {
      const status = err.code === "USER_NOT_FOUND" ? 404 : 500
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
