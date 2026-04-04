'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Settings } from 'lucide-react'
import { ManagerRoleBadge } from '@/components/ManagerRoleBadge'
import type { UserLeague, UserLeagueTeam } from '@/app/dashboard/types'
import { getDraftIdFromSettings } from '@/app/league/[leagueId]/components/league-settings-modal-utils'
import { IDPDraftFilters } from '@/app/idp/components/IDPDraftFilters'

export type DraftTabProps = {
  league: UserLeague
  teams: UserLeagueTeam[]
  isOwner: boolean
  inviteToken?: string
  idpLeagueUi?: boolean
}

function sortTeamsForDisplay(teams: UserLeagueTeam[]): UserLeagueTeam[] {
  return [...teams].sort((a, b) => {
    const ap = a.draftPosition
    const bp = b.draftPosition
    if (ap != null && bp != null) return ap - bp
    if (ap != null) return -1
    if (bp != null) return 1
    return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' })
  })
}

function teamAvatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl?.trim()) return null
  const t = avatarUrl.trim()
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `https://sleepercdn.com/avatars/${t}`
}

function teamInitials(team: UserLeagueTeam): string {
  const raw = team.teamName.trim() || team.ownerName.trim() || '?'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return raw.slice(0, 2).toUpperCase()
}

type TimerParts = { days: number; hours: number; mins: number; secs: number }

function remainingParts(targetMs: number): TimerParts | 'dash' {
  if (!Number.isFinite(targetMs)) return 'dash'
  const diff = Math.max(0, targetMs - Date.now())
  const secs = Math.floor(diff / 1000)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const mins = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return { days, hours, mins, secs: s }
}

