#!/usr/bin/env tsx
/**
 * scripts/regression-ai-result-cache.ts
 *
 * CI-safe regression guard for AiResult cache wiring.
 *
 * Assertions:
 *  1) Required files import and use the shared ai-result-cache helper.
 *  2) Shared helper can upsert/read from AiResult deterministically.
 *  3) Repeat write on same resultKey updates same row (no duplicate key behavior).
 *
 * Usage:
 *   npm run ai-result-cache:regression
 */

import { readFileSync } from 'node:fs'
import { prisma } from '../lib/prisma'
import { buildAiCacheKey, readAiResultCache, writeAiResultCache } from '../lib/ai-result-cache'

type Assertion = {
  name: string
  pass: boolean
  details?: string
}

const REQUIRED_CACHE_FILES = [
  'lib/ai-commissioner/AICommissionerService.ts',
  'app/api/ai/power-rankings/route.ts',
  'app/api/ai/waiver-recs/route.ts',
  'app/api/ai/matchup-preview/route.ts',
  'app/api/ai/commish-note/route.ts',
] as const

function hasCacheWiring(content: string): boolean {
  return (
    content.includes("@/lib/ai-result-cache") &&
    content.includes('buildAiCacheKey') &&
    content.includes('readAiResultCache') &&
    content.includes('writeAiResultCache')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForCacheRead(resultKey: string, attempts = 4, delayMs = 300): Promise<Awaited<ReturnType<typeof readAiResultCache>>> {
  for (let i = 0; i < attempts; i += 1) {
    const hit = await readAiResultCache(resultKey)
    if (hit) return hit
    if (i < attempts - 1) await sleep(delayMs)
  }
  return null
}

async function assertFileWiring(): Promise<Assertion[]> {
  return REQUIRED_CACHE_FILES.map((filePath) => {
    try {
      const content = readFileSync(filePath, 'utf8')
      const pass = hasCacheWiring(content)
      return {
        name: `cache-wiring:${filePath}`,
        pass,
        details: pass ? 'ok' : 'missing one or more required cache helper references',
      }
    } catch (e) {
      return {
        name: `cache-wiring:${filePath}`,
        pass: false,
        details: e instanceof Error ? e.message : 'failed to read file',
      }
    }
  })
}

async function assertHelperRoundTrip(): Promise<Assertion[]> {
  const scopeId = `regression-${Date.now()}`
  const payload = {
    lane: 'ai-result-cache',
    scopeId,
    test: 'round-trip',
    version: 1,
  }

  const { resultKey, inputHash } = buildAiCacheKey('ai-cache-regression-smoke', payload)

  await writeAiResultCache({
    resultKey,
    inputHash,
    feature: 'ai-cache-regression-smoke',
    scopeType: 'system',
    scopeId,
    provider: 'none',
    inputJson: payload,
    resultText: 'first-write',
    resultJson: { ok: true, step: 1 },
    ttlMs: 5 * 60 * 1000,
  })

  const firstRead = await waitForCacheRead(resultKey)

  await writeAiResultCache({
    resultKey,
    inputHash,
    feature: 'ai-cache-regression-smoke',
    scopeType: 'system',
    scopeId,
    provider: 'none',
    inputJson: payload,
    resultText: 'second-write',
    resultJson: { ok: true, step: 2 },
    ttlMs: 5 * 60 * 1000,
  })

  const secondRead = await waitForCacheRead(resultKey)

  const rowCount = await prisma.aiResult.count({ where: { resultKey } })

  return [
    {
      name: 'helper-round-trip:first-read-exists',
      pass: !!firstRead,
      details: firstRead ? 'ok' : 'readAiResultCache miss after retry window',
    },
    {
      name: 'helper-round-trip:second-read-updated',
      pass: secondRead?.resultText === 'second-write',
      details: `resultText=${secondRead?.resultText ?? 'null'}`,
    },
    {
      name: 'helper-round-trip:single-row-per-key',
      pass: rowCount === 1,
      details: `rowCount=${rowCount}`,
    },
  ]
}

async function main() {
  const assertions: Assertion[] = []

  assertions.push(...(await assertFileWiring()))
  assertions.push(...(await assertHelperRoundTrip()))

  const passCount = assertions.filter((a) => a.pass).length
  const failCount = assertions.length - passCount

  console.log('\n=== AI RESULT CACHE REGRESSION ===\n')
  for (const a of assertions) {
    const marker = a.pass ? '[PASS]' : '[FAIL]'
    console.log(`${marker} ${a.name}${a.details ? ` :: ${a.details}` : ''}`)
  }
  console.log('\nSummary:')
  console.log(`  total=${assertions.length}`)
  console.log(`  pass=${passCount}`)
  console.log(`  fail=${failCount}`)

  if (failCount > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((e) => {
    console.error('[regression-ai-result-cache] Fatal:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined)
  })
