'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { SettingsSection, SettingsRow } from '@/app/league/[leagueId]/components/settings/ui'

type Prefs = {
  startSitRecommendations: boolean
  waiverBreakoutAlerts: boolean
  matchupAnalysis: boolean
  weeklyRankings: boolean
  tradeBalanceAnalysis: boolean
}

const lsKey = (leagueId: string) => `af-idp-chimmy-prefs-${leagueId}`

export function IDPAIPanel({
  leagueId,
  hasAfSub,
  isCommissioner = false,
}: {
  leagueId: string
  hasAfSub: boolean
  isCommissioner?: boolean
}) {
  const [week, setWeek] = useState(1)
  const [prefs, setPrefs] = useState<Prefs>({
    startSitRecommendations: true,
    waiverBreakoutAlerts: true,
    matchupAnalysis: true,
    weeklyRankings: true,
    tradeBalanceAnalysis: true,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [out, setOut] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(lsKey(leagueId))
      if (raw) {
        const p = JSON.parse(raw) as Partial<Prefs>
        setPrefs((prev) => ({ ...prev, ...p }))
      }
    } catch {
      /* ignore */
    }
  }, [leagueId])

  const persistPrefs = useCallback(
    async (next: Prefs) => {
      setPrefs(next)
      try {
        window.localStorage.setItem(lsKey(leagueId), JSON.stringify(next))
      } catch {
        /* ignore */
      }
      if (!hasAfSub || !isCommissioner) return
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leagueId,
          week: 1,
          action: 'ai_prefs',
          prefs: {
            startSitRecommendations: next.startSitRecommendations,
            waiverBreakoutAlerts: next.waiverBreakoutAlerts,
            matchupAnalysis: next.matchupAnalysis,
            weeklyRankings: next.weeklyRankings,
            tradeBalanceAnalysis: next.tradeBalanceAnalysis,
          },
        }),
      })
      if (res.status === 402) setLocked(true)
    },
    [hasAfSub, isCommissioner, leagueId],
  )

  const run = async (action: string) => {
    setBusy(action)
    setLocked(false)
    setOut(null)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId, week, action }),
      })
      if (res.status === 402) {
        setLocked(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      setOut(JSON.stringify(data, null, 2))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pb-8">
      {!hasAfSub ? (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-[12px] text-amber-100">
          <Lock className="h-4 w-4 shrink-0" />
          AF Commissioner Subscription gates IDP AI execution — preview below requires AfSub.
        </div>
      ) : null}

      <SettingsSection
        title="IDP AI toggles"
        description="Preferences sync to this device; commissioners also persist to the league (AfSub)."
      >
        <SettingsRow label="Start/Sit recommendations">
          <input
            type="checkbox"
            checked={prefs.startSitRecommendations}
            onChange={(e) => void persistPrefs({ ...prefs, startSitRecommendations: e.target.checked })}
            disabled={!hasAfSub}
            data-testid="idp-ai-toggle-start-sit"
          />
        </SettingsRow>
        <SettingsRow label="Waiver breakout alerts">
          <input
            type="checkbox"
            checked={prefs.waiverBreakoutAlerts}
            onChange={(e) => void persistPrefs({ ...prefs, waiverBreakoutAlerts: e.target.checked })}
            disabled={!hasAfSub}
            data-testid="idp-ai-toggle-waiver"
          />
        </SettingsRow>
        <SettingsRow label="Matchup-based IDP analysis">
          <input
            type="checkbox"
            checked={prefs.matchupAnalysis}
            onChange={(e) => void persistPrefs({ ...prefs, matchupAnalysis: e.target.checked })}
            disabled={!hasAfSub}
            data-testid="idp-ai-toggle-matchup"
          />
        </SettingsRow>
        <SettingsRow label="Weekly IDP rankings">
          <input
            type="checkbox"
            checked={prefs.weeklyRankings}
            onChange={(e) => void persistPrefs({ ...prefs, weeklyRankings: e.target.checked })}
            disabled={!hasAfSub}
            data-testid="idp-ai-toggle-rankings"
          />
        </SettingsRow>
        <SettingsRow label="Trade balance analysis">
          <input
            type="checkbox"
            checked={prefs.tradeBalanceAnalysis}
            onChange={(e) => void persistPrefs({ ...prefs, tradeBalanceAnalysis: e.target.checked })}
            disabled={!hasAfSub}
            data-testid="idp-ai-toggle-trade"
          />
        </SettingsRow>
      </SettingsSection>

      <div className="mx-4 mt-6 space-y-3 rounded-xl border border-white/[0.08] bg-[#080a12]/80 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">Run Chimmy (NFL week)</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-white/55">
            Week
            <input
              type="number"
              min={1}
              max={18}
              value={week}
              onChange={(e) => setWeek(Math.min(18, Math.max(1, Number(e.target.value) || 1)))}
              className="ml-2 w-16 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-sm text-white"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy || !hasAfSub}
            onClick={() => void run('rankings')}
            className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-2 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
            data-testid="idp-ai-run-rankings"
          >
            {busy === 'rankings' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Weekly rankings'}
          </button>
          <button
            type="button"
            disabled={!!busy || !hasAfSub}
            onClick={() => void run('waiver_targets')}
            className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-2 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
            data-testid="idp-ai-run-waivers"
          >
            {busy === 'waiver_targets' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Waiver scan'}
          </button>
          <button
            type="button"
            disabled={!!busy || !hasAfSub}
            onClick={() => void run('sleepers')}
            className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-2 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
            data-testid="idp-ai-run-sleepers"
          >
            {busy === 'sleepers' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Sleepers'}
          </button>
          <button
            type="button"
            disabled={!!busy || !hasAfSub}
            onClick={() => void run('scarcity')}
            className="rounded-lg border border-cyan-500/35 bg-cyan-950/30 px-3 py-2 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
            data-testid="idp-ai-run-scarcity"
          >
            {busy === 'scarcity' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Scarcity'}
          </button>
          {isCommissioner ? (
            <button
              type="button"
              disabled={!!busy || !hasAfSub}
              onClick={() => void run('power_rankings')}
              className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-[11px] font-semibold text-amber-100 disabled:opacity-40"
              data-testid="idp-ai-run-power-rankings"
            >
              {busy === 'power_rankings' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Power rankings'}
            </button>
          ) : null}
        </div>
        {locked ? (
          <p className="flex items-center gap-1 text-[11px] text-amber-200/90">
            <Lock className="h-3.5 w-3.5" /> 🔒 This feature requires the AF Commissioner Subscription.
          </p>
        ) : null}
        {out ? (
          <pre className="max-h-48 overflow-auto rounded-lg border border-white/[0.06] bg-black/40 p-2 text-[10px] text-white/75">
            {out}
          </pre>
        ) : null}
      </div>
    </div>
  )
}
