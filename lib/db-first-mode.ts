function readEnvBool(name: string, fallback = false): boolean {
  const value = (process.env[name] ?? '').trim().toLowerCase()
  if (!value) return fallback
  if (value === '1' || value === 'true' || value === 'yes' || value === 'on') return true
  if (value === '0' || value === 'false' || value === 'no' || value === 'off') return false
  return fallback
}

function readEnvInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

export const dbFirstMode = {
  useDbCacheOnly: readEnvBool('AF_USE_DB_CACHE_ONLY', false),
  disableLiveApiOnPageLoad: readEnvBool('AF_DISABLE_LIVE_API_ON_PAGE_LOAD', false),
  disableImageLookupOnPageLoad: readEnvBool('AF_DISABLE_IMAGE_LOOKUP_ON_PAGE_LOAD', false),
  disableAdpLiveMergeOnPageLoad: readEnvBool('AF_DISABLE_ADP_LIVE_MERGE_ON_PAGE_LOAD', false),
  disableStatsLiveMergeOnPageLoad: readEnvBool('AF_DISABLE_STATS_LIVE_MERGE_ON_PAGE_LOAD', false),
  mockAiCacheFirst: readEnvBool('AF_MOCK_AI_CACHE_FIRST', false),
  disableAiLiveCalls: readEnvBool('AF_DISABLE_AI_LIVE_CALLS', false),
  draftPoolCacheTtlSeconds: Math.max(1, readEnvInt('AF_DRAFT_POOL_CACHE_TTL_SECONDS', 300)),
} as const
