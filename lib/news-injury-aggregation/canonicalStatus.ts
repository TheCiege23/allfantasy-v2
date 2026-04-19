import type { CanonicalInjuryStatus } from '@/lib/news-injury-aggregation/types'

/** Deterministic mapping from provider text to a canonical bucket (no LLM). */
export function toCanonicalInjuryStatus(raw: string | null | undefined): CanonicalInjuryStatus {
  if (!raw || !raw.trim()) return 'unknown'
  const s = raw.toLowerCase()

  if (/\bir\b|injured reserve|pup|nfi|non-football|designated to return/.test(s)) return 'ir'
  if (/suspend|suspension|barred|ineligible/.test(s)) return 'suspended'
  if (/\bpersonal\b|paternity|bereavement/.test(s)) return 'personal'
  if (/\bout\b|ruled out|will not play|inactive|scratch|dnr|dnf|dnq/.test(s)) return 'out'
  if (/doubt/.test(s)) return 'doubtful'
  if (/quest/.test(s)) return 'questionable'
  if (/prob/.test(s) || /gametime decision|gtd/.test(s)) return 'probable'
  if (/active|full|full go|cleared|starting|available|healthy/.test(s)) return 'active'
  if (/limited|lp\b|partial/.test(s)) return 'questionable'
  if (/did not participate|dnp/.test(s)) return 'doubtful'

  return 'unknown'
}

/** Higher = more severe injury / less expected production. */
export function severityScore(status: CanonicalInjuryStatus): number {
  switch (status) {
    case 'ir':
    case 'suspended':
      return 100
    case 'out':
      return 95
    case 'doubtful':
      return 80
    case 'questionable':
      return 60
    case 'personal':
      return 55
    case 'probable':
      return 35
    case 'active':
      return 10
    case 'unknown':
    default:
      return 20
  }
}
