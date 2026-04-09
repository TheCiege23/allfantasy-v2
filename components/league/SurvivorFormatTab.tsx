'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface SurvivorFormatTabProps {
  leagueId: string
  hasAfCommissionerSub: boolean
}

interface SurvivorSettings {
  [key: string]: unknown
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-white/70 uppercase tracking-wide">{label}</h3>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4">{children}</div>
    </section>
  )
}

function Row({ label, children, gated, hasSub, tooltip }: {
  label: string; children: React.ReactNode; gated?: boolean; hasSub?: boolean; tooltip?: string
}) {
  const locked = gated && !hasSub
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 border-b border-white/5 last:border-0 ${locked ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/80">{label}</span>
        {tooltip && <span className="text-xs text-white/30" title={tooltip}>?</span>}
        {locked && <Lock className="h-3 w-3 text-amber-400/60" />}
      </div>
      <div className="flex-shrink-0">
        {locked ? <span className="text-xs text-amber-300/60">Pro</span> : children}
      </div>
    </div>
  )
}

/**
 * Survivor Format-Specific Settings Tab (Tab 3 in the 3-tab shell).
 *
 * FREE features (included without subscription):
 *   - Idol dispersement, @Chimmy voting, storyline, minigames
 *   - Basic tribe config, merge/jury, tribal council rules
 *   - Exile island core features
 *
 * GATED features (require AF Commissioner Subscription):
 *   - Anti-tanking detection
 *   - Anti-collusion monitoring
 *   - Odd number playoff teams
 *   - Extended scoring corrections
 *   - AI episode recaps, betrayal arcs, rivalry tracking
 *   - AI confessional system
 *   - AI commissioner alerts
 *   - Post-season highlights
 *   - Advanced challenge generation
 */
