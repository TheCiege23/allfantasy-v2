'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
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
export function SurvivorExileView({ leagueId, summary }: SurvivorExileViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [returnError, setReturnError] = useState<string | null>(null)
  const [returnMessage, setReturnMessage] = useState<string | null>(null)
  const { exileLeagueId, exileTokens, config } = summary
  const returnEnabled = config.exileReturnEnabled
  const tokensNeeded = config.exileReturnTokens ?? 0
  const myExileStatus = summary.myExileStatus ?? null

  function handleReturnToIsland() {
    setReturnError(null)
    setReturnMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/leagues/${leagueId}/survivor/return`, {
          method: 'POST',
        })
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) {
          setReturnError(payload?.error ?? 'Unable to return from Exile Island right now.')
          return
        }
        setReturnMessage('Return to the main Survivor league complete.')
        router.refresh()
      } catch (error) {
        setReturnError(error instanceof Error ? error.message : 'Unable to return from Exile Island right now.')
      }
    })
  }

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
                {returnEnabled ? ' - Return is enabled.' : ' - Return is disabled.'}
              </p>
            </div>
            {myExileStatus?.eliminated ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium text-white">Your exile status</p>
                <p className="mt-1 text-sm text-white/60">
                  You have <strong className="text-white/80">{myExileStatus.tokens}</strong> of{' '}
                  <strong className="text-white/80">{tokensNeeded}</strong> required token(s).
                </p>
                {myExileStatus.eligibleToReturn ? (
                  <button
                    type="button"
                    onClick={handleReturnToIsland}
                    disabled={isPending}
                    className="mt-3 inline-flex items-center rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? 'Returning...' : 'Return To Main League'}
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-white/50">
                    {myExileStatus.reason ?? 'You are not eligible to return yet.'}
                  </p>
                )}
                {returnError ? <p className="mt-2 text-sm text-rose-300">{returnError}</p> : null}
                {returnMessage ? <p className="mt-2 text-sm text-emerald-300">{returnMessage}</p> : null}
              </div>
            ) : null}
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
              {exileTokens.map((token) => (
                <li
                  key={token.rosterId}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white/80">{token.displayName}</span>
                  <span className="tabular-nums text-cyan-300">{token.tokens} token(s)</span>
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
            href={`/league/${exileLeagueId}`}
            className="inline-flex items-center gap-2 text-sm text-amber-300 hover:underline"
          >
            Open Exile League <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  )
}
