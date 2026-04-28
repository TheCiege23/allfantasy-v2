import 'server-only'

import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'

type AiResultRecord = {
  id: string
  resultKey: string
  inputHash: string
  feature: string
  scopeType: string | null
  scopeId: string | null
  provider: string | null
  model: string | null
  status: string
  inputJson: unknown
  resultText: string | null
  resultJson: unknown
  tokenPrompt: number | null
  tokenOutput: number | null
  syncedAt: Date
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`
}

export function buildAiInputHash(input: {
  feature: string
  scopeType?: string | null
  scopeId?: string | null
  model?: string | null
  payload: unknown
}): string {
  const canonical = stableStringify({
    feature: input.feature,
    scopeType: input.scopeType ?? null,
    scopeId: input.scopeId ?? null,
    model: input.model ?? null,
    payload: input.payload,
  })
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

export async function getCachedAiResult(input: {
  feature: string
  scopeType?: string | null
  scopeId?: string | null
  model?: string | null
  payload: unknown
}): Promise<AiResultRecord | null> {
  const inputHash = buildAiInputHash(input)
  const now = new Date()
  const row = await (prisma as any).aiResult.findFirst({
    where: {
      inputHash,
      feature: input.feature,
      ...(input.scopeType ? { scopeType: input.scopeType } : {}),
      ...(input.scopeId ? { scopeId: input.scopeId } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      status: 'ready',
    },
    orderBy: { syncedAt: 'desc' },
  })
  return (row ?? null) as AiResultRecord | null
}

export async function saveAiResult(input: {
  feature: string
  scopeType?: string | null
  scopeId?: string | null
  provider?: string | null
  model?: string | null
  payload: unknown
  resultText?: string | null
  resultJson?: unknown
  status?: string
  tokenPrompt?: number | null
  tokenOutput?: number | null
  ttlSeconds?: number | null
}): Promise<AiResultRecord> {
  const inputHash = buildAiInputHash({
    feature: input.feature,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    model: input.model,
    payload: input.payload,
  })
  const resultKey = `${input.feature}:${input.scopeType ?? 'global'}:${input.scopeId ?? 'global'}:${inputHash}`
  const expiresAt =
    typeof input.ttlSeconds === 'number' && input.ttlSeconds > 0
      ? new Date(Date.now() + input.ttlSeconds * 1000)
      : null

  const row = await (prisma as any).aiResult.upsert({
    where: { resultKey },
    create: {
      resultKey,
      inputHash,
      feature: input.feature,
      scopeType: input.scopeType ?? null,
      scopeId: input.scopeId ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status ?? 'ready',
      inputJson: input.payload as object,
      resultText: input.resultText ?? null,
      resultJson: (input.resultJson ?? null) as object | null,
      tokenPrompt: input.tokenPrompt ?? null,
      tokenOutput: input.tokenOutput ?? null,
      syncedAt: new Date(),
      expiresAt,
    },
    update: {
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status ?? 'ready',
      inputJson: input.payload as object,
      resultText: input.resultText ?? null,
      resultJson: (input.resultJson ?? null) as object | null,
      tokenPrompt: input.tokenPrompt ?? null,
      tokenOutput: input.tokenOutput ?? null,
      syncedAt: new Date(),
      expiresAt,
    },
  })

  return row as AiResultRecord
}

export async function getOrCreateAiResult(input: {
  feature: string
  scopeType?: string | null
  scopeId?: string | null
  provider?: string | null
  model?: string | null
  payload: unknown
  ttlSeconds?: number | null
  onCacheMiss: () => Promise<{
    resultText?: string | null
    resultJson?: unknown
    status?: string
    tokenPrompt?: number | null
    tokenOutput?: number | null
  }>
}): Promise<{
  cacheHit: boolean
  row: AiResultRecord
  modelDurationMs: number | null
}> {
  const cached = await getCachedAiResult({
    feature: input.feature,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    model: input.model,
    payload: input.payload,
  })

  if (cached) {
    return {
      cacheHit: true,
      row: cached,
      modelDurationMs: null,
    }
  }

  const modelStart = Date.now()
  const missResult = await input.onCacheMiss()
  const modelDurationMs = Date.now() - modelStart

  const row = await saveAiResult({
    feature: input.feature,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    provider: input.provider,
    model: input.model,
    payload: input.payload,
    resultText: missResult.resultText ?? null,
    resultJson: missResult.resultJson,
    status: missResult.status ?? 'ready',
    tokenPrompt: missResult.tokenPrompt ?? null,
    tokenOutput: missResult.tokenOutput ?? null,
    ttlSeconds: input.ttlSeconds,
  })

  return {
    cacheHit: false,
    row,
    modelDurationMs,
  }
}
