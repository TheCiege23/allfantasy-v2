/**
 * Reads optional entry fee from league `settings` JSON (same keys as dashboard list).
 */
export function extractEntryFeeUsdFromSettings(settings: unknown): number | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const o = settings as Record<string, unknown>
  const keys = ['entryFee', 'entry_fee', 'buyIn', 'buy_in', 'buyInAmount', 'entry_fee_usd']
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  }
  return null
}
