import type { ZombieLeague } from '@prisma/client'

export function getLeagueMode(league: Pick<ZombieLeague, 'isPaid'>): 'paid' | 'free' {
  return league.isPaid ? 'paid' : 'free'
}

export function currencyLabelForMode(
  mode: 'paid' | 'free',
  freeLabel: string | null | undefined,
): string {
  if (mode === 'paid') return '$'
  return freeLabel?.trim() || 'Outbreak Points'
}
