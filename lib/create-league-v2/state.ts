/**
 * Create League v2 — client-side state shape (concept-first unified flow).
 *
 * Collects: concept → sport + scoring preset → teams + name → draft type.
 * On submit, translates into `POST /api/leagues` (canonical) or `POST /api/tournament/create`.
 */

import type { LeagueTypeId, DraftTypeId } from '@/lib/league-creation-wizard/types'

/** Wizard-level draft type — superset of Prisma's DraftTypeId to accommodate execution modes. */
export type WizardDraftType = DraftTypeId | 'team' | 'auto' | 'offline'

export type SupportedSport =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'SOCCER'

export const SUPPORTED_SPORTS: SupportedSport[] = [
  'NFL',
  'NBA',
  'MLB',
  'NHL',
  'NCAAF',
  'NCAAB',
  'SOCCER',
]

export type TradeReviewMode = 'none' | 'commissioner' | 'league_vote'
export type PprMode = 'standard' | 'half' | 'full'
export type ScoringSource = 'af' | 'sleeper' | 'espn' | 'yahoo'

export type SoccerPipeline = 'mls' | 'euro'

export type CreateLeagueSectionKey = 'concept' | 'sport' | 'teams' | 'draft'

export interface CreateLeagueV2State {
  /** Null until the user explicitly picks a league concept (concept-first). */
  leagueType: LeagueTypeId | null
  /** IDP is a modifier, not a format. When true, leagueType stays 'redraft' and we pass leagueVariant: 'IDP'. */
  idpSelected: boolean
  sport: SupportedSport
  /** Soccer-only: MLS vs European data pipeline. */
  soccerPipeline: SoccerPipeline | null
  /** Stable id from `lib/league-creation-preset/scoring-presets` */
  scoringPresetId: string
  teamCount: number
  /** Survivor-only: number of tribes. Ignored for other league types. */
  survivorTribeCount: number
  draftType: WizardDraftType
  /** Third-round reversal — snake drafts only. */
  thirdRoundReversal: boolean
  name: string
  /** When false, name updates from smart defaults when concept/sport/teams change. */
  nameTouched: boolean
  description: string
  timezone: string
  language: string
  scoringSource: ScoringSource
  tradeReviewMode: TradeReviewMode
  /** Legacy fields — derived from scoring preset on submit; kept for session hydration compatibility. */
  superflex: boolean
  tePremium: boolean
  tePremiumMultiplier: number
  pprMode: PprMode
}

export const DEFAULT_V2_STATE: CreateLeagueV2State = {
  leagueType: null,
  idpSelected: false,
  sport: 'NFL',
  soccerPipeline: null,
  scoringPresetId: '',
  teamCount: 12,
  survivorTribeCount: 2,
  draftType: 'snake',
  thirdRoundReversal: false,
  name: '',
  nameTouched: false,
  description: '',
  timezone: 'America/New_York',
  language: 'en',
  scoringSource: 'af',
  tradeReviewMode: 'commissioner',
  superflex: false,
  tePremium: false,
  tePremiumMultiplier: 1.5,
  pprMode: 'half',
}

export const V2_STORAGE_KEY = 'af:create-league-v2:state'

export function loadPersistedV2State(): Partial<CreateLeagueV2State> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(V2_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CreateLeagueV2State>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function persistV2State(state: CreateLeagueV2State): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(V2_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota / disabled storage — safe to ignore.
  }
}

export function clearPersistedV2State(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(V2_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getEffectiveLeagueType(state: CreateLeagueV2State): LeagueTypeId | null {
  if (state.idpSelected) return 'redraft'
  return state.leagueType
}

export function isFormComplete(s: CreateLeagueV2State): boolean {
  const lt = getEffectiveLeagueType(s)
  if (!lt) return false
  if (!s.sport) return false
  if (!s.scoringPresetId?.trim()) return false
  if (!(s.teamCount > 0)) return false
  if (s.name.trim().length < 3 || s.name.trim().length > 100) return false
  if (!s.draftType) return false
  return true
}

/** @deprecated Multi-step flow removed — kept for imports that still reference page ids. */
export type V2PageId = 'setup' | 'identity' | 'scoring' | 'review'

/** @deprecated */
export const V2_PAGES: readonly V2PageId[] = ['setup', 'identity', 'scoring', 'review'] as const

/** @deprecated */
export const V2_PAGE_LABELS: Record<V2PageId, string> = {
  setup: 'Setup',
  identity: 'Identity',
  scoring: 'Scoring',
  review: 'Review',
}

/** @deprecated */
export function isSetupComplete(s: CreateLeagueV2State): boolean {
  return Boolean(getEffectiveLeagueType(s) && s.sport && s.teamCount > 0 && s.draftType)
}

/** @deprecated */
export function isIdentityComplete(s: CreateLeagueV2State): boolean {
  return s.name.trim().length >= 3 && s.name.trim().length <= 100
}

/** @deprecated */
export function isScoringComplete(_s: CreateLeagueV2State): boolean {
  return true
}

/** @deprecated */
export function canAdvance(page: V2PageId, state: CreateLeagueV2State): boolean {
  switch (page) {
    case 'setup':
      return isSetupComplete(state)
    case 'identity':
      return isIdentityComplete(state)
    case 'scoring':
      return isScoringComplete(state)
    case 'review':
      return isFormComplete(state)
  }
}

/** Football-like sports where the Scoring page detail panel applies. */
export function isFootballLike(sport: SupportedSport): boolean {
  return sport === 'NFL' || sport === 'NCAAF'
}
