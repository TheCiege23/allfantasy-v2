'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Wallet,
  FileText,
  Users,
  Gavel,
  Sparkles,
  Settings,
  ChevronDown,
  MessageSquare,
  Zap,
} from 'lucide-react'
import type { SalaryCapSummary, SalaryCapView } from './types'
import { CapDashboard } from './CapDashboard'
import { ContractsPage } from './ContractsPage'
import { TeamBuilderView } from './TeamBuilderView'
import { StartupAuctionView } from './StartupAuctionView'
import { SalaryCapAIPanel } from './SalaryCapAIPanel'
import { SalaryCapRulesView } from './SalaryCapRulesView'
import { useUserTimezone } from '@/hooks/useUserTimezone'

export interface SalaryCapHomeProps {
  leagueId: string
}

const VIEW_LABELS: Record<SalaryCapView, string> = {
  home: 'Home',
  'cap-dashboard': 'Cap Dashboard',
  contracts: 'Contracts',
  'team-builder': 'Team Builder',
  draft: 'Draft & Lottery',
  ai: 'AI Tools',
  rules: 'Rules & Settings',
}

export function SalaryCapHome({ leagueId }: SalaryCapHomeProps) {
  const { formatDateInTimezone } = useUserTimezone()
  const [summary, setSummary] = useState<SalaryCapSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<SalaryCapView>('home')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/salary-cap/summary`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Error ${res.status}`)
        setSummary(null)
        return
      }
      const data = await res.json()
      setSummary(data)
    } catch {
      setError('Failed to load salary cap summary')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !summary) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-white/60">Loading Salary Cap League…</p>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-2 text-xs text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const ledger = summary?.ledger ?? null
  const config = summary?.config

  return (
    <div className="space-y-6">
      {/* Branding header */}
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 sm:h-20 sm:w-20">
          <Wallet className="h-8 w-8 text-emerald-400 sm:h-10 sm:w-10" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Salary Cap League</h1>
          <p className="text-sm text-white/60">
            {config?.mode === 'bestball' ? 'Best Ball' : 'Dynasty'} · Cap & contracts
          </p>
        </div>
      </header>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/league/${leagueId}?tab=Chat`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Waivers`}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/50"
        >
          <Zap className="h-4 w-4" /> Waivers
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Trades`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Trades
        </Link>
        <Link
          href={`/app/league/${leagueId}?tab=Settings`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
      </div>

      {/* View switcher (mobile dropdown, desktop tabs) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/50 sm:hidden">View:</span>
        <div className="relative sm:hidden">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as SalaryCapView)}
            className="rounded-xl border border-white/20 bg-white/5 py-2 pl-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {(Object.keys(VIEW_LABELS) as SalaryCapView[]).map((v) => (
              <option key={v} value={v}>
                {VIEW_LABELS[v]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
        </div>
        <div className="hidden flex-wrap gap-1 sm:flex">
          {(Object.keys(VIEW_LABELS) as SalaryCapView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                view === v
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Home view: summary cards + links to panels */}
      {view === 'home' && summary && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Cap at a glance
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-white/50">Current cap space</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {ledger ? `$${ledger.capSpace}` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-white/50">Committed (this year)</p>
                <p className="text-lg font-semibold text-white/80">
                  {ledger ? `$${ledger.totalCapHit}` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-white/50">Dead money</p>
                <p className="text-lg font-semibold text-amber-300">
                  {summary.deadMoneyTotal ? `$${summary.deadMoneyTotal}` : '$0'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-white/50">Active contracts</p>
                <p className="text-lg font-semibold text-white/80">{summary.contracts.length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView('cap-dashboard')}
              className="mt-3 text-sm text-cyan-400 hover:underline"
            >
              Open Cap Dashboard →
            </button>
          </section>

          {summary.futureProjection.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold text-white">Future cap projection</h2>
              <ul className="space-y-2">
                {summary.futureProjection.map((y) => (
                  <li
                    key={y.capYear}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                  >
                    <span className="text-white/80">{y.capYear}</span>
                    <span className="tabular-nums text-emerald-300">${y.projectedSpace} space</span>
                    <span className="text-white/50">${y.totalCapHit} hit</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-white">Summaries</h2>
            <ul className="space-y-2 text-sm text-white/80">
              <li>Expiring this year: {summary.expiringCount}</li>
              {config?.extensionsEnabled && (
                <li>Extension candidates: {summary.extensionCandidatesCount}</li>
              )}
              {config?.franchiseTagEnabled && (
                <li>Franchise tag candidates: {summary.tagCandidatesCount}</li>
              )}
              <li>Rookie contracts: {summary.rookieContractCount}</li>
            </ul>
            <button
              type="button"
              onClick={() => setView('contracts')}
              className="mt-3 text-sm text-cyan-400 hover:underline"
            >
              View all contracts →
            </button>
          </section>

          {summary.events.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold text-white">Recent cap events</h2>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {summary.events.slice(0, 15).map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded border border-white/5 px-2 py-1 text-xs text-white/70"
                  >
                    <span>{e.eventType.replace(/_/g, ' ')}</span>
                    <span>{formatDateInTimezone(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              AI Salary Cap Tools
            </h2>
            <p className="mb-3 text-sm text-white/70">
              Cap strategy, extension suggestions, title-window analysis, contend vs rebuild.
            </p>
            <button
              type="button"
              onClick={() => setView('ai')}
              className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950/50"
            >
              Open AI Tools
            </button>
          </section>
        </div>
      )}

      {view === 'cap-dashboard' && summary && (
        <CapDashboard summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
      {view === 'contracts' && summary && (
        <ContractsPage summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
      {view === 'team-builder' && summary && (
        <TeamBuilderView summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
      {view === 'draft' && summary && (
        <StartupAuctionView summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
      {view === 'ai' && summary && (
        <SalaryCapAIPanel summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
      {view === 'rules' && summary && (
        <SalaryCapRulesView summary={summary} leagueId={leagueId} onBack={() => setView('home')} />
      )}
    </div>
  )
}
