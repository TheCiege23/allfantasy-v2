'use client'

import Link from 'next/link'
import { Palmtree, Coins, AlertTriangle, ArrowRight } from 'lucide-react'
import type { SurvivorSummary } from './types'

export interface SurvivorExileViewProps {
  leagueId: string
  summary: SurvivorSummary
  names: Record<string, string>
}

/**
 * Exile Island View: token count, current exile roster setup, FAAB/team claim flow, return-to-island progress, commissioner/Boss warning state.
 */
export function SurvivorExileView({ leagueId, summary, names }: SurvivorExileViewProps) {
  const { exileLeagueId, exileTokens, config } = summary
  const returnEnabled = config.exileReturnEnabled
  const tokensNeeded = config.exileReturnTokens ?? 0

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Palmtree className="h-5 w-5 text-cyan-400" />
          Exile Island
        </h2>
        {!exileLeagueId ? (
          <p className="text-sm text-white/50">Exile Island is not configured for this league.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Exiled managers compete in a separate league. Earn tokens to buy your way back.
            </p>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-200">
                <Coins className="h-4 w-4" /> Exile return tokens
              </p>
              <p className="text-sm text-white/60">
                Tokens needed to return: <strong className="text-white/80">{tokensNeeded}</strong>
                {returnEnabled ? ' · Return is enabled.' : ' · Return is disabled.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {exileLeagueId && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            Token standings (exile league)
          </h2>
          {exileTokens.length === 0 ? (
            <p className="text-sm text-white/50">No token balances yet.</p>
          ) : (
            <ul className="space-y-2">
              {exileTokens.map((t) => (
                <li
                  key={t.rosterId}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white/80">{names[t.rosterId] ?? t.rosterId}</span>
                  <span className="tabular-nums text-cyan-300">{t.tokens} token(s)</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {exileLeagueId && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            Commissioner / Boss
          </h2>
          <p className="mb-3 text-sm text-white/60">
            Exile league commissioner (Boss) can adjust tokens and return rules. FAAB/team claim flow runs in the Exile league.
          </p>
          <Link
            href={`/app/league/${exileLeagueId}`}
            className="inline-flex items-center gap-2 text-sm text-amber-300 hover:underline"
          >
            Open Exile League <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  )
}
