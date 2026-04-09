'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

interface TournamentCommissionerModalProps {
  tournamentId: string
  open: boolean
  onClose: () => void
}

type SettingsTab = 'general' | 'conferences' | 'leagues' | 'rounds' | 'drafts' | 'standings' | 'forum' | 'branding' | 'automation' | 'advanced'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'conferences', label: 'Conferences' },
  { id: 'leagues', label: 'Leagues' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'standings', label: 'Standings' },
  { id: 'forum', label: 'Forum' },
  { id: 'branding', label: 'Branding' },
  { id: 'automation', label: 'Automation' },
  { id: 'advanced', label: 'Advanced' },
]

function Row({ label, children, gated }: { label: string; children: React.ReactNode; gated?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 border-b border-white/5 last:border-0 ${gated ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/80">{label}</span>
        {gated && <Lock className="h-3 w-3 text-amber-400/60" />}
      </div>
      <div className="flex-shrink-0">{gated ? <span className="text-xs text-amber-300/60">Pro</span> : children}</div>
    </div>
  )
}

export function TournamentCommissionerModal({ tournamentId, open, onClose }: TournamentCommissionerModalProps) {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (open) {
      fetch(`/api/tournament/${tournamentId}/control`)
        .then((r) => r.json())
        .then((d) => setSettings(d.settings ?? d))
        .catch(() => setSettings({}))
    }
  }, [open, tournamentId])

  const save = useCallback(async (key: string, value: unknown) => {
    await fetch(`/api/tournament/${tournamentId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_setting', key, value }),
    }).catch(() => {})
    setSettings((s) => s ? { ...s, [key]: value } : s)
  }, [tournamentId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl border border-purple-400/20 bg-[#0a1628] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-lg font-semibold text-white">Tournament Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-5 w-5 text-white/60" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden sm:flex flex-col w-36 border-r border-white/10 py-2 overflow-y-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-left text-xs transition ${tab === t.id ? 'bg-purple-400/10 text-purple-100 border-l-2 border-purple-400' : 'text-white/60 hover:text-white/80 border-l-2 border-transparent'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex sm:hidden border-b border-white/10 overflow-x-auto px-2 py-1.5 gap-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${tab === t.id ? 'bg-purple-400/10 text-purple-100' : 'text-white/50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!settings ? <div className="text-sm text-white/40">Loading...</div> : (
              <>
                {tab === 'general' && (
                  <div className="space-y-1">
                    <Row label="Pool Size">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={String(settings.maxParticipants ?? 120)} onChange={(e) => save('maxParticipants', Number(e.target.value))}>
                        <option value="60">60</option><option value="120">120</option><option value="180">180</option><option value="240">240</option>
                      </select>
                    </Row>
                    <Row label="Conferences"><Input type="number" min={1} max={8} className="w-20 text-right" value={String(settings.conferenceCount ?? 2)} onChange={(e) => save('conferenceCount', Number(e.target.value))} /></Row>
                    <Row label="Teams per League"><Input type="number" min={8} max={16} className="w-20 text-right" value={String(settings.teamsPerLeague ?? 12)} onChange={(e) => save('teamsPerLeague', Number(e.target.value))} /></Row>
                    <Row label="Naming Mode">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white" value={String(settings.namingMode ?? 'ai_generated')} onChange={(e) => save('namingMode', e.target.value)}>
                        <option value="ai_generated">AI Generated</option><option value="commissioner_custom">Manual</option><option value="hybrid">AI + Edit</option>
                      </select>
                    </Row>
                  </div>
                )}
                {tab === 'rounds' && (
                  <div className="space-y-1">
                    <Row label="Total Rounds"><Input type="number" min={2} max={6} className="w-20 text-right" value={String(settings.totalRounds ?? 4)} onChange={(e) => save('totalRounds', Number(e.target.value))} /></Row>
                    <Row label="Advancers per League"><Input type="number" min={1} max={8} className="w-20 text-right" value={String(settings.advancersPerLeague ?? 4)} onChange={(e) => save('advancersPerLeague', Number(e.target.value))} /></Row>
                    <Row label="Bubble Enabled"><Switch checked={Boolean(settings.bubbleEnabled)} onCheckedChange={(v) => save('bubbleEnabled', v)} /></Row>
                    <Row label="Bubble Size"><Input type="number" min={0} max={16} className="w-20 text-right" value={String(settings.bubbleSize ?? 4)} onChange={(e) => save('bubbleSize', Number(e.target.value))} /></Row>
                  </div>
                )}
                {tab === 'drafts' && (
                  <div className="space-y-1">
                    <Row label="Redraft Between Rounds"><Switch checked={Boolean(settings.redraftBetweenRounds)} onCheckedChange={(v) => save('redraftBetweenRounds', v)} /></Row>
                    <Row label="Auto-Schedule Drafts"><Switch checked={Boolean(settings.autoScheduleDrafts)} onCheckedChange={(v) => save('autoScheduleDrafts', v)} /></Row>
                    <Row label="Trades Enabled"><Switch checked={Boolean(settings.tradesEnabled)} onCheckedChange={(v) => save('tradesEnabled', v)} /></Row>
                  </div>
                )}
                {tab === 'standings' && (
                  <div className="space-y-1">
                    <Row label="Global Top X"><Input type="number" min={16} max={240} className="w-20 text-right" value={String(settings.globalTopX ?? 60)} onChange={(e) => save('globalTopX', Number(e.target.value))} /></Row>
                    <Row label="Weekly Standings Visible"><Switch checked={settings.weeklyStandingsVisible !== false} onCheckedChange={(v) => save('weeklyStandingsVisible', v)} /></Row>
                    <Row label="Eliminated Can View Hub"><Switch checked={settings.eliminatedCanView !== false} onCheckedChange={(v) => save('eliminatedCanView', v)} /></Row>
                  </div>
                )}
                {tab === 'automation' && (
                  <div className="space-y-1">
                    <Row label="Auto-Create Next Leagues"><Switch checked={settings.autoCreateNextLeagues !== false} onCheckedChange={(v) => save('autoCreateNextLeagues', v)} /></Row>
                    <Row label="Auto-Assign Advancers"><Switch checked={settings.autoAssignAdvancers !== false} onCheckedChange={(v) => save('autoAssignAdvancers', v)} /></Row>
                    <Row label="AI Recap Posts" gated><Switch defaultChecked={false} /></Row>
                    <Row label="AI Storylines" gated><Switch defaultChecked={false} /></Row>
                  </div>
                )}
                {tab === 'branding' && (
                  <div className="text-sm text-white/50">Conference and league branding can be managed in the Conferences and Leagues tabs.</div>
                )}
                {tab === 'conferences' && <div className="text-sm text-white/50">Conference management — edit names, themes, colors.</div>}
                {tab === 'leagues' && <div className="text-sm text-white/50">League management — edit names, assign participants.</div>}
                {tab === 'forum' && <div className="text-sm text-white/50">Post announcements, pin messages, manage forum visibility.</div>}
                {tab === 'advanced' && (
                  <div className="space-y-1">
                    <Row label="Force Advance Round"><Button size="sm" variant="outline" onClick={() => save('forceAdvance', true)}>Force</Button></Row>
                    <Row label="Rebalance Leagues"><Button size="sm" variant="outline" onClick={() => save('rebalance', true)}>Rebalance</Button></Row>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
