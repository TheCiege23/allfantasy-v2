'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useMemo } from 'react'
import ChimmyChatShell from '@/components/chimmy/ChimmyChatShell'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { usePlayerComparisonUI } from '@/components/player-comparison-ui'
import { buildAiPlayerCompareToolUrl } from '@/lib/chimmy-actions/aiPlayerComparisonBridge'

export function ChimmyChatPageClient(props: {
  prompt?: string | null
  leagueId?: string | null
  sport?: string | null
  teamId?: string | null
  week?: string | null
  strategyMode?: string | null
}) {
  const sport = useMemo(() => normalizeToSupportedSport(props.sport), [props.sport])
  const { openComparison } = usePlayerComparisonUI()

  return (
    <main className="mode-surface min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/chimmy"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white/90"
          data-testid="chimmy-chat-back-link"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Chimmy
        </Link>
        <ChimmyChatShell
          initialPrompt={props.prompt ?? ''}
          leagueId={props.leagueId ?? null}
          teamId={props.teamId ?? null}
          sport={sport}
          week={props.week ? Number(props.week) : null}
          strategyMode={props.strategyMode ?? null}
          startSitDecisionHref={buildAiPlayerCompareToolUrl({
            sport,
            leagueId: props.leagueId ?? null,
            teamId: props.teamId ?? null,
            week: props.week ?? null,
            strategyMode: props.strategyMode ?? null,
          })}
          onOpenCompare={() =>
            openComparison({
              playerA: '',
              playerB: '',
              sport,
              leagueId: props.leagueId ?? null,
              teamId: props.teamId ?? null,
              weekOrPeriod: props.week ?? null,
              source: 'chimmy',
            })
          }
          toolContext={{
            toolName: 'Chimmy',
            summary: 'Direct chat route',
            sport,
          }}
          className="min-h-[680px]"
        />
      </div>
    </main>
  )
}
