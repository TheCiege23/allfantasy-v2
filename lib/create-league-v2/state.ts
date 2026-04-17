/**
 * Create League v2 — client-side state shape.
 *
 * Deliberately a narrow subset of the full wizard state: the v2 flow only
 * collects the 4-page spec's fields. On submit we translate this into the
 * existing `POST /api/league/create` payload shape, so the backend contract
 * is unchanged.
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

export interface CreateLeagueV2State {
  // ── Page 1: Setup ────────────────────────────────────────────────
  leagueType: LeagueTypeId
  /** IDP is a modifier, not a format. When true, leagueType stays 'redraft' and we pass leagueVariant: 'IDP'. */
  idpSelected: boolean
  sport: SupportedSport
  /** Soccer-only: MLS vs European data pipeline. */
  soccerPipeline: SoccerPipeline | null
  teamCount: number
  /** Survivor-only: number of tribes. Ignored for other league types. */
  survivorTribeCount: number
  draftType: WizardDraftType
  /** Third-round reversal — snake drafts only. */
  thirdRoundReversal: boolean

  // ── Page 2: Identity ─────────────────────────────────────────────
  name: string
  description: string
  timezone: string
  language: string
  scoringSource: ScoringSource
  tradeReviewMode: TradeReviewMode

  // ── Page 3: Scoring (football-only detail, passthrough for others) ─
  superflex: boolean
  tePremium: boolean
  tePremiumMultiplier: number
  pprMode: PprMode
}

export const DEFAULT_V2_STATE: CreateLeagueV2State = {
  leagueType: 'redraft',
  idpSelected: false,
  sport: 'NFL',
  soccerPipeline: null,
  teamCount: 12,
  survivorTribeCount: 2,
  draftType: 'snake',
  thirdRoundReversal: false,
  name: '',
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

// ── Page validation helpers ──────────────────────────────────────────

export type V2PageId = 'setup' | 'identity' | 'scoring' | 'review'

export const V2_PAGES: readonly V2PageId[] = ['setup', 'identity', 'scoring', 'review'] as const

export const V2_PAGE_LABELS: Record<V2PageId, string> = {
  setup: 'Setup',
  identity: 'Identity',
  scoring: 'Scoring',
  review: 'Review',
}

export function isSetupComplete(s: CreateLeagueV2State): boolean {
  return Boolean(s.leagueType && s.sport && s.teamCount > 0 && s.draftType)
}

export function isIdentityComplete(s: CreateLeagueV2State): boolean {
  return s.name.trim().length >= 3 && s.name.trim().length <= 100
}

export function isScoringComplete(_s: CreateLeagueV2State): boolean {
  // Scoring page has defaults for every field so it's always valid.
  return true
}

export function canAdvance(page: V2PageId, state: CreateLeagueV2State): boolean {
  switch (page) {
    case 'setup':
      return isSetupComplete(state)
    case 'identity':
      return isIdentityComplete(state)
    case 'scoring':
      return isScoringComplete(state)
    case 'review':
      return isSetupComplete(state) && isIdentityComplete(state) && isScoringComplete(state)
  }
}

/** Football-like sports where the Scoring page detail panel applies. */
export function isFootballLike(sport: SupportedSport): boolean {
  return sport === 'NFL' || sport === 'NCAAF'
}
