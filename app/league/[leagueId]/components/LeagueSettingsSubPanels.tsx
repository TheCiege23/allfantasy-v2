'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { League, LeagueInvite, LeagueTeam } from '@prisma/client'
import type { UserLeague } from '@/app/dashboard/types'
import { DiscordLeagueSyncPanel } from './DiscordLeagueSyncPanel'
import {
  detectScoringFlavor,
  getDraftIdFromSettings,
  getScoringSettings,
  getSleeperLikeBundle,
  getSettingsRecord,
  initialsFromName,
  leagueAvatarSrc,
  sleeperAvatarUrl,
  waiverTypeLabel,
} from './league-settings-modal-utils'

/** Matches `LeagueShellLeague` without importing `LeagueShell` (avoid circular imports). */
export type LeagueSettingsModalLeague = League & {
  teams: LeagueTeam[]
  invites: LeagueInvite[]
}

export type SleeperMemberMap = Record<string, { display_name: string; avatar: string | null }>

export type SubPanelContext = {
  league: LeagueSettingsModalLeague
  displayLeague: UserLeague
  userId: string
  userTeam: LeagueTeam | null
  sleeperLeagueId: string | null
  platformLeagueId: string
  isCommissioner: boolean
  sleeperMemberMap: SleeperMemberMap
  onGoToDraftTab: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2.5 last:border-0">
      <span className="text-[12px] text-white/45">{label}</span>
      <span className="max-w-[60%] text-right text-[12px] font-medium text-white/90">{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">{children}</p>
}

function SleeperLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex text-[13px] font-semibold text-cyan-400/95 underline-offset-2 hover:text-cyan-300"
    >
      {children}
    </a>
  )
}

