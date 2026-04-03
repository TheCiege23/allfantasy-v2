/** Map LeagueSettings.pickTimerPreset + custom value to seconds (clamped 10..604800). */
const PRESET_TO_SEC: Record<string, number> = {
  '30s': 30,
  '60s': 60,
  '90s': 90,
  '120s': 120,
  '300s': 300,
  '600s': 600,
  '1800s': 1800,
  '3600s': 3600,
  '3h': 10800,
  '8h': 28800,
  '24h': 86400,
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
