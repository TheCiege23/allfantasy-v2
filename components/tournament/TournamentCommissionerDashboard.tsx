'use client'

import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  CalendarClock,
  Settings2,
  MessageSquare,
  Sparkles,
  Share2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  CreditCard,
  History,
} from 'lucide-react'
import { TournamentControlDashboard } from '@/components/tournament/TournamentControlDashboard'
import { KingBuffaloPresentedBy } from '@/components/tournament/KingBuffaloPresentedBy'
import { TournamentLeagueSettingsModalLegacy } from '@/components/tournament/TournamentLeagueSettingsModalLegacy'
import { TournamentApprovalsCenter } from '@/components/tournament/TournamentApprovalsCenter'
import { TournamentDraftSchedulePanel } from '@/components/tournament/TournamentDraftSchedulePanel'
import { TournamentEligibilityControl } from '@/components/tournament/TournamentEligibilityControl'
import {
  TournamentWarRoomAmbient,
  WarRoomHeroCard,
  WarRoomPanel,
  WarRoomStatOrb,
  WarRoomTabButton,
} from '@/components/tournament/TournamentWarRoomPrimitives'
import { TournamentSubscriptionTokensPanel } from '@/components/tournament/TournamentSubscriptionTokensPanel'
import { TournamentHistoryArchivePanel } from '@/components/tournament/TournamentHistoryArchivePanel'
import { TournamentAiOperationsCenter } from '@/components/tournament/TournamentAiOperationsCenter'
import type { DraftScheduleV1 } from '@/lib/tournament/draft-schedule-types'
import { DRAFT_PHASE_LABEL } from '@/lib/tournament/draft-schedule-types'
import type { AfPlanId } from '@/lib/tournament/af-premium-plans'
import type { AiAutomationV1State } from '@/lib/tournament/ai-automation-hub'
import { defaultAiAutomationV1 } from '@/lib/tournament/ai-automation-hub'

type TabId =
  | 'overview'
  | 'leagues'
  | 'standings'
  | 'drafts'
  | 'settings'
  | 'members'
  | 'chat'
  | 'ai'
  | 'media'
  | 'subscription'
  | 'approvals'
  | 'history'

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'leagues', label: 'Leagues', icon: <Trophy className="h-4 w-4" /> },
  { id: 'standings', label: 'Standings', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'drafts', label: 'Drafts', icon: <CalendarClock className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'ai', label: 'AI & Automation', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'media', label: 'Media / Sharing', icon: <Share2 className="h-4 w-4" /> },
  { id: 'subscription', label: 'Access · Tokens', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'approvals', label: 'Approvals', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
]

type Summary = {
  tournament: { id: string; name: string; sport: string; season: number; status: string; lockedAt: string | null }
  counts: {
    subLeagues: number
    expectedSubLeagues: number
    totalFilledTeams: number
    totalEmptySlots: number
    totalCapacity: number
    participants: number
    waitlisted: number
    activeParticipants: number
    eliminated: number
  }
  rounds: Array<{
    roundIndex: number
    phase: string
    name: string | null
    startWeek: number | null
    endWeek: number | null
    status: string
  }>
  scheduleHints: { qualificationWeeks: number; redraftWeeks: number[] }
  hub?: {
    visibility: string
    waitlistEnabled: boolean
    maxWaitlist: number | null
    eligibilityMode?: string
    draftScheduleV1?: unknown | null
    aiAutomationV1?: AiAutomationV1State
  }
  monetization?: {
    afPlan: AfPlanId | null
    afTokensRemaining: number
    subscriptionPlans: string[]
    subscriptionStatus: string
  }
  feederLeagues?: Array<{
    tournamentLeagueId: string
    leagueId: string
    name: string
    conferenceName: string
    filledSlots: number
    capacity: number
    shell: { homepage: boolean; leagueChat: boolean; draftBoard: boolean; rosterShell: boolean }
    inviteCode: string
    joinUrl: string
  }>
}

