'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import PermissionsWrapper from '@/components/league/PermissionsWrapper'
import type { LeagueLifecyclePermissions, LeagueLifecycleSnapshot } from '@/components/league/types'
import { useLeagueLifecycleGate } from '@/hooks/useLeagueLifecycleGate'

type Role = 'commissioner' | 'co_commissioner' | 'member' | 'viewer' | null

export default function CommissionerControlsPanel({
  leagueId,
  season,
  leagueRole,
  lifecycle,
  permissionsFromApi,
  onSuccessfulAction,
}: {
  leagueId: string
  season: number | null
  leagueRole: Role
  lifecycle?: LeagueLifecycleSnapshot
  /** When set (client sync), overrides `leagueRole` for elevated / head checks. */
  permissionsFromApi?: LeagueLifecyclePermissions | null
  /** Called after a commissioner API call succeeds (e.g. refresh audit log). */
  onSuccessfulAction?: () => void
}) {
  const router = useRouter()
  const elevatedFromRole = leagueRole === 'commissioner' || leagueRole === 'co_commissioner'
  const headFromRole = leagueRole === 'commissioner'
  const elevated =
    permissionsFromApi != null ? permissionsFromApi.isElevatedCommissioner : elevatedFromRole
  const head = permissionsFromApi != null ? permissionsFromApi.isHeadCommissioner : headFromRole
  const gate = useLeagueLifecycleGate(lifecycle, { isElevatedCommissioner: elevated })
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const refreshAfter = useCallback(() => {
    router.refresh()
  }, [router])

  const run = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      setBusy(key)
      setMsg(null)
      try {
        await fn()
        setMsg('Done.')
        refreshAfter()
        onSuccessfulAction?.()
      } catch (e) {
        if (e instanceof Error && e.message === '__cancelled__') {
          setMsg(null)
        } else {
          setMsg(e instanceof Error ? e.message : 'Request failed')
        }
      } finally {
        setBusy(null)
      }
    },
    [refreshAfter, onSuccessfulAction],
  )

  if (!elevated) return null

  const nextLifecycle =
    lifecycle?.state === 'pre_draft'
      ? 'drafting'
      : lifecycle?.state === 'drafting'
        ? 'post_draft'
        : lifecycle?.state === 'post_draft'
          ? 'in_season'
          : null

  const advanceAllowed = Boolean(nextLifecycle) && elevated
  const advanceReason = !nextLifecycle ? 'No default transition for this phase.' : undefined

  const waiverAllowed = gate.can('waiver_process_run')
  const waiverReason = gate.reason('waiver_process_run') ?? 'Cannot run waivers in this phase.'

  const automationAllowed = gate.can('automation_run')
  const automationReason = gate.reason('automation_run') ?? 'Automation not available in this phase.'

  const lockAllowed = gate.can('league_lock_toggle')
  const lockReason = gate.reason('league_lock_toggle') ?? 'Lock toggle not available.'

  return (
    <div
      className="mb-4 rounded-xl border border-sky-500/20 bg-[#0a1228]/95 p-3 text-left"
      data-testid="commissioner-controls-panel"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/90">Commissioner</p>
      <p className="text-xs text-white/50">Lifecycle, overrides, and automation (audited).</p>

      {msg ? <p className="mt-2 text-xs text-white/70">{msg}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <PermissionsWrapper allowed={advanceAllowed} reason={advanceReason} showDeniedReason>
          <button
            type="button"
            disabled={busy !== null || !nextLifecycle}
            className="rounded-lg border border-white/10 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-100 disabled:opacity-40"
            onClick={() =>
              run('advance', async () => {
                const res = await fetch(`/api/leagues/${leagueId}/lifecycle`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nextState: nextLifecycle, force: false }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Transition failed')
              })
            }
          >
            {busy === 'advance' ? 'Working…' : 'Advance phase'}
          </button>
        </PermissionsWrapper>

        <PermissionsWrapper allowed={waiverAllowed} reason={waiverReason} showDeniedReason>
          <button
            type="button"
            disabled={busy !== null || !waiverAllowed}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 disabled:opacity-40"
            onClick={() =>
              run('waivers', async () => {
                const res = await fetch(`/api/leagues/${leagueId}/commissioner-controls`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'run_waivers' }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Waivers failed')
              })
            }
          >
            {busy === 'waivers' ? 'Waivers…' : 'Run waivers'}
          </button>
        </PermissionsWrapper>

        <PermissionsWrapper allowed={automationAllowed} reason={automationReason} showDeniedReason>
          <button
            type="button"
            disabled={busy !== null || !automationAllowed}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 disabled:opacity-40"
            onClick={() =>
              run('auto', async () => {
                const res = await fetch(`/api/leagues/${leagueId}/commissioner-controls`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'run_automation',
                    automationSeason: season ?? undefined,
                    forceAutomation: false,
                  }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Automation failed')
              })
            }
          >
            {busy === 'auto' ? 'Automation…' : 'Run automation'}
          </button>
        </PermissionsWrapper>

        <PermissionsWrapper allowed={lockAllowed} reason={lockReason} showDeniedReason>
          <button
            type="button"
            disabled={busy !== null || !lockAllowed}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/85 disabled:opacity-40"
            onClick={() =>
              run('lock', async () => {
                const res = await fetch(`/api/leagues/${leagueId}/commissioner-controls`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: lifecycle?.locked ? 'unlock' : 'lock' }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Lock toggle failed')
              })
            }
          >
            {lifecycle?.locked ? 'Unlock league' : 'Lock league'}
          </button>
        </PermissionsWrapper>

        <PermissionsWrapper
          allowed={elevated}
          reason={
            lifecycle?.emergencyPaused
              ? 'Turn off emergency pause when ready to resume normal play.'
              : 'Pause non-commissioner actions across the league (draft, waivers, roster moves).'
          }
        >
          <button
            type="button"
            disabled={busy !== null}
            className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100/95 disabled:opacity-40"
            onClick={() =>
              run('pause', async () => {
                const res = await fetch(`/api/leagues/${leagueId}/commissioner-controls`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: lifecycle?.emergencyPaused ? 'emergency_pause_off' : 'emergency_pause_on',
                  }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Emergency pause failed')
              })
            }
          >
            {busy === 'pause'
              ? '…'
              : lifecycle?.emergencyPaused
                ? 'Clear emergency pause'
                : 'Emergency pause'}
          </button>
        </PermissionsWrapper>

        <PermissionsWrapper allowed={head} reason="Only the head commissioner can archive the league.">
          <button
            type="button"
            disabled={busy !== null || !head}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200/90 disabled:opacity-40"
            onClick={() =>
              run('archive', async () => {
                if (!window.confirm('Archive this league? This is intended for end-of-season wrap-up.')) {
                  throw new Error('__cancelled__')
                }
                const res = await fetch(`/api/leagues/${leagueId}/commissioner-controls`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'archive' }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Archive failed')
              })
            }
          >
            Archive league
          </button>
        </PermissionsWrapper>
      </div>
    </div>
  )
}
