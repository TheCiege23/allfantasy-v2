/**
 * PostgreSQL advisory locks for league-scoped work inside a Prisma transaction.
 * Use only when all DB operations in the callback use the same `tx` client; otherwise prefer idempotency keys + unique constraints.
 */

import 'server-only'

import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

export function leagueLockScope(leagueId: string, purpose: string): string {
  return `${leagueId}:${purpose}`
}

/**
 * Runs `fn` while holding a transaction-scoped advisory lock derived from `leagueId` + `purpose`.
 * Collisions across different purposes are unlikely; use distinct `purpose` strings per subsystem.
 */
export async function withLeagueTransactionLock<T>(
  tx: Prisma.TransactionClient,
  leagueId: string,
  purpose: string,
  fn: () => Promise<T>,
): Promise<T> {
  const scope = leagueLockScope(leagueId, purpose)
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(abs(hashtext(${scope}::text))::bigint)`)
  return fn()
}

/**
 * Convenience: start a transaction and run work under a league lock.
 * Callback receives the transaction client — use it for all queries in `fn`.
 */
export async function prismaTransactionWithLeagueLock<T>(
  prisma: PrismaClient,
  leagueId: string,
  purpose: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const scope = leagueLockScope(leagueId, purpose)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(abs(hashtext(${scope}::text))::bigint)`)
    return fn(tx)
  })
}
