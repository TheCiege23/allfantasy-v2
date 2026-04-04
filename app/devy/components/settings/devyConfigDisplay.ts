export function devyStr(config: Record<string, unknown> | null, key: string, fallback = '—'): string {
  if (!config) return fallback
  const v = config[key]
  if (v === null || v === undefined) return fallback
  return String(v)
}

export function devyNum(config: Record<string, unknown> | null, key: string, fallback = 0): number {
  if (!config) return fallback
  const v = config[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return fallback
}

export function devyBool(config: Record<string, unknown> | null, key: string, fallback = false): boolean {
  if (!config) return fallback
  const v = config[key]
  return typeof v === 'boolean' ? v : fallback
}