export function SettingsSubPanelBody({
  panelId,
  ctx,
}: {
  panelId: string
  ctx: SubPanelContext
}) {
  const bundle = useMemo(() => getSleeperLikeBundle(ctx.league.settings), [ctx.league.settings])
  const settings = useMemo(() => getSettingsRecord(ctx.league.settings), [ctx.league.settings])
  const scoring = useMemo(() => getScoringSettings(ctx.league.settings), [ctx.league.settings])
  const flavor = detectScoringFlavor(scoring)
  const waiverRaw = bundle.waiver_type ?? settings.waiver_type
  const rosterPositions = (bundle.roster_positions as string[] | undefined) ?? []
  const numTeams = typeof bundle.total_rosters === 'number' ? bundle.total_rosters : ctx.displayLeague.teamCount
  const sport = String(bundle.sport ?? ctx.displayLeague.sport ?? '—')
  const season = bundle.season != null ? String(bundle.season) : String(ctx.displayLeague.season ?? '—')
  const playoffTeams = bundle.playoff_teams ?? settings.playoff_teams
  const playoffStart = bundle.playoff_week_start ?? settings.playoff_week_start
  const tradeDl = bundle.trade_deadline ?? settings.trade_deadline
  const waiverBudget = bundle.waiver_budget ?? settings.waiver_budget
  const reserveSlots = bundle.reserve_slots ?? settings.reserve_slots
  const taxiSlots = bundle.taxi_slots ?? settings.taxi_slots
  const draftId = getDraftIdFromSettings(ctx.league.settings)

  const sleeperSettingsHref = ctx.sleeperLeagueId
    ? `https://sleeper.com/leagues/${ctx.sleeperLeagueId}/settings`
    : null
  const mockDraftHref = ctx.sleeperLeagueId ? `https://sleeper.com/mock-draft/${ctx.sleeperLeagueId}` : null
  const inviteUrl =
    ctx.platformLeagueId.length > 0
      ? `https://sleeper.com/leagues/${ctx.platformLeagueId}`
      : 'https://sleeper.com/'

  switch (panelId) {
    case 'discord-sync':
      return <DiscordLeagueSyncPanel ctx={ctx} />
    case 'my-team':
      return <MyTeamPanel ctx={ctx} />
    case 'general-info':
      return (
        <div className="space-y-1">
          <SectionTitle>League snapshot</SectionTitle>
          <Row label="League name" value={ctx.displayLeague.name} />
          <Row label="Teams" value={String(numTeams)} />
          <Row label="Sport" value={sport} />
          <Row label="Season" value={season} />
          <Row label="Scoring" value={flavor} />
          <Row label="Waiver type" value={waiverTypeLabel(waiverRaw)} />
          <Row label="FAAB budget" value={waiverBudget != null ? String(waiverBudget) : '—'} />
          <Row label="Playoff teams" value={playoffTeams != null ? String(playoffTeams) : '—'} />
          <Row label="Playoff start week" value={playoffStart != null ? String(playoffStart) : '—'} />
          <Row label="Trade deadline week" value={tradeDl != null ? String(tradeDl) : '—'} />
          {sleeperSettingsHref ? (
            <SleeperLink href={sleeperSettingsHref}>Open full settings in Sleeper →</SleeperLink>
          ) : null}
        </div>
      )
    case 'draft':
      return (
        <DraftSubPanel
          bundle={bundle}
          draftId={draftId}
          draftDateIso={ctx.displayLeague.draftDate ?? null}
          mockDraftHref={mockDraftHref}
          onGoToDraftTab={ctx.onGoToDraftTab}
        />
      )
    case 'playoffs':
      return (
        <div className="space-y-1">
          <SectionTitle>Playoffs</SectionTitle>
          <Row label="Playoff teams" value={playoffTeams != null ? String(playoffTeams) : '—'} />
          <Row label="Playoff start week" value={playoffStart != null ? String(playoffStart) : '—'} />
          <Row label="Bracket" value={String(bundle.playoff_round_type ?? settings.playoff_round_type ?? '—')} />
          <Row label="Consolation" value={String(settings.consolation_bracket_enabled ?? '—')} />
          <Row label="Toilet bowl" value={String(settings.toilet_bowl ?? '—')} />
          {sleeperSettingsHref ? (
            <SleeperLink href={sleeperSettingsHref}>Open playoff settings in Sleeper →</SleeperLink>
          ) : null}
        </div>
      )
    case 'roster':
      return (
        <div className="space-y-3">
          <SectionTitle>Positions</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {rosterPositions.length === 0 ? (
              <p className="text-[12px] text-white/45">No roster_positions in synced settings.</p>
            ) : (
              rosterPositions.map((slot) => (
                <span
                  key={slot}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/85"
                >
                  {slot}
                </span>
              ))
            )}
          </div>
          <Row label="IR slots" value={reserveSlots != null ? String(reserveSlots) : '—'} />
          <Row label="Taxi slots" value={taxiSlots != null ? String(taxiSlots) : '—'} />
          {sleeperSettingsHref ? (
            <SleeperLink href={sleeperSettingsHref}>Open roster settings in Sleeper →</SleeperLink>
          ) : null}
        </div>
      )
    case 'scoring':
      return <ScoringSubPanel scoring={scoring} flavor={flavor} sleeperSettingsHref={sleeperSettingsHref} />
    case 'notifications':
      return <NotificationsPanel />
    case 'invite':
      return <InvitePanel inviteUrl={inviteUrl} filled={ctx.league.teams.length} total={numTeams} />
    case 'co-owners':
      return <CoOwnersPanel ctx={ctx} />
    case 'draft-results':
    case 'draft-results-commish':
      return <DraftResultsPanel draftId={draftId} isCommish={panelId === 'draft-results-commish'} />
    case 'league-history':
    case 'league-history-commish':
      return (
        <LeagueHistoryPanel
          platformLeagueId={ctx.platformLeagueId}
          isCommish={panelId === 'league-history-commish'}
          isCommissioner={ctx.isCommissioner}
        />
      )
    case 'commish-general':
      return <CommishGeneralPanel leagueName={ctx.displayLeague.name} sleeperSettingsHref={sleeperSettingsHref} />
    case 'division-settings':
      return (
        <div className="space-y-2 text-[13px] text-white/70">
          <p>Division names and assignments sync from commissioner tools. Edit in Supabase when `league_divisions` is wired.</p>
          {sleeperSettingsHref ? <SleeperLink href={sleeperSettingsHref}>Open division settings in Sleeper →</SleeperLink> : null}
        </div>
      )
    case 'members-commish':
      return <MembersCommishPanel ctx={ctx} />
    case 'commish-note':
      return <CommishNotePanel ctx={ctx} />
    case 'commish-controls':
      return <CommishControlsPanel />
    case 'ai-chimmy-setup':
    case 'ai-power-rankings':
    case 'ai-trade':
    case 'ai-waiver':
    case 'ai-recap':
    case 'ai-draft-help':
    case 'ai-matchup':
    case 'ai-trash':
      return <AiFeaturePanel panelId={panelId} ctx={ctx} />
    default:
      return <p className="text-[13px] text-white/45">Unknown panel.</p>
  }
}

