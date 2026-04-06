'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import OverviewInsights from '@/app/af-legacy/components/OverviewInsights'
import OverviewLanes from '@/app/af-legacy/components/OverviewLanes'
import OverviewReportCard from '@/app/af-legacy/components/OverviewReportCard'
import type { CompositeProfile } from '@/lib/legacy/overview-scoring'
import { RANK_LEVELS, getLevelFromXp, getLevelIcon } from '@/lib/rank/levels'

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
  totalWins?: number
  totalLosses?: number
  totalTies?: number
  playoffAppearances?: number
  importedAt: string | null
}

interface RankResponse {
  imported: boolean
  rank: PlayerRank | null
  overviewProfile?: CompositeProfile | null
  legacyUsername?: string | null
  tier?: string | null
  tierName?: string | null
  xpTotal?: number | null
  xpLevel?: number | null
  level?: number | null
  levelName?: string | null
  tierGroup?: number | null
  color?: string | null
  bgColor?: string | null
  xpIntoLevel?: number | null
  xpForLevel?: number | null
  progressPct?: number | null
  nextLevelName?: string | null
  careerWins?: number | null
  careerLosses?: number | null
  careerChampionships?: number | null
  careerPlayoffAppearances?: number | null
  careerSeasonsPlayed?: number | null
  careerLeaguesPlayed?: number | null
  rankProcessing?: boolean
  rankCalculatedAt?: string | null
  error?: string
  careerStats?: {
    seasonsPlayed: number
    totalWins: number
    totalLosses: number
    championships: number
    playoffAppearances: number
    leaguesPlayed: number
  } | null
  stats?: RankResponse['careerStats']
}

/** Normalized 25-level payload from `/api/user/rank`. */
type RankLevelApiPayload = {
  tier: string
  level: number
  levelName: string
  tierGroup: number
  color: string
  bgColor: string
  xpTotal: number
  xpIntoLevel: number
  xpForLevel: number
  progressPct: number
  nextLevelName: string | null
  careerWins: number | null
  careerLosses: number | null
  careerChampionships: number | null
  careerPlayoffAppearances: number | null
  careerSeasonsPlayed: number | null
  careerLeaguesPlayed: number | null
  rankCalculatedAt: string | null
}

function rankLevelPayloadFromResponse(data: RankResponse): RankLevelApiPayload | null {
  const xp = data.xpTotal ?? 0
  const lv = getLevelFromXp(xp)
  if (!data.tier?.trim() && typeof data.level !== 'number') return null
  const level = typeof data.level === 'number' ? data.level : lv.level
  const row = RANK_LEVELS.find((r) => r.level === level) ?? lv
  return {
    tier: data.tier?.trim() || row.tier,
    level,
    levelName: data.levelName?.trim() ?? row.name,
    tierGroup: data.tierGroup ?? row.tierGroup,
    color: data.color ?? row.color,
    bgColor: data.bgColor ?? row.bgColor,
    xpTotal: xp,
    xpIntoLevel: data.xpIntoLevel ?? lv.xpIntoLevel,
    xpForLevel: data.xpForLevel ?? lv.xpForLevel,
    progressPct: data.progressPct ?? lv.progressPct,
    nextLevelName: data.nextLevelName ?? lv.nextLevel?.name ?? null,
    careerWins: data.careerWins ?? data.careerStats?.totalWins ?? null,
    careerLosses: data.careerLosses ?? data.careerStats?.totalLosses ?? null,
    careerChampionships: data.careerChampionships ?? data.careerStats?.championships ?? null,
    careerPlayoffAppearances: data.careerPlayoffAppearances ?? data.careerStats?.playoffAppearances ?? null,
    careerSeasonsPlayed: data.careerSeasonsPlayed ?? data.careerStats?.leaguesPlayed ?? null,
    careerLeaguesPlayed: data.careerLeaguesPlayed ?? data.careerStats?.seasonsPlayed ?? null,
    rankCalculatedAt: data.rankCalculatedAt ?? null,
  }
}

/** When API returns tier + stats but omits nested `rank` (older clients), build a display rank. */
function playerRankFromApiResponse(data: RankResponse): PlayerRank | null {
  if (data.rank) return data.rank
  const cs = data.careerStats ?? data.stats ?? null
  const xpNum = data.xpTotal ?? 0
  const lv = getLevelFromXp(xpNum)
  if (data.tier?.trim() || typeof data.level === 'number') {
    const level = typeof data.level === 'number' ? data.level : lv.level
    const row = RANK_LEVELS.find((r) => r.level === level) ?? lv
    return {
      careerTier: data.tierGroup ?? row.tierGroup,
      careerTierName: data.levelName?.trim() || data.tierName?.trim() || row.name,
      careerLevel: level,
      careerXp: String(xpNum),
      aiReportGrade: 'B',
      aiScore: 70,
      aiInsight: 'Import your leagues to generate your AI insight.',
      winRate: 0,
      playoffRate: 0,
      championshipCount: cs?.championships ?? 0,
      seasonsPlayed: cs?.seasonsPlayed ?? 0,
      totalWins: cs?.totalWins,
      totalLosses: cs?.totalLosses,
      playoffAppearances: cs?.playoffAppearances,
      importedAt: data.rankCalculatedAt ?? null,
    }
  }
  return null
}

