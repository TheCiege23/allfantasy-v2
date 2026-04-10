'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface ZombieFormatTabProps {
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

export function ZombieFormatTab({ leagueId, hasAfCommissionerSub }: ZombieFormatTabProps) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/zombie/settings?leagueId=${leagueId}`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setSettings({}))
  }, [leagueId])

  const save = useCallback(async (key: string, value: unknown) => {
    setSavedKey(null)
    await fetch(`/api/zombie/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, [key]: value }),
    }).catch(() => {})
    setSettings((s) => s ? { ...s, [key]: value } : s)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1500)
  }, [leagueId])

  if (!settings) return <div className="text-sm text-white/40">Loading Zombie settings...</div>

  const sub = hasAfCommissionerSub

  return (
    <div>
      {savedKey && <div className="mb-3 text-xs text-emerald-400">Saved</div>}

      {/* Whisperer */}
      <Section label="Whisperer">
        <Row label="Selection Mode">
          <select className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-white"
            value={String(settings.whispererSelection ?? 'random')}
            onChange={(e) => save('whispererSelection', e.target.value)}>
            <option value="random">Random</option>
            <option value="veteran_priority">Veteran Priority</option>
            <option value="commissioner">Commissioner Picks</option>
          </select>
        </Row>
        <Row label="Whisperer Public" tooltip="Is the Whisperer revealed publicly from day 1?">
          <Switch checked={Boolean(settings.whispererIsPublic)} onCheckedChange={(v) => save('whispererIsPublic', v)} />
        </Row>
        <Row label="Ambush Count Per Week">
          <Input type="number" min={0} max={5} className="w-20 text-right"
            value={String(settings.whispererAmbushCount ?? 1)}
            onChange={(e) => save('whispererAmbushCount', Number(e.target.value))} />
        </Row>
      </Section>

      {/* Infection Rules */}
      <Section label="Infection Rules">
        <Row label="Infection on Loss to Whisperer">
          <Switch checked={settings.infectionLossToWhisperer !== false} onCheckedChange={(v) => save('infectionLossToWhisperer', v)} />
        </Row>
        <Row label="Infection on Loss to Zombie">
          <Switch checked={settings.infectionLossToZombie !== false} onCheckedChange={(v) => save('infectionLossToZombie', v)} />
        </Row>
        <Row label="Block Zombie Trades" tooltip="Zombies cannot trade players">
          <Switch checked={settings.zombieTradeBlocked !== false} onCheckedChange={(v) => save('zombieTradeBlocked', v)} />
        </Row>
      </Section>

      {/* Resources */}
      <Section label="Resources">
        <Row label="Serum Revive Count" tooltip="How many serums needed to revive from Zombie to Survivor">
          <Input type="number" min={1} max={5} className="w-20 text-right"
            value={String(settings.serumReviveCount ?? 2)}
            onChange={(e) => save('serumReviveCount', Number(e.target.value))} />
        </Row>
        <Row label="Serum Award on High Score">
          <Switch checked={settings.serumAwardHighScore !== false} onCheckedChange={(v) => save('serumAwardHighScore', v)} />
        </Row>
        <Row label="Weapon Top-Two Active">
          <Switch checked={settings.weaponTopTwoActive !== false} onCheckedChange={(v) => save('weaponTopTwoActive', v)} />
        </Row>
      </Section>

      {/* Payout */}
      <Section label="League Type">
        <Row label="Paid League">
          <Switch checked={Boolean(settings.isPaid)} onCheckedChange={(v) => save('isPaid', v)} />
        </Row>
        {Boolean(settings.isPaid) && (
          <>
            <Row label="Buy-In Amount">
              <Input type="number" min={0} max={500} className="w-24 text-right"
                value={String(settings.buyInAmount ?? 0)}
                onChange={(e) => save('buyInAmount', Number(e.target.value))} />
            </Row>
            <Row label="Commissioner Fee (%)">
              <Input type="number" min={0} max={20} className="w-20 text-right"
                value={String(settings.commissionerFee ?? 0)}
                onChange={(e) => save('commissionerFee', Number(e.target.value))} />
            </Row>
            <Row label="Weekly Payouts">
              <Switch checked={Boolean(settings.weeklyPayoutEnabled)} onCheckedChange={(v) => save('weeklyPayoutEnabled', v)} />
            </Row>
          </>
        )}
      </Section>

      {/* Universe */}
      <Section label="Universe">
        <Row label="Part of Universe" tooltip="Link this league to a Zombie Universe for shared stats and promotion/relegation">
          <Switch checked={Boolean(settings.universeId)} disabled />
        </Row>
        <Row label="Tier">
          <span className="text-sm text-white/50">{String(settings.tierLabel ?? 'Standalone')}</span>
        </Row>
      </Section>

      {/* AI Features (Gated) */}
      <Section label="AI Features">
        <Row label="AI Weekly Recaps" gated hasSub={sub} tooltip="AI-generated weekly infection summaries">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Commissioner Summary" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="AI Horde Narratives" gated hasSub={sub} tooltip="Dramatic infection spread storylines">
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Anti-Collusion Detection" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
        <Row label="Dangerous Drop Guard" gated hasSub={sub}>
          <Switch defaultChecked={false} />
        </Row>
      </Section>
    </div>
  )
}
