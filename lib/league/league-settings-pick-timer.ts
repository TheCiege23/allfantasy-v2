/** Map LeagueSettings.pickTimerPreset + custom value to seconds (clamped 10..604800).
 *
 * Sources every preset key from the canonical `TIMER_PRESETS` list in
 * `lib/draft/timer-presets.ts` so this module can never drift out of sync with
 * the dropdown UI again. (Prior versions held a hand-maintained subset that
 * was missing `10s`, `60s`, `1200s`, `2h`, `4h`, `6h`, etc., causing those
 * preset keys to silently fall through to the 120-second default — and `off`
 * was missing entirely, returning 120 instead of 0.)
 *
 * Contract:
 *   - 'off'    → 0   (caller treats <= 0 as "no timer")
 *   - 'custom' → clamped(pickTimerCustomValue, 10..604800), default 120
 *   - any preset value listed in TIMER_PRESETS → its seconds
 *   - unknown key → 120 (defensive default)
 */

import { TIMER_PRESETS } from '@/lib/draft/timer-presets'

const PRESET_TO_SEC: Record<string, number> = {
  off: 0,
  ...Object.fromEntries(TIMER_PRESETS.map((p) => [p.value, p.seconds])),
}

export function pickTimerSecondsFromLeagueSettings(
  pickTimerPreset: string,
  pickTimerCustomValue: number | null | undefined,
): number {
  if (pickTimerPreset === 'custom') {
    const v = pickTimerCustomValue
    if (v == null || !Number.isFinite(v)) return 120
    return Math.max(10, Math.min(604800, Math.floor(v)))
  }
  return PRESET_TO_SEC[pickTimerPreset] ?? 120
}
