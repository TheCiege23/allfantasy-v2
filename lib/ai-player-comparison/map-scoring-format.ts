import type { ScoringFormat } from '@/lib/player-comparison-lab/types'

const ALLOWED: ScoringFormat[] = ['ppr', 'half_ppr', 'non_ppr']

export function parseScoringFormat(raw: string | null | undefined): ScoringFormat | null {
  if (!raw || typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (s === 'ppr' || s === 'full_ppr') return 'ppr'
  if (s === 'half_ppr' || s === 'half' || s === '0.5_ppr') return 'half_ppr'
  if (s === 'non_ppr' || s === 'standard' || s === 'std') return 'non_ppr'
  if ((ALLOWED as string[]).includes(s)) return s as ScoringFormat
  return null
}
