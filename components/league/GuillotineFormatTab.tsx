'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface GuillotineFormatTabProps {
  leagueId: string
  hasAfCommissionerSub: boolean
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
      <div className="flex-shrink-0">{locked ? <span className="text-xs text-amber-300/60">Pro</span> : children}</div>
    </div>
  )
}

export function GuillotineFormatTab({ leagueId, hasAfCommissionerSub }: GuillotineFormatTabProps) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/guillotine/summary`)
      .then((r) => r.json())
      .then((d) => setSettings(d?.config ?? d))
      .catch(() => setSettings({}))
  }, [leagueId])

  const save = useCallback(async (key: string, value: unknown) => {
    setSavedKey(null)
    await fetch(`/api/guillotine/season`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, action: 'update_config', [key]: value }),
    }).catch(() => {})
    setSettings((s) => s ? { ...s, [key]: value } : s)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1500)
  }, [leagueId])

  if (!settings) return <div className="text-sm text-white/40">Loading Guillotine settings...</div>

  const sub = hasAfCommissionerSub

  return (
    <div>
      {savedKey && <div className="mb-3 text-xs text-emerald-400">Saved</div>}

      {/* Schedule Info (read-only, derived from sport) */}
      <Section label="Schedule">
        <Row label="Chop Day" tooltip="Same day every week — lowest scorer is eliminated">
          <span className="text-sm text-red-300/80">{String(settings.chopLabel ?? settings.chopDay ?? 'Tuesday')}</span>
        </Row>
        <Row label="Waiver Day" tooltip="Day after chop — eliminated roster enters the player pool">
          <span className="text-sm text-emerald-300/80">{String(settings.waiverLabel ?? settings.waiverDay ?? 'Wednesday')}</span>
        </Row>
        <Row label="Default Team Count" tooltip="Regular season weeks - 1">
          <span className="text-sm text-white">{String(settings.defaultTeamCount ?? settings.teamCount ?? '—')}</span>
        </Row>
        <Row label="Stat Correction Window">
          <Input type="number" min={0} max={72} className="w-20 text-right"
            value={String(settings.statCorrectionHours ?? 48)}
            onChange={(e) => save('statCorrectionHours', Number(e.target.value))} />
          <span className="ml-1 text-xs text-white/40">hours</span>
        </Row>
      </Section>

      {/* Elimination */}
      <Section label="Elimination">
        <Row label="Eliminations Per Period">
          <Input type="number" min={1} max={3} className="w-20 text-right"
            value={String(settings.guillotineEliminationsPerPeriod ?? 1)}
            onChange={(e) => save('guillotineEliminationsPerPeriod', Number(e.target.value))} />
        </Row>
        <Row label="Protected Week 1">
          <Switch checked={Boolean(settings.guillotineProtectedWeek1)}
            onCheckedChange={(v) => save('guillotineProtectedWeek1', v)} />
        </Row>
        <Row label="Endgame Format">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.guillotineEndgame ?? 'last_team_standing')}
            onChange={(e) => save('guillotineEndgame', e.target.value)}>
            <option value="last_team_standing">Last Team Standing</option>
            <option value="final_four">Final Four</option>
            <option value="final_three">Final 3</option>
            <option value="final_two">Final 2 Showdown</option>
          </select>
        </Row>
        <Row label="Final Stage Scoring">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.guillotineFinalStageScoring ?? 'cumulative')}
            onChange={(e) => save('guillotineFinalStageScoring', e.target.value)}>
            <option value="cumulative">Cumulative Total</option>
            <option value="single_period">Single Period</option>
          </select>
        </Row>
      </Section>

      {/* Tiebreakers */}
      <Section label="Tiebreakers">
        <Row label="Primary Tiebreaker">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.guillotineTiebreaker ?? 'lowest_bench_points')}
            onChange={(e) => save('guillotineTiebreaker', e.target.value)}>
            <option value="lowest_bench_points">Lowest Bench Points</option>
            <option value="lowest_cumulative">Lowest Season Total</option>
            <option value="lowest_projected">Lowest Projected</option>
            <option value="worst_previous">Worst Previous Period</option>
            <option value="commissioner">Commissioner Decides</option>
          </select>
        </Row>
      </Section>

      {/* Waivers */}
      <Section label="Waivers & Player Pool">
        <Row label="Same-Period Pickups" tooltip="Allow picking up eliminated players during the same scoring period">
          <Switch checked={Boolean(settings.guillotineSamePeriodPickups)}
            onCheckedChange={(v) => save('guillotineSamePeriodPickups', v)} />
        </Row>
        <Row label="Waiver Delay (hours)" tooltip="Hours after elimination before players become available">
          <Input type="number" min={0} max={72} className="w-20 text-right"
            value={String(settings.guillotineWaiverDelay ?? 0)}
            onChange={(e) => save('guillotineWaiverDelay', Number(e.target.value))} />
        </Row>
        <Row label="Roster Release Timing">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.rosterReleaseTiming ?? 'next_waiver_run')}
            onChange={(e) => save('rosterReleaseTiming', e.target.value)}>
            <option value="next_waiver_run">Next Waiver Run</option>
            <option value="immediate">Immediate</option>
            <option value="next_period">Next Scoring Period</option>
          </select>
        </Row>
      </Section>

      {/* Roster Expansion */}
      <Section label="Roster Evolution">
        <Row label="Roster Expansion" tooltip="Auto-expand roster as teams get eliminated">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={JSON.stringify(settings.guillotineRosterExpansion ?? '[]') === '[]' ? 'none' : 'enabled'}
            onChange={(e) => save('guillotineRosterExpansion', e.target.value === 'none' ? [] : [{ atTeamsRemaining: 8, addBench: 1 }, { atTeamsRemaining: 4, addStarter: 1 }])}>
            <option value="none">No Expansion</option>
            <option value="enabled">Auto-Expand</option>
          </select>
        </Row>
      </Section>

      {/* Notifications & Visibility */}
      <Section label="Notifications & Visibility">
        <Row label="Danger Zone Alerts" tooltip="Notify managers when they're in the chop zone">
          <Switch checked={settings.dangerAlerts !== false} onCheckedChange={(v) => save('dangerAlerts', v)} />
        </Row>
        <Row label="FAAB Balances Visible to All" tooltip="If OFF, FAAB balances are hidden until spent">
          <Switch checked={settings.faabVisible !== false} onCheckedChange={(v) => save('faabVisible', v)} />
        </Row>
        <Row label="Chop Clock Countdown" tooltip="Show countdown timer to chop day on the survival board">
          <Switch checked={settings.chopClockEnabled !== false} onCheckedChange={(v) => save('chopClockEnabled', v)} />
        </Row>
        <Row label="Danger Margin (points)" tooltip="Teams within this margin of last place are in the danger zone">
          <Input type="number" min={0} max={50} className="w-20 text-right"
            value={String(settings.dangerMarginPoints ?? 10)}
            onChange={(e) => save('dangerMarginPoints', Number(e.target.value))} />
        </Row>
      </Section>

      {/* Trades */}
      <Section label="Trades">
        <Row label="Trades Allowed" tooltip="Trades are OFF by default in guillotine leagues">
          <Switch checked={Boolean(settings.tradesAllowed)} onCheckedChange={(v) => save('tradesAllowed', v)} />
        </Row>
        <Row label="FAAB Tradeable" tooltip="Allow managers to trade FAAB budget">
          <Switch checked={Boolean(settings.faabTradeable)} onCheckedChange={(v) => save('faabTradeable', v)} />
        </Row>
      </Section>

      {/* AI Features (Gated) */}
      <Section label="AI Features">
        <Row label="AI Survival Assistant" gated hasSub={sub} tooltip="Survival probability, risk tiers, safe score targets">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI FAAB Coach" gated hasSub={sub} tooltip="Bid recommendations based on urgency and scarcity">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Elimination Risk Model" gated hasSub={sub} tooltip="Track projected floors, volatility, and schedule risk">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Lineup Floor Optimizer" gated hasSub={sub} tooltip="Start/sit for survival — prioritize floor over ceiling">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Storyline Generator" gated hasSub={sub} tooltip="Dramatic weekly recaps, elimination stories, waiver wars">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI League Insights" gated hasSub={sub} tooltip="Weekly survival rankings, best FAAB manager, most at-risk team">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Inactive Manager Detection" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
      </Section>
    </div>
  )
}
