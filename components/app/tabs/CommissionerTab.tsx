'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Shield, Users, FileEdit, Clock, ListChecks, MessageSquare, Settings2, Link2, Loader2, Award, TrendingUp, Heart, Pause, Play, RotateCcw, Undo2, Bot, Megaphone } from 'lucide-react'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import TabDataState from '@/components/app/tabs/TabDataState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import CommissionerBroadcastForm from '@/components/chat/CommissionerBroadcastForm'
import { LeagueRecruitmentTools } from '@/components/app/recruitment'

type DraftSessionStatus = 'pre_draft' | 'in_progress' | 'paused' | 'completed'
interface SlotOrderEntry { slot: number; rosterId: string; displayName: string }
interface DraftSessionState {
  session: { status: DraftSessionStatus; slotOrder?: SlotOrderEntry[]; picks?: unknown[] } | null
  leagueId: string
}

export default function CommissionerTab({ leagueId }: LeagueTabProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waiverPending, setWaiverPending] = useState<unknown[]>([])
  const [waiverSettings, setWaiverSettings] = useState<Record<string, unknown> | null>(null)
  const [invite, setInvite] = useState<{ inviteCode: string | null; inviteLink: string | null; joinUrl: string | null } | null>(null)
  const [managers, setManagers] = useState<{ teams: unknown[]; rosters: unknown[]; managers?: { rosterId: string; userId: string; displayName: string }[] } | null>(null)
  const [lineupInfo, setLineupInfo] = useState<{ lineupLockRule: unknown; invalidRosters: unknown[] } | null>(null)
  const [draftState, setDraftState] = useState<DraftSessionState | null>(null)
  const [commissionerSettings, setCommissionerSettings] = useState<{ settings?: { leagueChatThreadId?: string } } | null>(null)
  const [runningWaiver, setRunningWaiver] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [transferUserId, setTransferUserId] = useState('')
  const [transferConfirm, setTransferConfirm] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [overridePick, setOverridePick] = useState({ playerName: '', position: '', rosterId: '' })
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [resetDraftConfirm, setResetDraftConfirm] = useState(false)

  const base = `/api/commissioner/leagues/${encodeURIComponent(leagueId)}`
  const draftControlsUrl = `/api/leagues/${encodeURIComponent(leagueId)}/draft/controls`
  const leagueBase = `/app/league/${encodeURIComponent(leagueId)}`

  const fetchSection = useCallback(
    async (path: string) => {
      const res = await fetch(`${base}${path}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
      return res.json()
    },
    [base]
  )

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [pendingRes, settingsRes, inviteRes, managersRes, lineupRes, draftRes, commSettingsRes] = await Promise.all([
          fetch(`${base}/waivers?type=pending`),
          fetch(`${base}/waivers?type=settings`),
          fetch(`${base}/invite`),
          fetch(`${base}/managers`),
          fetch(`${base}/lineup`),
          fetch(`/api/leagues/${encodeURIComponent(leagueId)}/draft/session`, { cache: 'no-store' }),
          fetch(`${base}/settings`, { cache: 'no-store' }),
        ])
        if (!active) return
        if (pendingRes.status === 403 || settingsRes.status === 403) setError('Commissioner access denied')
        else if (pendingRes.ok) setWaiverPending((await pendingRes.json()).claims ?? [])
        if (settingsRes.ok) setWaiverSettings(await settingsRes.json())
        if (inviteRes.ok) setInvite(await inviteRes.json())
        if (managersRes.ok) setManagers(await managersRes.json())
        if (lineupRes.ok) setLineupInfo(await lineupRes.json())
        if (draftRes.ok) {
          const data = await draftRes.json()
          setDraftState({ session: data?.session ?? null, leagueId })
        }
        if (commSettingsRes.ok) setCommissionerSettings(await commSettingsRes.json())
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load commissioner data')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [base, leagueId])

  const triggerWaiverRun = async () => {
    setRunningWaiver(true)
    try {
      const res = await fetch(`${base}/waivers`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Waiver run complete. ${data.processed ?? 0} processed.`)
      setWaiverPending([])
    } catch (e: any) {
      toast.error(e?.message || 'Waiver run failed')
    } finally {
      setRunningWaiver(false)
    }
  }

  const regenerateInvite = async () => {
    setSaving('invite')
    try {
      const res = await fetch(`${base}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerate: true }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setInvite({ inviteCode: data.inviteCode, inviteLink: data.inviteLink, joinUrl: data.joinUrl })
      toast.success('Invite link regenerated')
    } catch (e: any) {
      toast.error(e?.message || 'Regenerate failed')
    } finally {
      setSaving(null)
    }
  }

  const handleTransferCommissioner = async () => {
    if (!transferUserId.trim() || !transferConfirm || transferring) return
    setTransferring(true)
    try {
      const res = await fetch(`${base}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCommissionerUserId: transferUserId.trim(), confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Transfer failed')
      toast.success('Commissioner role transferred. You will no longer have commissioner access.')
      setTransferUserId('')
      setTransferConfirm(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e?.message || 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  const runOperation = async (action: string, value?: boolean | string) => {
    setSaving(action)
    try {
      const res = await fetch(`${base}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value, description: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Setting updated')
    } catch (e: any) {
      toast.error(e?.message || 'Update failed')
    } finally {
      setSaving(null)
    }
  }

  const runDraftControl = async (action: string, body?: Record<string, unknown>) => {
    setSaving(`draft_${action}`)
    try {
      const res = await fetch(draftControlsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(action.replace(/_/g, ' ') + ' succeeded')
      const session = data?.session ?? null
      setDraftState((prev) => (prev ? { ...prev, session } : { session, leagueId }))
      if (action === 'reset_draft') setResetDraftConfirm(false)
      if (action === 'force_autopick') {
        setShowOverrideForm(false)
        setOverridePick({ playerName: '', position: '', rosterId: '' })
      }
    } catch (e: any) {
      toast.error(e?.message || 'Draft control failed')
    } finally {
      setSaving(null)
    }
  }

  const session = draftState?.session ?? null
  const draftStatus = session?.status as DraftSessionStatus | undefined
  const slotOrder = (session?.slotOrder ?? []) as SlotOrderEntry[]
  const canPause = draftStatus === 'in_progress'
  const canResume = draftStatus === 'paused'
  const canDraftControls = draftStatus === 'in_progress' || draftStatus === 'paused'
  const hasPicks = Array.isArray(session?.picks) && session.picks.length > 0
  const threadId = commissionerSettings?.settings?.leagueChatThreadId ?? null

  return (
    <TabDataState title="Commissioner" loading={loading} error={error}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <p className="font-medium text-white">Commissioner Control Center</p>
            <p className="text-xs text-white/60">You have commissioner access. Changes apply only within this league and cannot bypass global lock rules.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Heart className="h-4 w-4 text-cyan-400" /> Trust & legacy
          </h2>
          <p className="mt-1 text-xs text-white/60">
            View manager trust scores, legacy leaderboard, and Hall of Fame in one place. Use these for governance and recognition.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
            >
              <Shield className="h-3.5 w-3.5" /> Trust scores (Reputation)
            </Link>
            <Link
              href={`/app/league/${encodeURIComponent(leagueId)}?tab=Legacy`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Legacy leaderboard
            </Link>
            <Link
              href={`/app/league/${encodeURIComponent(leagueId)}?tab=Hall of Fame`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
            >
              <Award className="h-3.5 w-3.5" /> Hall of Fame
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileEdit className="h-4 w-4" /> Edit settings & managers
          </h2>
          <p className="mt-1 text-xs text-white/60">Edit league name, scoring, draft, waiver, and other settings. Replace managers or assign AI to orphan teams.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`${leagueBase}?tab=Settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
            >
              <Settings2 className="h-3.5 w-3.5" /> Edit settings
            </Link>
            <Link
              href={`${leagueBase}?tab=Settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
            >
              <Users className="h-3.5 w-3.5" /> Replace managers
            </Link>
            <Link
              href={`${leagueBase}?tab=Settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
            >
              <Bot className="h-3.5 w-3.5" /> Assign AI manager (Draft)
            </Link>
          </div>
        </section>

        <LeagueRecruitmentTools
          leagueId={leagueId}
          initialInvite={invite ? { joinUrl: invite.joinUrl, inviteCode: invite.inviteCode } : null}
          isCommissioner={true}
        />

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4" /> Managers
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {managers?.teams?.length ?? 0} teams, {managers?.rosters?.length ?? 0} rosters. Remove manager via platform or use replacement flow.
          </p>
          {Array.isArray(managers?.managers) && managers.managers.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-white/80">Transfer commissioner to another manager</p>
              <select
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">Select manager…</option>
                {managers.managers.map((m) => (
                  <option key={m.rosterId} value={m.userId}>{m.displayName} ({m.userId.slice(0, 8)}…)</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={transferConfirm}
                  onChange={(e) => setTransferConfirm(e.target.checked)}
                  className="rounded border-white/20"
                />
                I confirm I want to transfer commissioner role to this user
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTransferCommissioner}
                disabled={!transferUserId.trim() || !transferConfirm || transferring}
              >
                {transferring ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Transfer commissioner'}
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="h-4 w-4" /> Draft controls
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {session ? `Status: ${draftStatus ?? 'unknown'}. Pause, resume, reset timer, undo last pick, override pick, or reset draft.` : 'No draft session. Start draft from the Draft tab.'}
          </p>
          {session && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canPause && (
                <Button size="sm" variant="outline" onClick={() => runDraftControl('pause')} disabled={!!saving} className="border-amber-500/40 text-amber-200">
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause draft
                </Button>
              )}
              {canResume && (
                <Button size="sm" variant="outline" onClick={() => runDraftControl('resume')} disabled={!!saving} className="border-green-500/40 text-green-200">
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Resume draft
                </Button>
              )}
              {canDraftControls && (
                <Button size="sm" variant="outline" onClick={() => runDraftControl('reset_timer')} disabled={!!saving}>
                  Reset timer
                </Button>
              )}
              {canDraftControls && hasPicks && (
                <Button size="sm" variant="outline" onClick={() => runDraftControl('undo_pick')} disabled={!!saving} className="border-purple-500/40 text-purple-200">
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo last pick
                </Button>
              )}
              {canDraftControls && (
                <>
                  {!showOverrideForm ? (
                    <Button size="sm" variant="outline" onClick={() => setShowOverrideForm(true)} disabled={!!saving} className="border-cyan-500/40 text-cyan-200">
                      Override pick
                    </Button>
                  ) : (
                    <div className="w-full rounded-lg border border-cyan-500/30 bg-black/30 p-3 space-y-2">
                      <Label className="text-xs text-white/80">Force pick (player name, position)</Label>
                      <Input placeholder="Player name" value={overridePick.playerName} onChange={(e) => setOverridePick((p) => ({ ...p, playerName: e.target.value }))} className="bg-gray-900 border-white/20 text-sm" />
                      <Input placeholder="Position (e.g. QB, RB)" value={overridePick.position} onChange={(e) => setOverridePick((p) => ({ ...p, position: e.target.value }))} className="bg-gray-900 border-white/20 text-sm" />
                      {slotOrder.length > 0 && (
                        <select
                          value={overridePick.rosterId}
                          onChange={(e) => setOverridePick((p) => ({ ...p, rosterId: e.target.value }))}
                          className="w-full rounded border border-white/20 bg-gray-900 px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">Current team on clock</option>
                          {slotOrder.map((s) => (
                            <option key={s.rosterId} value={s.rosterId}>{s.displayName || s.rosterId}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => runDraftControl('force_autopick', { playerName: overridePick.playerName.trim(), position: overridePick.position.trim(), rosterId: overridePick.rosterId || undefined })} disabled={!!saving || !overridePick.playerName.trim() || !overridePick.position.trim()} className="bg-cyan-600 hover:bg-cyan-700">
                          Submit pick
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowOverrideForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {session && draftStatus !== 'pre_draft' && (
                <>
                  {!resetDraftConfirm ? (
                    <Button size="sm" variant="outline" onClick={() => setResetDraftConfirm(true)} disabled={!!saving} className="border-red-500/40 text-red-200">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset draft
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-200">Clear all picks and return to pre-draft?</span>
                      <Button size="sm" onClick={() => runDraftControl('reset_draft')} disabled={!!saving} className="bg-red-600 hover:bg-red-700">Confirm reset</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResetDraftConfirm(false)}>Cancel</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4" /> Waivers
          </h2>
          <p className="mt-1 text-xs text-white/60">Pending claims: {Array.isArray(waiverPending) ? waiverPending.length : 0}. Adjust waiver settings in Waivers tab.</p>
          <Button size="sm" className="mt-2" onClick={triggerWaiverRun} disabled={runningWaiver}>
            {runningWaiver ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run waiver processing now'}
          </Button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4" /> Lineup / roster
          </h2>
          <p className="mt-1 text-xs text-white/60">Lineup lock rule and invalid roster review. Force-correct not yet supported.</p>
          {lineupInfo && <p className="mt-1 text-xs text-white/50">Lock rule: {String(lineupInfo.lineupLockRule ?? 'not set')}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Megaphone className="h-4 w-4" /> Broadcast message
          </h2>
          <p className="mt-1 text-xs text-white/60">Send an @everyone message to league chat. Link league chat in Settings (or Chat tab) first.</p>
          {threadId ? (
            <div className="mt-3">
              <CommissionerBroadcastForm threadId={threadId} leagueId={leagueId} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/50">League chat not linked. Go to Settings → link chat to enable broadcast.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Settings2 className="h-4 w-4" /> League operations
          </h2>
          <div className="mt-2 space-y-2">
            <Button size="sm" variant="outline" onClick={() => runOperation('post_to_dashboard', true)} disabled={!!saving}>
              Post to public dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => runOperation('set_orphan_seeking', true)} disabled={!!saving}>
              Mark looking for replacement
            </Button>
            <Button size="sm" variant="outline" onClick={() => runOperation('set_ranked_visibility', true)} disabled={!!saving}>
              Set ranked visibility
            </Button>
          </div>
        </section>
      </div>
    </TabDataState>
  )
}
