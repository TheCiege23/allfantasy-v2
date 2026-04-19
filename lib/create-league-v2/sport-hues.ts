/**
 * Sport-tinted surfaces for Create League — dark-mode friendly gradients.
 * Aligned with AllFantasy / dashboard AI tool language (soft glow, no flat neons).
 */

import type { SupportedSport } from '@/lib/create-league-v2/state'

export type SportHue = {
  sport: SupportedSport
  /** Page / hero gradient overlay */
  pageGradient: string
  /** Card ring / focus glow */
  glow: string
  /** Muted label accent */
  labelClass: string
}

export const SPORT_HUES: Record<SupportedSport, SportHue> = {
  NFL: {
    sport: 'NFL',
    pageGradient:
      'from-[#0a1628]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(56,189,248,0.45)]',
    labelClass: 'text-sky-300/90',
  },
  NBA: {
    sport: 'NBA',
    pageGradient:
      'from-[#28140a]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(251,146,60,0.42)]',
    labelClass: 'text-orange-300/90',
  },
  MLB: {
    sport: 'MLB',
    pageGradient:
      'from-[#0a1f18]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(52,211,153,0.4)]',
    labelClass: 'text-emerald-300/90',
  },
  NHL: {
    sport: 'NHL',
    pageGradient:
      'from-[#0a1824]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(34,211,238,0.38)]',
    labelClass: 'text-cyan-200/90',
  },
  SOCCER: {
    sport: 'SOCCER',
    pageGradient:
      'from-[#0a2214]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(74,222,128,0.42)]',
    labelClass: 'text-lime-300/90',
  },
  NCAAF: {
    sport: 'NCAAF',
    pageGradient:
      'from-[#240a12]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(248,113,113,0.38)]',
    labelClass: 'text-rose-300/90',
  },
  NCAAB: {
    sport: 'NCAAB',
    pageGradient:
      'from-[#180a28]/90 via-[#060a18]/40 to-transparent',
    glow: 'shadow-[0_0_48px_-12px_rgba(167,139,250,0.42)]',
    labelClass: 'text-violet-300/90',
  },
}

export function getSportHue(sport: SupportedSport | null | undefined): SportHue {
  if (!sport) return SPORT_HUES.NFL
  return SPORT_HUES[sport] ?? SPORT_HUES.NFL
}