type AccessFlags = {
  isCreator: boolean
  canUseControlConsole: boolean
  canEditHubSettings: boolean
}

export function TournamentCommissionerDashboard({ tournamentId }: { tournamentId: string }) {
  const searchParams = useSearchParams()
  const created = searchParams?.get('created') === '1'
  const [tab, setTab] = useState<TabId>('overview')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [accessFlags, setAccessFlags] = useState<AccessFlags | null>(null)

  const loadAccess = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/access`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j.authenticated) {
        setAccessFlags({
          isCreator: Boolean(j.isCreator),
          canUseControlConsole: Boolean(j.canUseControlConsole),
          canEditHubSettings: Boolean(j.canEditHubSettings),
        })
      } else {
        setAccessFlags(null)
      }
    } catch {
      setAccessFlags(null)
    }
  }, [tournamentId])

  const loadSummary = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/commissioner-dashboard`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setLoadError(typeof j.error === 'string' ? j.error : 'Failed to load tournament')
        setSummary(null)
        return
      }
      setSummary(await res.json())
    } catch {
      setLoadError('Network error')
      setSummary(null)
    }
  }, [tournamentId])

  useEffect(() => {
    loadSummary()
    loadAccess()
  }, [loadSummary, loadAccess])

  const phaseRoadmap = useMemo(() => {
    if (!summary?.rounds?.length) return []
    return summary.rounds.map((r) => ({
      label: r.name ?? r.phase,
      phase: r.phase,
      status: r.status,
      weeks: r.startWeek != null && r.endWeek != null ? `W${r.startWeek}–${r.endWeek}` : '—',
    }))
  }, [summary])

  const draftScheduleLines = useMemo(() => {
    const raw = summary?.hub?.draftScheduleV1
    if (!raw || typeof raw !== 'object') return [] as string[]
    const ds = raw as DraftScheduleV1
    const phases = ds.phases ?? {}
    const lines: string[] = []
    for (const key of Object.keys(DRAFT_PHASE_LABEL) as Array<keyof typeof DRAFT_PHASE_LABEL>) {
      const ph = phases[key]
      const at = ph?.uniform?.scheduledAt
      if (typeof at === 'string' && at) {
        try {
          lines.push(`${DRAFT_PHASE_LABEL[key]} · ${new Date(at).toLocaleString()}`)
        } catch {
          /* ignore */
        }
      }
    }
    return lines
  }, [summary?.hub?.draftScheduleV1])

  const heroAccent = useMemo((): 'cyan' | 'amber' | 'violet' | 'emerald' => {
    const s = String(summary?.tournament.status ?? '').toLowerCase()
    if (s.includes('final') || s.includes('championship')) return 'amber'
    if (s.includes('cut') || s.includes('elim')) return 'violet'
    if (s.includes('qualif')) return 'emerald'
    return 'cyan'
  }, [summary?.tournament.status])

  return (
    <div className="relative min-h-[80vh] text-white">
      <TournamentWarRoomAmbient />
      <div className="relative z-10">
      <div className="mb-6">
        <WarRoomHeroCard phaseAccent={heroAccent}>
        <div className="border-b border-white/[0.07] px-1 pb-5 sm:px-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/90">
                Tournament war room
              </p>
              <h1 className="bg-gradient-to-r from-white via-white to-cyan-200/90 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                {summary?.tournament.name ?? 'Tournament'}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {summary ? (
                  <>
                    {summary.tournament.sport} · Season {summary.tournament.season} ·{' '}
                    <span className="font-medium text-cyan-100/90">{summary.tournament.status}</span>
                  </>
                ) : (
                  'Loading tournament…'
                )}
              </p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-2 lg:items-end">
              <KingBuffaloPresentedBy variant="strip" />
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/tournament/${tournamentId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm hover:bg-white/10"
                >
                  Public hub <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.45)] hover:bg-cyan-500/25"
                  data-testid="tournament-open-settings-modal"
                >
                  League settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {created ? (
          <div
            className="flex items-center gap-2 border-b border-emerald-500/25 bg-emerald-500/[0.12] px-4 py-2.5 text-xs text-emerald-100 sm:px-6"
            role="status"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-emerald-300/90" />
            Tournament online — sub-leagues, invites, draft shells, and league chat are live. Command the phases below.
          </div>
        ) : null}

        <div className="flex gap-1.5 overflow-x-auto px-2 py-3 sm:px-3">
          {TABS.map((t) => (
            <WarRoomTabButton
              key={t.id}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
              icon={t.icon}
              label={t.label}
              testId={`tournament-commissioner-tab-${t.id}`}
            />
          ))}
        </div>
        </WarRoomHeroCard>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {tab === 'overview' && summary && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <WarRoomStatOrb label="Current phase" value={summary.tournament.status} hint="Tournament state" accent="cyan" />
              <WarRoomStatOrb
                label="Filled / capacity"
                value={`${summary.counts.totalFilledTeams} / ${summary.counts.totalCapacity}`}
                hint="Across all sub-leagues"
                accent="emerald"
              />
              <WarRoomStatOrb label="Sub-leagues" value={String(summary.counts.subLeagues)} hint="Auto-created feeders" accent="violet" />
              <WarRoomStatOrb label="Waitlisted" value={String(summary.counts.waitlisted)} hint="Hub waitlist" accent="amber" />
              <WarRoomStatOrb label="Active" value={String(summary.counts.activeParticipants)} hint="Participants" accent="cyan" />
              <WarRoomStatOrb label="Eliminated" value={String(summary.counts.eliminated)} hint="Cut tracker" accent="violet" />
              <WarRoomStatOrb
                label="Qualifier window"
                value={`${summary.scheduleHints.qualificationWeeks} wks`}
                hint="Configured length"
                accent="emerald"
              />
              <WarRoomStatOrb
                label="Redraft beats"
                value={summary.scheduleHints.redraftWeeks?.join(', ') || '—'}
                hint="Phase transitions"
                accent="amber"
              />
            </div>

            {draftScheduleLines.length > 0 ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.08] via-white/[0.03] to-violet-500/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-5">
                <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/90">
                  <CalendarClock className="h-4 w-4" /> Draft phase clocks
                </h2>
                <ul className="flex flex-col gap-1.5 text-sm text-white/75 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  {draftScheduleLines.map((line) => (
                    <li key={line} className="font-mono text-[13px] text-cyan-50/90">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/70">
                  <BarChart3 className="h-4 w-4 text-cyan-400/90" /> Phase roadmap
                </h2>
                <ol className="space-y-2 text-sm">
                  {phaseRoadmap.length === 0 ? (
                    <li className="text-white/50">No round rows yet.</li>
                  ) : (
                    phaseRoadmap.map((s, i) => (
                      <li
                        key={`${s.phase}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                      >
                        <span className="font-medium text-white/90">{s.label}</span>
                        <span className="text-xs text-white/45">
                          {s.weeks} · {s.status}
                        </span>
                      </li>
                    ))
                  )}
                </ol>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-amber-950/10 p-4 sm:p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-200/90">
                  <AlertTriangle className="h-4 w-4" /> Action center
                </h2>
                <ul className="space-y-2 text-sm text-white/75">
                  <li className="flex justify-between gap-2">
                    <span>Universal tournament chat</span>
                    <Link href={`/tournament/${tournamentId}/forum`} className="text-cyan-400 hover:text-cyan-300">
                      Open forum
                    </Link>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Advance phase / cuts</span>
                    <button type="button" onClick={() => setTab('leagues')} className="text-cyan-400 hover:text-cyan-300">
                      Go to Operations
                    </button>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Standings export</span>
                    <Link href={`/tournament/${tournamentId}/standings`} className="text-cyan-400 hover:text-cyan-300">
                      View standings
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {summary.feederLeagues && summary.feederLeagues.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">
                  Sub-league shell & invites
                </h2>
                <p className="mb-4 text-xs text-white/50">
                  Each feeder is created with homepage, league chat, draft shell, and roster/waiver surfaces. Invite links
                  are generated per league at creation.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-white/10 text-white/45">
                        <th className="py-2 pr-2">League</th>
                        <th className="py-2">Roster</th>
                        <th className="py-2">Shell</th>
                        <th className="py-2">Invite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.feederLeagues.map((fl) => (
                        <tr key={fl.tournamentLeagueId} className="border-b border-white/5">
                          <td className="py-2 pr-2">
                            <p className="font-medium text-white/90">{fl.name}</p>
                            <p className="text-[10px] text-white/35">{fl.conferenceName}</p>
                          </td>
                          <td className="py-2 text-white/70">
                            {fl.filledSlots}/{fl.capacity}
                          </td>
                          <td className="py-2 text-emerald-200/80">
                            {fl.shell.homepage && fl.shell.leagueChat && fl.shell.draftBoard ? 'Ready' : '—'}
                          </td>
                          <td className="py-2">
                            {fl.joinUrl ? (
                              <span className="text-cyan-300/90" title={fl.joinUrl}>
                                Link set
                              </span>
                            ) : fl.inviteCode ? (
                              <span className="font-mono text-[10px] text-white/50">{fl.inviteCode}</span>
                            ) : (
                              <span className="text-amber-200/80">Add in league settings</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        )}

        {tab === 'overview' && !summary && !loadError && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
            Loading overview…
          </div>
        )}

        {tab === 'leagues' && (
          <div className="space-y-4">
            <p className="text-sm text-white/55">
              Operations console: invites, announcements, admin safety, round progression, and bubble tools.
            </p>
            {accessFlags && !accessFlags.canUseControlConsole ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/95">
                Your role can view the dashboard but not run operations. Ask the tournament creator for{' '}
                <span className="font-semibold">manage leagues</span> or <span className="font-semibold">full admin</span>{' '}
                on your staff profile.
              </div>
            ) : (
              <TournamentControlDashboard tournamentId={tournamentId} hideLocalBackLink />
            )}
          </div>
        )}

        {tab === 'standings' && (
          <Panel
            title="Universal standings"
            subtitle="W–L first, points for as tiebreaker — mirrors tournament hub."
            actions={
              <Link
                href={`/tournament/${tournamentId}/standings`}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
              >
                Open full standings
              </Link>
            }
          >
            <p className="text-sm text-white/60">
              Live cross-league standings are on the tournament hub. We surface ranking logic there to avoid duplicating
              scoring engines in the dashboard shell.
            </p>
          </Panel>
        )}

        {tab === 'drafts' && summary && (
          <Panel
            title="Draft scheduling manager"
            subtitle="Uniform · per-league · grouped batches — stored in hub draftScheduleV1."
            actions={
              <Link href={`/tournament/${tournamentId}/drafts`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
                Open drafts hub
              </Link>
            }
          >
            <TournamentDraftSchedulePanel
              tournamentId={tournamentId}
              feeders={(summary.feederLeagues ?? []).map((f) => ({ leagueId: f.leagueId, name: f.name }))}
              draftScheduleV1={summary.hub?.draftScheduleV1 ?? null}
              canEdit={accessFlags?.canEditHubSettings ?? false}
              onSaved={() => loadSummary()}
            />
            <p className="mt-4 text-xs text-white/45">
              Draft rooms open per sub-league; this schedule is the commissioner source of truth for phase clocks and
              reminders.
            </p>
          </Panel>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            <TournamentEligibilityControl
              tournamentId={tournamentId}
              mode={summary?.hub?.eligibilityMode ?? 'open'}
              canEdit={accessFlags?.canEditHubSettings ?? false}
              onSaved={() => loadSummary()}
            />
            <Panel title="Universal vs overrides" subtitle="Template + per–sub-league patches with guardrails.">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 hover:bg-cyan-500/15"
              >
                Open tournament league settings
              </button>
            </Panel>
          </div>
        )}

        {tab === 'approvals' && (
          <Panel
            title="Pending co-commissioner requests"
            subtitle="Mini-commissioners propose league.settings patches — approve or reject."
          >
            <TournamentApprovalsCenter tournamentId={tournamentId} />
          </Panel>
        )}

        {tab === 'members' && (
          <MembersTab
            tournamentId={tournamentId}
            isCreator={accessFlags?.isCreator ?? false}
            onRefreshSummary={loadSummary}
          />
        )}

        {tab === 'chat' && (
          <Panel
            title="Universal chat & announcements"
            subtitle="Forum + pinned commissioner posts."
            actions={
              <Link href={`/tournament/${tournamentId}/forum`} className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
                Open forum
              </Link>
            }
          >
            <p className="text-sm text-white/60">
              Tournament forum hosts universal threads. Each sub-league keeps its own league chat from the league shell.
            </p>
          </Panel>
        )}

        {tab === 'ai' && summary && (
          <TournamentAiOperationsCenter
            tournamentId={tournamentId}
            canEdit={accessFlags?.canEditHubSettings ?? false}
            afPlan={summary.monetization?.afPlan ?? null}
            initialAutomation={summary.hub?.aiAutomationV1 ?? defaultAiAutomationV1()}
            onSaved={() => loadSummary()}
          />
        )}
        {tab === 'ai' && !summary && !loadError && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
            Loading AI & automation…
          </div>
        )}

        {tab === 'subscription' && (
          <TournamentSubscriptionTokensPanel
            entitlements={{
              plan: summary?.monetization?.afPlan ?? null,
              afTokensRemaining: summary?.monetization?.afTokensRemaining ?? null,
            }}
          />
        )}

        {tab === 'history' && summary && (
          <TournamentHistoryArchivePanel rounds={summary.rounds} tournamentStatus={summary.tournament.status} />
        )}
        {tab === 'history' && !summary && !loadError && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
            Loading history…
          </div>
        )}

        {tab === 'media' && (
          <Panel title="Media / sharing" subtitle="Invite links per league + hub share from the public tournament page.">
            <p className="text-sm text-white/60">
              Copy per-league invites from Operations. Milestone cards can be shared from the tournament hub once phases
              advance.
            </p>
          </Panel>
        )}
      </div>
      </div>

      <TournamentLeagueSettingsModalLegacy
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tournamentId={tournamentId}
        hubSnapshot={summary?.hub}
        canEdit={accessFlags?.canEditHubSettings ?? false}
        onSaved={() => {
          loadSummary()
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}

function MembersTab({
  tournamentId,
  isCreator,
  onRefreshSummary,
}: {
  tournamentId: string
  isCreator: boolean
  onRefreshSummary: () => void
}) {
  const [waitlist, setWaitlist] = useState<
    Array<{ order: number; userId: string; displayName: string; createdAt: string }>
  >([])
  const [staff, setStaff] = useState<
    Array<{ userId: string; displayName: string; permissions: Record<string, unknown> }>
  >([])
  const [loading, setLoading] = useState(true)
  const [staffUserId, setStaffUserId] = useState('')
  const [perm, setPerm] = useState({
    dashboard: true,
    manageLeagues: false,
    manageDrafts: false,
    manageChat: false,
    manageSettings: false,
    fullAdmin: false,
  })
  const [staffSaving, setStaffSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const wRes = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/waitlist`, { cache: 'no-store' })
      const wJson = await wRes.json().catch(() => ({}))
      if (wRes.ok && Array.isArray(wJson.entries)) setWaitlist(wJson.entries)
      else setWaitlist([])

      if (isCreator) {
        const sRes = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/staff`, { cache: 'no-store' })
        const sJson = await sRes.json().catch(() => ({}))
        if (sRes.ok && Array.isArray(sJson.staff)) setStaff(sJson.staff)
        else setStaff([])
      } else {
        setStaff([])
      }
    } catch {
      setWaitlist([])
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [tournamentId, isCreator])

  useEffect(() => {
    load()
  }, [load])

  async function removeWaitlist(userId: string) {
    const res = await fetch(
      `/api/tournament/${encodeURIComponent(tournamentId)}/waitlist?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      await load()
      onRefreshSummary()
    }
  }

  async function addStaff(e: FormEvent) {
    e.preventDefault()
    const uid = staffUserId.trim()
    if (!uid) return
    setStaffSaving(true)
    try {
      const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigneeUserId: uid,
          permissions: {
            dashboard: perm.dashboard || perm.fullAdmin,
            manageLeagues: perm.manageLeagues || perm.fullAdmin,
            manageDrafts: perm.manageDrafts || perm.fullAdmin,
            manageChat: perm.manageChat || perm.fullAdmin,
            manageSettings: perm.manageSettings || perm.fullAdmin,
            fullAdmin: perm.fullAdmin,
          },
        }),
      })
      if (res.ok) {
        setStaffUserId('')
        await load()
      }
    } finally {
      setStaffSaving(false)
    }
  }

  async function removeStaff(userId: string) {
    const res = await fetch(
      `/api/tournament/${encodeURIComponent(tournamentId)}/staff?userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    )
    if (res.ok) await load()
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Waitlist"
        subtitle="Ordered by signup time. Remove to clear a slot or before promoting a user into a league."
      >
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : waitlist.length === 0 ? (
          <p className="text-sm text-white/50">No users on the waitlist.</p>
        ) : (
          <ul className="space-y-2">
            {waitlist.map((row) => (
              <li
                key={row.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-white/40">#{row.order}</span> {row.displayName}{' '}
                  <span className="font-mono text-[11px] text-white/35">({row.userId.slice(0, 8)}…)</span>
                </span>
                <button
                  type="button"
                  onClick={() => void removeWaitlist(row.userId)}
                  className="text-xs text-rose-300 hover:text-rose-200"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {isCreator ? (
        <Panel title="Tournament staff" subtitle="Co-commissioners with dashboard or operations permissions (creator only).">
          <ul className="mb-4 space-y-2">
            {staff.length === 0 ? (
              <p className="text-sm text-white/50">No staff assigned yet.</p>
            ) : (
              staff.map((s) => (
                <li
                  key={s.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <span>{s.displayName}</span>
                  <button
                    type="button"
                    onClick={() => void removeStaff(s.userId)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={addStaff} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Add staff by user ID</p>
            <input
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              placeholder="User UUID"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white"
            />
            <div className="grid gap-2 text-xs text-white/75 sm:grid-cols-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={perm.dashboard}
                  onChange={(e) => setPerm((p) => ({ ...p, dashboard: e.target.checked }))}
                />
                Dashboard
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={perm.manageLeagues}
                  onChange={(e) => setPerm((p) => ({ ...p, manageLeagues: e.target.checked }))}
                />
                Manage leagues / operations
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={perm.manageSettings}
                  onChange={(e) => setPerm((p) => ({ ...p, manageSettings: e.target.checked }))}
                />
                Manage settings
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={perm.fullAdmin}
                  onChange={(e) => setPerm((p) => ({ ...p, fullAdmin: e.target.checked }))}
                />
                Full admin
              </label>
            </div>
            <button
              type="submit"
              disabled={staffSaving}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {staffSaving ? 'Saving…' : 'Add staff'}
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Mini-commissioners (per league)" subtitle="Deputy commissioners on individual feeder leagues.">
        <p className="text-sm text-white/60">
          Assign via API <code className="text-cyan-200/90">POST /api/tournament/[id]/mini-commissioners</code> or extend
          the hub UI later. Listing is available to all dashboard roles.
        </p>
      </Panel>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <WarRoomPanel title={title} subtitle={subtitle} actions={actions}>
      {children}
    </WarRoomPanel>
  )
}
