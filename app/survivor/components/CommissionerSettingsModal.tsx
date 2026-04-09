'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Save, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface CommissionerSettingsModalProps {
  leagueId: string
  open: boolean
  onClose: () => void
}

type SettingsTab =
  | 'setup'
  | 'tribes'
  | 'challenges'
  | 'tribal'
  | 'idols'
  | 'exile'
  | 'merge'
  | 'chat'
  | 'ai'
  | 'notifications'
  | 'advanced'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'tribes', label: 'Tribes' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'tribal', label: 'Tribal' },
  { id: 'idols', label: 'Idols' },
  { id: 'exile', label: 'Exile' },
  { id: 'merge', label: 'Merge / Jury' },
  { id: 'chat', label: 'Chat' },
  { id: 'ai', label: 'AI Host' },
  { id: 'notifications', label: 'Alerts' },
  { id: 'advanced', label: 'Advanced' },
]

interface SurvivorSettings {
  survivorPlayerCount: number
  survivorTribeCount: number
  survivorTribeNaming: string
  survivorMergeTrigger: string
  survivorMergeWeek: number
  survivorMergeAtCount: number
  survivorJuryStart: string
  survivorIdolsEnabled: boolean
  survivorIdolCount: number
  survivorIdolsTradable: boolean
  survivorIdolsExpireAtMerge: boolean
  survivorExileEnabled: boolean
  survivorTokenEnabled: boolean
  survivorBossResetEnabled: boolean
  survivorSelfVoteAllowed: boolean
  survivorRocksEnabled: boolean
  survivorTieRule: string
  survivorRevealMode: string
  survivorChallengeMode: string
  survivorDailyMessages: boolean
  survivorWeeklyMessages: boolean
  survivorRebalanceTrigger: number
  survivorTokenCap: number
  survivorExileHarshTokenLoss: boolean
  [key: string]: unknown
}

function SettingRow({ label, children, locked, tooltip }: {
  label: string; children: React.ReactNode; locked?: boolean; tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/80">{label}</span>
        {tooltip && <span className="text-xs text-white/30" title={tooltip}>?</span>}
        {locked && <Lock className="h-3 w-3 text-amber-400/60" />}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-300">Sure?</span>
        <Button size="sm" variant="destructive" onClick={() => { onConfirm(); setConfirming(false) }}>Yes</Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>No</Button>
      </div>
    )
  }
  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <AlertTriangle className="h-3 w-3 mr-1" />{label}
    </Button>
  )
}

