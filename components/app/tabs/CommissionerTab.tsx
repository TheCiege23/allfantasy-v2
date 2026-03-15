'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Shield, Users, FileEdit, Clock, ListChecks, MessageSquare, Settings2, Link2, Loader2, Award, TrendingUp, Heart } from 'lucide-react'
import type { LeagueTabProps } from '@/components/app/tabs/types'
import TabDataState from '@/components/app/tabs/TabDataState'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CommissionerTab({ leagueId }: LeagueTabProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waiverPending, setWaiverPending] = useState<unknown[]>([])
  const [waiverSettings, setWaiverSettings] = useState<Record<string, unknown> | null>(null)
  const [invite, setInvite] = useState<{ inviteCode: string | null; inviteLink: string | null; joinUrl: string | null } | null>(null)
  const [managers, setManagers] = useState<{ teams: unknown[]; rosters: unknown[] } | null>(null)
  const [lineupInfo, setLineupInfo] = useState<{ lineupLockRule: unknown; invalidRosters: unknown[] } | null>(null)
  const [runningWaiver, setRunningWaiver] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const base = `/api/commissioner/leagues/${encodeURIComponent(leagueId)}`

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
        const [pendingRes, settingsRes, inviteRes, managersRes, lineupRes] = await Promise.all([
          fetch(`${base}/waivers?type=pending`),
          fetch(`${base}/waivers?type=settings`),
          fetch(`${base}/invite`),
          fetch(`${base}/managers`),
          fetch(`${base}/lineup`),
        ])
        if (!active) return
        if (pendingRes.status === 403 || settingsRes.status === 403) setError('Commissioner access denied')
        else if (pendingRes.ok) setWaiverPending((await pendingRes.json()).claims ?? [])
        if (settingsRes.ok) setWaiverSettings(await settingsRes.json())
        if (inviteRes.ok) setInvite(await inviteRes.json())
        if (managersRes.ok) setManagers(await managersRes.json())
        if (lineupRes.ok) setLineupInfo(await lineupRes.json())
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
  }, [base])

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
            <FileEdit className="h-4 w-4" /> League management
          </h2>
          <p className="mt-1 text-xs text-white/60">Edit name, description, and settings from the League / Settings tab. Invite and managers below.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Link2 className="h-4 w-4" /> Invite link
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {invite?.joinUrl ? (
              <code className="rounded bg-white/10 px-2 py-1 text-xs text-cyan-300">{invite.joinUrl}</code>
            ) : (
              <span className="text-xs text-white/50">No invite code set</span>
            )}
            <Button size="sm" variant="outline" onClick={regenerateInvite} disabled={saving === 'invite'}>
              {saving === 'invite' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Regenerate'}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4" /> Managers
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {managers?.teams?.length ?? 0} teams, {managers?.rosters?.length ?? 0} rosters. Remove manager is not supported in-app; use your platform.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Clock className="h-4 w-4" /> Draft controls
          </h2>
          <p className="mt-1 text-xs text-white/60">Pause, resume, reset timer, undo pick, assign missed pick. Not yet wired to platform; use Sleeper (or platform) for live draft control.</p>
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
            <MessageSquare className="h-4 w-4" /> Chat / broadcast
          </h2>
          <p className="mt-1 text-xs text-white/60">Send @everyone broadcast, pin announcements, moderate. Broadcast/pin require league chat to be linked.</p>
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
