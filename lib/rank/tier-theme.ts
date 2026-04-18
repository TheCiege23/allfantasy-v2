/**
 * Dark-theme visual identity per fantasy rank tier group (1–7 from `lib/rank/levels` RANK_LEVELS).
 * Used by AF Rankings dashboard card and `/af-rankings` page for consistent prestige styling.
 */

export type TierTheme = {
  tierGroup: number
  /** Stable key for animations / tests */
  key: string
  /** Human-readable tier family (Rookie, Starter, …) */
  familyLabel: string
  accent: string
  accentSoft: string
  glow: string
  /** Gradient for XP / progress fills */
  barFrom: string
  barTo: string
  borderGlow: string
  chipBg: string
  /** Optional CSS for subtle legend shimmer (className addition in consumers) */
  shimmerClass?: string
}

const TIERS: TierTheme[] = [
  {
    tierGroup: 1,
    key: 'rookie',
    familyLabel: 'Rookie',
    accent: '#c4a574',
    accentSoft: '#8b7355',
    glow: 'rgba(196,165,116,0.45)',
    barFrom: '#78716c',
    barTo: '#d6bc8f',
    borderGlow: 'rgba(196,165,116,0.55)',
    chipBg: 'rgba(196,165,116,0.14)',
  },
  {
    tierGroup: 2,
    key: 'starter',
    familyLabel: 'Starter',
    accent: '#38bdf8',
    accentSoft: '#0ea5e9',
    glow: 'rgba(56,189,248,0.42)',
    barFrom: '#0284c7',
    barTo: '#7dd3fc',
    borderGlow: 'rgba(56,189,248,0.5)',
    chipBg: 'rgba(56,189,248,0.12)',
  },
  {
    tierGroup: 3,
    key: 'veteran',
    familyLabel: 'Veteran',
    accent: '#4ade80',
    accentSoft: '#22c55e',
    glow: 'rgba(74,222,128,0.38)',
    barFrom: '#15803d',
    barTo: '#86efac',
    borderGlow: 'rgba(74,222,128,0.45)',
    chipBg: 'rgba(74,222,128,0.1)',
  },
  {
    tierGroup: 4,
    key: 'allpro',
    familyLabel: 'All-Pro',
    accent: '#a78bfa',
    accentSoft: '#7c3aed',
    glow: 'rgba(167,139,250,0.45)',
    barFrom: '#6d28d9',
    barTo: '#c4b5fd',
    borderGlow: 'rgba(167,139,250,0.5)',
    chipBg: 'rgba(167,139,250,0.12)',
  },
  {
    tierGroup: 5,
    key: 'playoff',
    familyLabel: 'Playoff',
    accent: '#fb923c',
    accentSoft: '#ea580c',
    glow: 'rgba(251,146,60,0.42)',
    barFrom: '#c2410c',
    barTo: '#fdba74',
    borderGlow: 'rgba(251,146,60,0.48)',
    chipBg: 'rgba(251,146,60,0.1)',
  },
  {
    tierGroup: 6,
    key: 'champion',
    familyLabel: 'Champion',
    accent: '#f472b6',
    accentSoft: '#db2777',
    glow: 'rgba(244,114,182,0.4)',
    barFrom: '#be185d',
    barTo: '#fbcfe8',
    borderGlow: 'rgba(244,114,182,0.45)',
    chipBg: 'rgba(244,114,182,0.1)',
  },
  {
    tierGroup: 7,
    key: 'dynasty',
    familyLabel: 'Dynasty',
    accent: '#fcd34d',
    accentSoft: '#d97706',
    glow: 'rgba(252,211,77,0.5)',
    barFrom: '#b45309',
    barTo: '#fde68a',
    borderGlow: 'rgba(252,211,77,0.55)',
    chipBg: 'rgba(252,211,77,0.14)',
    shimmerClass: 'af-rank-legend-shimmer',
  },
]

export function getTierTheme(tierGroup: number | null | undefined): TierTheme {
  const g = typeof tierGroup === 'number' && Number.isFinite(tierGroup)
    ? Math.min(7, Math.max(1, Math.round(tierGroup)))
    : 1
  return TIERS[g - 1] ?? TIERS[0]
}

/** Short label shown next to AI score (deterministic from score — no LLM). */
export function getAiScoreDescriptor(score: number): string {
  if (score >= 92) return 'Elite trajectory'
  if (score >= 85) return 'Rising fast'
  if (score >= 78) return 'Rising'
  if (score >= 72) return 'Stable'
  if (score >= 65) return 'Building'
  if (score >= 58) return 'Recovering'
  return 'Room to grow'
}
