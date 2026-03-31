"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ServerCrash } from 'lucide-react'

type ProviderEntry = {
  status: 'up' | 'down' | 'degraded'
  lastSeen: string | null
  latencyMs?: number
  affectedFeatures?: string[]
  fallbackActive?: boolean
  fallbackSource?: string | null
  model?: string
  details?: string
}

type FreshnessEntry = {
  status: 'fresh' | 'stale' | 'empty'
  age: string
  checkedAt: string
}

type SystemHealthSnapshot = {
  timestamp: string
  overall: 'up' | 'degraded' | 'down'
  providers: Record<string, ProviderEntry>
  dataFreshness: Record<string, FreshnessEntry>
  importCompleteness: {
    leagues: {
      synced: number
      stale: number
      total: number
      lastRunAt?: string
    }
  }
  alertHistory: Array<{
    createdAt: string
    title: string
    body: string | null
    severity: string
  }>
  recoveryActions: string[]
}

function badgeClass(status: string) {
  if (status === 'up' || status === 'fresh') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  if (status === 'degraded' || status === 'stale') return 'border-amber-500/20 bg-amber-500/10 text-amber-300'
  return 'border-red-500/20 bg-red-500/10 text-red-300'
}

function labelize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function SystemHealthDashboard() {
  const [data, setData] = useState<SystemHealthSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/system/health', {
        cache: 'no-store',
        credentials: 'include',
      })
      const json = (await response.json().catch(() => ({}))) as SystemHealthSnapshot & { error?: string }
      if (!response.ok) {
        throw new Error(json.error || 'Failed to load system health')
      }
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system health')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const providerEntries = useMemo(() => Object.entries(data?.providers ?? {}), [data])
  const freshnessEntries = useMemo(() => Object.entries(data?.dataFreshness ?? {}), [data])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white/95">System health</h1>
            <p className="text-xs text-white/55">Provider status, freshness, imports, and recovery actions</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#071124] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Overall status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${badgeClass(data?.overall ?? 'down')}`}>
                {labelize(data?.overall ?? 'down')}
              </span>
              <span className="text-xs text-white/45">{formatDate(data?.timestamp)}</span>
            </div>
          </div>
          {data?.overall === 'up' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          ) : (
            <ServerCrash className="h-5 w-5 text-amber-300" />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#071124] p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white/90">Live provider grid</h2>
            <p className="text-xs text-white/50">Sports data, AI providers, database, auth, and delivery services</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {providerEntries.map(([key, provider]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white/90">{labelize(key)}</h3>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${badgeClass(provider.status)}`}>
                  {labelize(provider.status)}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-white/60">
                <p>Last seen: {formatDate(provider.lastSeen)}</p>
                <p>Latency: {provider.latencyMs != null ? `${provider.latencyMs}ms` : 'N/A'}</p>
                {provider.model ? <p>Model: {provider.model}</p> : null}
                {provider.fallbackActive ? (
                  <p>Fallback: {provider.fallbackSource || 'active'}</p>
                ) : null}
                {provider.affectedFeatures?.length ? (
                  <p>Affected: {provider.affectedFeatures.join(', ')}</p>
                ) : null}
                {provider.details ? <p className="text-amber-200/80">{provider.details}</p> : null}
              </div>
              {provider.latencyMs != null ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        provider.status === 'up'
                          ? 'bg-emerald-400/80'
                          : provider.status === 'degraded'
                            ? 'bg-amber-400/80'
                            : 'bg-red-400/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, provider.latencyMs / 40))}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#071124] p-4">
        <h2 className="text-sm font-semibold text-white/90">Data freshness timeline</h2>
        <p className="mt-1 text-xs text-white/50">Latest detected age for injuries, rankings, and news by sport</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {freshnessEntries.map(([key, entry]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/80">{labelize(key)}</span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${badgeClass(entry.status)}`}>
                  {labelize(entry.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/55">Age: {entry.age}</p>
              <p className="text-xs text-white/45">Checked: {formatDate(entry.checkedAt)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#071124] p-4">
          <h2 className="text-sm font-semibold text-white/90">Import completeness</h2>
          <p className="mt-1 text-xs text-white/50">League sync freshness and resync coverage</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] text-white/50">Total leagues</p>
              <p className="mt-1 text-lg font-semibold text-white/90">{data?.importCompleteness.leagues.total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-[11px] text-emerald-200/70">Synced or refreshed</p>
              <p className="mt-1 text-lg font-semibold text-emerald-200">{data?.importCompleteness.leagues.synced ?? 0}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-[11px] text-amber-200/70">Still stale</p>
              <p className="mt-1 text-lg font-semibold text-amber-200">{data?.importCompleteness.leagues.stale ?? 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/45">
            Last import sweep: {formatDate(data?.importCompleteness.leagues.lastRunAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#071124] p-4">
          <h2 className="text-sm font-semibold text-white/90">Recovery actions</h2>
          <p className="mt-1 text-xs text-white/50">Automatic safeguards currently active</p>
          <div className="mt-4 space-y-2">
            {(data?.recoveryActions.length ? data.recoveryActions : ['No active recovery actions.']).map((action) => (
              <div key={action} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75">
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#071124] p-4">
          <h2 className="text-sm font-semibold text-white/90">AI response times</h2>
          <p className="mt-1 text-xs text-white/50">Latest probe latencies for Anthropic, OpenAI, and ElevenLabs</p>
          <div className="mt-4 space-y-3">
            {['anthropic', 'openai', 'elevenlabs'].map((key) => {
              const provider = data?.providers[key]
              if (!provider) return null
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white/85">{labelize(key)}</span>
                    <span className="text-xs text-white/50">{provider.latencyMs != null ? `${provider.latencyMs}ms` : 'N/A'}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${
                        provider.status === 'up'
                          ? 'bg-sky-400/80'
                          : provider.status === 'degraded'
                            ? 'bg-amber-400/80'
                            : 'bg-red-400/80'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(6, (provider.latencyMs ?? 0) / 50))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#071124] p-4">
          <h2 className="text-sm font-semibold text-white/90">Alert history</h2>
          <p className="mt-1 text-xs text-white/50">Recent system health notifications</p>
          <div className="mt-4 space-y-2">
            {(data?.alertHistory.length ? data.alertHistory : []).map((entry) => (
              <div key={`${entry.createdAt}-${entry.title}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white/85">{entry.title}</p>
                    {entry.body ? <p className="mt-1 text-xs text-white/55">{entry.body}</p> : null}
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${badgeClass(entry.severity === 'high' ? 'down' : 'degraded')}`}>
                    {labelize(entry.severity)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
            {!data?.alertHistory.length ? (
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/55">
                No system alerts recorded yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {loading && !data ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          Loading latest health snapshot...
        </div>
      ) : null}
    </div>
  )
}
