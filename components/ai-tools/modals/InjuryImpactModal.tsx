'use client'

import { ShieldAlert, AlertTriangle, Activity, ArrowRight, Clock } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type Severity = 'out' | 'questionable' | 'probable' | 'ir'

type InjuryAlert = {
  player: string
  position: string
  team: string
  severity: Severity
  status: string // Short status string — "Hamstring · Q for Sun"
  timing: string // "This week" / "2-4 weeks" / "Season"
  replacement: {
    name: string
    position: string
    why: string
  } | null
  impactScore: number // 0-100 — how much this dents your lineup
}

const SEVERITY_STYLES: Record<Severity, { label: string; text: string; bg: string; border: string; dot: string }> = {
  out: { label: 'Out', text: 'text-red-200', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
  ir: { label: 'IR', text: 'text-rose-200', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  questionable: { label: 'Questionable', text: 'text-amber-200', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  probable: { label: 'Probable', text: 'text-emerald-200', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
}

/**
 * Alert-based signature: each injury is an alert card with a severity
 * dot, a timing window, a risk meter, and inline replacement suggestion.
 * Feels like a status console, not a feed.
 *
 * TODO: wire to `/api/roster/injuries?sport=…` (or your real endpoint).
 * UI expects `{ alerts: InjuryAlert[], overallRisk: number }`.
 */
export function InjuryImpactModal({
  open,
  onClose,
  sport,
}: {
  open: boolean
  onClose: () => void
  sport: string
}) {
  const alerts = PLACEHOLDER_ALERTS
  const overallRisk = Math.min(
    100,
    Math.round(alerts.reduce((sum, a) => sum + a.impactScore, 0) / Math.max(1, alerts.length)),
  )
  const criticalCount = alerts.filter((a) => a.severity === 'out' || a.severity === 'ir').length

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Injury Impact"
      subtitle="Roster availability risk console"
      accentColor="red"
      icon={<ShieldAlert className="h-5 w-5" />}
      chimmyPrompt={`Break down my injury situation for ${sport} and suggest moves`}
    >
      {/* Risk meter — signature */}
      <div className="mb-4 rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-500/[0.06] to-transparent px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-300/70">
              Roster Risk
            </p>
            <p className="mt-1 text-[13px] font-semibold text-white/85">
              {alerts.length} active {alerts.length === 1 ? 'alert' : 'alerts'}
              {criticalCount > 0 ? (
                <span className="ml-1 text-red-300">· {criticalCount} critical</span>
              ) : null}
            </p>
          </div>
          <p className="text-[24px] font-black tabular-nums text-white/95">
            {overallRisk}
            <span className="text-[11px] font-bold text-white/30">/100</span>
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-500"
            style={{ width: `${overallRisk}%` }}
          />
        </div>
      </div>

      {/* Alert list */}
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
        Active Alerts
      </p>
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-6 text-center">
            <Activity className="mx-auto h-6 w-6 text-emerald-400" />
            <p className="mt-2 text-[13px] font-semibold text-emerald-300">Roster is clean</p>
            <p className="mt-1 text-[11px] text-white/40">No injury concerns flagged.</p>
          </div>
        ) : (
          alerts.map((a, i) => <InjuryAlertCard key={i} alert={a} />)
        )}
      </div>

      {/* Next actions summary */}
      <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.03] px-4 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-red-300/70">
          Next Actions
        </p>
        <p className="text-[12px] leading-relaxed text-white/65">
          Move your IR candidate to IR, stream the top waiver replacement at the affected position,
          and pivot your flex decision to insulate against the weekend downgrade.
        </p>
      </div>
    </AIToolModalShell>
  )
}

// ── Alert card ───────────────────────────────────────────────────────

function InjuryAlertCard({ alert }: { alert: InjuryAlert }) {
  const s = SEVERITY_STYLES[alert.severity]
  return (
    <div className={`rounded-xl border p-3 ${s.border} ${s.bg}`}>
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className={`h-2 w-2 rounded-full ${s.dot} ${alert.severity === 'out' || alert.severity === 'ir' ? 'animate-pulse' : ''}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-bold text-white/90">{alert.player}</p>
            <AlertTriangle className={`h-3 w-3 shrink-0 ${s.text}`} />
          </div>
          <p className="truncate text-[10px] text-white/40">
            {alert.position} · {alert.team}
          </p>
          <p className="mt-1 text-[11px] text-white/65">{alert.status}</p>
          <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-white/40">
            <Clock className="h-2.5 w-2.5" /> {alert.timing}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${s.text} ${s.bg}`}>
            {s.label}
          </span>
          <p className="mt-1 text-[14px] font-black tabular-nums text-white/85">{alert.impactScore}</p>
          <p className="text-[7px] font-bold uppercase tracking-widest text-white/30">impact</p>
        </div>
      </div>

      {/* Replacement suggestion */}
      {alert.replacement ? (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
          <ArrowRight className="h-3 w-3 shrink-0 text-white/40" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-white/75">
              {alert.replacement.name}{' '}
              <span className="text-[9px] font-semibold text-white/40">
                {alert.replacement.position}
              </span>
            </p>
            <p className="truncate text-[10px] text-white/45">{alert.replacement.why}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ── Placeholder data ────────────────────────────────────────────────

const PLACEHOLDER_ALERTS: InjuryAlert[] = [
  {
    player: 'Workhorse RB',
    position: 'RB',
    team: 'FA',
    severity: 'questionable',
    status: 'Hamstring · Q for Sunday, limited Friday',
    timing: 'This week',
    impactScore: 78,
    replacement: {
      name: 'Handcuff RB',
      position: 'RB',
      why: 'Direct backup, projected 12+ touches if he sits.',
    },
  },
  {
    player: 'WR1 Lock',
    position: 'WR',
    team: 'FA',
    severity: 'probable',
    status: 'Ankle · Probable, full practice Friday',
    timing: 'This week',
    impactScore: 22,
    replacement: null,
  },
  {
    player: 'Backup TE',
    position: 'TE',
    team: 'FA',
    severity: 'ir',
    status: 'Knee · Ruled out, IR-eligible',
    timing: 'Season',
    impactScore: 88,
    replacement: {
      name: 'Streamer TE',
      position: 'TE',
      why: 'Plus matchup this week, cheap FAAB.',
    },
  },
]
