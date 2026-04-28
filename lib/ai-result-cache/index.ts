/**
 * lib/ai-result-cache/index.ts
 *
 * DB-first AiResult cache helpers — thin wrapper around prisma.aiResult.
 *
 * Usage pattern (mirrors PlayerCardAnalyticsService):
 *   1. Build deterministic inputs object (only stable, non-secret fields).
 *   2. const { resultKey, inputHash } = buildAiCacheKey(feature, inputs)
 *   3. const hit = await readAiResultCache(resultKey)
 *      if (hit) return hit
 *   4. const text = await callAI(...)
 *   5. await writeAiResultCache({ resultKey, inputHash, feature, ... })
 */

import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ── key helpers ──────────────────────────────────────────────────────────────

/** Stable JSON serialisation — sorts object keys recursively. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value))
    return `[${(value as unknown[]).map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

export interface AiCacheKey {
  resultKey: string
  inputHash: string
}

/**
 * Build a stable (resultKey, inputHash) pair from an arbitrary inputs object.
 * resultKey is scoped to the feature so different features never collide.
 */
export function buildAiCacheKey(
  feature: string,
  inputs: Record<string, unknown>,
): AiCacheKey {
  const inputHash = createHash('sha256').update(stableStringify(inputs)).digest('hex')
  const resultKey = `${feature}:${inputHash}`
  return { resultKey, inputHash }
}

// ── read ─────────────────────────────────────────────────────────────────────

export interface AiResultHit {
  resultText: string | null
  resultJson: unknown
  /** ISO string */
  syncedAt: string
}

/**
 * Read a cached AI result by resultKey.
 * Returns null on miss, stale entry, or DB error.
 */
export async function readAiResultCache(resultKey: string): Promise<AiResultHit | null> {
  try {
    const row = await prisma.aiResult.findUnique({
      where: { resultKey },
      select: { resultText: true, resultJson: true, expiresAt: true, syncedAt: true },
    })
    if (!row) return null
    const now = new Date()
    if (row.expiresAt && row.expiresAt <= now) return null
    return {
      resultText: row.resultText ?? null,
      resultJson: row.resultJson ?? null,
      syncedAt: row.syncedAt.toISOString(),
    }
  } catch {
    return null
  }
}

// ── write ─────────────────────────────────────────────────────────────────────

export interface WriteAiResultCacheParams {
  resultKey: string
  inputHash: string
  feature: string
  scopeType?: string | null
  scopeId?: string | null
  provider?: string | null
  model?: string | null
  inputJson?: Record<string, unknown> | null
  resultText?: string | null
  resultJson?: unknown
  tokenPrompt?: number | null
  tokenOutput?: number | null
  ttlMs: number
}

function toNullableJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

/**
 * Upsert an AI result into the cache.
 * Fire-and-forget safe — catches and logs errors without throwing.
 */
export async function writeAiResultCache(params: WriteAiResultCacheParams): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + params.ttlMs)
  try {
    await prisma.aiResult.upsert({
      where: { resultKey: params.resultKey },
      update: {
        resultText: params.resultText ?? null,
        resultJson: params.resultJson !== undefined ? (params.resultJson as never) : undefined,
        syncedAt: now,
        expiresAt,
        status: 'ready',
        updatedAt: now,
        tokenPrompt: params.tokenPrompt ?? null,
        tokenOutput: params.tokenOutput ?? null,
      },
      create: {
        resultKey: params.resultKey,
        inputHash: params.inputHash,
        feature: params.feature,
        scopeType: params.scopeType ?? null,
        scopeId: params.scopeId ?? null,
        provider: params.provider ?? null,
        model: params.model ?? null,
        status: 'ready',
        inputJson: toNullableJsonInput(params.inputJson),
        resultText: params.resultText ?? null,
        resultJson: params.resultJson !== undefined ? (params.resultJson as never) : undefined,
        syncedAt: now,
        expiresAt,
      },
    })
  } catch (e) {
    console.warn(
      `[ai-result-cache] write failed { feature: '${params.feature}', key: '${params.resultKey.slice(0, 48)}' }:`,
      e instanceof Error ? e.message : e,
    )
  }
}

export {
  createSmokeAiResult,
  isAiResultCacheSmokeProviderEnabled,
  type SmokeAiPayload,
  type SmokeAiResult,
} from './smoke-provider'
