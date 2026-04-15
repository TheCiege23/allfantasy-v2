import type { LeftChatInitialTab } from '@/app/dashboard/types'

/**
 * Parses `?openChat=` for league shell / left rail (matches LeftChatPanel tabs).
 */
export function normalizeOpenChatQueryParam(raw: string | null | undefined): LeftChatInitialTab | undefined {
  if (raw == null || typeof raw !== 'string') return undefined
  const r = raw.trim().toLowerCase()
  if (r === 'league') return 'league'
  if (r === 'chimmy' || r === 'ai') return 'chimmy'
  if (r === 'dms' || r === 'dm' || r === 'direct') return 'dms'
  if (r === 'af_huddle' || r === 'huddle' || r === 'group') return 'af_huddle'
  return undefined
}