export function SurvivorFormatTab({ leagueId, hasAfCommissionerSub }: SurvivorFormatTabProps) {
  const [settings, setSettings] = useState<SurvivorSettings | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/survivor/config`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
  }, [leagueId])

  const save = useCallback(async (key: string, value: unknown) => {
    setSavedKey(null)
    await fetch(`/api/leagues/${leagueId}/survivor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    setSettings((s) => s ? { ...s, [key]: value } : s)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1500)
  }, [leagueId])

  if (!settings) return <div className="text-sm text-white/40">Loading Survivor settings...</div>

  const sub = hasAfCommissionerSub

  return (
    <div>
      {savedKey && <div className="mb-3 text-xs text-emerald-400">Saved</div>}

      {/* ===== FREE: Setup ===== */}
      <Section label="Setup">
        <Row label="Player Count">
          <Input type="number" min={16} max={20} className="w-20 text-right"
            value={String(settings.survivorPlayerCount ?? 20)}
            onChange={(e) => save('survivorPlayerCount', Number(e.target.value))} />
        </Row>
        <Row label="Tribe Count">
          <Input type="number" min={2} max={5} className="w-20 text-right"
            value={String(settings.survivorTribeCount ?? 4)}
            onChange={(e) => save('survivorTribeCount', Number(e.target.value))} />
        </Row>
        <Row label="Commissioner Plays" tooltip="When enabled, commissioner participates as a regular player. Blind mode activates — commissioner cannot see who has idols, vote counts, or hidden info. System handles all vote counting autonomously.">
          <Switch checked={Boolean(settings.survivorCommissionerPlays)} onCheckedChange={(v) => save('survivorCommissionerPlays', v)} />
        </Row>
        <Row label="Tribe Naming">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorTribeNaming ?? 'auto')}
            onChange={(e) => save('survivorTribeNaming', e.target.value)}>
            <option value="auto">Auto</option>
            <option value="ai">AI Generated</option>
            <option value="custom">Custom</option>
          </select>
        </Row>
      </Section>

      {/* ===== FREE: Tribal Council ===== */}
      <Section label="Tribal Council">
        <Row label="Self-Vote Allowed">
          <Switch checked={Boolean(settings.survivorSelfVoteAllowed)} onCheckedChange={(v) => save('survivorSelfVoteAllowed', v)} />
        </Row>
        <Row label="Go to Rocks">
          <Switch checked={settings.survivorRocksEnabled !== false} onCheckedChange={(v) => save('survivorRocksEnabled', v)} />
        </Row>
        <Row label="Tie Resolution">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorTieRule ?? 'rocks')}
            onChange={(e) => save('survivorTieRule', e.target.value)}>
            <option value="rocks">Go to Rocks</option>
            <option value="fire_making">Fire Making</option>
            <option value="score">Season Points</option>
            <option value="commissioner">Commissioner Decides</option>
          </select>
        </Row>
        <Row label="Vote Reveal Mode">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorRevealMode ?? 'dramatic')}
            onChange={(e) => save('survivorRevealMode', e.target.value)}>
            <option value="dramatic">Dramatic (1-by-1)</option>
            <option value="full_public">Full Public</option>
            <option value="anonymized">Anonymized</option>
            <option value="delayed">Delayed</option>
          </select>
        </Row>
      </Section>

      {/* ===== FREE: Idols & Powers ===== */}
      <Section label="Idols & Powers">
        <Row label="Idols Enabled" tooltip="Free: includes idol dispersement and @Chimmy idol plays">
          <Switch checked={settings.survivorIdolsEnabled !== false} onCheckedChange={(v) => save('survivorIdolsEnabled', v)} />
        </Row>
        <Row label="Idol Count">
          <Input type="number" min={0} max={20} className="w-20 text-right"
            value={String(settings.survivorIdolCount ?? 9)}
            onChange={(e) => save('survivorIdolCount', Number(e.target.value))} />
        </Row>
        <Row label="Tradable">
          <Switch checked={Boolean(settings.survivorIdolsTradable)} onCheckedChange={(v) => save('survivorIdolsTradable', v)} />
        </Row>
        <Row label="Expire at Merge">
          <Switch checked={settings.survivorIdolsExpireAtMerge !== false} onCheckedChange={(v) => save('survivorIdolsExpireAtMerge', v)} />
        </Row>
        <Row label="Idol Expiry Week" tooltip="Week after which idols can no longer be played. Default: Final 5 players remaining.">
          <Input type="number" min={4} max={20} className="w-20 text-right"
            value={String(settings.survivorIdolExpiryWeek ?? '')}
            placeholder="Auto"
            onChange={(e) => save('survivorIdolExpiryWeek', e.target.value ? Number(e.target.value) : null)} />
        </Row>
      </Section>

      {/* ===== FREE: Merge & Jury ===== */}
      <Section label="Merge & Jury">
        <Row label="Merge Trigger">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorMergeTrigger ?? 'player_count')}
            onChange={(e) => save('survivorMergeTrigger', e.target.value)}>
            <option value="player_count">At Player Count</option>
            <option value="week">At Week</option>
          </select>
        </Row>
        <Row label={settings.survivorMergeTrigger === 'week' ? 'Merge Week' : 'Merge at Players'}>
          <Input type="number" min={4} max={16} className="w-20 text-right"
            value={String(settings.survivorMergeTrigger === 'week' ? (settings.survivorMergeWeek ?? 8) : (settings.survivorMergeAtCount ?? 10))}
            onChange={(e) => save(settings.survivorMergeTrigger === 'week' ? 'survivorMergeWeek' : 'survivorMergeAtCount', Number(e.target.value))} />
        </Row>
        <Row label="Jury Start">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorJuryStart ?? 'after_merge')}
            onChange={(e) => save('survivorJuryStart', e.target.value)}>
            <option value="after_merge">After Merge</option>
            <option value="first_post_merge_vote">First Post-Merge Vote</option>
            <option value="at_player_count">At Player Count</option>
          </select>
        </Row>
      </Section>

      {/* ===== FREE: Exile Island ===== */}
      <Section label="Exile Island">
        <Row label="Exile Enabled">
          <Switch checked={settings.survivorExileEnabled !== false} onCheckedChange={(v) => save('survivorExileEnabled', v)} />
        </Row>
        <Row label="Token Pool">
          <Switch checked={settings.survivorTokenEnabled !== false} onCheckedChange={(v) => save('survivorTokenEnabled', v)} />
        </Row>
        <Row label="Boss Reset">
          <Switch checked={settings.survivorBossResetEnabled !== false} onCheckedChange={(v) => save('survivorBossResetEnabled', v)} />
        </Row>
        <Row label="Token Cap">
          <Input type="number" min={0} max={20} className="w-20 text-right"
            value={String(settings.survivorTokenCap ?? 10)}
            onChange={(e) => save('survivorTokenCap', Number(e.target.value))} />
        </Row>
        <Row label="Harsh Token Loss (wrong pick = wipe)">
          <Switch checked={Boolean(settings.survivorExileHarshTokenLoss)} onCheckedChange={(v) => save('survivorExileHarshTokenLoss', v)} />
        </Row>
      </Section>

      {/* ===== FREE: Challenges & AI Core ===== */}
      <Section label="Challenges & AI (Free)">
        <Row label="Challenge Mode" tooltip="Free: auto-generated minigames specific to this league">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.survivorChallengeMode ?? 'automatic')}
            onChange={(e) => save('survivorChallengeMode', e.target.value)}>
            <option value="automatic">Automatic</option>
            <option value="semi_automatic">Semi-Auto (Approve)</option>
            <option value="manual">Manual</option>
          </select>
        </Row>
        <Row label="@Chimmy Voting" tooltip="Free: private DM voting via @Chimmy">
          <Switch checked disabled />
        </Row>
        <Row label="AI Storyline (Weekly Host Posts)" tooltip="Free: basic weekly host messages and narrative">
          <Switch checked={settings.survivorWeeklyMessages !== false} onCheckedChange={(v) => save('survivorWeeklyMessages', v)} />
        </Row>
        <Row label="Daily Island Messages">
          <Switch checked={Boolean(settings.survivorDailyMessages)} onCheckedChange={(v) => save('survivorDailyMessages', v)} />
        </Row>
      </Section>

      {/* ===== GATED: Advanced AI Features ===== */}
      <Section label="Advanced AI Features">
        <Row label="AI Episode Recaps" gated hasSub={sub} tooltip="Weekly episode-style AI narrative recap">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Betrayal Arc Tracking" gated hasSub={sub} tooltip="AI tracks betrayals and alliance shifts">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Rivalry Tracking" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Commissioner Alerts" gated hasSub={sub} tooltip="AI flags unusual activity to commissioner">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Confessional System" gated hasSub={sub} tooltip="Players submit private thoughts, AI summarizes post-season">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Post-Season Highlights" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Finale Drama Writeup" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Advanced Challenge AI" gated hasSub={sub} tooltip="AI generates unique sport-specific challenges beyond templates">
          <Switch defaultChecked={false} />
        </Row>
      </Section>

      {/* ===== GATED: Competitive Integrity ===== */}
      <Section label="Competitive Integrity">
        <Row label="Anti-Tanking Detection" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Anti-Collusion Monitoring" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Lineup Neglect Warnings" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
      </Section>

      {/* ===== GATED: Extended Scoring ===== */}
      <Section label="Extended Features">
        <Row label="Extended Scoring Corrections" gated hasSub={sub} tooltip="Apply stat corrections that can reverse eliminations">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Odd Number Playoff Teams" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
      </Section>

      {/* ===== Commissioner Quick Actions ===== */}
      <Section label="Commissioner Actions">
        <Row label="Pause Season" tooltip="Pauses all automation until resumed">
          <button
            onClick={() => fetch(`/api/survivor/commissioner`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leagueId, action: 'pause_season' }),
            })}
            className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/10"
          >
            Pause
          </button>
        </Row>
        <Row label="Resume Season">
          <button
            onClick={() => fetch(`/api/survivor/commissioner`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leagueId, action: 'resume_season' }),
            })}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/10"
          >
            Resume
          </button>
        </Row>
        <Row label="Grant Idol to Player" tooltip="Manually assign an idol/advantage to a player">
          <button
            onClick={() => {
              const userId = prompt('Enter player user ID:')
              const powerType = prompt('Power type (e.g. hidden_immunity_idol):')
              if (userId && powerType) {
                fetch(`/api/survivor/commissioner`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ leagueId, action: 'grant_idol', userId, powerType }),
                })
              }
            }}
            className="rounded-lg border border-violet-400/30 bg-violet-400/5 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-400/10"
          >
            Grant Idol
          </button>
        </Row>
      </Section>
    </div>
  )
}
