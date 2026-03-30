import type { DraftAutomationFeature } from './types'
import { buildDraftExecutionMetadata } from './DraftAutomationPolicy'

export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number
): Promise<{ ok: true; value: T } | { ok: false; timedOut: true }> {
  let timer: NodeJS.Timeout | null = null
  try {
    const timeout = new Promise<{ ok: false; timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ ok: false, timedOut: true }), timeoutMs)
    })
    const result = await Promise.race([
      work.then((value) => ({ ok: true as const, value })),
      timeout,
    ])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function buildDeterministicExecution(feature: DraftAutomationFeature, reasonCode: string) {
  return buildDraftExecutionMetadata({
    feature,
    aiUsed: false,
    aiEligible: false,
    reasonCode,
  })
}
