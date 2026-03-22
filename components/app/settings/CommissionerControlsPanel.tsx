'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Megaphone, UserPlus, RotateCcw, Settings2, Loader2 } from 'lucide-react'
import CommissionerBroadcastForm from '@/components/chat/CommissionerBroadcastForm'

export default function CommissionerControlsPanel({ leagueId }: { leagueId?: string }) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) {
      setLoading(false)
      return
    }
    const id = leagueId
    let active = true
    async function fetchThread() {
      try {
        const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(id)}/settings`, { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (active && data?.settings?.leagueChatThreadId) {
          setThreadId(data.settings.leagueChatThreadId)
        }
      } catch {
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchThread()
    return () => { active = false }
  }, [leagueId])

  if (!leagueId) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-semibold text-white">Commissioner Controls</h3>
        <p className="mt-2 text-xs text-white/65">Select a league to access commissioner controls.</p>
      </section>
    )
  }

  const baseUrl = `/app/league/${leagueId}`
  const settingsTabs = [
    { tab: 'General', label: 'General' },
    { tab: 'Waiver Settings', label: 'Waivers' },
    { tab: 'Draft Settings', label: 'Draft' },
    { tab: 'Member Settings', label: 'Members' },
    { tab: 'Reset League', label: 'Reset' },
  ]

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Commissioner Controls</h3>
      </div>
      <p className="text-xs text-white/65">
        Full control of league settings, announcements, and membership. Use the Commissioner tab for invite link, waiver run, AI Commissioner alerts, and operations.
      </p>

      <div>
        <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Quick jump to settings
        </h4>
        <div className="flex flex-wrap gap-2">
          {settingsTabs.map(({ tab, label }) => (
            <Link
              key={tab}
              href={`${baseUrl}?tab=Settings&settingsTab=${encodeURIComponent(tab)}`}
              className="inline-flex items-center rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
            >
              {label}
            </Link>
          ))}
          <Link
            href={`${baseUrl}?tab=Commissioner`}
            className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
          >
            Commissioner tab
          </Link>
          <Link
            href={`${baseUrl}?tab=Commissioner`}
            className="inline-flex items-center rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
          >
            AI Commissioner alerts
          </Link>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5">
          <Megaphone className="h-3.5 w-3.5" /> League announcement
        </h4>
        {loading ? (
          <p className="text-xs text-white/50 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking chat link…
          </p>
        ) : threadId ? (
          <CommissionerBroadcastForm
            threadId={threadId}
            leagueId={leagueId}
            className="mt-1"
          />
        ) : (
          <p className="text-xs text-white/50">
            Link league chat in Settings (or Chat tab) to send @everyone announcements from here.
          </p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Commissioner transfer
        </h4>
        <p className="text-xs text-white/65 mb-2">
          Transfer commissioner role to another manager who has a roster in this league.
        </p>
        <Link
          href={`${baseUrl}?tab=Commissioner`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
        >
          Open Commissioner tab to transfer
        </Link>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white/80 mb-2 flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset league
        </h4>
        <p className="text-xs text-white/65">
          Reset league data (rosters, standings, etc.) is available in the Reset League sub-tab above. Use with caution.
        </p>
      </div>
    </section>
  )
}
