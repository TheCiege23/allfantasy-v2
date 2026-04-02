'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import EngagementEventTracker from '@/components/engagement/EngagementEventTracker'
import { LandingToolVisitTracker } from '@/components/landing/LandingToolVisitTracker'
import { DEFAULT_SPORT, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

type Objective = 'WIN_NOW' | 'REBUILD' | 'BALANCED'
type FinderMode = 'FAST' | 'DEEP' | 'EXHAUSTIVE'
type ApiMode = 'FAST' | 'DEEP'
type FocusPreset = 'NONE' | 'TARGET_POSITION' | 'ACQUIRE_PICKS' | 'CONSOLIDATE'
type NeedFilter = 'QB' | 'RB' | 'WR' | 'TE' | 'PICKS'
type Position = 'QB' | 'RB' | 'WR' | 'TE'
type Tone = 'FRIENDLY' | 'CONFIDENT' | 'CASUAL' | 'DATA_BACKED' | 'SHORT'
type ActiveTab = 'find' | 'partners'
type PhaseKey = 'plan' | 'pricing' | 'engine' | 'ai' | 'check'
type Verdict = 'SMASH' | 'ACCEPT' | 'LEAN' | 'FAIR' | 'DECLINE'

type LegacyPlayerIndex = Record<string, { name: string; position: string; team: string | null }>

interface UserLeague {
  id: string
  rosterLeagueId: string | null
  sleeperLeagueId: string | null
  name: string
  platform: string
  sport: SupportedSport
  format: 'redraft' | 'dynasty' | 'keeper'
  scoring: string
  teamCount: number
  season: string
  avatarUrl: string | null
  synced: boolean
  fallbackRosterData: unknown | null
}

interface RosterPlayer {
  id: string
  name: string
  position: string
  team: string
  tradeValue: number | null
  injuryStatus: string | null
  isStarter: boolean
}

interface DraftPick {
  id: string
  label: string
  season: number
  round: number
}

interface CandidateAsset {
  assetId: string
  name: string
  value: number
  tier: string
  position?: string
  age?: number
  isPick?: boolean
  pickYear?: number
  pickRound?: number
  injuryFlag?: boolean
}

interface TradeFinderCandidate {
  tradeId: string
  archetype: string
  finderScore: number
  valueDeltaPct: number
  whyThisExists: string[]
  teamA: {
    teamId: string
    gives: CandidateAsset[]
    receives: CandidateAsset[]
  }
  teamB: {
    teamId: string
    gives: CandidateAsset[]
    receives: CandidateAsset[]
  }
}

interface TradeFinderRecommendation {
  tradeId: string
  rank: number
  summary: string
  whyItHelpsYou: string
  whyTheyAccept: string
  negotiationTip: string
  confidence: number
  winProbDelta: string
  riskFlags: string[]
  fallbackAsset: string | null
}

interface TradeFinderOpportunity {
  type: string
  title: string
  description: string
  icon: string
  targetManager?: string
  targetTeamId?: string
  relevantPlayers: Array<{ name: string; position: string; value: number; reason: string }>
  confidence: number
  actionable: boolean
}

interface TradeFinderResponse {
  recommendations?: TradeFinderRecommendation[]
  opportunities?: TradeFinderOpportunity[]
  overallStrategy?: string
  objectiveNotes?: string
  candidates?: TradeFinderCandidate[]
  meta?: {
    partnersEvaluated?: number
    rawCandidatesGenerated?: number
    prunedTo?: number
    aiEnhanced?: boolean
  }
  error?: string
}

interface PartnerMatchApiRow {
  teamId?: string
  externalId?: string
  teamName?: string
  record?: string
  needs?: string[]
  strengths?: string[]
  yourOffer?: string
  theirOffer?: string
  matchScore?: number
  tradeAngle?: string
  reputation?: {
    tier?: string
    overallScore?: number
  } | null
}

interface PartnerMatchResponse {
  userTeam?: {
    name?: string
    needs?: string[]
    strengths?: string[]
  }
  matches?: PartnerMatchApiRow[]
  error?: string
}

interface TradeAssetDisplay {
  id: string
  name: string
  position: string
  team: string
  value: number
  isPick: boolean
  injuryFlag: boolean
}

interface TradeCardModel {
  id: string
  tradeId: string
  partnerRosterId: string
  partnerName: string
  partnerRecord: string
  partnerObjective: string
  give: TradeAssetDisplay[]
  get: TradeAssetDisplay[]
  fairnessScore: number
  valueDelta: number
  valueDeltaPct: number
  confidence: number
  aiSummary: string
  whyTheyAccept: string
  negotiationTip: string
  verdict: Verdict
  archetype: string
  riskFlags: string[]
}

interface PartnerCardModel {
  externalRosterId: string
  managerName: string
  teamRecord: string
  objectiveLabel: string
  compatibility: number
  whyTheyTrade: string
  sharedNeeds: string[]
  yourOffer: string
  theirOffer: string
  reputationLabel: string | null
}

const SPORT_LABELS: Record<SupportedSport, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
}

const PLATFORM_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  sleeper: { emoji: '🌙', color: '#818cf8', label: 'Sleeper' },
  yahoo: { emoji: '🟣', color: '#7c3aed', label: 'Yahoo' },
  mfl: { emoji: '🏆', color: '#fbbf24', label: 'MFL' },
  fantrax: { emoji: '📊', color: '#34d399', label: 'Fantrax' },
  espn: { emoji: '🔴', color: '#f97316', label: 'ESPN' },
}

const POS_COLORS: Record<string, string> = {
  QB: 'border-red-500/30 bg-red-500/15 text-red-200',
  RB: 'border-green-500/30 bg-green-500/15 text-green-200',
  WR: 'border-blue-500/30 bg-blue-500/15 text-blue-200',
  TE: 'border-orange-500/30 bg-orange-500/15 text-orange-200',
  PICK: 'border-violet-500/30 bg-violet-500/15 text-violet-200',
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; dots: number }> = {
  SMASH: { label: 'SMASH', color: '#10b981', dots: 5 },
  ACCEPT: { label: 'ACCEPT', color: '#34d399', dots: 4 },
  LEAN: { label: 'LEAN', color: '#fbbf24', dots: 3 },
  FAIR: { label: 'FAIR', color: '#fbbf24', dots: 3 },
  DECLINE: { label: 'DECLINE', color: '#ef4444', dots: 1 },
}

