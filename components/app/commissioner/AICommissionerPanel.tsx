'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_SPORT, SUPPORTED_SPORTS, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
type AlertStatus = 'open' | 'approved' | 'dismissed' | 'resolved' | 'snoozed'
type NotificationMode = 'off' | 'in_app' | 'chat' | 'both'

interface ConfigView {
  configId: string
  leagueId: string
  sport: SupportedSport
  remindersEnabled: boolean
  disputeAnalysisEnabled: boolean
  collusionMonitoringEnabled: boolean
  voteSuggestionEnabled: boolean
  inactivityMonitoringEnabled: boolean
  commissionerNotificationMode: NotificationMode
  updatedAt: string
}

interface AlertView {
  alertId: string
  leagueId: string
  sport: SupportedSport
  alertType: string
  severity: AlertSeverity
  headline: string
  summary: string
  relatedManagerIds: string[]
  relatedTradeId: string | null
  relatedMatchupId: string | null
  status: AlertStatus
  snoozedUntil: string | null
  createdAt: string
  resolvedAt: string | null
}

interface ActionLogView {
  actionId: string
  actionType: string
  source: string
  summary: string
  createdAt: string
}

interface OverviewPayload {
  leagueId: string
  sport: SupportedSport
  season: number
  config: ConfigView
  alerts: AlertView[]
  actionLogs: ActionLogView[]
}

function sportLabel(sport: SupportedSport): string {
  if (sport === 'NCAAB') return 'NCAA Basketball'
  if (sport === 'NCAAF') return 'NCAA Football'
  if (sport === 'SOCCER') return 'Soccer'
  return sport
}

function severityClass(severity: AlertSeverity): string {
  if (severity === 'critical') return 'border-red-500/50 bg-red-500/10 text-red-100'
  if (severity === 'high') return 'border-orange-500/50 bg-orange-500/10 text-orange-100'
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-100'
  return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
}

