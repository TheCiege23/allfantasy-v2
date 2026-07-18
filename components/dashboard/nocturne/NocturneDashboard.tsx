'use client'

/**
 * Nocturne dashboard — Phase 1 (Global context), preview route `/dashboard/nocturne`.
 *
 * Reskins the logged-in dashboard to the Nocturne design, wired to the EXISTING
 * live-data systems (no new backend except the cross-league player-search route):
 *  - rank        → initialUserRankPayload (SSR) / GET /api/user/rank
 *  - leagues     → initialLeagueList (SSR) / GET /api/league/list
 *  - tier/gates  → useAccessTier() (guest|free|paid) — REAL subscription state
 *  - tokens      → useTokenBalance()
 *  - plan chip   → useEntitlements()
 *  - theme mode  → useOptionalThemeMode()
 *  - language    → useOptionalLanguage()
 *  - priorities  → GET /api/dashboard/today-actions
 *  - player srch → GET /api/players/my-exposure (real, across the user's leagues)
 *  - upgrade/tokens → /upgrade, /pricing (real monetization surfaces)
 *
 * The live `/dashboard` is untouched; this route is the staging ground for the
 * eventual cut-over. Commissioner/Team contexts, the full chart galleries, and
 * chat are later phases — the context tabs switch, and those contexts show a
 * clearly-labeled "coming in the next phase" placeholder for now.
 *
 * Tier is driven by REAL state; a small "Preview as" override is included ONLY
 * because this is a design-review preview route (drop it at production cut-over).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutGrid, ShieldCheck, User, Plus, ChevronDown, ChevronRight, LifeBuoy, Sparkles,
  Rocket, AlertCircle, Trophy, ListChecks, ArrowLeftRight, Handshake, Filter, Lock,
  List as ListIcon, X, MousePointerClick, LineChart, History, Brain, Share2, Scale,
  Sun, Moon, Monitor, Search, Lightbulb, Info, Settings,
} from 'lucide-react'
import { useAccessTier } from '@/hooks/useAccessTier'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useOptionalLanguage } from '@/components/i18n/LanguageProviderClient'
import { useOptionalThemeMode } from '@/components/theme/ThemeProvider'
import type { CommissionerLeagueHealthSnapshot } from '@/lib/commissioner-hub/commissionerHubHealth'
import './nocturne-dashboard.css'

type RankPayload = Record<string, unknown>
type LeagueListPayload = { leagues?: unknown[]; sleeperUserId?: string | null } | undefined

type NocturneDashboardProps = {
  userId: string
  userName: string
  userImage?: string | null
  initialLeagueList?: LeagueListPayload
  initialUserRankPayload?: RankPayload
  initialCommissionerHealthSnapshots?: CommissionerLeagueHealthSnapshot[]
}

type PrimaryContext = 'global' | 'commissioner' | 'team'
type PreviewTier = 'visitor' | 'free' | 'premium'

const PLATFORM_COLORS: Record<string, string> = {
  sleeper: '#1f2a4d', espn: '#4a1414', yahoo: '#3a1d55', mfl: '#143a2e', fantrax: '#5a3a14',
}
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

function platformColor(platform: string): string {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? 'var(--color-accent-800)'
}

type DisplayLeague = { id: string; name: string; platform: string; initial: string; color: string; isCommissioner: boolean; status: string }

function mapLeagues(payload: LeagueListPayload): DisplayLeague[] {
  const rows = Array.isArray(payload?.leagues) ? payload!.leagues! : []
  return rows.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>
    const id = str(r.navigationLeagueId) ?? str(r.unifiedLeagueId) ?? str(r.id) ?? cryptoLikeId(r)
    const name = str(r.name) ?? 'League'
    const platform = (str(r.platform) ?? 'native').toLowerCase()
    return {
      id,
      name,
      platform,
      initial: (platform === 'native' ? name : platform).charAt(0).toUpperCase(),
      color: platformColor(platform),
      isCommissioner: r.isCommissioner === true || r.userRole === 'commissioner',
      status: str(r.status) ?? str(r.lifecycleState) ?? 'Active',
    }
  })
}
function cryptoLikeId(r: Record<string, unknown>): string {
  return str(r.platformLeagueId) ?? `lg-${str(r.name) ?? Math.abs(hashStr(JSON.stringify(r))).toString(36)}`
}
function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }

// ── Rank payload readers (defensive; empty user → nulls) ──────────────────────
function readRank(p: RankPayload | undefined) {
  const rank = (p?.rank ?? null) as Record<string, unknown> | null
  return {
    imported: p?.imported === true,
    level: num(p?.level),
    levelName: str(p?.levelName) ?? str(p?.tierName),
    tier: str(p?.tier),
    xpInto: num(p?.xpIntoLevel),
    xpFor: num(p?.xpForLevel),
    progressPct: num(p?.progressPct),
    nextLevelName: str(p?.nextLevelName),
    wins: num(p?.careerWins),
    losses: num(p?.careerLosses),
    titles: num(p?.careerChampionships),
    playoffs: num(p?.careerPlayoffAppearances),
    seasons: num(p?.careerSeasonsPlayed),
    grade: str(rank?.aiReportGrade),
    insight: str(rank?.aiInsight),
  }
}

// ── Tools (reference set → real AF Legacy destinations, tier-gated) ───────────
const TOOLS = [
  { key: 'waiver', label: 'Waiver Assistant', desc: 'Ranked pickups for every league.', Icon: MousePointerClick, href: '/af-legacy?tab=waiver', premiumOnly: false },
  { key: 'trade', label: 'Trade Analyzer', desc: 'Fairness scoring on any proposal.', Icon: ArrowLeftRight, href: '/af-legacy?tab=trade', premiumOnly: true },
  { key: 'outlook', label: 'Season Outlook', desc: 'Playoff & championship odds.', Icon: LineChart, href: '/af-legacy?tab=pulse', premiumOnly: true },
  { key: 'history', label: 'Trade History', desc: 'Every trade, by week.', Icon: History, href: '/af-legacy?tab=finder', premiumOnly: true },
  { key: 'psych', label: 'Manager Psychology', desc: 'Your play style, decoded.', Icon: Brain, href: '/af-legacy?tab=compare', premiumOnly: true },
  { key: 'social', label: 'Social Media Sharing', desc: 'Share your season highlights.', Icon: Share2, href: '/career-share', premiumOnly: false },
  { key: 'compare', label: 'Manager Compare', desc: 'You vs. league average.', Icon: Scale, href: '/af-legacy?tab=compare', premiumOnly: true },
] as const

const UPGRADE_HREF = '/upgrade'
const TOKENS_HREF = '/pricing'

export default function NocturneDashboard({
  userId, userName, userImage, initialLeagueList, initialUserRankPayload, initialCommissionerHealthSnapshots,
}: NocturneDashboardProps) {
  const access = useAccessTier()
  const { balance: tokenBalance } = useTokenBalance()
  const entitlements = useEntitlements()
  const lang = useOptionalLanguage()
  const theme = useOptionalThemeMode()

  // ── Client state ────────────────────────────────────────────────────────────
  const [context, setContext] = useState<PrimaryContext>('global')
  const [tierOverride, setTierOverride] = useState<PreviewTier | null>(null)
  const [dashLeagueFilter, setDashLeagueFilter] = useState('all')
  const [leagueSearch, setLeagueSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [playerQuery, setPlayerQuery] = useState('')
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([])
  const [activePlayer, setActivePlayer] = useState<PlayerResult | null>(null)
  const [today, setToday] = useState<TodayShape | null>(null)
  const [commLeagueId, setCommLeagueId] = useState<string | null>(null)
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({})

  const commHealth = useMemo(() => initialCommissionerHealthSnapshots ?? [], [initialCommissionerHealthSnapshots])
  const activeCommSnapshot = useMemo(
    () => commHealth.find((s) => s.leagueId === commLeagueId) ?? commHealth[0] ?? null,
    [commHealth, commLeagueId],
  )

  const leagues = useMemo(() => mapLeagues(initialLeagueList), [initialLeagueList])
  const rank = useMemo(() => readRank(initialUserRankPayload), [initialUserRankPayload])

  // Real tier → Visitor/Free/Premium; preview override wins on this review route.
  const realTier: PreviewTier = access.tier === 'paid' ? 'premium' : access.tier === 'free' ? 'free' : 'visitor'
  const tier: PreviewTier = tierOverride ?? realTier
  const isVisitor = tier === 'visitor'
  const isFree = tier === 'free'
  const isPremium = tier === 'premium'
  const showLock = isFree // free accounts see blur+lock; visitors get signup prompts

  const planChip = resolvePlanChip(entitlements)

  // ── Today's actions (priorities + need-attention count) ──────────────────────
  useEffect(() => {
    if (leagues.length === 0) { setToday(null); return }
    let cancelled = false
    void fetch('/api/dashboard/today-actions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setToday(parseToday(data)) })
      .catch(() => { if (!cancelled) setToday(null) })
    return () => { cancelled = true }
  }, [leagues.length])

  // ── Live player search (debounced) ───────────────────────────────────────────
  useEffect(() => {
    const q = playerQuery.trim()
    if (q.length < 2) { setPlayerResults([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      void fetch(`/api/players/my-exposure?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (!cancelled) setPlayerResults(Array.isArray(data?.players) ? data.players : []) })
        .catch(() => { if (!cancelled) setPlayerResults([]) })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [playerQuery])

  const urgentCount = today ? today.lineups + today.waivers + today.trades : 0

  // ── Filtered leagues (search + platform + top-bar league scope) ──────────────
  const platformOptions = useMemo(
    () => Array.from(new Set(leagues.map((l) => l.platform))).filter((p) => p !== 'native'),
    [leagues],
  )
  const filteredLeagues = useMemo(() => {
    const q = leagueSearch.trim().toLowerCase()
    return leagues.filter((l) => {
      if (dashLeagueFilter !== 'all' && l.id !== dashLeagueFilter) return false
      if (platformFilter !== 'all' && l.platform !== platformFilter) return false
      if (q && !l.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [leagues, leagueSearch, platformFilter, dashLeagueFilter])

  const dashFilterLeagueName = dashLeagueFilter === 'all' ? null : leagues.find((l) => l.id === dashLeagueFilter)?.name ?? null
  const commissionedCount = leagues.filter((l) => l.isCommissioner).length

  const heroTitle = `Welcome back, ${userName.split(' ')[0] || userName}`
  const heroSubtitle = context === 'global'
    ? 'Everything across your leagues, in one place.'
    : context === 'commissioner' ? 'Health and analytics for the leagues you run.' : 'Your matchup, league by league.'

  const modeIcon = theme?.mode === 'dark' ? Moon : theme?.mode === 'light' ? Sun : Monitor
  const ModeIcon = modeIcon

  const closeAll = useCallback(() => { setSettingsOpen(false); setImportOpen(false); setActivePlayer(null) }, [])

  return (
    <div className="nocturne-dash" style={{ minHeight: '100vh' }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-text) 7%, transparent)', background: 'var(--color-surface)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Image src="/brand/allfantasy-wordmark-transparent.png" alt="AllFantasy" width={1198} height={306} priority style={{ height: 24, width: 'auto' }} />
            <div style={{ display: 'flex', gap: 3, background: 'color-mix(in srgb, var(--color-bg) 55%, transparent)', border: '1px solid var(--color-neutral-800)', borderRadius: 'var(--radius-md)', padding: 3 }}>
              {([['global', 'Global', LayoutGrid], ['commissioner', 'Commissioner', ShieldCheck], ['team', 'Team', User]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" className={`aftab${context === id ? ' is-active' : ''}`} onClick={() => setContext(id)}>
                  <Icon size={15} />{label}
                </button>
              ))}
            </div>
            {leagues.length > 0 && (
              <select className="input" value={dashLeagueFilter} onChange={(e) => setDashLeagueFilter(e.target.value)} style={{ width: 'auto', minHeight: 34, padding: '0 8px', fontSize: 12.5 }}>
                <option value="all">All leagues</option>
                {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Preview-as override (design-review only) */}
            <div className="seg" title="Preview tier (design review)">
              {(['visitor', 'free', 'premium'] as const).map((t, i) => (
                <button key={t} type="button" onClick={() => setTierOverride(t === realTier ? null : t)}
                  style={{ border: 'none', borderLeft: i ? '1px solid var(--color-divider)' : 'none', padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: tier === t ? 'var(--color-accent)' : 'none', color: tier === t ? '#fff' : 'var(--color-neutral-500)' }}>
                  {t}
                </button>
              ))}
            </div>
            {lang && (
              <select className="input" value={lang.language} onChange={(e) => lang.setLanguage(e.target.value as never)} style={{ width: 'auto', minHeight: 30, padding: '0 8px', fontSize: 12 }} aria-label="Language">
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            )}
            {theme && (
              <button type="button" onClick={() => theme.cycleMode()} title={`Theme: ${theme.mode}`} aria-label="Toggle theme" style={{ background: 'none', border: '1px solid var(--color-neutral-800)', borderRadius: 'var(--radius-md)', width: 30, height: 30, display: 'grid', placeItems: 'center', color: 'var(--color-neutral-400)', cursor: 'pointer' }}>
                <ModeIcon size={15} />
              </button>
            )}
            <a href="/support" style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', display: 'flex', alignItems: 'center', gap: 5 }}><LifeBuoy size={15} />Contact support</a>
            {isVisitor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/login?callbackUrl=/dashboard/nocturne" className="btn btn-secondary" style={{ fontSize: 12.5 }}>Sign in</Link>
                <Link href="/signup?next=/dashboard/nocturne" className="btn btn-primary" style={{ fontSize: 12.5 }}>Sign up free</Link>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => setImportOpen(true)} className="btn btn-secondary" style={{ fontSize: 12.5 }}><Plus size={14} />Import league</button>
                <button type="button" onClick={() => setSettingsOpen((s) => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6 }}>
                  <Avatar name={userName} image={userImage} size={28} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{userName.split(' ')[0]}</span>
                  <ChevronDown size={12} style={{ color: 'var(--color-neutral-500)' }} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ═══ CTA BANNERS ═══ */}
        {isVisitor && (
          <Banner icon={<Sparkles size={22} style={{ color: 'var(--color-accent-400)' }} />} accent
            title="You're browsing as a visitor"
            body="Create a free account to save your leagues, track rankings, and unlock more.">
            <Link href="/login?callbackUrl=/dashboard/nocturne" className="btn btn-secondary">Sign in</Link>
            <Link href="/signup?next=/dashboard/nocturne" className="btn btn-primary">Sign up for free</Link>
          </Banner>
        )}
        {isFree && (
          <Banner icon={<Rocket size={22} style={{ color: 'var(--color-accent-400)' }} />}
            title="You're on the free plan"
            body="Upgrade to unlock live scores, projected edge, and the full analytics suite — or unlock features à la carte with tokens.">
            <Link href={TOKENS_HREF} className="btn btn-secondary">Buy tokens</Link>
            <Link href={UPGRADE_HREF} className="btn btn-primary">Upgrade</Link>
          </Banner>
        )}

        {/* ═══ HERO ═══ */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 6px' }}>{heroTitle}</h1>
          <p style={{ fontSize: 14, color: 'var(--color-neutral-500)', margin: '0 0 16px' }}>{heroSubtitle}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatChip icon={<AlertCircle size={18} style={{ color: 'var(--color-accent-400)' }} />} value={String(urgentCount)} label="Need attention" />
            <StatChip icon={<LayoutGrid size={18} style={{ color: 'var(--color-accent-400)' }} />} value={String(leagues.length)} label="Leagues" />
            <Link href="/af-rankings" className="afcard" style={{ padding: '12px 18px', flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 10, color: 'inherit' }}>
              <Trophy size={18} style={{ color: 'var(--color-accent-400)' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{rank.level && rank.levelName ? `Lv.${rank.level} · ${rank.levelName}` : 'Unranked'}</div>
                <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>AF Rank →</div>
              </div>
            </Link>
          </div>
        </div>

        {/* ═══ PLAYER SEARCH (global) ═══ */}
        {context === 'global' && !isVisitor && (
          <div style={{ position: 'relative' }}>
            <div className="dash-kicker" style={{ marginBottom: 12 }}>Player search</div>
            <div style={{ position: 'relative', maxWidth: 360 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-neutral-600)' }} />
              <input className="input" style={{ width: '100%', minHeight: 40, padding: '0 14px 0 34px', fontSize: 13 }} value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} placeholder="Search a player across all your leagues..." />
            </div>
            {playerResults.length > 0 && (
              <div className="afcard" style={{ maxWidth: 520, marginTop: 8, padding: 6, position: 'relative', zIndex: 2 }}>
                {playerResults.map((pl) => (
                  <button key={pl.playerId} type="button" onClick={() => setActivePlayer(pl)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-accent-900)', display: 'grid', placeItems: 'center', font: '700 11px ui-monospace,Menlo,monospace', color: 'var(--color-accent-400)', flex: 'none' }}>{pl.position ?? '—'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{pl.name ?? 'Unknown player'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{pl.team ?? '—'} · in {pl.leagueCount} of your leagues</div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--color-neutral-600)' }} />
                  </button>
                ))}
              </div>
            )}
            {playerQuery.trim().length >= 2 && playerResults.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 8 }}>No matching player found on your rosters.</p>
            )}
          </div>
        )}

        {/* ═══ TODAY'S PRIORITIES ═══ */}
        {context === 'global' && (
          <div>
            <div className="dash-kicker" style={{ marginBottom: 12 }}>Today's priorities</div>
            {today && urgentCount > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                {today.lineups > 0 && <Priority icon={<ListChecks size={17} style={{ color: 'var(--color-accent-400)' }} />} title={`${today.lineups} lineup${today.lineups > 1 ? 's' : ''} to set`} sub="Across your leagues" />}
                {today.waivers > 0 && <Priority icon={<ArrowLeftRight size={17} style={{ color: 'var(--color-accent-400)' }} />} title={`${today.waivers} waiver target${today.waivers > 1 ? 's' : ''}`} sub="Runs coming up" />}
                {today.trades > 0 && <Priority icon={<Handshake size={17} style={{ color: 'var(--color-accent-400)' }} />} title={`${today.trades} trade${today.trades > 1 ? 's' : ''} pending`} sub="Waiting on you" />}
              </div>
            ) : (
              <div className="afcard" style={{ fontSize: 13, color: 'var(--color-neutral-400)' }}>
                {leagues.length === 0 ? 'Import a league to see your priorities here.' : "You're all set — nothing needs attention right now."}
              </div>
            )}
          </div>
        )}

        {dashFilterLeagueName && (
          <div className="afcard" style={{ display: 'flex', alignItems: 'center', gap: 10, borderColor: 'var(--color-accent-700)' }}>
            <Filter size={18} style={{ color: 'var(--color-accent-400)' }} />
            <span style={{ fontSize: 13 }}>Showing this dashboard scoped to <strong>{dashFilterLeagueName}</strong> only.</span>
          </div>
        )}

        {/* ═══ CONTEXT: GLOBAL — MY LEAGUES ═══ */}
        {context === 'global' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <span className="dash-kicker">My leagues ({filteredLeagues.length})</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="input" style={{ minHeight: 32, padding: '0 10px', fontSize: 12.5, width: 160 }} value={leagueSearch} onChange={(e) => setLeagueSearch(e.target.value)} placeholder="Search leagues..." />
                <select className="input" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={{ width: 'auto', minHeight: 32, padding: '0 8px', fontSize: 12.5 }}>
                  <option value="all">All platforms</option>
                  {platformOptions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 2, background: 'color-mix(in srgb, var(--color-bg) 55%, transparent)', border: '1px solid var(--color-neutral-800)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                  <button type="button" onClick={() => setView('cards')} aria-label="Cards view" style={{ border: 'none', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', background: view === 'cards' ? 'var(--color-accent)' : 'none', color: view === 'cards' ? '#fff' : 'var(--color-neutral-500)' }}><LayoutGrid size={14} /></button>
                  <button type="button" onClick={() => setView('list')} aria-label="List view" style={{ border: 'none', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', background: view === 'list' ? 'var(--color-accent)' : 'none', color: view === 'list' ? '#fff' : 'var(--color-neutral-500)' }}><ListIcon size={14} /></button>
                </div>
              </div>
            </div>
            {filteredLeagues.length === 0 ? (
              <div className="afcard" style={{ fontSize: 13, color: 'var(--color-neutral-500)' }}>
                {leagues.length === 0 ? 'No leagues yet — import one to get started.' : 'No leagues match your filters.'}
              </div>
            ) : view === 'cards' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                {filteredLeagues.map((lg) => (
                  <div key={lg.id} className="afcard">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span className="afsrc" style={{ background: lg.color }}>{lg.initial}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lg.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', textTransform: 'capitalize' }}>{lg.platform}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {lg.isCommissioner ? <span className="tag tag-accent">Commissioner</span> : <span className="tag tag-neutral">Manager</span>}
                      <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--color-accent-400)' }}>Open →</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="afcard" style={{ padding: 6 }}>
                {filteredLeagues.map((lg) => (
                  <div key={lg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-md)' }}>
                    <span className="afsrc" style={{ width: 24, height: 24, fontSize: 10, background: lg.color }}>{lg.initial}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }}>{lg.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', width: 70, textTransform: 'capitalize' }}>{lg.platform}</span>
                    {lg.isCommissioner ? <span className="tag tag-accent">Comm</span> : <span className="tag tag-neutral">Mgr</span>}
                  </div>
                ))}
              </div>
            )}
            {commissionedCount > 0 && (
              <div className="afcard" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderColor: 'var(--color-accent-800)', background: 'linear-gradient(180deg,color-mix(in srgb, var(--color-accent-800) 20%, transparent),var(--color-surface))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldCheck size={22} style={{ color: 'var(--color-accent-400)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>You commission {commissionedCount} league{commissionedCount > 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)' }}>Open Commissioner HQ for health, analytics, and recommendations.</div>
                  </div>
                </div>
                <button type="button" onClick={() => setContext('commissioner')} className="btn btn-primary">Open Commissioner HQ</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ CONTEXT: COMMISSIONER HQ (live commissioner-health engine) ═══ */}
        {context === 'commissioner' && (
          activeCommSnapshot ? (
            <CommissionerHQ
              snapshots={commHealth}
              active={activeCommSnapshot}
              onSelect={setCommLeagueId}
              platformLabel={commPlatformLabel(activeCommSnapshot, leagues)}
              showLock={showLock}
              checked={checkedActions}
              onToggle={(k) => setCheckedActions((s) => ({ ...s, [k]: !s[k] }))}
              tokensHref={TOKENS_HREF}
              upgradeHref={UPGRADE_HREF}
            />
          ) : (
            <div className="afcard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '40px 24px' }}>
              <ShieldCheck size={30} style={{ color: 'var(--color-accent-400)' }} />
              <div style={{ fontWeight: 600, fontSize: 16 }}>No commissioned leagues yet</div>
              <p style={{ fontSize: 13, color: 'var(--color-neutral-500)', maxWidth: '44ch' }}>Commissioner HQ shows health, analytics, and recommendations for leagues you run. Import or create a league you commission to see it here.</p>
            </div>
          )
        )}

        {/* ═══ CONTEXT: TEAM — deferred to a later phase ═══ */}
        {context === 'team' && (
          <div className="afcard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '40px 24px' }}>
            <User size={30} style={{ color: 'var(--color-accent-400)' }} />
            <div style={{ fontWeight: 600, fontSize: 16 }}>Team view — coming next</div>
            <p style={{ fontSize: 13, color: 'var(--color-neutral-500)', maxWidth: '46ch' }}>The per-league matchup card and quick-glance alerts land in the next phase — your live matchup data is already wired on the current dashboard.</p>
            <Link href="/dashboard" className="btn btn-secondary" style={{ fontSize: 12.5 }}>Open the current dashboard</Link>
          </div>
        )}

        {/* ═══ RANKINGS & LEGACY (global) ═══ */}
        {context === 'global' && !isVisitor && (
          <div>
            <div className="dash-kicker" style={{ marginBottom: 12 }}>Rankings &amp; legacy</div>
            {rank.imported ? (
              <div className="afcard" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 24, alignItems: 'center' }}>
                <div>
                  {rank.tier && <div style={{ fontSize: 12, color: 'var(--color-accent-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{rank.tier} Tier</div>}
                  <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 2 }}>Level {rank.level ?? '—'} · {rank.levelName ?? 'Manager'}</div>
                  {rank.xpInto != null && rank.xpFor != null && (
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', marginBottom: 10 }}>{rank.xpInto.toLocaleString()} / {rank.xpFor.toLocaleString()} XP{rank.nextLevelName ? ` to ${rank.nextLevelName}` : ''}</div>
                  )}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-neutral-800)', overflow: 'hidden', maxWidth: 340 }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, rank.progressPct ?? 0))}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 16, maxWidth: 440 }}>
                    <Career value={rank.wins != null && rank.losses != null ? `${rank.wins}-${rank.losses}` : '—'} label="Record" />
                    <Career value={rank.titles} label="Titles" />
                    <Career value={rank.playoffs} label="Playoffs" />
                    <Career value={rank.seasons} label="Seasons" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div className="afring" style={{ width: 92, height: 92, background: `conic-gradient(var(--color-accent) ${gradePct(rank.grade)}%, var(--color-neutral-800) ${gradePct(rank.grade)}% 100%)` }}>
                    <div className="afringval"><span style={{ fontSize: 24, fontWeight: 700 }}>{rank.grade ?? '—'}</span><span style={{ fontSize: 9, color: 'var(--color-neutral-600)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Chimmy Grade</span></div>
                  </div>
                  {rank.insight && (
                    <div style={{ position: 'relative', maxWidth: 170 }}>
                      <p style={{ fontSize: 11.5, color: 'var(--color-neutral-500)', textAlign: 'center', margin: 0, filter: showLock ? 'blur(4px)' : 'none' }}>{rank.insight}</p>
                      {showLock && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10.5, color: 'var(--color-neutral-500)', background: 'var(--color-surface)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={12} style={{ color: 'var(--color-accent-400)' }} />Premium</span>
                          <Link href={TOKENS_HREF} style={{ fontSize: 10, color: 'var(--color-accent-400)' }}>Buy tokens instead</Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="afcard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '28px 20px' }}>
                <Trophy size={26} style={{ color: 'var(--color-accent-400)' }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>Import a league to build your AF Rank</div>
                <button type="button" onClick={() => setImportOpen(true)} className="btn btn-primary">Import a league</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ TOOLS ═══ */}
        {context === 'global' && !isVisitor && (
          <div>
            <div className="dash-kicker" style={{ marginBottom: 12 }}>Tools</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              {TOOLS.map((tool) => {
                const locked = tool.premiumOnly && !isPremium
                const Inner = (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <tool.Icon size={20} style={{ color: 'var(--color-accent-400)' }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, margin: '10px 0 4px' }}>{tool.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{tool.desc}</div>
                  </>
                )
                if (locked) {
                  return (
                    <div key={tool.key} className="afcard" style={{ position: 'relative', overflow: 'hidden' }}>
                      <div style={{ filter: 'blur(3px)' }}>{Inner}</div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)' }}>
                        <Lock size={15} style={{ color: 'var(--color-accent-400)' }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-neutral-200)' }}>Premium</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={TOKENS_HREF} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 10.5 }}>Buy tokens</Link>
                          <Link href={UPGRADE_HREF} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 10.5 }}>Upgrade</Link>
                        </div>
                      </div>
                    </div>
                  )
                }
                return <Link key={tool.key} href={tool.href} className="afcard" style={{ cursor: 'pointer', display: 'block', color: 'inherit' }}>{Inner}</Link>
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SETTINGS POPUP ═══ */}
      {settingsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 35, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '70px 20px 20px' }} onClick={() => setSettingsOpen(false)}>
          <div className="afcard" style={{ width: 300 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Avatar name={userName} image={userImage} size={44} />
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{userName}</div><div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>{planChip} plan</div></div>
            </div>
            <div style={{ height: 1, background: 'var(--color-neutral-800)', marginBottom: 14 }} />
            <Row label="Subscription" value={planChip} />
            <Row label="Tokens remaining" value={tokenBalance != null ? tokenBalance.toLocaleString() : '—'} accent />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Link href="/settings?tab=billing" className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}>Manage plan</Link>
              <Link href={TOKENS_HREF} className="btn btn-secondary" style={{ flex: 1, fontSize: 12 }}>Buy tokens</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 }}>
              <Link href="/profile" style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', padding: '6px 0' }}>Profile</Link>
              <Link href="/settings" style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', padding: '6px 0' }}>Settings</Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT POPUP ═══ */}
      {importOpen && (
        <div className="nocturne-dash-modal" onClick={() => setImportOpen(false)}>
          <div className="afcard" style={{ width: '100%', maxWidth: 420, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setImportOpen(false)} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer' }}><X size={16} /></button>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Import a league</h2>
            <p style={{ fontSize: 12.5, color: 'var(--color-neutral-500)', margin: '0 0 14px' }}>Add another league right from your dashboard.</p>
            <p style={{ fontSize: 12.5, color: 'var(--color-neutral-400)', margin: '0 0 14px' }}>
              Sleeper imports instantly by username; ESPN, Yahoo, MFL and Fantrax take one quick connect step.
            </p>
            <Link href="/import?returnTo=/dashboard/nocturne" className="btn btn-primary btn-block" style={{ width: '100%' }}>Go to import →</Link>
          </div>
        </div>
      )}

      {/* ═══ PLAYER MODAL ═══ */}
      {activePlayer && (
        <div className="nocturne-dash-modal" onClick={() => setActivePlayer(null)}>
          <div className="afcard" style={{ width: '100%', maxWidth: 460, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setActivePlayer(null)} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer' }}><X size={16} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent-900)', display: 'grid', placeItems: 'center', font: '700 12px ui-monospace,Menlo,monospace', color: 'var(--color-accent-400)' }}>{activePlayer.position ?? '—'}</div>
              <div><div style={{ fontWeight: 600, fontSize: 16 }}>{activePlayer.name ?? 'Unknown player'}</div><div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{activePlayer.team ?? '—'}</div></div>
            </div>
            <div className="dash-kicker" style={{ marginBottom: 8 }}>Your exposure</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, textAlign: 'center' }}>
              <Career value={activePlayer.leagueCount} label="Leagues" />
              <Career value={activePlayer.startingCount} label="Starting" />
              <Career value={activePlayer.benchCount} label="Bench" />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', margin: '14px 0 0', textAlign: 'center' }}>
              On {activePlayer.leagueCount} of your leagues ({Math.round(activePlayer.exposurePercent * 100)}% exposure).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
type PlayerResult = {
  playerId: string; name: string | null; position: string | null; team: string | null
  leagueCount: number; startingCount: number; benchCount: number; irTaxiCount: number; exposurePercent: number
}
type TodayShape = { lineups: number; waivers: number; trades: number }

// ── Parsers / helpers ─────────────────────────────────────────────────────────
function parseToday(data: unknown): TodayShape | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const counts = (d.counts ?? {}) as Record<string, unknown>
  const waivers = (d.waivers ?? {}) as Record<string, unknown>
  const trades = (d.trades ?? {}) as Record<string, unknown>
  const lineupCount = num(counts.lineupsToSet) ?? num(counts.unsetLineups) ?? num(counts.lineups) ?? 0
  const waiverCount = Array.isArray(waivers.recommendations) ? waivers.recommendations.length : num(waivers.totalLeagues) ?? 0
  const tradeCount = num(trades.totalPending) ?? 0
  return { lineups: lineupCount, waivers: waiverCount, trades: tradeCount }
}

function resolvePlanChip(e: ReturnType<typeof useEntitlements>): string {
  if (e.hasSupreme) return 'AF Supreme'
  if (e.hasWarRoom) return 'AF Legacy'
  if (e.hasCommissioner) return 'AF Commissioner'
  if (e.hasPro) return 'AF Pro'
  return 'Free'
}

function gradePct(grade: string | null): number {
  if (!grade) return 0
  const map: Record<string, number> = { 'A+': 98, A: 94, 'A-': 90, 'B+': 86, B: 82, 'B-': 78, 'C+': 72, C: 66, 'C-': 60, 'D+': 54, D: 48, F: 35 }
  return map[grade] ?? 70
}

// ── Small presentational components ───────────────────────────────────────────
function Avatar({ name, image, size }: { name: string; image?: string | null; size: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'AF'
  // Plain <img>, not next/image: the avatar URL may be an external provider
  // (Discord/Google) not in the images allowlist, and it needs no optimization.
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--color-accent-800)', display: 'grid', placeItems: 'center', font: `700 ${Math.round(size * 0.4)}px ui-monospace,Menlo,monospace`, color: 'var(--color-accent-100)' }}>{initials}</div>
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="afcard" style={{ padding: '12px 18px', flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon}
      <div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{value}</div><div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{label}</div></div>
    </div>
  )
}

function Priority({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="afcard" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-900)', display: 'grid', placeItems: 'center' }}>{icon}</div>
      <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div><div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>{sub}</div></div>
    </div>
  )
}

function Banner({ icon, title, body, accent, children }: { icon: React.ReactNode; title: string; body: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: accent ? 'linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 22%, transparent),var(--color-surface))' : 'linear-gradient(135deg,color-mix(in srgb, var(--color-accent) 14%, transparent),var(--color-surface))', border: `1px solid ${accent ? 'var(--color-accent-700)' : 'var(--color-neutral-800)'}`, borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon}
        <div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div><div style={{ fontSize: 12.5, color: 'var(--color-neutral-400)' }}>{body}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{children}</div>
    </div>
  )
}

function Career({ value, label }: { value: number | string | null; label: string }) {
  return <div><div style={{ fontSize: 15, fontWeight: 700 }}>{value == null ? '—' : value}</div><div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)' }}>{label}</div></div>
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: accent ? 'var(--color-accent-400)' : 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

// Best-effort platform name for the read-only "do this on {platform}" copy.
function commPlatformLabel(snap: CommissionerLeagueHealthSnapshot, leagues: DisplayLeague[]): string {
  const match = leagues.find((l) => l.name === snap.leagueName)
  if (match && match.platform !== 'native') return match.platform.charAt(0).toUpperCase() + match.platform.slice(1)
  return 'your platform'
}

const dividerLine = <div style={{ height: 1, background: 'var(--color-neutral-800)' }} />

function CommissionerHQ({
  snapshots, active, onSelect, platformLabel, showLock, checked, onToggle, tokensHref, upgradeHref,
}: {
  snapshots: CommissionerLeagueHealthSnapshot[]
  active: CommissionerLeagueHealthSnapshot
  onSelect: (id: string) => void
  platformLabel: string
  showLock: boolean
  checked: Record<string, boolean>
  onToggle: (key: string) => void
  tokensHref: string
  upgradeHref: string
}) {
  const m = active.metrics
  const lineupPct = Math.round(m.lineupSubmissionRate <= 1 ? m.lineupSubmissionRate * 100 : m.lineupSubmissionRate)
  const health = Math.max(0, Math.min(100, Math.round(active.healthScore)))
  return (
    <div>
      <div className="dash-kicker" style={{ marginBottom: 12 }}>Your commissioned leagues</div>
      {snapshots.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {snapshots.map((s) => {
            const sel = s.leagueId === active.leagueId
            return (
              <button key={s.leagueId} type="button" onClick={() => onSelect(s.leagueId)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: `1px solid ${sel ? 'var(--color-accent)' : 'var(--color-neutral-800)'}`, background: sel ? 'color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13.5, fontWeight: 500 }}>
                {s.leagueName}
              </button>
            )
          })}
        </div>
      )}

      <div className="afcard" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Health ring + sub-scores */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div className="afring" style={{ width: 84, height: 84, background: `conic-gradient(var(--color-accent) ${health}%, var(--color-neutral-800) ${health}% 100%)` }}>
              <div className="afringval"><span style={{ fontSize: 22, fontWeight: 700 }}>{health}</span><span style={{ fontSize: 9.5, color: 'var(--color-neutral-600)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Health</span></div>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{active.leagueName}</div>
              <span className="tag tag-accent" style={{ marginTop: 6, textTransform: 'capitalize' }}>{active.overallStatus ?? 'Healthy'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, textAlign: 'center' }}>
            <SubScore value={active.fairnessScore} label="Fairness" />
            <SubScore value={active.engagementScore} label="Engagement" />
            <SubScore value={active.sustainabilityScore} label="Sustain." />
          </div>
        </div>

        {dividerLine}

        {/* Activity metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
          <Metric value={m.tradeActivity} label="Trades (7d)" />
          <Metric value={m.waiverActivity} label="Waiver claims (7d)" />
          <Metric value={m.chatMessagesLast7Days} label="Chat msgs (7d)" />
          <Metric value={m.inactiveTeams} label={`Inactive team${m.inactiveTeams === 1 ? '' : 's'}`} />
          <Metric value={`${lineupPct}%`} label="Lineups set" />
        </div>

        {active.recommendations.length > 0 && (
          <>
            {dividerLine}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Recommendations</div>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, filter: showLock ? 'blur(4px)' : 'none' }}>
                  {active.recommendations.slice(0, 4).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--color-neutral-300)' }}>
                      <Lightbulb size={16} style={{ color: 'var(--color-accent-400)', flex: 'none', marginTop: 1 }} />{rec}
                    </div>
                  ))}
                </div>
                {showLock && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', background: 'linear-gradient(90deg,transparent,var(--color-surface) 25%)' }}>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link href={tokensHref} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}>Buy tokens</Link>
                      <Link href={upgradeHref} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 11 }}><Lock size={12} /> Unlock</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {active.actions.length > 0 && (
          <>
            {dividerLine}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Info size={13} style={{ color: 'var(--color-neutral-600)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Recommended for you to do on {platformLabel}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-neutral-600)', margin: '0 0 12px' }}>
                AllFantasy reads {platformLabel} data but can't make changes there — here's what's worth doing; check it off once it's handled.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.actions.slice(0, 5).map((a) => {
                  const isChecked = !!checked[a.key]
                  return (
                    <label key={a.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-800)', cursor: 'pointer', opacity: isChecked ? 0.6 : 1 }}>
                      <input type="checkbox" checked={isChecked} onChange={() => onToggle(a.key)} style={{ accentColor: 'var(--color-accent)', width: 16, height: 16, flex: 'none', marginTop: 2 }} />
                      <span>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{a.label}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{a.description}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <Link href="/commissioner-hub" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12.5, color: 'var(--color-neutral-500)' }}>
                <Settings size={13} />AllFantasy settings for this league
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SubScore({ value, label }: { value: number; label: string }) {
  return <div><div style={{ fontSize: 16, fontWeight: 700 }}>{Math.round(value)}</div><div style={{ fontSize: 10.5, color: 'var(--color-neutral-600)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div></div>
}
function Metric({ value, label }: { value: number | string; label: string }) {
  return <div><div style={{ fontSize: 19, fontWeight: 700 }}>{value}</div><div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{label}</div></div>
}