const PECR_PHASES: Array<{ key: PhaseKey; label: string; icon: string }> = [
  { key: 'plan', label: 'Planning', icon: '📋' },
  { key: 'pricing', label: 'Pricing', icon: '💰' },
  { key: 'engine', label: 'Engine', icon: '⚙️' },
  { key: 'ai', label: 'AI', icon: '🧠' },
  { key: 'check', label: 'Check', icon: '✅' },
]

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function stringFromUnknown(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberFromUnknown(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(numeric) ? numeric : null
}

function arrayFromUnknown(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function inferLeagueFormat(raw: Record<string, unknown>): UserLeague['format'] {
  const format = stringFromUnknown(raw.format)?.toLowerCase()
  const variant = stringFromUnknown(raw.league_variant)?.toLowerCase()
  if (format === 'redraft' || format === 'dynasty' || format === 'keeper') return format
  if (raw.isDynasty === true) return 'dynasty'
  if (variant?.includes('keeper')) return 'keeper'
  return 'redraft'
}

function ordinal(round: number) {
  if (round === 1) return '1st'
  if (round === 2) return '2nd'
  if (round === 3) return '3rd'
  return `${round}th`
}

function normalizeLeagueFromList(rawLeague: unknown, userId: string | undefined): UserLeague | null {
  const raw = recordFromUnknown(rawLeague)
  if (!raw) return null

  const platform = stringFromUnknown(raw.platform) ?? 'sleeper'
  const sourceLeagueId =
    stringFromUnknown(raw.platformLeagueId) ??
    stringFromUnknown(raw.sleeperLeagueId) ??
    stringFromUnknown(raw.id)

  if (!sourceLeagueId) return null

  const rosters = arrayFromUnknown(raw.rosters)
  const ownRoster =
    rosters.find((entry) => {
      const roster = recordFromUnknown(entry)
      return userId != null && roster?.platformUserId === userId
    }) ?? rosters[0]

  const ownRosterRecord = recordFromUnknown(ownRoster)

  return {
    id: stringFromUnknown(raw.id) ?? sourceLeagueId,
    rosterLeagueId:
      stringFromUnknown(raw.navigationLeagueId) ??
      stringFromUnknown(raw.unifiedLeagueId) ??
      (raw.hasUnifiedRecord === false ? null : stringFromUnknown(raw.id)),
    sleeperLeagueId: platform === 'sleeper' ? sourceLeagueId : null,
    name: stringFromUnknown(raw.name) ?? 'League',
    platform,
    sport: normalizeToSupportedSport(stringFromUnknown(raw.sport_type) ?? stringFromUnknown(raw.sport) ?? DEFAULT_SPORT),
    format: inferLeagueFormat(raw),
    scoring: stringFromUnknown(raw.scoring) ?? 'standard',
    teamCount: numberFromUnknown(raw.leagueSize) ?? numberFromUnknown(raw.totalTeams) ?? 0,
    season: String(numberFromUnknown(raw.season) ?? stringFromUnknown(raw.season) ?? new Date().getFullYear()),
    avatarUrl: stringFromUnknown(raw.avatarUrl) ?? stringFromUnknown(raw.avatar),
    synced: raw.hasUnifiedRecord !== false,
    fallbackRosterData:
      ownRosterRecord?.playerData ??
      (ownRosterRecord
        ? {
            players: ownRosterRecord.players,
            starters: ownRosterRecord.starters,
            reserve: ownRosterRecord.bench,
            draftPicks: ownRosterRecord.draftPicks,
          }
        : null),
  }
}

function normalizeLeagueFromSleeperFallback(rawLeague: unknown): UserLeague | null {
  const raw = recordFromUnknown(rawLeague)
  if (!raw) return null

  const sleeperLeagueId = stringFromUnknown(raw.sleeperLeagueId)
  if (!sleeperLeagueId) return null

  return {
    id: sleeperLeagueId,
    rosterLeagueId: null,
    sleeperLeagueId,
    name: stringFromUnknown(raw.name) ?? 'Sleeper League',
    platform: 'sleeper',
    sport: DEFAULT_SPORT,
    format: raw.isDynasty === true ? 'dynasty' : 'redraft',
    scoring: stringFromUnknown(raw.scoringType) ?? 'standard',
    teamCount: numberFromUnknown(raw.totalTeams) ?? 0,
    season: stringFromUnknown(raw.season) ?? String(new Date().getFullYear()),
    avatarUrl: stringFromUnknown(raw.avatar),
    synced: raw.alreadySynced === true,
    fallbackRosterData: null,
  }
}

function normalizeRosterEntry(entry: unknown, playerIndex: LegacyPlayerIndex): RosterPlayer | null {
  if (typeof entry === 'string') {
    const lookup = playerIndex[entry]
    return {
      id: entry,
      name: lookup?.name ?? entry,
      position: lookup?.position ?? 'BN',
      team: lookup?.team ?? '',
      tradeValue: null,
      injuryStatus: null,
      isStarter: false,
    }
  }

  const raw = recordFromUnknown(entry)
  if (!raw) return null

  const rawId =
    stringFromUnknown(raw.id) ??
    stringFromUnknown(raw.playerId) ??
    stringFromUnknown(raw.player_id) ??
    stringFromUnknown(raw.sleeperId) ??
    stringFromUnknown(raw.sleeper_id)

  const lookup = rawId ? playerIndex[rawId] : undefined
  const name =
    stringFromUnknown(raw.name) ??
    stringFromUnknown(raw.player_name) ??
    stringFromUnknown(raw.full_name) ??
    lookup?.name ??
    rawId

  if (!name) return null

  return {
    id: rawId ?? name,
    name,
    position: stringFromUnknown(raw.position) ?? stringFromUnknown(raw.pos) ?? lookup?.position ?? 'BN',
    team: stringFromUnknown(raw.team) ?? stringFromUnknown(raw.teamAbbr) ?? stringFromUnknown(raw.nflTeam) ?? lookup?.team ?? '',
    tradeValue: numberFromUnknown(raw.tradeValue) ?? numberFromUnknown(raw.value) ?? null,
    injuryStatus:
      stringFromUnknown(raw.injuryStatus) ??
      stringFromUnknown(raw.injury_status) ??
      stringFromUnknown(raw.status),
    isStarter: false,
  }
}

function normalizeRosterFromPlayerData(playerData: unknown, playerIndex: LegacyPlayerIndex): RosterPlayer[] {
  const raw = recordFromUnknown(playerData)
  if (!raw) return []

  const lineupSections = recordFromUnknown(raw.lineup_sections)
  if (lineupSections) {
    const starters = arrayFromUnknown(lineupSections.starters)
      .map((entry) => {
        const normalized = normalizeRosterEntry(entry, playerIndex)
        return normalized ? { ...normalized, isStarter: true } : null
      })
      .filter((entry): entry is RosterPlayer => entry != null)

    const bench = arrayFromUnknown(lineupSections.bench)
      .map((entry) => normalizeRosterEntry(entry, playerIndex))
      .filter((entry): entry is RosterPlayer => entry != null)

    const ir = arrayFromUnknown(lineupSections.ir)
      .map((entry) => normalizeRosterEntry(entry, playerIndex))
      .filter((entry): entry is RosterPlayer => entry != null)

    const taxi = arrayFromUnknown(lineupSections.taxi)
      .map((entry) => normalizeRosterEntry(entry, playerIndex))
      .filter((entry): entry is RosterPlayer => entry != null)

    return [...starters, ...bench, ...ir, ...taxi]
  }

  const starterIds = new Set(
    arrayFromUnknown(raw.starters)
      .map((entry) => stringFromUnknown(typeof entry === 'string' ? entry : recordFromUnknown(entry)?.id))
      .filter((entry): entry is string => Boolean(entry))
  )
  const reserveIds = new Set(
    arrayFromUnknown(raw.reserve)
      .map((entry) => stringFromUnknown(typeof entry === 'string' ? entry : recordFromUnknown(entry)?.id))
      .filter((entry): entry is string => Boolean(entry))
  )

  const rawById = new Map<string, unknown>()
  const orderedIds: string[] = []

  for (const bucket of [raw.players, raw.starters, raw.reserve, raw.taxi]) {
    for (const entry of arrayFromUnknown(bucket)) {
      const normalized = normalizeRosterEntry(entry, playerIndex)
      if (!normalized) continue
      if (!rawById.has(normalized.id)) orderedIds.push(normalized.id)
      rawById.set(normalized.id, entry)
    }
  }

  return orderedIds
    .map((id) => {
      const normalized = normalizeRosterEntry(rawById.get(id) ?? id, playerIndex)
      if (!normalized) return null
      return {
        ...normalized,
        isStarter: starterIds.has(id),
        injuryStatus: reserveIds.has(id) ? 'IR' : normalized.injuryStatus,
      }
    })
    .filter((entry): entry is RosterPlayer => entry != null)
}

function normalizePicksFromPlayerData(playerData: unknown): DraftPick[] {
  const raw = recordFromUnknown(playerData)
  if (!raw) return []

  const draftPicks = arrayFromUnknown(raw.draftPicks ?? raw.draft_picks)

  return draftPicks
    .map((entry, index) => {
      const pick = recordFromUnknown(entry)
      if (!pick) return null

      const season = numberFromUnknown(pick.season) ?? numberFromUnknown(pick.year)
      const round = numberFromUnknown(pick.round)
      if (season == null || round == null) return null

      return {
        id: stringFromUnknown(pick.id) ?? `pick-${season}-${round}-${index}`,
        label: `${season} ${ordinal(round)}`,
        season,
        round,
      }
    })
    .filter((entry): entry is DraftPick => entry != null)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeConfidence(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 70
  if (value <= 1) return clamp(Math.round(value * 100), 0, 100)
  return clamp(Math.round(value), 0, 100)
}

function assetTeam(asset: CandidateAsset) {
  if (asset.isPick) return asset.pickYear != null && asset.pickRound != null ? `${asset.pickYear} R${asset.pickRound}` : 'Pick'
  return ''
}

function toTradeAssetDisplay(asset: CandidateAsset): TradeAssetDisplay {
  return {
    id: asset.assetId,
    name: asset.name,
    position: asset.isPick ? 'PICK' : asset.position ?? 'BENCH',
    team: assetTeam(asset),
    value: asset.value,
    isPick: Boolean(asset.isPick),
    injuryFlag: Boolean(asset.injuryFlag),
  }
}

function computeTradeValueDelta(candidate: TradeFinderCandidate) {
  const giveValue = candidate.teamA.gives.reduce((total, asset) => total + asset.value, 0)
  const getValue = candidate.teamA.receives.reduce((total, asset) => total + asset.value, 0)
  return {
    giveValue,
    getValue,
    valueDelta: Math.round(getValue - giveValue),
    deltaPct: giveValue > 0 ? Math.round(((getValue - giveValue) / giveValue) * 100) : candidate.valueDeltaPct,
  }
}

function fairnessScoreFromDelta(deltaPct: number) {
  return clamp(Math.round(100 - Math.abs(deltaPct) * 3), 0, 100)
}

function verdictFromDelta(deltaPct: number, confidence: number): Verdict {
  if (deltaPct >= 18 && confidence >= 70) return 'SMASH'
  if (deltaPct >= 8) return 'ACCEPT'
  if (deltaPct >= 2) return 'LEAN'
  if (deltaPct <= -10) return 'DECLINE'
  return 'FAIR'
}

function opportunityInsightLines(payload: TradeFinderResponse) {
  const lines = [payload.overallStrategy, payload.objectiveNotes].filter((value): value is string => Boolean(value && value.trim()))
  for (const opportunity of payload.opportunities ?? []) {
    lines.push(`${opportunity.title}: ${opportunity.description}`)
  }
  return lines.slice(0, 4)
}

function PosBadge({ position }: { position: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${POS_COLORS[position] ?? 'border-white/15 bg-white/[0.04] text-white/60'}`}>
      {position}
    </span>
  )
}

function LoadingCard() {
  return <div className="h-36 animate-pulse rounded-2xl border border-white/8 bg-[#0c0c1e]" />
}

function PhaseAnimation({ phase }: { phase: PhaseKey }) {
  const activeIndex = PECR_PHASES.findIndex((item) => item.key === phase)
  return (
    <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
      <div className="mb-6 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-2.5 w-2.5 rounded-full bg-cyan-400"
            style={{ animation: 'pulse 1s ease-in-out infinite', animationDelay: `${index * 0.18}s` }}
          />
        ))}
      </div>
      <div className="mx-auto max-w-sm space-y-2">
        {PECR_PHASES.map((item, index) => (
          <div
            key={item.key}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              index === activeIndex
                ? 'border-cyan-500/30 bg-cyan-500/10'
                : index < activeIndex
                  ? 'border-white/10 bg-white/[0.04] opacity-60'
                  : 'border-white/8 bg-white/[0.02] opacity-30'
            }`}
          >
            <span>{item.icon}</span>
            <span className="flex-1 text-left text-sm text-white/80">{item.label}</span>
            {index < activeIndex ? <span className="text-xs text-green-300">Done</span> : null}
            {index === activeIndex ? <div className="h-3 w-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompatibilityRing({ score }: { score: number }) {
  const normalized = clamp(score, 0, 10)
  const color = normalized >= 7 ? '#10b981' : normalized >= 5 ? '#fbbf24' : '#ef4444'
  const radius = 18
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="48" height="48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${(normalized / 10) * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{normalized}</div>
    </div>
  )
}

function LoginRequiredState() {
  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">AI Trade Finder</div>
          <h1 className="mt-4 text-3xl font-black">Sign in to scan your league for trades</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Trade Finder needs your synced league and roster context to score real opportunities.
          </p>
          <Link
            href="/login?callbackUrl=%2Ftrade-finder"
            className="mt-6 inline-flex rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 hover:bg-violet-500/20"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

function LeagueGate({
  leagues,
  loading,
  error,
  onSelect,
}: {
  leagues: UserLeague[]
  loading: boolean
  error: string | null
  onSelect: (league: UserLeague) => void
}) {
  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <div className="border-b border-white/6 bg-[#07071a]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
              AI Trade Finder
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black">Select a Sleeper League</h1>
          <p className="mt-2 text-sm text-white/45">
            Choose a synced Sleeper league first. Trade Finder scans the full market, ranks candidate deals, and surfaces partner matches.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <LoadingCard key={item} />
            ))}
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">⚠ {error}</div> : null}

        {!loading && !error && leagues.length === 0 ? (
          <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-10 text-center">
            <div className="text-5xl">🔄</div>
            <h2 className="mt-4 text-2xl font-black text-white">No synced Sleeper leagues found</h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Trade Finder currently requires a synced Sleeper league so it can resolve your roster and market context.
            </p>
            <Link
              href="/af-legacy"
              className="mt-6 inline-flex rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 hover:bg-violet-500/20"
            >
              Sync a League
            </Link>
          </div>
        ) : null}

        {!loading && leagues.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {leagues.map((league) => {
              const platform = PLATFORM_CONFIG[league.platform] ?? PLATFORM_CONFIG.sleeper
              const disabled = !league.synced || !league.sleeperLeagueId
              return (
                <button
                  key={`${league.id}-${league.sleeperLeagueId ?? 'no-source'}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onSelect(league)}
                  className={`rounded-3xl border p-5 text-left transition-all ${
                    disabled ? 'cursor-not-allowed opacity-55' : 'bg-[#0c0c1e] hover:border-white/15 hover:bg-white/[0.03]'
                  }`}
                  style={{ borderColor: disabled ? 'rgba(255,255,255,0.08)' : `${platform.color}25` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{platform.emoji}</span>
                      <span className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: platform.color }}>
                        {platform.label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
                        {SPORT_LABELS[league.sport]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
                        {league.format}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-lg font-bold text-white">{league.name}</div>
                  <div className="mt-2 text-sm text-white/45">
                    {league.teamCount} teams · {league.scoring} · Season {league.season}
                  </div>
                  <div className={`mt-4 text-xs font-bold uppercase tracking-[0.2em] ${disabled ? 'text-amber-300' : 'text-violet-300'}`}>
                    {disabled ? 'Sync required' : 'Open Trade Finder'}
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TradeCard({
  card,
  onSendToAnalyzer,
  onSave,
}: {
  card: TradeCardModel
  onSendToAnalyzer: (card: TradeCardModel) => void
  onSave: (card: TradeCardModel) => void
}) {
  const config = VERDICT_CONFIG[card.verdict]

  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0c0c1e]">
      <div className="h-0.5" style={{ background: config.color }} />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-xl px-2.5 py-1 text-xs font-black"
              style={{ background: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}
            >
              {config.label}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: index < config.dots ? config.color : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/40">Fairness</div>
            <div className="text-sm font-black text-white">{card.fairnessScore}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-red-300">You Give</div>
            <div className="space-y-2">
              {card.give.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2">
                  <PosBadge position={asset.position} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white/85">{asset.name}</div>
                    <div className="text-[10px] text-white/35">
                      {asset.team || 'Asset'} · {asset.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/8 p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-green-300">You Get</div>
            <div className="space-y-2">
              {card.get.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2">
                  <PosBadge position={asset.position} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white/85">{asset.name}</div>
                    <div className="text-[10px] text-white/35">
                      {asset.team || 'Asset'} · {asset.value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/45">
          <span className="font-semibold text-white/70">{card.partnerName}</span>
          {card.partnerRecord ? <span>· {card.partnerRecord}</span> : null}
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/55">{card.partnerObjective}</span>
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/55">{card.archetype.replace(/_/g, ' ')}</span>
        </div>

        <p className="mt-4 border-l-2 pl-3 text-sm italic leading-6 text-white/65" style={{ borderColor: config.color }}>
          {card.aiSummary}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Value Delta</div>
            <div className={`mt-2 text-sm font-black ${card.valueDelta >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {card.valueDelta > 0 ? '+' : ''}
              {card.valueDelta.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Delta %</div>
            <div className="mt-2 text-sm font-black text-white">{card.valueDeltaPct}%</div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Confidence</div>
            <div className="mt-2 text-sm font-black text-white">{card.confidence}%</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-white/55">
          <div>{card.whyTheyAccept}</div>
          <div>{card.negotiationTip}</div>
        </div>

        {card.riskFlags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {card.riskFlags.map((flag, index) => (
              <span key={`${flag}-${index}`} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-200">
                {flag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onSendToAnalyzer(card)}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-white/65 hover:border-white/30 hover:text-white"
          >
            Send to Analyzer →
          </button>
          <button
            type="button"
            onClick={() => onSave(card)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-sm text-white/45 hover:border-white/30 hover:text-white"
          >
            🔖
          </button>
        </div>
      </div>
    </div>
  )
}

function PartnerCard({
  partner,
  onFindTrades,
}: {
  partner: PartnerCardModel
  onFindTrades: (externalRosterId: string) => void
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
      <div className="mb-4 flex items-start gap-4">
        <CompatibilityRing score={partner.compatibility} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-white">{partner.managerName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
            {partner.teamRecord ? <span>{partner.teamRecord}</span> : null}
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5">{partner.objectiveLabel}</span>
            {partner.reputationLabel ? <span className="rounded-full bg-white/[0.05] px-2 py-0.5">{partner.reputationLabel}</span> : null}
          </div>
        </div>
      </div>

      <p className="text-xs italic leading-6 text-white/60">"{partner.whyTheyTrade}"</p>

      {partner.sharedNeeds.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {partner.sharedNeeds.slice(0, 4).map((need) => (
            <span key={need} className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-200">
              {need}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-1 text-[11px] text-white/45">
        {partner.yourOffer ? <div>You can offer: {partner.yourOffer}</div> : null}
        {partner.theirOffer ? <div>They can offer: {partner.theirOffer}</div> : null}
      </div>

      <button
        type="button"
        onClick={() => onFindTrades(partner.externalRosterId)}
        className="mt-5 w-full rounded-xl border border-violet-500/25 bg-violet-500/10 py-2.5 text-xs font-bold text-violet-200 hover:bg-violet-500/15"
      >
        Find Trades with {partner.managerName.split(' ')[0]} →
      </button>
    </div>
  )
}

function TradeFinderInner() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [leagues, setLeagues] = useState<UserLeague[]>([])
  const [leagueLoading, setLeagueLoading] = useState(false)
  const [leagueError, setLeagueError] = useState<string | null>(null)
  const [selectedLeague, setSelectedLeague] = useState<UserLeague | null>(null)

  const [playerIndex, setPlayerIndex] = useState<LegacyPlayerIndex | null>(null)
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)

  const [objective, setObjective] = useState<Objective>('BALANCED')
  const [finderMode, setFinderMode] = useState<FinderMode>('FAST')
  const [preset, setPreset] = useState<FocusPreset>('NONE')
  const [targetPos, setTargetPos] = useState<Position | null>(null)
  const [needFilters, setNeedFilters] = useState<Set<NeedFilter>>(new Set())
  const [onBlock, setOnBlock] = useState<Set<string>>(new Set())
  const [picksOnBlock, setPicksOnBlock] = useState<Set<string>>(new Set())
  const [tone, setTone] = useState<Tone>('CONFIDENT')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [minFairness, setMinFairness] = useState(0)
  const [excludeInjured, setExcludeInjured] = useState(false)

  const [activeTab, setActiveTab] = useState<ActiveTab>('find')
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [partnersError, setPartnersError] = useState<string | null>(null)
  const [partners, setPartners] = useState<PartnerCardModel[]>([])
  const [lockedPartnerId, setLockedPartnerId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<PhaseKey>('plan')
  const [results, setResults] = useState<TradeCardModel[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedOpps, setSavedOpps] = useState<TradeCardModel[]>([])

  const activeSport = selectedLeague?.sport ?? DEFAULT_SPORT

  const partnerLookup = useMemo(
    () => new Map(partners.map((partner) => [partner.externalRosterId, partner] as const)),
    [partners]
  )

  const ensurePlayerIndex = useCallback(async () => {
    if (playerIndex) return playerIndex
    const response = await fetch('/api/legacy/players')
    const payload = (await response.json().catch(() => ({}))) as { players?: LegacyPlayerIndex }
    const nextIndex = payload.players ?? {}
    setPlayerIndex(nextIndex)
    return nextIndex
  }, [playerIndex])

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    async function loadLeagues() {
      setLeagueLoading(true)
      setLeagueError(null)
      try {
        const listResponse = await fetch('/api/league/list')
        if (listResponse.ok) {
          const payload = (await listResponse.json().catch(() => ({}))) as { leagues?: unknown[] }
          const mapped = arrayFromUnknown(payload.leagues)
            .map((entry) => normalizeLeagueFromList(entry, session?.user && 'id' in session.user ? String(session.user.id ?? '') : undefined))
            .filter((entry): entry is UserLeague => entry != null)
            .filter((entry) => entry.platform === 'sleeper' || entry.sleeperLeagueId != null)
          if (!cancelled) setLeagues(mapped)
          return
        }

        const sleeperResponse = await fetch('/api/league/sleeper-user-leagues')
        if (!sleeperResponse.ok) {
          const payload = (await sleeperResponse.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? 'Could not load leagues.')
        }

        const payload = (await sleeperResponse.json().catch(() => ({}))) as { leagues?: unknown[] }
        const mapped = arrayFromUnknown(payload.leagues)
          .map((entry) => normalizeLeagueFromSleeperFallback(entry))
          .filter((entry): entry is UserLeague => entry != null)
        if (!cancelled) setLeagues(mapped)
      } catch (loadError: unknown) {
        if (!cancelled) setLeagueError(loadError instanceof Error ? loadError.message : 'Could not load leagues.')
      } finally {
        if (!cancelled) setLeagueLoading(false)
      }
    }

    void loadLeagues()
    return () => {
      cancelled = true
    }
  }, [session, status])

  const loadPartners = useCallback(async (league: UserLeague) => {
    if (!league.sleeperLeagueId) {
      setPartners([])
      setPartnersError('Trade Partner Match currently requires a synced Sleeper league.')
      return
    }

    setPartnersLoading(true)
    setPartnersError(null)

    try {
      const response = await fetch(`/api/trade-partner-match?leagueId=${encodeURIComponent(league.sleeperLeagueId)}`)
      const payload = (await response.json().catch(() => ({}))) as PartnerMatchResponse

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load trade partners.')
      }

      const mapped = (payload.matches ?? [])
        .map((row) => {
          const externalRosterId = stringFromUnknown(row.externalId)
          if (!externalRosterId) return null

          const needs = Array.isArray(row.needs) ? row.needs.filter((entry): entry is string => typeof entry === 'string') : []
          const compatibility = clamp(Math.round((numberFromUnknown(row.matchScore) ?? 0) / 10), 0, 10)

          return {
            externalRosterId,
            managerName: stringFromUnknown(row.teamName) ?? 'Manager',
            teamRecord: stringFromUnknown(row.record) ?? '',
            objectiveLabel: needs[0] ? `Needs ${needs[0]}` : 'Trade Match',
            compatibility,
            whyTheyTrade:
              stringFromUnknown(row.tradeAngle) ??
              stringFromUnknown(row.theirOffer) ??
              'This manager has a profile that lines up with your roster needs.',
            sharedNeeds: needs,
            yourOffer: stringFromUnknown(row.yourOffer) ?? '',
            theirOffer: stringFromUnknown(row.theirOffer) ?? '',
            reputationLabel: stringFromUnknown(row.reputation?.tier),
          } satisfies PartnerCardModel
        })
        .filter((entry): entry is PartnerCardModel => entry != null)

      setPartners(mapped)
    } catch (partnerError) {
      setPartners([])
      setPartnersError(partnerError instanceof Error ? partnerError.message : 'Failed to load trade partners.')
    } finally {
      setPartnersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    const league = selectedLeague
    let cancelled = false

    async function hydrateLeague() {
      setRosterLoading(true)
      setRoster([])
      setPicks([])
      setResults([])
      setInsights([])
      setError(null)
      setLockedPartnerId(null)
      setPartners([])
      setPartnersError(null)
      setOnBlock(new Set())
      setPicksOnBlock(new Set())

      try {
        const nextIndex = await ensurePlayerIndex()
        let nextRoster: RosterPlayer[] = []
        let nextPicks: DraftPick[] = []

        if (league.rosterLeagueId) {
          const response = await fetch(`/api/league/roster?leagueId=${encodeURIComponent(league.rosterLeagueId)}`)
          const payload = (await response.json().catch(() => ({}))) as { roster?: unknown; error?: string }

          if (!response.ok) {
            if (league.fallbackRosterData) {
              nextRoster = normalizeRosterFromPlayerData(league.fallbackRosterData, nextIndex)
              nextPicks = normalizePicksFromPlayerData(league.fallbackRosterData)
            } else {
              throw new Error(payload.error ?? 'Failed to load roster.')
            }
          } else {
            nextRoster = normalizeRosterFromPlayerData(payload.roster, nextIndex)
            nextPicks = normalizePicksFromPlayerData(payload.roster)
          }
        } else if (league.fallbackRosterData) {
          nextRoster = normalizeRosterFromPlayerData(league.fallbackRosterData, nextIndex)
          nextPicks = normalizePicksFromPlayerData(league.fallbackRosterData)
        }

        if (cancelled) return
        setRoster(nextRoster)
        setPicks(nextPicks)
        void loadPartners(league)
      } catch (hydrateError: unknown) {
        if (!cancelled) {
          setError(hydrateError instanceof Error ? hydrateError.message : 'Failed to load league roster.')
        }
      } finally {
        if (!cancelled) setRosterLoading(false)
      }
    }

    void hydrateLeague()
    return () => {
      cancelled = true
    }
  }, [ensurePlayerIndex, loadPartners, selectedLeague])

  const toggleNeed = useCallback((value: NeedFilter) => {
    setNeedFilters((current) => {
      const next = new Set(current)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }, [])

  const togglePlayerOnBlock = useCallback((id: string) => {
    setOnBlock((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const togglePickOnBlock = useCallback((id: string) => {
    setPicksOnBlock((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const buildTradeCards = useCallback(
    (payload: TradeFinderResponse, partnerFilterId: string | null) => {
      const candidates = payload.candidates ?? []
      const recommendations = payload.recommendations ?? []
      const candidateById = new Map(candidates.map((candidate) => [candidate.tradeId, candidate] as const))

      const mappedFromRecommendations = recommendations
        .map((recommendation) => {
          const candidate = candidateById.get(recommendation.tradeId)
          if (!candidate) return null

          const metrics = computeTradeValueDelta(candidate)
          const confidence = normalizeConfidence(recommendation.confidence)
          const partner = partnerLookup.get(candidate.teamB.teamId)

          return {
            id: `${recommendation.tradeId}-${recommendation.rank}`,
            tradeId: recommendation.tradeId,
            partnerRosterId: candidate.teamB.teamId,
            partnerName: partner?.managerName ?? `Team ${candidate.teamB.teamId}`,
            partnerRecord: partner?.teamRecord ?? '',
            partnerObjective: partner?.objectiveLabel ?? 'Trade Match',
            give: candidate.teamA.gives.map(toTradeAssetDisplay),
            get: candidate.teamA.receives.map(toTradeAssetDisplay),
            fairnessScore: fairnessScoreFromDelta(metrics.deltaPct),
            valueDelta: metrics.valueDelta,
            valueDeltaPct: metrics.deltaPct,
            confidence,
            aiSummary: recommendation.summary || recommendation.whyItHelpsYou || 'AI trade summary unavailable.',
            whyTheyAccept: recommendation.whyTheyAccept || 'AI did not provide a partner acceptance note.',
            negotiationTip: recommendation.negotiationTip || 'Lead with the mutual roster fit.',
            verdict: verdictFromDelta(metrics.deltaPct, confidence),
            archetype: candidate.archetype,
            riskFlags: recommendation.riskFlags ?? [],
          } satisfies TradeCardModel
        })
        .filter((entry): entry is TradeCardModel => entry != null)

      const fallbackCards = candidates.slice(0, 6).map((candidate) => {
        const metrics = computeTradeValueDelta(candidate)
        const confidence = normalizeConfidence(candidate.finderScore)
        const partner = partnerLookup.get(candidate.teamB.teamId)
        return {
          id: candidate.tradeId,
          tradeId: candidate.tradeId,
          partnerRosterId: candidate.teamB.teamId,
          partnerName: partner?.managerName ?? `Team ${candidate.teamB.teamId}`,
          partnerRecord: partner?.teamRecord ?? '',
          partnerObjective: partner?.objectiveLabel ?? 'Trade Match',
          give: candidate.teamA.gives.map(toTradeAssetDisplay),
          get: candidate.teamA.receives.map(toTradeAssetDisplay),
          fairnessScore: fairnessScoreFromDelta(metrics.deltaPct),
          valueDelta: metrics.valueDelta,
          valueDeltaPct: metrics.deltaPct,
          confidence,
          aiSummary: candidate.whyThisExists.join(' · ') || 'Deterministic candidate surfaced by the trade engine.',
          whyTheyAccept: 'Trade engine found reciprocal need alignment.',
          negotiationTip: 'Use this as a starting point and tune the package in the analyzer.',
          verdict: verdictFromDelta(metrics.deltaPct, confidence),
          archetype: candidate.archetype,
          riskFlags: [],
        } satisfies TradeCardModel
      })

      const baseCards = mappedFromRecommendations.length > 0 ? mappedFromRecommendations : fallbackCards

      return baseCards.filter((card) => {
        if (partnerFilterId && card.partnerRosterId !== partnerFilterId) return false
        if (card.fairnessScore < minFairness) return false

        if (needFilters.size > 0) {
          const satisfiesNeed = card.get.some((asset) => {
            if (asset.isPick) return needFilters.has('PICKS')
            return needFilters.has(asset.position as NeedFilter)
          })
          if (!satisfiesNeed) return false
        }

        if (onBlock.size > 0 && !card.give.some((asset) => onBlock.has(asset.id))) return false
        if (picksOnBlock.size > 0 && !card.give.some((asset) => asset.isPick && picksOnBlock.has(asset.id))) return false
        if (excludeInjured && card.get.some((asset) => asset.injuryFlag)) return false
        return true
      })
    },
    [excludeInjured, minFairness, needFilters, onBlock, partnerLookup, picksOnBlock]
  )

  const findTrades = useCallback(
    async (partnerFilterId?: string) => {
      if (!selectedLeague?.sleeperLeagueId || loading) return

      const lockedPartner = partnerFilterId ?? lockedPartnerId ?? null

      setLoading(true)
      setError(null)
      setInsights([])
      setResults([])
      setPhase('plan')
      setLockedPartnerId(lockedPartner)

      const timers = [
        window.setTimeout(() => setPhase('pricing'), 700),
        window.setTimeout(() => setPhase('engine'), 1800),
        window.setTimeout(() => setPhase('ai'), 3200),
        window.setTimeout(() => setPhase('check'), 5000),
      ]

      try {
        const body: {
          league_id: string
          objective: Objective
          mode: ApiMode
          preset: FocusPreset
          target_position?: Position
          preferredTone?: Tone
        } = {
          league_id: selectedLeague.sleeperLeagueId ?? selectedLeague.id,
          objective,
          mode: finderMode === 'EXHAUSTIVE' ? 'DEEP' : finderMode,
          preset,
          preferredTone: tone,
        }

        if (preset === 'TARGET_POSITION' && targetPos) {
          body.target_position = targetPos
        }

        const response = await fetch('/api/trade-finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const payload = (await response.json().catch(() => ({}))) as TradeFinderResponse
        if (!response.ok) {
          throw new Error(payload.error ?? `Trade Finder returned ${response.status}`)
        }

        const nextCards = buildTradeCards(payload, lockedPartner)
        setResults(nextCards)
        setInsights(opportunityInsightLines(payload))
      } catch (findError: unknown) {
        setError(findError instanceof Error ? findError.message : 'Failed to find trades.')
      } finally {
        timers.forEach((timer) => window.clearTimeout(timer))
        setLoading(false)
      }
    },
    [buildTradeCards, finderMode, lockedPartnerId, loading, objective, preset, selectedLeague, targetPos, tone]
  )

  const sendToAnalyzer = useCallback(
    (card: TradeCardModel) => {
      const params = new URLSearchParams({
        previewSender: card.give[0]?.name ?? '',
        previewReceiver: card.get[0]?.name ?? '',
        partner: card.partnerName,
      })
      router.push(`/trade-evaluator?${params.toString()}`)
    },
    [router]
  )

  const saveOpportunity = useCallback((card: TradeCardModel) => {
    setSavedOpps((current) => (current.some((entry) => entry.tradeId === card.tradeId) ? current : [...current, card]))
  }, [])

  const resetLeague = useCallback(() => {
    setSelectedLeague(null)
    setRoster([])
    setPicks([])
    setPartners([])
    setResults([])
    setInsights([])
    setError(null)
    setLockedPartnerId(null)
    setSavedOpps([])
  }, [])

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#07071a]" />
  }

  if (status === 'unauthenticated') {
    return <LoginRequiredState />
  }

  return (
    <>
      <LandingToolVisitTracker path="/trade-finder" toolName="AI Trade Finder" />
      <EngagementEventTracker
        eventType="ai_used"
        oncePerDayKey={`tool_trade_finder:${activeSport}`}
        meta={{ product: 'legacy', sport: activeSport }}
      />

      {!selectedLeague ? (
        <LeagueGate leagues={leagues} loading={leagueLoading} error={leagueError} onSelect={setSelectedLeague} />
      ) : (
        <div className="min-h-screen bg-[#07071a] text-white">
          <div className="sticky top-0 z-20 border-b border-white/6 bg-[#07071a]/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
              <div>
                <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
                  AI Trade Finder
                </div>
                <h1 className="mt-2 text-2xl font-black">League Trade Finder</h1>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="text-xs font-bold text-white">{selectedLeague.name}</div>
                <div className="text-[11px] text-white/40">
                  {SPORT_LABELS[normalizeToSupportedSport(selectedLeague.sport)]} · {selectedLeague.format} · {selectedLeague.scoring}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {savedOpps.length > 0 ? (
                  <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/45">
                    🔖 {savedOpps.length} saved
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={resetLeague}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/45 hover:border-white/20 hover:text-white"
                >
                  Change League
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6">
            <div className="mb-6 rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_45%),#0a0d1a] p-6">
              <div className="max-w-3xl">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300/80">League-Gated AI Discovery</div>
                <h2 className="mt-3 text-3xl font-black leading-tight">
                  Scan your league for the best trade paths based on your roster, objectives, and partner fit.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Use strategy controls to shape the search, then send the best opportunity directly into the trade analyzer for a deeper review.
                </p>
              </div>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="inline-flex rounded-2xl border border-white/8 bg-[#0c0c1e] p-1">
              {(['find', 'partners'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab)
                    if (tab === 'partners' && partners.length === 0 && !partnersLoading) void loadPartners(selectedLeague)
                  }}
                  className={`rounded-xl px-5 py-2 text-sm font-bold ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  {tab === 'find' ? '⚡ Find Trades' : '🤝 Partner Match'}
                </button>
              ))}
            </div>

            {activeTab === 'find' ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Team Strategy</div>
                    <div className="space-y-2">
                      {([
                        { value: 'WIN_NOW', label: 'Win Now', color: '#ef4444' },
                        { value: 'REBUILD', label: 'Rebuild', color: '#60a5fa' },
                        { value: 'BALANCED', label: 'Balanced', color: '#06b6d4' },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setObjective(option.value)}
                          className="w-full rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition-all"
                          style={
                            objective === option.value
                              ? {
                                  borderColor: `${option.color}50`,
                                  background: `${option.color}15`,
                                  color: option.color,
                                }
                              : {
                                  borderColor: 'transparent',
                                  background: 'rgba(255,255,255,0.02)',
                                  color: 'rgba(255,255,255,0.45)',
                                }
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Trade Focus</div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'NONE', label: 'Any' },
                        { value: 'TARGET_POSITION', label: 'Target Position' },
                        { value: 'ACQUIRE_PICKS', label: 'Acquire Picks' },
                        { value: 'CONSOLIDATE', label: 'Consolidate' },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setPreset(option.value)
                            if (option.value !== 'TARGET_POSITION') setTargetPos(null)
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            preset === option.value
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {preset === 'TARGET_POSITION' ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(['QB', 'RB', 'WR', 'TE'] as Position[]).map((position) => (
                          <button
                            key={position}
                            type="button"
                            onClick={() => setTargetPos(position)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-black ${
                              targetPos === position
                                ? POS_COLORS[position]
                                : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white'
                            }`}
                          >
                            {position}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Position Needs</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['QB', 'RB', 'WR', 'TE', 'PICKS'] as NeedFilter[]).map((need) => (
                        <button
                          key={need}
                          type="button"
                          onClick={() => toggleNeed(need)}
                          className={`rounded-xl border px-2 py-1.5 text-xs font-bold ${
                            needFilters.has(need)
                              ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                              : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white'
                          }`}
                        >
                          {need}
                        </button>
                      ))}
                    </div>
                  </div>

                  {roster.length > 0 ? (
                    <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Players I&apos;d Trade</div>
                      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                        {roster.map((player) => (
                          <label key={player.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                            <input
                              type="checkbox"
                              checked={onBlock.has(player.id)}
                              onChange={() => togglePlayerOnBlock(player.id)}
                              className="h-4 w-4 accent-violet-500"
                            />
                            <PosBadge position={player.position} />
                            <span className="truncate text-xs text-white/75">{player.name}</span>
                            <span className="ml-auto text-[10px] text-white/30">{player.team}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {picks.length > 0 ? (
                    <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Picks I&apos;d Trade</div>
                      <div className="space-y-1">
                        {picks.map((pick) => (
                          <label key={pick.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                            <input
                              type="checkbox"
                              checked={picksOnBlock.has(pick.id)}
                              onChange={() => togglePickOnBlock(pick.id)}
                              className="h-4 w-4 accent-violet-500"
                            />
                            <span className="text-xs text-white/75">{pick.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-4">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">AI Depth</div>
                    <div className="flex gap-2">
                      {(['FAST', 'DEEP', 'EXHAUSTIVE'] as FinderMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFinderMode(mode)}
                          className={`flex-1 rounded-xl py-1.5 text-xs font-bold ${
                            finderMode === mode
                              ? 'bg-cyan-500 text-black'
                              : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {mode === 'FAST' ? 'Quick' : mode === 'DEEP' ? 'Deep' : 'Full'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0c0c1e]">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((current) => !current)}
                      className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/35 hover:text-white/60"
                    >
                      <span>Advanced Options</span>
                      <span>{showAdvanced ? '▲' : '▼'}</span>
                    </button>

                    {showAdvanced ? (
                      <div className="space-y-3 border-t border-white/6 px-4 pb-4 pt-3">
                        <div>
                          <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30">Min fairness: {minFairness}</div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            value={minFairness}
                            onChange={(event) => setMinFairness(Number(event.target.value))}
                            className="w-full accent-violet-500"
                          />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
                          <input
                            type="checkbox"
                            checked={excludeInjured}
                            onChange={(event) => setExcludeInjured(event.target.checked)}
                            className="h-4 w-4 accent-violet-500"
                          />
                          Exclude injured targets
                        </label>
                        <div>
                          <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30">AI Tone</div>
                          <select
                            value={tone}
                            onChange={(event) => setTone(event.target.value as Tone)}
                            className="w-full rounded-xl border border-white/10 bg-[#07071a] px-3 py-2 text-xs text-white focus:border-violet-500/40 focus:outline-none"
                          >
                            {(['FRIENDLY', 'CONFIDENT', 'CASUAL', 'DATA_BACKED', 'SHORT'] as Tone[]).map((option) => (
                              <option key={option} value={option}>
                                {option.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  {lockedPartnerId ? (
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                      <span>
                        Locked to {partnerLookup.get(lockedPartnerId)?.managerName ?? `partner ${lockedPartnerId}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLockedPartnerId(null)}
                        className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void findTrades()}
                    disabled={loading || rosterLoading}
                    className="mb-5 w-full rounded-2xl py-4 text-base font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-35"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
                      boxShadow: loading ? 'none' : '0 8px 32px rgba(124,58,237,0.35)',
                    }}
                  >
                    {loading ? 'Scanning League...' : '⚡ Find Trades'}
                  </button>

                  {loading ? <PhaseAnimation phase={phase} /> : null}

                  {!loading && insights.length > 0 ? (
                    <div className="mb-5 rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">AI Strategy Notes</div>
                      <ul className="mt-4 space-y-2 text-sm text-white/65">
                        {insights.map((line, index) => (
                          <li key={`${line}-${index}`} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {rosterLoading && !loading ? <LoadingCard /> : null}

                  {!loading && !rosterLoading && results.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] p-12 text-center">
                      <div className="text-4xl">🔄</div>
                      <p className="mt-3 text-sm text-white/35">
                        Set your strategy, pick any optional filters, and click Find Trades to surface league-wide opportunities.
                      </p>
                    </div>
                  ) : null}

                  {!loading && results.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white">{results.length} trade opportunities found</span>
                        <span className="text-white/35">{objective.replace('_', ' ')} · {finderMode === 'EXHAUSTIVE' ? 'Full' : finderMode}</span>
                      </div>
                      {results.map((card) => (
                        <TradeCard key={card.id} card={card} onSendToAnalyzer={sendToAnalyzer} onSave={saveOpportunity} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                {partnersLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <LoadingCard key={item} />
                    ))}
                  </div>
                ) : null}

                {partnersError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{partnersError}</div>
                ) : null}

                {!partnersLoading && !partnersError && partners.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] p-12 text-center text-sm text-white/35">
                    Open Partner Match to load the best trade relationships for this league.
                  </div>
                ) : null}

                {!partnersLoading && partners.length > 0 ? (
                  <>
                    <p className="mb-5 text-sm text-white/45">
                      {partners.length} managers ranked by compatibility for {selectedLeague.name}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {partners
                        .slice()
                        .sort((left, right) => right.compatibility - left.compatibility)
                        .map((partner) => (
                          <PartnerCard
                            key={partner.externalRosterId}
                            partner={partner}
                            onFindTrades={(partnerId) => {
                              setActiveTab('find')
                              void findTrades(partnerId)
                            }}
                          />
                        ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function TradeFinderPage() {
  return <TradeFinderInner />
}