function MyTeamPanel({ ctx }: { ctx: SubPanelContext }) {
  const [teamName, setTeamName] = useState(ctx.userTeam?.teamName ?? '')
  const [uploading, setUploading] = useState(false)
  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('type', 'image')
      fd.set('leagueId', ctx.league.id)
      const res = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      await res.json().catch(() => ({}))
    } finally {
      setUploading(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/10">
          {ctx.userTeam?.avatarUrl ? (
            <img src={sleeperAvatarUrl(ctx.userTeam.avatarUrl) ?? ''} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white/70">
              {initialsFromName(teamName || ctx.userTeam?.ownerName || 'TM')}
            </span>
          )}
        </div>
        <label className="cursor-pointer rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-[12px] font-semibold text-cyan-200 hover:bg-cyan-500/20">
          {uploading ? 'Uploading…' : 'Upload avatar'}
          <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        </label>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-white/45">Team name</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-500/40"
        />
      </div>
      <p className="text-[11px] text-white/40">
        Player nicknames and persisted team settings use Supabase when `user_team_settings` is enabled.
      </p>
      <button
        type="button"
        className="w-full rounded-xl bg-cyan-500/20 py-2.5 text-[13px] font-bold text-cyan-100 hover:bg-cyan-500/30"
      >
        Save
      </button>
    </div>
  )
}

function DraftSubPanel({
  bundle,
  draftId,
  draftDateIso,
  mockDraftHref,
  onGoToDraftTab,
}: {
  bundle: Record<string, unknown>
  draftDateIso: string | null
  mockDraftHref: string | null
  draftId: string | null
  onGoToDraftTab: () => void
}) {
  const status = String(bundle.status ?? '—')
  const start = draftDateIso ? new Date(draftDateIso).toLocaleString() : '—'
  return (
    <div className="space-y-3">
      <Row label="Draft ID" value={draftId ?? '—'} />
      <Row label="Status" value={status} />
      <Row label="Scheduled" value={start} />
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onGoToDraftTab}
          className="rounded-xl border border-white/12 bg-white/[0.06] py-2.5 text-[13px] font-semibold text-white hover:bg-white/[0.1]"
        >
          View Draft Board
        </button>
        {mockDraftHref ? (
          <a
            href={mockDraftHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-center text-[13px] font-semibold text-cyan-100"
          >
            Mock Draft
          </a>
        ) : null}
      </div>
    </div>
  )
}

function ScoringSubPanel({
  scoring,
  flavor,
  sleeperSettingsHref,
}: {
  scoring: Record<string, number>
  flavor: string
  sleeperSettingsHref: string | null
}) {
  const keys = ['pass_td', 'pass_yd', 'pass_int', 'rush_td', 'rush_yd', 'rec_td', 'rec_yd', 'rec']
  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-200">
        {flavor}
      </div>
      <div className="space-y-0">
        {keys.map((k) => (
          <Row key={k} label={k.replace(/_/g, ' ')} value={scoring[k] != null ? String(scoring[k]) : '—'} />
        ))}
      </div>
      {sleeperSettingsHref ? (
        <SleeperLink href={sleeperSettingsHref}>Open scoring settings in Sleeper →</SleeperLink>
      ) : null}
    </div>
  )
}

const NOTIF_KEYS = [
  'trade_offers',
  'waiver_claims',
  'injury_alerts',
  'scoring_updates',
  'draft_reminders',
  'chat_mentions',
  'chimmy_recap',
  'commish_announcements',
] as const

function NotificationsPanel() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_KEYS.map((k) => [k, true])),
  )
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/45">Stored in Supabase `user_notification_prefs` when wired.</p>
      {NOTIF_KEYS.map((key) => (
        <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#1a1f3a] px-3 py-2">
          <span className="text-[12px] text-white/85">{key.replace(/_/g, ' ')}</span>
          <input
            type="checkbox"
            checked={toggles[key] ?? false}
            onChange={(e) => setToggles((s) => ({ ...s, [key]: e.target.checked }))}
            className="h-4 w-4 accent-cyan-500"
          />
        </label>
      ))}
      <button
        type="button"
        className="w-full rounded-xl bg-cyan-500/20 py-2.5 text-[13px] font-bold text-cyan-100"
        onClick={() => {}}
      >
        Save preferences
      </button>
    </div>
  )
}