export function CommissionerSettingsModal({ leagueId, open, onClose }: CommissionerSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('setup')
  const [settings, setSettings] = useState<SurvivorSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/survivor/config`)
    if (res.ok) {
      const data = await res.json()
      setSettings(data)
    }
  }, [leagueId])

  useEffect(() => {
    if (open) fetchSettings()
  }, [open, fetchSettings])

  const save = async (key: string, value: unknown) => {
    setSaving(true)
    setSavedKey(null)
    await fetch(`/api/leagues/${leagueId}/survivor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    setSettings((s) => s ? { ...s, [key]: value } : s)
    setSavedKey(key)
    setSaving(false)
    setTimeout(() => setSavedKey(null), 1500)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl border border-white/10 bg-[#0a1628] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-lg font-semibold text-white">Commissioner Settings</h2>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-cyan-300 animate-pulse">Saving...</span>}
            {savedKey && !saving && <span className="text-xs text-emerald-400">Saved</span>}
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
              <X className="h-5 w-5 text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab sidebar (desktop) / horizontal scroll (mobile) */}
          <div className="hidden sm:flex flex-col w-40 border-r border-white/10 py-2 overflow-y-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-left text-sm transition ${
                  tab === t.id
                    ? 'bg-cyan-300/10 text-cyan-100 border-l-2 border-cyan-400'
                    : 'text-white/60 hover:text-white/80 border-l-2 border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Mobile tab bar */}
          <div className="flex sm:hidden border-b border-white/10 overflow-x-auto px-2 py-1.5 gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                  tab === t.id
                    ? 'bg-cyan-300/10 text-cyan-100'
                    : 'text-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!settings ? (
              <div className="text-sm text-white/40">Loading settings...</div>
            ) : (
              <>
                {tab === 'setup' && (
                  <div className="space-y-1">
                    <SettingRow label="Player Count">
                      <Input type="number" min={16} max={20} className="w-20 text-right"
                        value={settings.survivorPlayerCount ?? 20}
                        onChange={(e) => save('survivorPlayerCount', Number(e.target.value))} />
                    </SettingRow>
                    <SettingRow label="Tribe Count">
                      <Input type="number" min={2} max={5} className="w-20 text-right"
                        value={settings.survivorTribeCount ?? 4}
                        onChange={(e) => save('survivorTribeCount', Number(e.target.value))} />
                    </SettingRow>
                    <SettingRow label="Tribe Naming" tooltip="auto, ai, or custom">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorTribeNaming ?? 'auto'}
                        onChange={(e) => save('survivorTribeNaming', e.target.value)}>
                        <option value="auto">Auto</option>
                        <option value="ai">AI Generated</option>
                        <option value="custom">Custom</option>
                      </select>
                    </SettingRow>
                  </div>
                )}

                {tab === 'tribes' && (
                  <div className="space-y-1">
                    <SettingRow label="Rebalance Trigger (min tribe size)">
                      <Input type="number" min={2} max={6} className="w-20 text-right"
                        value={settings.survivorRebalanceTrigger ?? 3}
                        onChange={(e) => save('survivorRebalanceTrigger', Number(e.target.value))} />
                    </SettingRow>
                    <SettingRow label="Tribe Swap">
                      <ConfirmButton label="Execute Swap Now" onConfirm={() => {
                        fetch(`/api/survivor/tribes`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leagueId, action: 'swap' }),
                        })
                      }} />
                    </SettingRow>
                  </div>
                )}

                {tab === 'challenges' && (
                  <div className="space-y-1">
                    <SettingRow label="Challenge Mode">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorChallengeMode ?? 'automatic'}
                        onChange={(e) => save('survivorChallengeMode', e.target.value)}>
                        <option value="automatic">Automatic</option>
                        <option value="semi_automatic">Semi-Auto (Approve)</option>
                        <option value="manual">Manual</option>
                      </select>
                    </SettingRow>
                  </div>
                )}

                {tab === 'tribal' && (
                  <div className="space-y-1">
                    <SettingRow label="Allow Self-Voting">
                      <Switch checked={settings.survivorSelfVoteAllowed ?? false}
                        onCheckedChange={(v) => save('survivorSelfVoteAllowed', v)} />
                    </SettingRow>
                    <SettingRow label="Go to Rocks">
                      <Switch checked={settings.survivorRocksEnabled ?? true}
                        onCheckedChange={(v) => save('survivorRocksEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Tie Rule">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorTieRule ?? 'rocks'}
                        onChange={(e) => save('survivorTieRule', e.target.value)}>
                        <option value="rocks">Go to Rocks</option>
                        <option value="fire_making">Fire Making</option>
                        <option value="score">Season Points</option>
                        <option value="commissioner">Commissioner Decides</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Vote Reveal Mode">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorRevealMode ?? 'dramatic'}
                        onChange={(e) => save('survivorRevealMode', e.target.value)}>
                        <option value="dramatic">Dramatic (1-by-1)</option>
                        <option value="full_public">Full Public</option>
                        <option value="anonymized">Anonymized</option>
                        <option value="delayed">Delayed Reveal</option>
                      </select>
                    </SettingRow>
                  </div>
                )}

                {tab === 'idols' && (
                  <div className="space-y-1">
                    <SettingRow label="Idols Enabled">
                      <Switch checked={settings.survivorIdolsEnabled ?? true}
                        onCheckedChange={(v) => save('survivorIdolsEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Total Idol Count">
                      <Input type="number" min={0} max={20} className="w-20 text-right"
                        value={settings.survivorIdolCount ?? 9}
                        onChange={(e) => save('survivorIdolCount', Number(e.target.value))} />
                    </SettingRow>
                    <SettingRow label="Idols Tradable">
                      <Switch checked={settings.survivorIdolsTradable ?? false}
                        onCheckedChange={(v) => save('survivorIdolsTradable', v)} />
                    </SettingRow>
                    <SettingRow label="Expire at Merge">
                      <Switch checked={settings.survivorIdolsExpireAtMerge ?? true}
                        onCheckedChange={(v) => save('survivorIdolsExpireAtMerge', v)} />
                    </SettingRow>
                  </div>
                )}

                {tab === 'exile' && (
                  <div className="space-y-1">
                    <SettingRow label="Exile Island">
                      <Switch checked={settings.survivorExileEnabled ?? true}
                        onCheckedChange={(v) => save('survivorExileEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Token Pool">
                      <Switch checked={settings.survivorTokenEnabled ?? true}
                        onCheckedChange={(v) => save('survivorTokenEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Boss Reset on Win">
                      <Switch checked={settings.survivorBossResetEnabled ?? true}
                        onCheckedChange={(v) => save('survivorBossResetEnabled', v)} />
                    </SettingRow>
                    <SettingRow label="Token Cap">
                      <Input type="number" min={0} max={20} className="w-20 text-right"
                        value={settings.survivorTokenCap ?? 10}
                        onChange={(e) => save('survivorTokenCap', Number(e.target.value))} />
                    </SettingRow>
                    <SettingRow label="Harsh Token Loss (wrong pick = wipe)">
                      <Switch checked={settings.survivorExileHarshTokenLoss ?? false}
                        onCheckedChange={(v) => save('survivorExileHarshTokenLoss', v)} />
                    </SettingRow>
                  </div>
                )}

                {tab === 'merge' && (
                  <div className="space-y-1">
                    <SettingRow label="Merge Trigger">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorMergeTrigger ?? 'player_count'}
                        onChange={(e) => save('survivorMergeTrigger', e.target.value)}>
                        <option value="player_count">At Player Count</option>
                        <option value="week">At Week</option>
                      </select>
                    </SettingRow>
                    <SettingRow label={settings.survivorMergeTrigger === 'week' ? 'Merge at Week' : 'Merge at Players'}>
                      <Input type="number" min={4} max={16} className="w-20 text-right"
                        value={settings.survivorMergeTrigger === 'week'
                          ? (settings.survivorMergeWeek ?? 8)
                          : (settings.survivorMergeAtCount ?? 10)}
                        onChange={(e) => save(
                          settings.survivorMergeTrigger === 'week' ? 'survivorMergeWeek' : 'survivorMergeAtCount',
                          Number(e.target.value)
                        )} />
                    </SettingRow>
                    <SettingRow label="Jury Starts">
                      <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
                        value={settings.survivorJuryStart ?? 'after_merge'}
                        onChange={(e) => save('survivorJuryStart', e.target.value)}>
                        <option value="after_merge">After Merge</option>
                        <option value="first_post_merge_vote">First Post-Merge Vote</option>
                        <option value="at_player_count">At Player Count</option>
                      </select>
                    </SettingRow>
                    <SettingRow label="Trigger Merge Now">
                      <ConfirmButton label="Merge Now" onConfirm={() => {
                        fetch(`/api/survivor/gamestate`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ leagueId, action: 'force_merge' }),
                        })
                      }} />
                    </SettingRow>
                  </div>
                )}

                {tab === 'chat' && (
                  <div className="space-y-1">
                    <SettingRow label="Daily Host Messages">
                      <Switch checked={settings.survivorDailyMessages ?? false}
                        onCheckedChange={(v) => save('survivorDailyMessages', v)} />
                    </SettingRow>
                    <SettingRow label="Weekly Host Messages">
                      <Switch checked={settings.survivorWeeklyMessages ?? true}
                        onCheckedChange={(v) => save('survivorWeeklyMessages', v)} />
                    </SettingRow>
                  </div>
                )}

                {tab === 'ai' && (
                  <div className="space-y-1">
                    <SettingRow label="AI Auto-Create Challenges" locked>
                      <Switch checked={settings.survivorChallengeMode === 'automatic'}
                        onCheckedChange={(v) => save('survivorChallengeMode', v ? 'automatic' : 'manual')} />
                    </SettingRow>
                    <SettingRow label="AI Storyline Recaps" locked tooltip="AF Commissioner Subscription">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-amber-400/60" />
                        <span className="text-xs text-amber-300/60">Pro</span>
                      </div>
                    </SettingRow>
                    <SettingRow label="AI Confessional System" locked tooltip="AF Commissioner Subscription">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-amber-400/60" />
                        <span className="text-xs text-amber-300/60">Pro</span>
                      </div>
                    </SettingRow>
                  </div>
                )}

                {tab === 'notifications' && (
                  <div className="text-sm text-white/50">
                    Notification preferences are set per-player in their profile settings.
                    Commissioner can control what system messages are posted to league chat.
                  </div>
                )}

                {tab === 'advanced' && (
                  <div className="space-y-1">
                    <SettingRow label="Force Elimination">
                      <ConfirmButton label="Force Eliminate" onConfirm={() => {}} />
                    </SettingRow>
                    <SettingRow label="Reset Season">
                      <ConfirmButton label="Reset" onConfirm={() => {}} />
                    </SettingRow>
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