interface ImportState {
  platform: 'sleeper' | 'yahoo' | 'mfl' | 'fantrax' | 'espn'
  username: string
  loading: boolean
  error: string | null
  successMessage: string | null
}

type ImportJobProgressResponse = {
  status: string
  progress: number
  currentSeason: number | null
  seasonsCompleted: number | null
  totalSeasons: number | null
  totalLeaguesSaved: number | null
  lastRankTier: string | null
  lastRankLevel: number | null
  lastXpTotal: number | null
  completedAt?: string | null
  seasons: Array<{
    season: number
    status: string
    leagueCount: number | null
    wins: number | null
    losses: number | null
    championships?: number | null
    rankAfter: string | null
    levelAfter: number | null
    xpEarned?: number | null
  }>
}

const statusIcon = (s: string) =>
  (
    ({
      complete: '✓',
      processing: '⟳',
      error: '✕',
      empty: '—',
      pending: '·',
    }) as Record<string, string>
  )[s] ?? '·'

const statusColor = (s: string) =>
  (
    ({
      complete: '#6EE7A0',
      processing: '#38BDF8',
      error: '#F87171',
      empty: '#94A3B8',
      pending: '#64748B',
    }) as Record<string, string>
  )[s] ?? '#64748B'

function ImportProgressPanel({
  job,
  loading,
  error,
}: {
  job: ImportJobProgressResponse | null
  loading: boolean
  error: string | null
}) {
  const seasonsSorted = job?.seasons?.length ? [...job.seasons].sort((a, b) => a.season - b.season) : []
  const pct = Math.min(100, Math.max(0, job?.progress ?? 0))

  return (
    <div data-testid="import-progress-panel">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes import-season-spin { to { transform: rotate(360deg); } }`,
        }}
      />
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: 24,
          background: 'linear-gradient(145deg, rgba(10,18,40,0.95), rgba(7,7,26,0.98))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>Importing your legacy history</h3>
        {error ? <p style={{ marginTop: 10, fontSize: 14, color: '#fca5a5' }}>{error}</p> : null}
        {loading && !job ? (
          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(248,250,252,0.5)' }}>Loading job status…</p>
        ) : null}

        {job ? (
          <>
            <div style={{ margin: '16px 0 8px', height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #185FA5, #7c3aed)',
                  borderRadius: 5,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'rgba(248,250,252,0.45)',
                marginBottom: 20,
              }}
            >
              <span>
                {job.seasonsCompleted ?? 0} of {job.totalSeasons ?? seasonsSorted.length} seasons
              </span>
              <span>{pct}%</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {seasonsSorted.map((s) => {
                const st = s.status
                const bg =
                  st === 'complete'
                    ? 'rgba(59, 109, 17, 0.2)'
                    : st === 'processing'
                      ? 'rgba(24, 95, 165, 0.2)'
                      : st === 'error'
                        ? 'rgba(226, 75, 74, 0.15)'
                        : 'rgba(241, 239, 232, 0.06)'
                return (
                  <div
                    key={s.season}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      background: bg,
                      color: statusColor(st),
                      border: st === 'processing' ? '1px solid #185FA5' : '1px solid transparent',
                    }}
                  >
                    <span
                      style={
                        st === 'processing'
                          ? { display: 'inline-block', animation: 'import-season-spin 1s linear infinite' }
                          : {}
                      }
                    >
                      {statusIcon(st)}
                    </span>
                    {s.season}
                    {st === 'complete' && (s.leagueCount ?? 0) > 0 ? (
                      <span style={{ opacity: 0.6 }}>·{s.leagueCount}</span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Leagues saved', val: job.totalLeaguesSaved ?? 0 },
                { label: 'Current level', val: job.lastRankLevel ?? '—' },
                { label: 'XP earned', val: (job.lastXpTotal ?? 0).toLocaleString() },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    padding: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc' }}>{row.val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', marginTop: 2 }}>{row.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

const PLATFORMS = [
  { id: 'sleeper', label: 'Sleeper', emoji: '🌙' },
  { id: 'yahoo', label: 'Yahoo', emoji: '🏈' },
  { id: 'mfl', label: 'MFL', emoji: '🏆' },
  { id: 'fantrax', label: 'Fantrax', emoji: '📊' },
  { id: 'espn', label: 'ESPN', emoji: '🔴' },
] as const

type TierVisual = {
  tier: number
  name: string
  color: string
  glow: string
  badge: string
  desc: string
}

function getTierConfigByLevel(level: number): TierVisual {
  const row = RANK_LEVELS.find((e) => e.level === level) ?? RANK_LEVELS[0]
  const glow = `${row.color}55`
  return {
    tier: row.level,
    name: row.name,
    color: row.color,
    glow,
    badge: getLevelIcon(row.tierGroup),
    desc: row.tier,
  }
}

function getTierConfig(rank: Pick<PlayerRank, 'careerTier' | 'careerTierName' | 'careerLevel'>) {
  return getTierConfigByLevel(rank.careerLevel)
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
          LV {rank.careerLevel}
        </span>
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
  const [isImporting, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [totalSeasons, setTotalSeasons] = useState(0)
  const [currentSeason, setCurrentSeason] = useState<number | null>(null)
  const [seasonIndex, setSeasonIndex] = useState(0)
  const [leaguesSaved, setLeaguesSaved] = useState(0)
  const [completedSeasons, setCompletedSeasons] = useState<
    { season: number; leagues: number; level?: number }[]
  >([])
  const [currentLevel, setCurrentLevel] = useState<number | null>(null)
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [currentXp, setCurrentXp] = useState<number | null>(null)

  const selectedPlatform = useMemo(
    () => PLATFORMS.find((entry) => entry.id === state.platform) ?? PLATFORMS[0],
    [state.platform]
  )

  const runClientSideImport = useCallback(
    async (sleeperUsername: string) => {
      setImporting(true)
      setImportError(null)
      setTotalSeasons(0)
      setCurrentSeason(null)
      setSeasonIndex(0)
      setLeaguesSaved(0)
      setCompletedSeasons([])
      setCurrentLevel(null)
      setCurrentTier(null)
      setCurrentXp(null)

      try {
        const userRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUsername)}`)
        if (!userRes.ok) throw new Error('Sleeper user not found')
        const sleeperUser = (await userRes.json()) as { user_id?: string }
        const sleeperUserId = sleeperUser.user_id
        if (!sleeperUserId) throw new Error('Sleeper user not found')

        const currentYear = new Date().getFullYear()
        const years = Array.from({ length: currentYear - 2016 }, (_, i) => 2017 + i)
        const seasonsWithLeagues: number[] = []

        for (const year of years) {
          const r = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${year}`)
          const data = await r.json()
          if (Array.isArray(data) && data.length > 0) {
            seasonsWithLeagues.push(year)
          }
        }

        if (seasonsWithLeagues.length === 0) {
          throw new Error('No Sleeper leagues found for this username')
        }

        setTotalSeasons(seasonsWithLeagues.length)

        for (let i = 0; i < seasonsWithLeagues.length; i++) {
          const season = seasonsWithLeagues[i]
          setCurrentSeason(season)
          setSeasonIndex(i)

          try {
            const leagueRes = await fetch(
              `https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${season}`
            )
            const sleeperLeagues = await leagueRes.json()
            if (!Array.isArray(sleeperLeagues)) continue

            const leagueRecords: Array<{
              platformLeagueId: string
              name: string
              season: number
              leagueSize: number
              importWins: number
              importLosses: number
              importTies: number
              importMadePlayoffs: boolean
              importWonChampionship: boolean
              importFinalStanding: number | null
              importPointsFor: number | null
            }> = []

            for (const league of sleeperLeagues as Array<{
              league_id?: string
              name?: string
              total_rosters?: number
              settings?: { playoff_teams?: number }
            }>) {
              try {
                const lid = league.league_id
                if (!lid) continue
                const rosterRes = await fetch(`https://api.sleeper.app/v1/league/${lid}/rosters`)
                const rosters = await rosterRes.json()
                const mine = Array.isArray(rosters)
                  ? (rosters as Array<{
                      owner_id?: string
                      co_owners?: string[]
                      settings?: {
                        wins?: number
                        losses?: number
                        ties?: number
                        fpts?: number
                        final_standing?: number
                      }
                    }>).find(
                      (row) =>
                        row.owner_id === sleeperUserId || row.co_owners?.includes(sleeperUserId)
                    )
                  : null

                const totalTeams = league.total_rosters ?? 12
                const playoffTeams =
                  league.settings?.playoff_teams ?? Math.ceil(totalTeams / 3)
                const finalStanding = mine?.settings?.final_standing ?? null

                leagueRecords.push({
                  platformLeagueId: String(lid),
                  name: league.name ?? `League ${lid}`,
                  season,
                  leagueSize: totalTeams,
                  importWins: mine?.settings?.wins ?? 0,
                  importLosses: mine?.settings?.losses ?? 0,
                  importTies: mine?.settings?.ties ?? 0,
                  importMadePlayoffs: finalStanding ? finalStanding <= playoffTeams : false,
                  importWonChampionship: finalStanding === 1,
                  importFinalStanding: finalStanding,
                  importPointsFor: mine?.settings?.fpts ?? null,
                })
              } catch {
                // skip individual league error
              }
            }

            const isLastSeason = i === seasonsWithLeagues.length - 1
            const batchRes = await fetch('/api/leagues/import/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                season,
                leagues: leagueRecords,
                sleeperUserId,
                isLastSeason,
              }),
            })
            const batchData = (await batchRes.json().catch(() => ({}))) as {
              xpLevel?: number
              rankTier?: string | null
              xpTotal?: number | null
              error?: string
            }
            if (!batchRes.ok) {
              throw new Error(
                typeof batchData.error === 'string' ? batchData.error : 'Failed to save import batch'
              )
            }

            if (batchData.xpLevel != null) {
              setCurrentLevel(batchData.xpLevel)
              setCurrentTier(batchData.rankTier ?? null)
              setCurrentXp(batchData.xpTotal ?? null)
            }

            setCompletedSeasons((prev) => [
              ...prev,
              { season, leagues: leagueRecords.length, level: batchData.xpLevel },
            ])
            setLeaguesSaved((prev) => prev + leagueRecords.length)
          } catch (seasonErr) {
            console.error(`[import] season ${season}:`, seasonErr)
          }

          await new Promise((r) => setTimeout(r, 300))
        }

        setImporting(false)
        onImportSuccess()
        router.push('/dashboard/rankings?imported=true&done=true')
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Import failed')
        setImporting(false)
      }
    },
    [onImportSuccess, router]
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

    await runClientSideImport(state.username.trim().toLowerCase())
    setState((current) => ({ ...current, loading: false, error: null, successMessage: null }))
  }, [router, runClientSideImport, selectedPlatform.label, state.platform, state.username])

  if (isImporting) {
    const pct =
      totalSeasons > 0 ? Math.round((seasonIndex / totalSeasons) * 100) : 0
    return (
      <div
        className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#12082a] to-[#0a0a1e] p-6 shadow-2xl"
        data-testid="client-import-progress"
      >
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#f8fafc' }}>
            Importing your history...
          </div>
          <div style={{ fontSize: 13, color: 'gray', marginBottom: 20 }}>
            {currentSeason != null
              ? `Season ${currentSeason} (${seasonIndex + 1} of ${totalSeasons})`
              : 'Discovering seasons...'}
          </div>

          <div
            style={{
              height: 8,
              background: '#eee',
              borderRadius: 4,
              margin: '0 auto 20px',
              maxWidth: 400,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                width: `${pct}%`,
                background: '#185FA5',
                transition: 'width 0.5s',
              }}
            />
          </div>

          {currentLevel != null ? (
            <div style={{ fontSize: 14, color: '#185FA5' }}>
              Current rank: Level {currentLevel}
              {currentTier ? ` · ${currentTier}` : ''}
              {currentXp != null ? <span> · {currentXp.toLocaleString()} XP</span> : null}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 16,
            }}
          >
            {completedSeasons.map((s) => (
              <span
                key={s.season}
                style={{
                  background: '#EAF3DE',
                  color: '#27500A',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                ✓ {s.season} ({s.leagues} leagues)
              </span>
            ))}
            {currentSeason != null && !completedSeasons.find((x) => x.season === currentSeason) ? (
              <span
                style={{
                  background: '#E6F1FB',
                  color: '#0C447C',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  border: '1px solid #185FA5',
                }}
              >
                ⟳ {currentSeason}...
              </span>
            ) : null}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: 'gray' }}>
            {leaguesSaved} leagues saved so far
          </div>
        </div>
      </div>
    )
  }

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

      {(state.error || importError) ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {importError ?? state.error}
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
  const wins = rank.totalWins ?? 0
  const losses = rank.totalLosses ?? 0
  const ties = rank.totalTies ?? 0
  const recordLabel = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
  const stats = [
    { label: 'Record', value: wins + losses + ties > 0 ? recordLabel : '—', sub: 'imported Sleeper leagues' },
    { label: 'Win Rate', value: `${rank.winRate.toFixed(1)}%`, sub: 'career average' },
    {
      label: 'Playoff appearances',
      value: rank.playoffAppearances != null ? String(rank.playoffAppearances) : '—',
      sub: 'seasons qualified',
    },
    { label: 'Playoff Rate', value: `${rank.playoffRate.toFixed(0)}%`, sub: 'of league seasons' },
    { label: 'Championships', value: String(rank.championshipCount), sub: 'total titles' },
    { label: 'Seasons played', value: String(rank.seasonsPlayed), sub: 'distinct seasons' },
  ]

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Career Stats</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
  const tierUp = getTierConfigByLevel(Math.max(1, rank.careerLevel - 1))
  const tierDown = getTierConfigByLevel(Math.min(25, rank.careerLevel + 1))

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
  const lv = getLevelFromXp(xp)
  const xpProgress = lv.progressPct
  const nextRow = RANK_LEVELS.find((r) => r.level === rank.careerLevel + 1)
  const xpToNext = nextRow ? Math.max(0, nextRow.minXp - xp) : 0

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
              {nextRow
                ? `${xpToNext.toLocaleString()} XP to ${nextRow.name}`
                : rank.careerLevel >= 25
                  ? 'Max level reached'
                  : '—'}
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

function ProcessingImportState() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#0a1228] to-[#07071a] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/35 border-t-cyan-400" />
        </div>
        <h2 className="text-xl font-black text-white">Import in progress</h2>
        <p className="mt-2 text-sm text-white/50">
          Syncing rosters and brackets from Sleeper, then calculating your rank. This page updates automatically.
        </p>
      </div>
    </div>
  )
}

