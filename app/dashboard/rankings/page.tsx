'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OverviewInsights from '@/app/af-legacy/components/OverviewInsights'
import OverviewLanes from '@/app/af-legacy/components/OverviewLanes'
import OverviewReportCard from '@/app/af-legacy/components/OverviewReportCard'
import type { CompositeProfile } from '@/lib/legacy/overview-scoring'

interface PlayerRank {
  careerTier: number
  careerTierName: string
  careerLevel: number
  careerXp: string
  aiReportGrade: string
  aiScore: number
  aiInsight: string
  winRate: number
  playoffRate: number
  championshipCount: number
  seasonsPlayed: number
  importedAt: string | null
}

interface RankResponse {
  imported: boolean
  rank: PlayerRank | null
  overviewProfile?: CompositeProfile | null
  legacyUsername?: string | null
}

interface ImportState {
  platform: 'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'
  username: string
  loading: boolean
  error: string | null
  successMessage: string | null
}

function mapLegacyImportError(payload: Record<string, unknown>, status: number): string {
  const code = typeof payload.error === 'string' ? payload.error : ''
  if (status === 401 || code === 'UNAUTHENTICATED') return 'Sign in to import your legacy profile.'
  if (code === 'VERIFICATION_REQUIRED')
    return 'Verify your email or phone in Settings before importing.'
  if (code === 'AGE_REQUIRED') return 'Confirm you are 18+ in Settings before importing.'
  if (status === 409)
    return typeof payload.error === 'string'
      ? payload.error
      : 'This Sleeper account is linked to another AllFantasy user.'
  if (status === 429) return 'Too many attempts. Try again in a minute.'
  if (status === 404) return 'Sleeper username not found. Check spelling (e.g. TheCiege24).'
  return typeof payload.error === 'string' ? payload.error : 'Import failed'
}

const TIERS = [
  { tier: 1, name: 'Dynasty', color: '#c084fc', glow: 'rgba(192,132,252,0.40)', badge: '👑', desc: 'Generational. The standard everyone chases.' },
  { tier: 2, name: 'Champion', color: '#06b6d4', glow: 'rgba(6,182,212,0.30)', badge: '🏆', desc: 'Titles. Rings. Respect.' },
  { tier: 3, name: 'Playoff Performer', color: '#ef4444', glow: 'rgba(239,68,68,0.30)', badge: '🔥', desc: 'Built for the moment. Wins when it matters.' },
  { tier: 4, name: 'All-Pro', color: '#f59e0b', glow: 'rgba(245,158,11,0.30)', badge: '⭐', desc: 'Elite across formats and platforms.' },
  { tier: 5, name: 'Veteran', color: '#fbbf24', glow: 'rgba(251,191,36,0.30)', badge: '🎖️', desc: 'Experience that shows up when it counts.' },
  { tier: 6, name: 'Starter', color: '#34d399', glow: 'rgba(52,211,153,0.30)', badge: '▶️', desc: 'A reliable presence in any league.' },
  { tier: 7, name: 'Rookie', color: '#60a5fa', glow: 'rgba(96,165,250,0.30)', badge: '🐣', desc: 'First taste of real competition.' },
  { tier: 8, name: 'Camp Invite', color: '#818cf8', glow: 'rgba(129,140,248,0.30)', badge: '⛺', desc: 'Competing for a roster spot.' },
  { tier: 9, name: 'Undrafted Free Agent', color: '#a78bfa', glow: 'rgba(167,139,250,0.30)', badge: '📋', desc: 'You know the game. Time to prove it.' },
  { tier: 10, name: 'Practice Squad', color: '#94a3b8', glow: 'rgba(148,163,184,0.30)', badge: '🎮', desc: 'Everyone starts here. Get your reps in.' },
] as const

const PLATFORMS = [
  { id: 'sleeper', label: 'Sleeper', emoji: '🌙' },
  { id: 'yahoo', label: 'Yahoo', emoji: '🏈' },
  { id: 'mfl', label: 'MFL', emoji: '🏆' },
  { id: 'fantrax', label: 'Fantrax', emoji: '📊' },
  { id: 'espn', label: 'ESPN', emoji: '🔴' },
] as const