export default function AICommissionerPanel({ leagueId }: { leagueId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sport, setSport] = useState<SupportedSport>(normalizeToSupportedSport(DEFAULT_SPORT))
  const [season, setSeason] = useState<string>('')
  const [includeResolved, setIncludeResolved] = useState(false)
  const [payload, setPayload] = useState<OverviewPayload | null>(null)
  const [draft, setDraft] = useState<ConfigView | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [running, setRunning] = useState(false)
  const [actioning, setActioning] = useState<Record<string, string>>({})
  const [explaining, setExplaining] = useState<Record<string, boolean>>({})
  const [explanations, setExplanations] = useState<Record<string, string>>({})

  const canRun = !loading && !running && !savingConfig
  const hasOpenAlerts = (payload?.alerts ?? []).some((alert) => alert.status === 'open')

  const load = useCallback(
    async (options?: { includeResolved?: boolean }) => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams()
        qs.set('sport', sport)
        qs.set('includeResolved', String(options?.includeResolved ?? includeResolved))
        qs.set('includeDismissed', 'false')
        qs.set('includeSnoozed', 'true')
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/ai-commissioner?${qs.toString()}`,
          { cache: 'no-store' }
        )
        const data = (await res.json().catch(() => ({}))) as OverviewPayload & { error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to load AI Commissioner data')
        setPayload(data)
        setDraft(data.config)
        setSeason(String(data.season || ''))
        setSport(normalizeToSupportedSport(data.config?.sport ?? sport))
      } catch (e: any) {
        setError(e?.message || 'Failed to load AI Commissioner data')
      } finally {
        setLoading(false)
      }
    },
    [includeResolved, leagueId, sport]
  )

  useEffect(() => {
    void load()
  }, [load])

  const saveConfig = useCallback(async () => {
    if (!draft) return
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai-commissioner/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          remindersEnabled: draft.remindersEnabled,
          disputeAnalysisEnabled: draft.disputeAnalysisEnabled,
          collusionMonitoringEnabled: draft.collusionMonitoringEnabled,
          voteSuggestionEnabled: draft.voteSuggestionEnabled,
          inactivityMonitoringEnabled: draft.inactivityMonitoringEnabled,
          commissionerNotificationMode: draft.commissionerNotificationMode,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as ConfigView & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to save AI Commissioner settings')
      setDraft(data)
      setPayload((prev) => (prev ? { ...prev, config: data } : prev))
      toast.success('AI Commissioner settings saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save AI Commissioner settings')
    } finally {
      setSavingConfig(false)
    }
  }, [draft, leagueId, sport])

  const runCycle = useCallback(async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai-commissioner/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          season: season.trim() ? Number.parseInt(season.trim(), 10) : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; createdAlerts?: Array<unknown> }
      if (!res.ok) throw new Error(data.error || 'AI Commissioner run failed')
      toast.success(`AI Commissioner run complete (${data.createdAlerts?.length ?? 0} new alerts)`)
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'AI Commissioner run failed')
    } finally {
      setRunning(false)
    }
  }, [leagueId, load, season, sport])

  const mutateAlert = useCallback(
    async (alertId: string, action: 'approve' | 'dismiss' | 'snooze' | 'resolve' | 'reopen' | 'send_notice') => {
      setActioning((prev) => ({ ...prev, [alertId]: action }))
      try {
        const res = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/ai-commissioner/alerts/${encodeURIComponent(alertId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              ...(action === 'snooze' ? { snoozeHours: 24 } : {}),
            }),
          }
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Failed to ${action} alert`)
        toast.success(
          action === 'send_notice'
            ? 'Notice sent to league chat'
            : `Alert ${action.replace('_', ' ')} action applied`
        )
        await load()
      } catch (e: any) {
        toast.error(e?.message || `Failed to ${action} alert`)
      } finally {
        setActioning((prev) => {
          const next = { ...prev }
          delete next[alertId]
          return next
        })
      }
    },
    [leagueId, load]
  )

  const explainAlert = useCallback(
    async (alertId: string) => {
      setExplaining((prev) => ({ ...prev, [alertId]: true }))
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai-commissioner/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string; narrative?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to explain alert')
        const narrative = String(data.narrative ?? '').trim()
        if (narrative) {
          setExplanations((prev) => ({ ...prev, [alertId]: narrative }))
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to explain alert')
      } finally {
        setExplaining((prev) => ({ ...prev, [alertId]: false }))
      }
    },
    [leagueId]
  )

  const alertSummary = useMemo(() => {
    const alerts = payload?.alerts ?? []
    const counts = {
      total: alerts.length,
      open: alerts.filter((a) => a.status === 'open').length,
      high: alerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length,
      snoozed: alerts.filter((a) => a.status === 'snoozed').length,
    }
    return counts
  }, [payload?.alerts])

  return (
    <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot className="h-4 w-4 text-purple-300" /> AI Commissioner
          </h2>
          <p className="mt-1 text-xs text-white/65">
            Governance assistant for rule enforcement, reminders, disputes, collusion signals, and commissioner notice workflow.
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            AI Commissioner provides explainable guidance and does not silently override league rules.
          </p>
        </div>
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings`}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"
        >
          Back to settings
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">Total alerts</p>
          <p className="text-sm font-semibold text-white">{alertSummary.total}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">Open</p>
          <p className="text-sm font-semibold text-white">{alertSummary.open}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">High / critical</p>
          <p className="text-sm font-semibold text-white">{alertSummary.high}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">Snoozed</p>
          <p className="text-sm font-semibold text-white">{alertSummary.snoozed}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">Latest action</p>
          <p className="text-xs font-medium text-white/85 truncate">
            {payload?.actionLogs?.[0]?.actionType ?? 'No actions yet'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-3">
        <div>
          <Label className="text-[11px] text-white/65">Sport</Label>
          <select
            aria-label="AI commissioner sport filter"
            value={sport}
            onChange={(event) => setSport(normalizeToSupportedSport(event.target.value))}
            className="mt-1 w-full rounded border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white"
            data-testid="ai-commissioner-sport"
          >
            {SUPPORTED_SPORTS.map((option) => (
              <option key={option} value={option}>
                {sportLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[11px] text-white/65">Season</Label>
          <Input
            value={season}
            onChange={(event) => setSeason(event.target.value)}
            className="mt-1 bg-black/40 border-white/20 text-xs text-white"
            data-testid="ai-commissioner-season"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={loading || running}
            data-testid="ai-commissioner-refresh"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1">Refresh</span>
          </Button>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => void runCycle()}
            disabled={!canRun}
            data-testid="ai-commissioner-run"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="ml-1">{running ? 'Running...' : 'Run AI cycle'}</span>
          </Button>
        </div>
        <label className="md:col-span-3 flex items-center gap-2 text-xs text-white/75">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(event) => {
              const next = event.target.checked
              setIncludeResolved(next)
              void load({ includeResolved: next })
            }}
            className="rounded border-white/25"
            data-testid="ai-commissioner-include-resolved"
          />
          Include resolved alerts
        </label>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white">Commissioner behaviors</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void saveConfig()}
            disabled={!draft || savingConfig}
            data-testid="ai-commissioner-save-config"
          >
            {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save settings'}
          </Button>
        </div>
        {draft ? (
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={draft.remindersEnabled}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, remindersEnabled: event.target.checked } : prev))
                }
              />
              Lineup reminders
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={draft.disputeAnalysisEnabled}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, disputeAnalysisEnabled: event.target.checked } : prev
                  )
                }
              />
              Dispute analysis
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={draft.collusionMonitoringEnabled}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, collusionMonitoringEnabled: event.target.checked } : prev
                  )
                }
              />
              Collusion monitoring
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={draft.voteSuggestionEnabled}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, voteSuggestionEnabled: event.target.checked } : prev))
                }
              />
              Vote suggestions
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={draft.inactivityMonitoringEnabled}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, inactivityMonitoringEnabled: event.target.checked } : prev
                  )
                }
              />
              Inactivity monitoring
            </label>
            <div>
              <Label className="text-[11px] text-white/65">Notification mode</Label>
              <select
                value={draft.commissionerNotificationMode}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          commissionerNotificationMode: event.target.value as NotificationMode,
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white"
              >
                <option value="in_app">In-app only</option>
                <option value="chat">League chat only</option>
                <option value="both">In-app + league chat</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/60">Loading commissioner behavior settings...</p>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-white/90">Alert center</h3>
        {loading && !payload ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/65 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading alert center...
          </div>
        ) : null}
        {!loading && payload && payload.alerts.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/65">
            No alerts yet. Run the AI cycle to generate commissioner guidance.
          </div>
        ) : null}
        {(payload?.alerts ?? []).map((alert) => (
          <article
            key={alert.alertId}
            className={`rounded-xl border p-3 ${severityClass(alert.severity)}`}
            data-testid={`ai-commissioner-alert-${alert.alertId}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{alert.headline}</p>
                <p className="mt-1 text-xs opacity-90">{alert.summary}</p>
                <p className="mt-1 text-[11px] opacity-80">
                  {alert.alertType} • status {alert.status} • {new Date(alert.createdAt).toLocaleString()}
                </p>
                {alert.snoozedUntil ? (
                  <p className="text-[11px] opacity-80">Snoozed until {new Date(alert.snoozedUntil).toLocaleString()}</p>
                ) : null}
                {alert.relatedManagerIds.length > 0 ? (
                  <div className="mt-1 space-y-1 text-[11px] opacity-90">
                    <p>Managers:</p>
                    <div className="flex flex-wrap gap-2">
                      {alert.relatedManagerIds.map((managerId) => (
                        <span
                          key={`${alert.alertId}-manager-${managerId}`}
                          className="inline-flex items-center gap-1 rounded border border-white/20 bg-black/25 px-1.5 py-0.5"
                        >
                          <span className="text-white/85">{managerId}</span>
                          <Link
                            href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings&settingsTab=${encodeURIComponent('Reputation')}&reputationManagerId=${encodeURIComponent(managerId)}`}
                            className="text-cyan-200 underline underline-offset-2"
                            data-testid={`ai-commissioner-alert-manager-trust-${alert.alertId}-${managerId}`}
                          >
                            trust
                          </Link>
                          <Link
                            href={`/app/league/${encodeURIComponent(leagueId)}/legacy/breakdown?entityType=MANAGER&entityId=${encodeURIComponent(managerId)}&sport=${encodeURIComponent(alert.sport)}`}
                            className="text-amber-200 underline underline-offset-2"
                            data-testid={`ai-commissioner-alert-manager-legacy-${alert.alertId}-${managerId}`}
                          >
                            legacy
                          </Link>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  {alert.relatedTradeId ? (
                    <Link
                      href={`/app/league/${encodeURIComponent(leagueId)}?tab=Trades`}
                      className="underline underline-offset-2"
                    >
                      Open trade review context
                    </Link>
                  ) : null}
                  {alert.relatedMatchupId ? (
                    <Link
                      href={`/app/league/${encodeURIComponent(leagueId)}?tab=Matchups`}
                      className="underline underline-offset-2"
                    >
                      Open matchup context
                    </Link>
                  ) : null}
                </div>
              </div>
              <ShieldAlert className="h-4 w-4 shrink-0 opacity-80" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateAlert(alert.alertId, 'approve')}
                disabled={!!actioning[alert.alertId]}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateAlert(alert.alertId, 'dismiss')}
                disabled={!!actioning[alert.alertId]}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateAlert(alert.alertId, 'snooze')}
                disabled={!!actioning[alert.alertId]}
              >
                Snooze 24h
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateAlert(alert.alertId, alert.status === 'resolved' ? 'reopen' : 'resolve')}
                disabled={!!actioning[alert.alertId]}
              >
                {alert.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void mutateAlert(alert.alertId, 'send_notice')}
                disabled={!!actioning[alert.alertId]}
              >
                Send notice
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void explainAlert(alert.alertId)}
                disabled={!!explaining[alert.alertId]}
              >
                {explaining[alert.alertId] ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'AI explain'
                )}
              </Button>
            </div>
            {explanations[alert.alertId] ? (
              <p className="mt-2 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-white/90">
                {explanations[alert.alertId]}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {!loading && payload ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <h4 className="text-xs font-semibold text-white/90">Recent commissioner actions</h4>
          <div className="mt-2 space-y-1">
            {payload.actionLogs.length > 0 ? (
              payload.actionLogs.slice(0, 8).map((log) => (
                <p key={log.actionId} className="text-[11px] text-white/70">
                  {new Date(log.createdAt).toLocaleString()} • {log.actionType} • {log.summary}
                </p>
              ))
            ) : (
              <p className="text-[11px] text-white/55">No actions logged yet.</p>
            )}
          </div>
          {!hasOpenAlerts ? (
            <p className="mt-2 text-[11px] text-emerald-200/85">
              No open alerts currently. Continue regular run cadence and reminder monitoring.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