function CalculatingRankState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-6" data-testid="rank-calculating-state">
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#0a1228] to-[#07071a] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/35 border-t-violet-300" />
        </div>
        <h2 className="text-xl font-black text-white">Calculating your rank…</h2>
        <p className="mt-2 text-sm text-white/50">
          Your leagues are imported. We&apos;re finishing your tier and XP snapshot — this usually takes a few seconds.
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-6 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 hover:border-cyan-500/35 hover:text-white"
        >
          Refresh now
        </button>
      </div>
    </div>
  )
}

function RankImportTimeoutState() {
  const router = useRouter()
  return (
    <div className="space-y-6" data-testid="rank-import-timeout">
      <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#0a1228] to-[#07071a] p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <p className="text-sm text-white/90">
          Import didn&apos;t complete — this can happen due to a timeout.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/rankings')}
          className="mt-6 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:border-cyan-400/50 hover:text-white"
        >
          Try importing again
        </button>
      </div>
    </div>
  )
}

function LevelJourneyStrip({ currentLevel }: { currentLevel: number }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Level journey</p>
      <div className="flex gap-1 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:thin]">
        {RANK_LEVELS.map((row) => {
          const done = row.level < currentLevel
          const active = row.level === currentLevel
          return (
            <div
              key={row.level}
              title={`${row.level}. ${row.name}`}
              className="flex h-9 min-w-[2.25rem] shrink-0 flex-col items-center justify-center rounded-lg border text-[9px] font-bold"
              style={{
                borderColor: active ? row.color : 'rgba(255,255,255,0.08)',
                background: done ? `${row.color}35` : active ? `${row.color}22` : 'rgba(255,255,255,0.03)',
                color: active ? row.color : done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
                boxShadow: active ? `0 0 0 1px ${row.color}55` : undefined,
              }}
            >
              <span className="leading-none">{row.level}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TwentyFiveLevelRankCard({ payload }: { payload: RankLevelApiPayload }) {
  const icon = getLevelIcon(payload.tierGroup)
  const seasons = payload.careerLeaguesPlayed ?? 0
  const cells = [
    { label: 'Seasons', value: String(seasons) },
    { label: 'Wins', value: String(payload.careerWins ?? 0) },
    { label: 'Losses', value: String(payload.careerLosses ?? 0) },
    { label: 'Championships', value: String(payload.careerChampionships ?? 0) },
    {
      label: 'Playoff Apps',
      value: payload.careerPlayoffAppearances != null ? String(payload.careerPlayoffAppearances) : '—',
    },
  ]
  const nextRow = RANK_LEVELS.find((r) => r.level === payload.level + 1)
  const xpToNext = nextRow ? Math.max(0, nextRow.minXp - payload.xpTotal) : 0

  return (
    <div
      className="rounded-2xl border-2 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      data-testid="import-rank-snapshot-card"
      style={{
        background: payload.bgColor,
        borderColor: payload.color,
      }}
    >
      <div className="text-center">
        <div className="text-5xl font-black tabular-nums" style={{ color: payload.color }}>
          {payload.level}
        </div>
        <p className="mt-1 text-lg font-bold text-[#0a0a12]" style={{ color: '#0a0a12' }}>
          {payload.levelName}
        </p>
        <p className="text-sm font-semibold opacity-80" style={{ color: payload.color }}>
          {payload.tier}
        </p>
        <div className="mt-3 flex justify-center text-3xl" aria-hidden>
          {icon}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1 flex justify-between text-[11px] font-medium opacity-70">
          <span style={{ color: '#0a0a12' }}>
            {payload.xpIntoLevel.toLocaleString()} / {payload.xpForLevel.toLocaleString()} XP in level
          </span>
          <span style={{ color: '#0a0a12' }}>{payload.progressPct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${payload.progressPct}%`,
              background: payload.color,
            }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-medium opacity-75" style={{ color: '#0a0a12' }}>
          {nextRow
            ? `${xpToNext.toLocaleString()} XP to ${payload.nextLevelName ?? nextRow.name}`
            : payload.level >= 25
              ? 'Max level'
              : '—'}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-black/10 bg-white/60 p-3 text-center backdrop-blur-sm"
          >
            <div className="text-lg font-bold text-[#0a0a12]">{c.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#0a0a12]/50">{c.label}</div>
          </div>
        ))}
      </div>

      <LevelJourneyStrip currentLevel={payload.level} />
    </div>
  )
}

function RankingSystemOverview() {
  const tierGroups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, (typeof RANK_LEVELS)[number][]>()
    for (const row of RANK_LEVELS) {
      if (!map.has(row.tier)) {
        order.push(row.tier)
        map.set(row.tier, [])
      }
      map.get(row.tier)!.push(row)
    }
    return { order, map }
  }, [])

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] p-5 max-h-[min(70vh,560px)] overflow-y-auto">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">The Ranking System</p>
      <div className="space-y-5">
        {tierGroups.order.map((tierName) => (
          <div key={tierName}>
            <p className="text-[11px] font-bold text-cyan-300/90 mb-2 flex items-center gap-2">
              <span>{getLevelIcon((tierGroups.map.get(tierName) ?? [])[0]?.tierGroup ?? 1)}</span>
              {tierName}
            </p>
            <ul className="space-y-1.5">
              {tierGroups.map.get(tierName)?.map((row) => (
                <li
                  key={row.level}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-white/50 w-6 shrink-0">{row.level}</span>
                  <span className="flex-1 text-white/80 truncate">{row.name}</span>
                  <span className="text-[10px] text-white/35 shrink-0">{row.minXp.toLocaleString()} XP</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
          <RankingSystemOverview />
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
  levelRank,
  username,
  overviewProfile,
  onReimport,
  onRecalculate,
  recalculateLoading,
}: {
  rank: PlayerRank
  levelRank: RankLevelApiPayload | null
  username: string
  overviewProfile: CompositeProfile | null
  onReimport: () => void
  onRecalculate?: () => void
  recalculateLoading?: boolean
}) {
  return (
    <div className="space-y-6">
      {levelRank ? <TwentyFiveLevelRankCard payload={levelRank} /> : null}
      <RankHero rank={rank} username={username} />

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
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
            <div className="flex flex-wrap gap-2 shrink-0">
              {onRecalculate ? (
                <button
                  type="button"
                  disabled={recalculateLoading}
                  onClick={onRecalculate}
                  className="rounded-xl px-4 py-2 text-xs font-bold border border-cyan-500/35 text-cyan-200 hover:border-cyan-400/50 hover:text-white transition-all disabled:opacity-40"
                  data-testid="rank-recalculate-button"
                >
                  {recalculateLoading ? 'Recalculating…' : 'Recalculate'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onReimport}
                className="rounded-xl px-4 py-2 text-xs font-bold border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all"
              >
                Reimport
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyRankingsPageInner() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rank, setRank] = useState<PlayerRank | null>(null)
  const [overviewProfile, setOverviewProfile] = useState<CompositeProfile | null>(null)
  const [legacyUsername, setLegacyUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [importProcessing, setImportProcessing] = useState(false)
  const [rankFetchError, setRankFetchError] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importBannerDismissed, setImportBannerDismissed] = useState(false)
  const [recalculateLoading, setRecalculateLoading] = useState(false)
  const [apiImported, setApiImported] = useState(false)
  const [apiTier, setApiTier] = useState<string | null>(null)
  const [levelRank, setLevelRank] = useState<RankLevelApiPayload | null>(null)
  const justImported = searchParams.get('imported') === 'true'
  const importDone = searchParams.get('done') === 'true'
  const jobIdParam = searchParams.get('jobId')
  const [jobProgress, setJobProgress] = useState<ImportJobProgressResponse | null>(null)
  const [jobProgressError, setJobProgressError] = useState<string | null>(null)
  const [importPhasedSuccess, setImportPhasedSuccess] = useState<{
    totalLeagues: number
    totalSeasons: number
    finalLevel: number | null
  } | null>(null)
  const [importPhasedBannerDismissed, setImportPhasedBannerDismissed] = useState(false)
  const [importRankHidden, setImportRankHidden] = useState(() => Boolean(searchParams.get('jobId')))
  const [showLevelUpBurst, setShowLevelUpBurst] = useState(false)
  const [importStuck, setImportStuck] = useState(false)
  const completedJobHandledRef = useRef<string | null>(null)
  const importPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialImportLevelRef = useRef<number | null>(null)

  const loadRank = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setLoading(true)
    try {
      const response = await fetch('/api/user/rank', { cache: 'no-store' })
      const data = (await response.json().catch(() => ({}))) as RankResponse
      if (response.ok) {
        setRankFetchError(false)
        setImportProcessing(data.rankProcessing === true)
        setApiImported(data.imported === true)
        setApiTier(data.tier ?? null)
        setLevelRank(rankLevelPayloadFromResponse(data))
        const displayRank = playerRankFromApiResponse(data)
        if (displayRank) {
          setRank(displayRank)
          setOverviewProfile(data.overviewProfile ?? null)
          setLegacyUsername(data.legacyUsername ?? null)
        } else {
          setRank(null)
          setOverviewProfile(null)
          setLegacyUsername(data.legacyUsername ?? null)
        }
      } else {
        setRankFetchError(true)
        setRank(null)
        setOverviewProfile(null)
        setLegacyUsername(null)
        setImportProcessing(false)
        setApiImported(false)
        setApiTier(null)
        setLevelRank(null)
      }
    } catch {
      setRankFetchError(true)
      setRank(null)
      setOverviewProfile(null)
      setLegacyUsername(null)
      setImportProcessing(false)
      setApiImported(false)
      setApiTier(null)
      setLevelRank(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const handleRecalculate = useCallback(async () => {
    setRecalculateLoading(true)
    try {
      await fetch('/api/user/rank?recalculate=true', { cache: 'no-store', credentials: 'include' })
      await loadRank({ silent: true })
    } finally {
      setRecalculateLoading(false)
    }
  }, [loadRank])

  useEffect(() => {
    void loadRank()
  }, [loadRank])

  /** After client-side import, force recalculate from DB and show rank without endless polling. */
  useEffect(() => {
    if (!justImported || !importDone) return
    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/user/rank?recalculate=true', { cache: 'no-store', credentials: 'include' })
        if (cancelled) return
        await loadRank({ silent: true })
      } finally {
        if (!cancelled) {
          router.replace('/dashboard/rankings', { scroll: false })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [justImported, importDone, loadRank, router])

  useEffect(() => {
    if (!jobIdParam) {
      setJobProgress(null)
      setJobProgressError(null)
      return
    }
    setImportRankHidden(true)
    completedJobHandledRef.current = null
    initialImportLevelRef.current = null
    const jobId = jobIdParam
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/leagues/import/progress/${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        if (!res.ok) {
          if (!cancelled) {
            setJobProgressError(typeof data.error === 'string' ? data.error : 'Could not load import progress')
          }
          return
        }
        if (!cancelled) {
          setJobProgressError(null)
          setJobProgress(data as ImportJobProgressResponse)
        }
        const jp = data as ImportJobProgressResponse
        if (jp && (jp.status === 'complete' || jp.status === 'error')) {
          if (importPollRef.current) {
            clearInterval(importPollRef.current)
            importPollRef.current = null
          }
        }
      } catch {
        if (!cancelled) setJobProgressError('Could not load import progress')
      }
    }

    void poll()
    importPollRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void poll()
    }, 2500)

    return () => {
      cancelled = true
      if (importPollRef.current) {
        clearInterval(importPollRef.current)
        importPollRef.current = null
      }
    }
  }, [jobIdParam])

  useEffect(() => {
    if (!jobIdParam || !jobProgress) return
    if (jobProgress.status !== 'complete') return
    if (completedJobHandledRef.current === jobIdParam) return
    completedJobHandledRef.current = jobIdParam
    const finalLv = jobProgress.lastRankLevel ?? null
    setImportPhasedSuccess({
      totalLeagues: jobProgress.totalLeaguesSaved ?? 0,
      totalSeasons: jobProgress.totalSeasons ?? 0,
      finalLevel: finalLv,
    })
    router.replace('/dashboard/rankings', { scroll: false })
    window.setTimeout(() => {
      void loadRank({ silent: false })
      setImportRankHidden(false)
      if (
        initialImportLevelRef.current != null &&
        finalLv != null &&
        finalLv > initialImportLevelRef.current
      ) {
        setShowLevelUpBurst(true)
        window.setTimeout(() => setShowLevelUpBurst(false), 2200)
      }
    }, 1500)
  }, [jobIdParam, jobProgress, loadRank, router])

  useEffect(() => {
    if (!jobIdParam) return
    if (levelRank && initialImportLevelRef.current === null) {
      initialImportLevelRef.current = levelRank.level
    }
  }, [jobIdParam, levelRank])

  useEffect(() => {
    if (!justImported) return
    if (!importProcessing) return
    const id = window.setInterval(() => void loadRank({ silent: true }), 5000)
    return () => window.clearInterval(id)
  }, [justImported, importProcessing, loadRank])

  useEffect(() => {
    const waitingForTier = !rank && apiImported && !apiTier && !rankFetchError
    if (!waitingForTier) {
      setImportStuck(false)
      return
    }
    setImportStuck(false)
    const timeoutId = window.setTimeout(() => setImportStuck(true), 45000)
    return () => window.clearTimeout(timeoutId)
  }, [rank, apiImported, apiTier, rankFetchError])

  /** Tier pending after import: poll /api/user/rank (max 10 tries, 3s apart). */
  useEffect(() => {
    if (rank) return
    if (!apiImported || apiTier) return
    if (rankFetchError) return
    let tries = 0
    const id = window.setInterval(() => {
      tries += 1
      void loadRank({ silent: true })
      if (tries >= 10) window.clearInterval(id)
    }, 3000)
    return () => window.clearInterval(id)
  }, [rank, apiImported, apiTier, rankFetchError, loadRank])

  const username =
    legacyUsername ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    'manager'

  const hideRankForPhasedImport = importRankHidden

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
        {justImported && !importBannerDismissed ? (
          <div
            className={`mb-6 flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              rankFetchError
                ? 'border-amber-500/35 bg-amber-500/10'
                : importProcessing
                  ? 'border-cyan-500/35 bg-cyan-500/10'
                  : rank
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-white/15 bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start gap-3">
              {importProcessing && !rankFetchError ? (
                <div className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
              ) : null}
              <p
                className={`text-sm font-semibold ${
                  rankFetchError
                    ? 'text-amber-100'
                    : importProcessing
                      ? 'text-cyan-100'
                      : rank
                        ? 'text-emerald-100'
                        : 'text-white/70'
                }`}
              >
                {rankFetchError
                  ? 'Could not load your rank (server error). Try refreshing the page or try again in a moment.'
                  : importProcessing
                    ? 'Import in progress — syncing Sleeper history and calculating your rank…'
                    : rank
                      ? 'Import complete! Your rank has been calculated.'
                      : 'Import finished — rank data is still updating. This page refreshes automatically.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setImportBannerDismissed(true)
                router.replace('/dashboard/rankings', { scroll: false })
              }}
              className={`shrink-0 text-xs font-semibold underline-offset-2 hover:underline ${
                rankFetchError
                  ? 'text-amber-200/80 hover:text-amber-50'
                  : importProcessing
                    ? 'text-cyan-200/80 hover:text-cyan-50'
                    : rank
                      ? 'text-emerald-200/80 hover:text-emerald-50'
                      : 'text-white/40 hover:text-white/70'
              }`}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {importPhasedSuccess && !importPhasedBannerDismissed ? (
          <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-emerald-100">
              Import complete! {importPhasedSuccess.totalLeagues} leagues across {importPhasedSuccess.totalSeasons}{' '}
              seasons
              {importPhasedSuccess.finalLevel != null ? (
                <span className="text-emerald-200/90"> — Level {importPhasedSuccess.finalLevel}</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setImportPhasedBannerDismissed(true)}
              className="shrink-0 text-xs font-semibold text-emerald-200/80 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {showLevelUpBurst ? (
          <div
            className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center"
            aria-live="polite"
          >
            <div className="animate-bounce rounded-2xl border border-amber-400/40 bg-amber-500/20 px-6 py-3 text-lg font-black text-amber-100 shadow-lg shadow-amber-500/20">
              Level up!
            </div>
          </div>
        ) : null}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="group mb-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/35 transition-colors hover:text-cyan-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">My Rankings</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
            Your AllFantasy rank, AI grade, import flow, and league access rules in one place.
          </p>
        </div>

        {jobIdParam && jobProgress?.status !== 'complete' ? (
          <ImportProgressPanel
            job={jobProgress}
            loading={jobProgress == null && !jobProgressError}
            error={jobProgressError}
          />
        ) : null}

        {hideRankForPhasedImport ? null : showImport ? (
          <EmptyRankState
            onImported={() => {
              setShowImport(false)
              void loadRank()
            }}
          />
        ) : rank ? (
          <FullRankView
            rank={rank}
            levelRank={levelRank}
            username={username}
            overviewProfile={overviewProfile}
            onReimport={() => setShowImport(true)}
            onRecalculate={handleRecalculate}
            recalculateLoading={recalculateLoading}
          />
        ) : !rank && importProcessing && justImported && !rankFetchError ? (
          <ProcessingImportState />
        ) : apiImported && !apiTier && !rankFetchError ? (
          importStuck ? (
            <RankImportTimeoutState />
          ) : (
            <CalculatingRankState
              onRetry={() => {
                setImportStuck(false)
                void loadRank({ silent: true })
              }}
            />
          )
        ) : !apiImported ? (
          <EmptyRankState
            onImported={() => {
              setShowImport(false)
              void loadRank()
            }}
          />
        ) : (
          <EmptyRankState
            onImported={() => {
              setShowImport(false)
              void loadRank()
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function MyRankingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#07071a] to-[#0d0d1f]">
          <div className="mx-auto flex min-h-[420px] max-w-7xl items-center justify-center px-4 py-10">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/40 border-t-violet-500" />
              <p className="text-sm text-white/40">Loading…</p>
            </div>
          </div>
        </div>
      }
    >
      <MyRankingsPageInner />
    </Suspense>
  )
}