function toTierNameKey(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function getTierConfigByTier(tier: number) {
  return TIERS.find((entry) => entry.tier === tier) ?? TIERS[TIERS.length - 1]
}

function getTierConfig(rank: Pick<PlayerRank, 'careerTier' | 'careerTierName'>) {
  const byName = TIERS.find((entry) => toTierNameKey(entry.name) === toTierNameKey(rank.careerTierName))
  return byName ?? getTierConfigByTier(rank.careerTier)
}

function RankBadge({ rank, size = 'md' }: { rank: PlayerRank; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = getTierConfig(rank)
  const sizes = {
    sm: { outer: 'w-16 h-16', inner: 'w-12 h-12', emoji: 'text-2xl', tier: 'text-[10px]' },
    md: { outer: 'w-24 h-24', inner: 'w-20 h-20', emoji: 'text-4xl', tier: 'text-xs' },
    lg: { outer: 'w-36 h-36', inner: 'w-32 h-32', emoji: 'text-6xl', tier: 'text-sm' },
  }[size]

  return (
    <div className={`relative flex items-center justify-center ${sizes.outer}`}>
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{ boxShadow: `0 0 32px 8px ${cfg.glow}`, background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)` }}
      />
      <div
        className={`relative ${sizes.inner} rounded-full flex flex-col items-center justify-center border-2`}
        style={{
          borderColor: cfg.color,
          background: `radial-gradient(circle at 35% 35%, ${cfg.glow}, rgba(10,10,30,0.95))`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        <span className={sizes.emoji}>{cfg.badge}</span>
        <span className={`${sizes.tier} font-bold mt-0.5`} style={{ color: cfg.color }}>
          TIER {cfg.tier}
        </span>
      </div>
    </div>
  )
}

function TierLadder({ rank }: { rank: PlayerRank }) {
  const activeKey = toTierNameKey(rank.careerTierName)

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Ranking Ladder</p>
      <div className="space-y-1.5">
        {TIERS.map((tier) => {
          const isActive = toTierNameKey(tier.name) === activeKey
          const isLocked = tier.tier < getTierConfig(rank).tier
          return (
            <div
              key={tier.tier}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all"
              style={isActive ? { background: tier.glow, boxShadow: `inset 0 0 0 1px ${tier.color}` } : undefined}
            >
              <span className={`text-base ${isLocked && !isActive ? 'opacity-40' : ''}`}>{tier.badge}</span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-xs font-semibold truncate ${isLocked && !isActive ? 'text-white/35' : 'text-white/80'}`}
                  style={isActive ? { color: tier.color } : undefined}
                >
                  {tier.name}
                </div>
                <div className="text-[10px] text-white/30 truncate">{tier.desc}</div>
              </div>
              <span
                className={`text-[10px] font-bold ${isLocked && !isActive ? 'text-white/20' : 'text-white/35'}`}
                style={isActive ? { color: tier.color } : undefined}
              >
                T{tier.tier}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ImportPanel({ onImportSuccess }: { onImportSuccess: () => void }) {
  const router = useRouter()
  const [state, setState] = useState<ImportState>({
    platform: 'sleeper',
    username: '',
    loading: false,
    error: null,
    successMessage: null,
  })

  const selectedPlatform = useMemo(
    () => PLATFORMS.find((entry) => entry.id === state.platform) ?? PLATFORMS[0],
    [state.platform]
  )

  const handleImport = useCallback(async () => {
    if (!state.username.trim()) return

    if (state.platform !== 'sleeper') {
      setState((current) => ({
        ...current,
        error: `${selectedPlatform.label} needs the full AF Legacy import flow right now. We'll take you there.`,
      }))
      router.push('/af-legacy')
      return
    }

    setState((current) => ({ ...current, loading: true, error: null, successMessage: null }))

    try {
      const response = await fetch('/api/legacy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sleeper_username: state.username.trim().toLowerCase() }),
      })
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        throw new Error(mapLegacyImportError(data, response.status))
      }
      const msg =
        typeof data.message === 'string'
          ? data.message
          : 'Import queued. Your rank and history update as the sync runs (usually a few minutes). This does not add leagues to My Leagues on the dashboard — only full league import or leagues you create here do.'
      setState((current) => ({
        ...current,
        loading: false,
        successMessage: msg,
        error: null,
      }))
      onImportSuccess()
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }))
      return
    }
  }, [onImportSuccess, router, selectedPlatform.label, state.platform, state.username])

  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#12082a] to-[#0a0a1e] p-6 shadow-2xl">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">Build Your Legacy Profile</h3>
        <p className="text-sm text-white/50 mt-0.5">
          Import your fantasy history to calculate your AllFantasy rank, XP progress, and AI grade.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-5">
        {PLATFORMS.map((platform) => {
          const isSelected = state.platform === platform.id
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() =>
                setState((current) => ({ ...current, platform: platform.id, error: null, successMessage: null }))
              }
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all text-xs font-semibold ${
                isSelected
                  ? 'border-cyan-500/60 bg-cyan-500/10 text-white'
                  : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="text-xl">{platform.emoji}</span>
              <span>{platform.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2 block">
          {state.platform === 'sleeper' ? 'Platform Username' : 'Provider Handle or League ID'}
        </label>
        <input
          type="text"
          value={state.username}
          onChange={(event) => setState((current) => ({ ...current, username: event.target.value }))}
          onKeyDown={(event) => event.key === 'Enter' && void handleImport()}
          placeholder={state.platform === 'sleeper' ? 'your_sleeper_username' : 'continue in full legacy import'}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
        <p className="text-[11px] text-white/30 mt-2">
          Sleeper is wired directly here. Other providers hand off to the full AF Legacy import experience.
        </p>
        <p className="text-[11px] text-cyan-200/40 mt-2">
          Rankings import builds your career history only — it does not add leagues to the dashboard &quot;My Leagues&quot; list (that&apos;s for full sync from Import or leagues you create on AllFantasy).
        </p>
      </div>

      {state.successMessage ? (
        <div className="mb-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {state.successMessage}
        </div>
      ) : null}

      {state.error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={state.loading || !state.username.trim()}
        className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          boxShadow: state.loading ? 'none' : '0 4px 24px rgba(124,58,237,0.4)',
        }}
      >
        {state.loading ? 'Importing...' : state.platform === 'sleeper' ? '🔥 Build My Legacy Profile' : 'Open Full Legacy Import'}
      </button>

      <p className="text-center text-[11px] text-white/25 mt-3">
        Career rank cache, AI report, and overview cards all refresh from this import.
      </p>
    </div>
  )
}

function CareerStats({ rank }: { rank: PlayerRank }) {
  const cfg = getTierConfig(rank)
  const stats = [
    { label: 'Win Rate', value: `${rank.winRate.toFixed(1)}%`, sub: 'career average' },
    { label: 'Playoff Rate', value: `${rank.playoffRate.toFixed(0)}%`, sub: 'seasons qualified' },
    { label: 'Championships', value: String(rank.championshipCount), sub: 'total titles' },
    { label: 'Seasons Played', value: String(rank.seasonsPlayed), sub: 'career length' },
  ]

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Career Stats</p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
            <div className="text-xl font-bold text-white" style={{ color: cfg.color }}>
              {item.value}
            </div>
            <div className="text-[11px] font-semibold text-white/70 mt-0.5">{item.label}</div>
            <div className="text-[10px] text-white/30">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeagueAccessRules({ rank }: { rank: PlayerRank }) {
  const cfg = getTierConfig(rank)
  const tierUp = getTierConfigByTier(Math.max(1, cfg.tier - 1))
  const tierDown = getTierConfigByTier(Math.min(10, cfg.tier + 1))

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: `${cfg.color}30`, background: `radial-gradient(ellipse at top left, ${cfg.glow}, #0d0d1f)` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: cfg.glow, border: `1px solid ${cfg.color}` }}
        >
          🔒
        </div>
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">League Access</p>
      </div>

      <div className="space-y-2.5">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <div className="text-[11px] font-bold text-green-400 uppercase tracking-wide mb-1.5">You Can Request to Join</div>
          <div className="flex flex-wrap gap-1.5">
            {[tierUp, cfg, tierDown].map((tier) => (
              <span
                key={tier.tier}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: tier.glow, color: tier.color, border: `1px solid ${tier.color}40` }}
              >
                {tier.badge} {tier.name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide mb-1">Invitations</div>
          <p className="text-xs text-white/50">
            Anyone can invite you to any tier league. Rank limits only apply when you are requesting access.
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[11px] font-bold text-white/30 uppercase tracking-wide mb-1">Rank Up for Higher Leagues</div>
          <p className="text-xs text-white/30">
            Requests are limited to leagues within 1 tier of your current rank. Earn XP through imports, play, and results to move up.
          </p>
        </div>
      </div>
    </div>
  )
}

function RankHero({ rank, username }: { rank: PlayerRank; username: string }) {
  const cfg = getTierConfig(rank)
  const xp = Number(rank.careerXp)
  const currentTierIndex = Math.max(0, Math.min(9, cfg.tier - 1))
  const currentThreshold = currentTierIndex * 1500
  const nextThreshold = Math.min(15000, currentThreshold + 1500)
  const xpProgress =
    nextThreshold > currentThreshold
      ? Math.min(100, Math.max(0, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
      : 100

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-white/8"
      style={{ background: `radial-gradient(ellipse at 30% 0%, ${cfg.glow}, #07071a 60%)` }}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <RankBadge rank={rank} size="lg" />

        <div className="flex-1 text-center sm:text-left">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>
            Your AllFantasy Rank
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-none mb-1">{rank.careerTierName || cfg.name}</h1>
          <p className="text-sm text-white/50 mb-1">@{username}</p>
          <p className="text-sm text-white/60 italic mb-4">{cfg.desc}</p>

          <div className="max-w-xs sm:max-w-sm mx-auto sm:mx-0">
            <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
              <span>Level {rank.careerLevel}</span>
              <span>{xp.toLocaleString()} XP</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${xpProgress}%`,
                  background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
                  boxShadow: `0 0 8px ${cfg.color}`,
                }}
              />
            </div>
            <div className="text-[10px] text-white/30 mt-1 text-right">
              {cfg.tier > 1 ? `${Math.max(0, nextThreshold - xp).toLocaleString()} XP to ${getTierConfigByTier(cfg.tier - 1).name}` : 'Max showcase tier reached'}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="rounded-2xl px-5 py-4 text-center border" style={{ background: cfg.glow, borderColor: `${cfg.color}40` }}>
            <div className="text-3xl font-black" style={{ color: cfg.color }}>
              {rank.aiReportGrade}
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">AI Grade</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{rank.aiScore}</div>
            <div className="text-[10px] text-white/30">/ 100</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/6 px-6 sm:px-8 py-3 flex items-start gap-3">
        <span className="text-cyan-400 text-xs font-bold mt-0.5 shrink-0">AI</span>
        <p className="text-xs text-white/60 italic leading-relaxed">"{rank.aiInsight}"</p>
      </div>
    </div>
  )
}

function EmptyRankState({ onImported }: { onImported: () => void }) {
  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-gradient-to-br from-[#12082a] to-[#07071a] p-8 text-center">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(124,58,237,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.3) 0%, transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Turn your fantasy history into a{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Legacy Profile</span>
          </h2>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-2">
            Import your career data to unlock your rank badge, AI insight, league access tier, and progression path.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ImportPanel onImportSuccess={onImported} />

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">The Ranking System</p>
            <div className="space-y-1.5">
              {TIERS.map((tier) => (
                <div key={tier.tier} className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <span className="text-base">{tier.badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white/70 truncate">{tier.name}</div>
                    <div className="text-[10px] text-white/30 truncate">{tier.desc}</div>
                  </div>
                  <span className="text-[10px] font-bold text-white/20">T{tier.tier}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div>
            <h3 className="font-bold text-white mb-1">League Access Rules</h3>
            <p className="text-sm text-white/60">
              You can request leagues within 1 tier of your current rank. Commissioners and invite links can still bring you into any tier.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FullRankView({
  rank,
  username,
  overviewProfile,
  onReimport,
}: {
  rank: PlayerRank
  username: string
  overviewProfile: CompositeProfile | null
  onReimport: () => void
}) {
  return (
    <div className="space-y-6">
      <RankHero rank={rank} username={username} />

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <TierLadder rank={rank} />
          <CareerStats rank={rank} />
          <LeagueAccessRules rank={rank} />
        </div>

        <div className="space-y-4">
          {overviewProfile ? (
            <>
              <OverviewReportCard
                profile={overviewProfile}
                tierName={rank.careerTierName}
                tierLevel={rank.careerLevel}
                careerXp={Number(rank.careerXp)}
              />
              <OverviewInsights profile={overviewProfile} lanes={overviewProfile.lanes} />
              <OverviewLanes lanes={overviewProfile.lanes} />
            </>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5 text-sm text-white/60">
              Import more legacy history to unlock the AF Legacy overview cards on this page.
            </div>
          )}

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Refresh your legacy profile</p>
              <p className="text-xs text-white/40">
                {rank.importedAt ? `Last calculated ${new Date(rank.importedAt).toLocaleString()}` : 'Run another import to recalculate your rank.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onReimport}
              className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all"
            >
              Reimport
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyRankingsPage() {
  const { data: session } = useSession()
  const [rank, setRank] = useState<PlayerRank | null>(null)
  const [overviewProfile, setOverviewProfile] = useState<CompositeProfile | null>(null)
  const [legacyUsername, setLegacyUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  const loadRank = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/rank', { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as RankResponse
      if (response.ok && data.rank) {
        setRank(data.rank)
        setOverviewProfile(data.overviewProfile ?? null)
        setLegacyUsername(data.legacyUsername ?? null)
      } else {
        setRank(null)
        setOverviewProfile(null)
        setLegacyUsername(null)
      }
    } catch {
      setRank(null)
      setOverviewProfile(null)
      setLegacyUsername(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRank()
  }, [loadRank])

  const username =
    legacyUsername ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    'manager'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#07071a] to-[#0d0d1f]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[420px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/40 border-t-violet-500 animate-spin" />
              <p className="text-sm text-white/40">Loading your rank...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#07071a] to-[#0d0d1f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Dashboard</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white">My Rankings</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-300">
            Your AllFantasy rank, AI grade, import flow, and league access rules in one place.
          </p>
        </div>

        {!rank || showImport ? (
          <EmptyRankState
            onImported={() => {
              setShowImport(false)
              void loadRank()
            }}
          />
        ) : (
          <FullRankView
            rank={rank}
            username={username}
            overviewProfile={overviewProfile}
            onReimport={() => setShowImport(true)}
          />
        )}
      </div>
    </div>
  )
}
