'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowDownToLine,
  Bot,
  ClipboardList,
  Coins,
  LayoutGrid,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import type { SubPanelContext } from '@/app/league/[leagueId]/components/LeagueSettingsSubPanels'
import {
  defaultDevyLeagueSetup,
  parseDevyLeagueConfig,
  type DevyLeagueSetupState,
} from '@/lib/devy/devy-league-config'
import { DevyLeagueSetupSection } from '@/components/league-creation-wizard/DevyLeagueSetupSection'

type TabId =
  | 'league'
  | 'rosters'
  | 'pool'
  | 'drafts'
  | 'promotions'
  | 'trading'
  | 'scoring'
  | 'assets'
  | 'chimmy'
  | 'tools'
  | 'danger'

const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'league', label: 'League', icon: Settings },
  { id: 'rosters', label: 'Rosters & slots', icon: Users },
  { id: 'pool', label: 'Devy pool', icon: LayoutGrid },
  { id: 'drafts', label: 'Drafts & picks', icon: ClipboardList },
  { id: 'promotions', label: 'Promotions', icon: ArrowDownToLine },
  { id: 'trading', label: 'Trading', icon: Scale },
  { id: 'scoring', label: 'Scoring', icon: Trophy },
  { id: 'assets', label: 'Future assets', icon: Coins },
  { id: 'chimmy', label: 'AI / Chimmy', icon: Bot },
  { id: 'tools', label: 'Commissioner', icon: Shield },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
]

function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function DevyLeagueSettingsHub({ ctx }: { ctx: SubPanelContext }) {
  const sport = ctx.league.sport
  const initial = useMemo(() => {
    const raw = ctx.league.settings && typeof ctx.league.settings === 'object' && !Array.isArray(ctx.league.settings)
      ? (ctx.league.settings as Record<string, unknown>).devy_league_config
      : undefined
    return parseDevyLeagueConfig(raw) ?? defaultDevyLeagueSetup(sport)
  }, [ctx.league.settings, sport])

  const [config, setConfig] = useState<DevyLeagueSetupState>(initial)
  const [tab, setTab] = useState<TabId>('league')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setConfig(initial)
  }, [initial])

  const persist = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/league/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId: ctx.league.id, devyLeagueConfig: config }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      toast.success('Devy settings saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [ctx.league.id, config])

  return (
    <div className="space-y-4 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#0c1828] via-[#070d18] to-[#050915] p-4">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Devy command center</p>
            <h3 className="mt-1 text-lg font-bold text-white">Multi-year prospect development</h3>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/55">
              This league is built for long-term pipelines: active pros, taxi stashes, devy prospects, and tradable
              future capital. MLB and NHL Devy formats are not supported — your sport uses a football or basketball
              prospect path.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void persist()}
            disabled={saving || !ctx.isCommissioner}
            className="shrink-0 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-[12px] font-bold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition ${
                active ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/45 hover:bg-white/[0.05] hover:text-white/75'
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'league' ? (
        <DevyLeagueSetupSection sport={sport} value={config} onChange={setConfig} />
      ) : null}

      {tab === 'rosters' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Rosters & slots</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Taxi and Devy are separate: taxi holds eligible young pros; devy holds pre-pro developmental players.
            Defaults include both — tune slot counts without removing the pipelines.
          </p>
          <ul className="mt-3 space-y-2 text-[12px] text-white/70">
            <li>• Enforce separate devy roster section in lineup UIs</li>
            <li>• Block devy players from active starting slots (non-scoring for weekly lineups)</li>
            <li>• Roster preview: active / bench / IR / taxi / devy / future picks (wiring to league roster views)</li>
          </ul>
        </GlassCard>
      ) : null}

      {tab === 'pool' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Devy player pool</h4>
          <p className="mt-2 text-[12px] text-white/55">
            This controls which future or developmental players can be drafted and stored in devy slots.
          </p>
          <p className="mt-2 text-[11px] text-white/45">
            Filters: class year, position, school, ranking feed, declaration status — connected to scouting imports and
            commissioner curation.
          </p>
        </GlassCard>
      ) : null}

      {tab === 'drafts' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Drafts & picks</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Annual rookie and devy drafts support linear, snake, auction, and weighted lottery. Weighted lottery is
            only for annual drafts — never for startup drafts.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12px] text-white/65">
            <li>• Future pick trading, max years, ownership validation</li>
            <li>• Draft calendar, open trading during draft, clock pauses, queue autopick</li>
          </ul>
        </GlassCard>
      ) : null}

      {tab === 'promotions' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Promotion rules</h4>
          <p className="mt-2 text-[12px] text-amber-100/90">
            Promotion rules determine when a devy player must move out of developmental inventory and onto an active
            roster, taxi, or waivers, depending on league rules.
          </p>
        </GlassCard>
      ) : null}

      {tab === 'trading' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Trading rules</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Supports players, devy assets, rookie picks, future picks, taxi players, and multi-team deals. Trade review,
            veto thresholds, deadlines, and pick labeling (year/round/original owner) surface in trade UIs.
          </p>
        </GlassCard>
      ) : null}

      {tab === 'scoring' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Scoring</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Uses your sport scoring template. Devy/taxi non-scoring enforcement keeps devy prospects off weekly scores
            unless you run a special event format.
          </p>
          <p className="mt-2 text-[11px] text-white/45">NFL and NBA devy templates — no MLB/NHL devy scoring paths.</p>
        </GlassCard>
      ) : null}

      {tab === 'assets' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Future assets</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Future rookie and devy picks, traded pick history, original-owner labels, protected/conditional picks
            (when enabled), pick ledger export, and commissioner repair tools.
          </p>
        </GlassCard>
      ) : null}

      {tab === 'chimmy' ? (
        <GlassCard>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h4 className="text-sm font-bold text-white">Chimmy + Devy</h4>
          </div>
          <p className="mt-2 text-[12px] text-white/55">
            Ask about devy eligibility, promotions, pick value, trades, and long-term outlook. Chimmy should read this
            league&apos;s devy config, rosters, taxi/devy buckets, and owned picks when context is available.
          </p>
          <ul className="mt-3 space-y-1 text-[11px] text-white/50">
            <li>• “Should I draft this prospect?” · “Compare these two devy players”</li>
            <li>• “What future picks do I own?” · “Evaluate this devy trade”</li>
          </ul>
        </GlassCard>
      ) : null}

      {tab === 'tools' ? (
        <GlassCard>
          <h4 className="text-sm font-bold text-white">Commissioner tools</h4>
          <p className="mt-1 text-[12px] text-white/55">
            Overrides (eligibility, promotions, pick assignment, pool refresh, audit logs) should confirm destructive
            actions and write commissioner audit entries when wired to the backend.
          </p>
        </GlassCard>
      ) : null}

      {tab === 'danger' ? (
        <GlassCard className="border-amber-500/25 bg-amber-500/[0.06]">
          <h4 className="text-sm font-bold text-amber-100">Advanced / danger zone</h4>
          <p className="mt-2 text-[12px] text-amber-100/80">
            Disabling devy, converting formats, resetting picks, or mass promotions can destroy league history. These
            flows require typed confirmation and audit trails in production.
          </p>
        </GlassCard>
      ) : null}
    </div>
  )
}