function InvitePanel({ inviteUrl, filled, total }: { inviteUrl: string; filled: number; total: number }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-4">
      <Row label="Members" value={`${filled} / ${total} teams`} />
      <div className="flex justify-center rounded-xl border border-white/10 bg-white p-3">
        <QRCodeSVG value={inviteUrl} size={160} level="M" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded-xl border border-white/12 bg-white/[0.06] py-2 text-[12px] font-semibold text-white"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(inviteUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-center text-[12px] font-semibold text-emerald-200"
        >
          WhatsApp
        </a>
      </div>
      <p className="text-[11px] text-white/35">Invite metadata from Sleeper may include invite_code when synced.</p>
    </div>
  )
}

function CoOwnersPanel({ ctx }: { ctx: SubPanelContext }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-white/45">
        Co-owner assignments persist to Supabase `team_co_owners` when enabled. Toggle UI is preview-only.
      </p>
      {ctx.league.teams.map((t) => {
        const su = t.platformUserId ? ctx.sleeperMemberMap[t.platformUserId] : null
        const av = su?.avatar ? sleeperAvatarUrl(su.avatar) : null
        return (
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#1a1f3a] px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-white/10">
                {av ? <img src={av} alt="" className="h-full w-full object-cover" /> : null}
                {!av ? (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold">
                    {initialsFromName(su?.display_name ?? t.ownerName)}
                  </span>
                ) : null}
              </div>
              <span className="truncate text-[12px] font-semibold text-white">{t.teamName}</span>
            </div>
            <input type="checkbox" disabled className="h-4 w-4 accent-cyan-500" title="Co-owner (preview)" />
          </div>
        )
      })}
    </div>
  )
}

