/**
 * Read-only DB helpers for payment and token fulfilment health monitoring.
 *
 * These are surfaced by GET /api/admin/chimmy/health as additional fields so
 * the ops dashboard can catch failed Stripe webhook events and missing token
 * grants without requiring direct DB access.
 *
 * All functions:
 *   - Catch their own errors and return a degraded `{ ok: false }` shape.
 *   - Use (prisma as any) to reach token / Stripe event models that are
 *     defined in schema but not yet in the generated typed client.
 *   - Are read-only; no writes.
 */

import { prisma } from "@/lib/prisma"

// ---------------------------------------------------------------------------
// Stripe webhook health
// ---------------------------------------------------------------------------

export type StripeWebhookHealthResult = {
  ok: boolean
  /** All events with status="error" inside the window (any purchaseType). */
  errorCount: number
  /** Events with status="error" AND purchaseType="tokens" — token grants that silently failed. */
  tokenErrorCount: number
  /** Oldest unresolved error event (all time) for quick triage. */
  oldestUnresolvedError: {
    eventId: string
    purchaseType: string | null
    processedAt: string | null
    errorSnippet: string
  } | null
  error?: string
}

export async function getStripeWebhookHealth(
  windowHours: number
): Promise<StripeWebhookHealthResult> {
  try {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)
    const events = (prisma as any).stripeWebhookEvent

    const [errorCount, tokenErrorCount, oldest] = await Promise.all([
      events.count({
        where: { status: "error", processedAt: { gte: since } },
      }) as Promise<number>,
      events.count({
        where: { status: "error", purchaseType: "tokens", processedAt: { gte: since } },
      }) as Promise<number>,
      events.findFirst({
        where: { status: "error" },
        orderBy: { processedAt: "asc" },
        select: {
          eventId: true,
          purchaseType: true,
          processedAt: true,
          error: true,
        },
      }) as Promise<{
        eventId: string
        purchaseType: string | null
        processedAt: Date | null
        error: string | null
      } | null>,
    ])

    return {
      ok: true,
      errorCount: errorCount ?? 0,
      tokenErrorCount: tokenErrorCount ?? 0,
      oldestUnresolvedError: oldest
        ? {
            eventId: oldest.eventId,
            purchaseType: oldest.purchaseType,
            processedAt: oldest.processedAt?.toISOString() ?? null,
            errorSnippet: (oldest.error ?? "").slice(0, 300),
          }
        : null,
    }
  } catch (e) {
    return {
      ok: false,
      errorCount: 0,
      tokenErrorCount: 0,
      oldestUnresolvedError: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Token ledger health
// ---------------------------------------------------------------------------

export type TokenLedgerHealthResult = {
  ok: boolean
  /** Total PURCHASE entries written in the window. */
  purchaseGrantsInWindow: number
  /** Total SPEND entries written in the window. */
  spendEntriesInWindow: number
  /** Distinct users who have a non-zero token balance (all-time snapshot). */
  usersWithBalance: number
  error?: string
}

export async function getTokenLedgerHealth(
  windowHours: number
): Promise<TokenLedgerHealthResult> {
  try {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)
    const ledger = (prisma as any).tokenLedger
    const balance = (prisma as any).userTokenBalance

    const [purchaseGrants, spendEntries, usersWithBalance] = await Promise.all([
      ledger.count({
        where: { entryType: "purchase", createdAt: { gte: since } },
      }) as Promise<number>,
      ledger.count({
        where: { entryType: "spend", createdAt: { gte: since } },
      }) as Promise<number>,
      balance.count({
        where: { balance: { gt: 0 } },
      }) as Promise<number>,
    ])

    return {
      ok: true,
      purchaseGrantsInWindow: purchaseGrants ?? 0,
      spendEntriesInWindow: spendEntries ?? 0,
      usersWithBalance: usersWithBalance ?? 0,
    }
  } catch (e) {
    return {
      ok: false,
      purchaseGrantsInWindow: 0,
      spendEntriesInWindow: 0,
      usersWithBalance: 0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