function useDraftCountdown(draftDateIso: string | null | undefined): TimerParts | 'dash' {
  const targetMs = useMemo(() => {
    if (!draftDateIso) return NaN
    const t = new Date(draftDateIso).getTime()
    return Number.isFinite(t) ? t : NaN
  }, [draftDateIso])

  const [parts, setParts] = useState<TimerParts | 'dash'>(() =>
    Number.isFinite(targetMs) ? remainingParts(targetMs) : 'dash',
  )

  useEffect(() => {
    if (!Number.isFinite(targetMs)) {
      setParts('dash')
      return
    }

    const tick = () => {
      setParts(remainingParts(targetMs))
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [targetMs])

  return parts
}

export function DraftTab({ league, teams, isOwner, inviteToken, idpLeagueUi = false }: DraftTabProps) {
  const router = useRouter()
  const sorted = useMemo(() => sortTeamsForDisplay(teams), [teams])
  const filled = teams.length
  const cap = league.teamCount
  const isFull = filled >= cap
  const showInvite =
    isOwner && !isFull && typeof inviteToken === 'string' && inviteToken.length > 0
  const inviteDisplayPath = `allfantasy.ai/join/${inviteToken ?? ''}`
  const inviteCopyUrl = `https://${inviteDisplayPath}`

  const handleCopyInvite = useCallback(async () => {
    if (!inviteToken) return
    try {
      await navigator.clipboard.writeText(inviteCopyUrl)
    } catch {
      // ignore
    }
  }, [inviteCopyUrl, inviteToken])

  const draftDateIso = league.draftDate ?? null
  const hasDraftTime = Boolean(draftDateIso && Number.isFinite(new Date(draftDateIso).getTime()))
  const timer = useDraftCountdown(hasDraftTime ? draftDateIso : null)
  const sleeperDraftId = useMemo(
    () => getDraftIdFromSettings(league.settings as unknown),
    [league.settings],
  )

  const handleSetTime = useCallback(() => {
    console.log('DraftTab: Set Time (stub)', { leagueId: league.id })
  }, [league.id])

  const handleMockDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/draft/create-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, sport: league.sport }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { draftId?: string; roomId?: string }
      const id = data.draftId ?? data.roomId
      if (id) {
        router.push(`/draft/mock/${id}`)
      }
    } catch {
      // ignore
    }
  }, [league.id, league.sport, router])

  const handleDraftRoom = useCallback(async () => {
    try {
      const res = await fetch('/api/draft/session/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { draftSessionId?: string }
      if (data.draftSessionId) {
        router.push(`/draft/live/${data.draftSessionId}`)
      }
    } catch {
      // ignore
    }
  }, [league.id, router])

  return (
    <div className="space-y-4 p-5">
      {idpLeagueUi ? <IDPDraftFilters /> : null}
      {showInvite ? (
        <section
          className="rounded-2xl border border-white/[0.08] bg-[#0c0c1e] p-4"
          aria-label="Invite friends"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Invite friends to play</h2>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/70">
              {filled}/{cap} teams filled
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2 text-[11px] text-cyan-200/90">
              {inviteDisplayPath}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-black transition hover:bg-cyan-400"
            >
              COPY
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)' }}
        aria-label="Draftboard"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold">Draftboard</h2>
            <p className="mt-0.5 text-[10px] text-white/55">
              {hasDraftTime && draftDateIso
                ? new Date(draftDateIso).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Draft time has not yet been set'}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              className="rounded-lg bg-white/15 p-2 text-white/90 transition hover:bg-white/25"
              aria-label="League info"
            >
              <Globe className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg bg-white/15 p-2 text-white/90 transition hover:bg-white/25"
              aria-label="Draft settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-black/35 px-4 py-3">
          <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-8">
            {(['DAYS', 'HRS', 'MINS', 'SECS'] as const).map((label) => {
              const value =
                timer === 'dash'
                  ? '—'
                  : label === 'DAYS'
                    ? String(timer.days)
                    : label === 'HRS'
                      ? String(timer.hours).padStart(2, '0')
                      : label === 'MINS'
                        ? String(timer.mins).padStart(2, '0')
                        : String(timer.secs).padStart(2, '0')
              return (
                <div key={label} className="flex min-w-[52px] flex-col items-center gap-1">
                  <span className="font-mono text-[18px] font-bold tabular-nums">{value}</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-white/45">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {sleeperDraftId ? (
          <p className="mt-2 text-[10px] text-white/35">
            Sleeper draft id: <span className="font-mono text-white/50">{sleeperDraftId}</span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <button
            type="button"
            onClick={() => void handleMockDrafts()}
            className="flex flex-1 flex-col items-center justify-center rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-left transition hover:bg-white/20 sm:min-w-[140px]"
          >
            <span className="text-sm font-semibold">Mock Drafts</span>
            <span className="text-[9px] text-white/45">Practice drafting</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDraftRoom()}
            className="flex flex-1 items-center justify-center rounded-xl bg-cyan-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-cyan-400 sm:min-w-[120px]"
          >
            Draft Room
          </button>
          {isOwner ? (
            <button
              type="button"
              onClick={handleSetTime}
              className="flex flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 sm:min-w-[120px]"
            >
              Set Time
            </button>
          ) : null}
        </div>
      </section>

      <section aria-label="Teams">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-bold text-white">Team</h2>
          <p className="text-[11px] text-white/40">
            {isFull ? 'League is full' : `${filled} of ${cap} teams`}
          </p>
        </div>

        <ul className="space-y-2">
          {sorted.map((team, index) => {
            const rank = index + 1
            const src = teamAvatarSrc(team.avatarUrl)
            const showUnclaimed = team.isOrphan && isOwner
            return (
              <li
                key={team.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-[#0c0c1e] px-3 py-2.5"
              >
                <span className="w-5 shrink-0 text-center text-[13px] text-white/25">{rank}</span>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white/70">
                      {teamInitials(team)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{team.teamName}</span>
                    <ManagerRoleBadge role={team.role} />
                    {showUnclaimed ? (
                      <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">
                        Unclaimed
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-white/35">
                    @{team.ownerName.replace(/^@/, '') || 'manager'}
                  </p>
                </div>
                <p className="w-full shrink-0 text-[10px] text-white/40 sm:ml-auto sm:w-auto sm:text-right">
                  {team.draftPosition != null
                    ? `Draft position #${team.draftPosition}`
                    : 'No draft position'}
                </p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
