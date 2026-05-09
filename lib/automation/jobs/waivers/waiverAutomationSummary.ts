import type { ProcessedClaimResult } from "@/lib/waiver-wire/types"

export type WaiverAutomationSummary = {
  processedClaims: number
  awardedClaims: number
  failedClaims: number
  skippedClaims: number
  transactionsCreated: number
  message: string
  metadata: Record<string, unknown>
}

/**
 * Normalize `processWaiverClaimsForLeague` output + optional engine metadata into dashboard-friendly counters.
 * Reuses outcome semantics from `lib/waiver-wire/types.ts` (`ProcessedClaimResult.outcomeCode`).
 */
export function summarizeWaiverProcessingResults(
  results: ProcessedClaimResult[],
  opts?: { extraMetadata?: Record<string, unknown> }
): WaiverAutomationSummary {
  let awarded = 0
  let failed = 0
  let skipped = 0

  for (const r of results) {
    if (r.success) {
      awarded += 1
      continue
    }
    const oc = r.outcomeCode
    if (oc === "lost_priority" || oc === "lost_tiebreaker") {
      skipped += 1
    } else {
      failed += 1
    }
  }

  const processed = results.length
  const transactionsCreated = awarded

  const meta = {
    outcomeCodes: results.map((r) => r.outcomeCode ?? null),
    ...(opts?.extraMetadata ?? {}),
  }

  const message =
    processed === 0
      ? "No pending claims processed."
      : `Processed ${processed} claim(s): ${awarded} awarded, ${failed} failed, ${skipped} lost priority/tiebreaker.`

  return {
    processedClaims: processed,
    awardedClaims: awarded,
    failedClaims: failed,
    skippedClaims: skipped,
    transactionsCreated,
    message,
    metadata: meta,
  }
}