function DraftResultsPanel({ draftId, isCommish }: { draftId: string | null; isCommish: boolean }) {
  const [picks, setPicks] = useState<unknown[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!draftId) return
    let cancelled = false
    setLoading(true)
    setErr(null)
    void fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Draft picks unavailable'))))
      .then((data) => {
        if (!cancelled) setPicks(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) {
          setErr('Could not load draft picks.')
          setPicks([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [draftId])

  if (!draftId) {
    return <p className="text-[13px] text-white/45">No draft_id on synced league settings.</p>
  }
  if (loading) return <p className="text-[13px] text-white/45">Loading picks…</p>
  if (err) return <p className="text-[13px] text-rose-300">{err}</p>

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-white/40">
        Picks from Sleeper API. {isCommish ? 'Commish overrides store in Supabase when wired.' : null}
      </p>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0d1117] p-2">
        {(picks ?? []).slice(0, 40).map((p, i) => {
          const row = p as Record<string, unknown>
          const pid = String(row.player_id ?? row.pick_no ?? i)
          return (
            <div key={pid} className="flex justify-between gap-2 text-[11px] text-white/80">
              <span className="text-white/45">#{i + 1}</span>
              <span className="truncate">{pid}</span>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="w-full rounded-xl border border-white/12 py-2 text-[12px] font-semibold text-white/80"
        onClick={() => {
          const csv = 'pick,player_id\n' + (picks ?? []).map((p, i) => `${i + 1},${(p as { player_id?: string }).player_id ?? ''}`).join('\n')
          void navigator.clipboard.writeText(csv)
        }}
      >
        Export as CSV (clipboard)
      </button>
    </div>
  )
}

function LeagueHistoryPanel({
  platformLeagueId,
  isCommish,
  isCommissioner,
}: {
  platformLeagueId: string
  isCommish: boolean
  isCommissioner: boolean
}) {
  const [rows, setRows] = useState<{ season: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRows([])
    async function walk(id: string, depth: number) {
      if (depth > 8 || cancelled) return
      const res = await fetch(`https://api.sleeper.app/v1/league/${id}`)
      if (!res.ok) return
      const L = (await res.json()) as Record<string, unknown>
      if (cancelled) return
      const season = String(L.season ?? '')
      const name = String(L.name ?? 'League')
      setRows((r) => [...r, { season, name }])
      const prev = L.previous_league_id
      if (typeof prev === 'string' && prev && prev !== id) await walk(prev, depth + 1)
    }
    setLoading(true)
    void walk(platformLeagueId, 0).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [platformLeagueId])

  if (loading) return <p className="text-[13px] text-white/45">Loading history chain…</p>

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.season}-${i}`} className="rounded-xl border border-white/[0.06] bg-[#1a1f3a] px-3 py-2 text-[13px]">
            <span className="font-bold text-white">{r.season}</span> — {r.name}
          </li>
        ))}
      </ul>
      {isCommish && isCommissioner ? (
        <button type="button" className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[12px] font-semibold text-amber-100">
          Add Trophy
        </button>
      ) : null}
    </div>
  )
}

function CommishGeneralPanel({
  leagueName,
  sleeperSettingsHref,
}: {
  leagueName: string
  sleeperSettingsHref: string | null
}) {
  const [name, setName] = useState(leagueName)
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-white/45">League name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white"
        />
        <p className="mt-1 text-[10px] text-white/35">Updates AllFantasy + mirror changes in Sleeper.</p>
      </div>
      <label className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#1a1f3a] px-3 py-2">
        <span className="text-[12px] text-white/85">Public league</span>
        <input type="checkbox" className="h-4 w-4 accent-cyan-500" />
      </label>
      {sleeperSettingsHref ? (
        <SleeperLink href={sleeperSettingsHref}>Open in Sleeper Commissioner Tools →</SleeperLink>
      ) : null}
    </div>
  )
}

function MembersCommishPanel({ ctx }: { ctx: SubPanelContext }) {
  return (
    <div className="space-y-2">
      {ctx.league.teams.map((t) => (
        <div
          key={t.id}
          className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#1a1f3a] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[13px] font-semibold text-white">{t.teamName}</p>
            <p className="text-[11px] text-white/40">{t.ownerName}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/60">
              Reset team
            </button>
            <button type="button" className="rounded-lg border border-rose-500/30 px-2 py-1 text-[10px] text-rose-200">
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CommishNotePanel({ ctx }: { ctx: SubPanelContext }) {
  const [body, setBody] = useState('')
  const [week, setWeek] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ title?: string; body?: string } | null>(null)

  const run = async () => {
    if (!ctx.isCommissioner) return
    setLoading(true)
    setError(null)
    try {
      const w = week.trim() ? parseInt(week, 10) : undefined
      const res = await fetch('/api/ai/commish-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: ctx.league.id,
          week: Number.isFinite(w) ? w : undefined,
          context: body,
        }),
      })
      const data = (await res.json()) as { title?: string; body?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generate failed')
      setResult({ title: data.title, body: data.body })
      if (data.body) setBody(data.body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  if (!ctx.isCommissioner) {
    return <p className="text-[13px] text-white/45">Only the commissioner can generate league notes.</p>
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-white/45">Week focus (optional)</label>
        <input
          type="number"
          min={1}
          max={24}
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          placeholder="e.g. 12"
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white placeholder:text-white/25"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Extra context for Chimmy (optional)…"
        className="w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white placeholder:text-white/25"
        data-testid="commish-note-context"
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
        data-testid="commish-note-generate"
      >
        {loading ? 'Generating…' : '✨ Generate with Chimmy'}
      </button>
      {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      {result?.title ? (
        <p className="text-[12px] font-semibold text-cyan-200">{result.title}</p>
      ) : null}
      <button type="button" className="w-full rounded-xl bg-cyan-500/20 py-2.5 text-[13px] font-bold text-cyan-100">
        Post / Update
      </button>
    </div>
  )
}

function CommishControlsPanel() {
  return (
    <div className="space-y-2 text-[12px] text-white/70">
      <p className="text-white/45">Audit logging to `commish_actions` when API is connected.</p>
      <button type="button" className="w-full rounded-xl border border-white/12 py-2 text-left px-3 hover:bg-white/[0.04]">
        Force waiver claim…
      </button>
      <button type="button" className="w-full rounded-xl border border-white/12 py-2 text-left px-3 hover:bg-white/[0.04]">
        Reset draft order…
      </button>
      <button type="button" className="w-full rounded-xl border border-white/12 py-2 text-left px-3 hover:bg-white/[0.04]">
        Pause / resume waivers
      </button>
    </div>
  )
}

function parseNameList(raw: string): { name: string }[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }))
}

function AiFeaturePanel({ panelId, ctx }: { panelId: string; ctx: SubPanelContext }) {
  const titles: Record<string, string> = {
    'ai-chimmy-setup': 'Chimmy league setup',
    'ai-power-rankings': 'AI power rankings',
    'ai-trade': 'AI trade analyzer',
    'ai-waiver': 'AI waiver wire',
    'ai-recap': 'AI weekly recap',
    'ai-draft-help': 'AI draft assistant',
    'ai-matchup': 'AI matchup preview',
    'ai-trash': 'AI trash talk',
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [giveText, setGiveText] = useState('')
  const [getText, setGetText] = useState('')
  const [week, setWeek] = useState('')
  const [targetName, setTargetName] = useState('')
  const [recentPerf, setRecentPerf] = useState('')
  const [intensity, setIntensity] = useState<'mild' | 'medium' | 'savage'>('medium')

  const leagueId = ctx.league.id

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let endpoint = ''
      let payload: Record<string, unknown> = { leagueId }

      switch (panelId) {
        case 'ai-chimmy-setup':
          endpoint = '/api/ai/chimmy-setup'
          break
        case 'ai-power-rankings':
          endpoint = '/api/ai/power-rankings'
          break
        case 'ai-trade': {
          const give = parseNameList(giveText)
          const get = parseNameList(getText)
          if (give.length === 0 && get.length === 0) {
            throw new Error('Add at least one player on the give or get side (comma-separated names).')
          }
          endpoint = '/api/ai/trade-analysis'
          payload = { leagueId, give, get }
          break
        }
        case 'ai-waiver':
          endpoint = '/api/ai/waiver-recs'
          payload = { leagueId, userId: ctx.userId }
          break
        case 'ai-recap': {
          endpoint = '/api/ai/weekly-recap'
          const w = week.trim() ? parseInt(week, 10) : undefined
          payload = { leagueId, week: Number.isFinite(w) ? w : undefined }
          break
        }
        case 'ai-draft-help':
          endpoint = '/api/ai/draft-help'
          break
        case 'ai-matchup': {
          endpoint = '/api/ai/matchup-preview'
          const w = week.trim() ? parseInt(week, 10) : undefined
          payload = { leagueId, userId: ctx.userId, week: Number.isFinite(w) ? w : undefined }
          break
        }
        case 'ai-trash':
          endpoint = '/api/ai/trash-talk'
          if (!targetName.trim()) throw new Error('Enter a target display name.')
          payload = {
            targetDisplayName: targetName.trim(),
            recentPerformance: recentPerf.trim() || undefined,
            intensity,
          }
          break
        default:
          throw new Error('Unknown AI panel')
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const testId = `ai-run-${panelId.replace(/[^a-z-]/gi, '-')}`

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-white/70">{titles[panelId] ?? 'AI tool'}</p>

      {panelId === 'ai-trade' ? (
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-white/45">Players you give (comma-separated)</label>
            <textarea
              value={giveText}
              onChange={(e) => setGiveText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[12px] text-white"
              placeholder="e.g. Josh Allen, Travis Kelce"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/45">Players you get</label>
            <textarea
              value={getText}
              onChange={(e) => setGetText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[12px] text-white"
            />
          </div>
        </div>
      ) : null}

      {panelId === 'ai-recap' || panelId === 'ai-matchup' ? (
        <div>
          <label className="text-[11px] text-white/45">Week (optional — defaults to current)</label>
          <input
            type="number"
            min={1}
            max={24}
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white"
          />
        </div>
      ) : null}

      {panelId === 'ai-trash' ? (
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-white/45">Target display name</label>
            <input
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/45">Recent performance (optional)</label>
            <textarea
              value={recentPerf}
              onChange={(e) => setRecentPerf(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[12px] text-white"
              placeholder="e.g. Lost 3 straight, lowest PF in league"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/45">Intensity</label>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as 'mild' | 'medium' | 'savage')}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a1f3a] px-3 py-2 text-[13px] text-white"
            >
              <option value="mild">Mild</option>
              <option value="medium">Medium</option>
              <option value="savage">Savage</option>
            </select>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600/50 to-fuchsia-600/45 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-violet-900/20 disabled:opacity-50"
        data-testid={testId}
      >
        {loading ? 'Running…' : 'Run'}
      </button>
      {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      {result != null ? (
        <pre className="max-h-64 overflow-auto rounded-xl border border-white/[0.08] bg-[#0d1117] p-3 text-[11px] leading-relaxed text-white/85">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
