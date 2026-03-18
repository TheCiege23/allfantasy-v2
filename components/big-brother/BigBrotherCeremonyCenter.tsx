'use client'

/**
 * [NEW] Ceremony Center: nomination, veto draw, veto ceremony, replacement, eviction, host recap. PROMPT 4.
 */

import { useState } from 'react'
import type { BigBrotherSummary } from './types'

export interface BigBrotherCeremonyCenterProps {
  leagueId: string
  summary: BigBrotherSummary
}

const CEREMONY_TABS = ['Nomination', 'Veto Draw', 'Veto Ceremony', 'Replacement', 'Eviction'] as const

export function BigBrotherCeremonyCenter({ leagueId, summary }: BigBrotherCeremonyCenterProps) {
  const [tab, setTab] = useState<(typeof CEREMONY_TABS)[number]>('Nomination')
  const names = summary.rosterDisplayNames ?? {}
  const cycle = summary.cycle

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {CEREMONY_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-amber-500/20 text-amber-200' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        {tab === 'Nomination' && (
          <>
            <h3 className="text-sm font-medium text-white/90">Nomination Ceremony</h3>
            {cycle?.nominee1RosterId && cycle?.nominee2RosterId ? (
              <p className="mt-2 text-sm text-white/70">
                HOH nominated {names[cycle.nominee1RosterId] ?? cycle.nominee1RosterId} and {names[cycle.nominee2RosterId] ?? cycle.nominee2RosterId} to the block.
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/50">Nominations not yet set for this week.</p>
            )}
          </>
        )}
        {tab === 'Veto Draw' && (
          <>
            <h3 className="text-sm font-medium text-white/90">Veto Players</h3>
            {cycle?.vetoParticipantRosterIds?.length ? (
              <ul className="mt-2 list-inside list-disc text-sm text-white/70">
                {cycle.vetoParticipantRosterIds.map((id) => (
                  <li key={id}>{names[id] ?? id}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-white/50">Veto draw not yet run.</p>
            )}
          </>
        )}
        {tab === 'Veto Ceremony' && (
          <>
            <h3 className="text-sm font-medium text-white/90">Veto Result</h3>
            {cycle?.vetoWinnerRosterId ? (
              <p className="mt-2 text-sm text-white/70">
                {names[cycle.vetoWinnerRosterId] ?? cycle.vetoWinnerRosterId} won the Veto.
                {cycle.vetoUsed ? ` Used it to save ${cycle.vetoSavedRosterId ? names[cycle.vetoSavedRosterId] ?? cycle.vetoSavedRosterId : 'a nominee'}.` : ' Kept nominations the same.'}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/50">Veto not yet decided.</p>
            )}
          </>
        )}
        {tab === 'Replacement' && (
          <>
            <h3 className="text-sm font-medium text-white/90">Replacement Nominee</h3>
            {cycle?.vetoUsed && cycle?.replacementNomineeRosterId ? (
              <p className="mt-2 text-sm text-white/70">
                HOH named {names[cycle.replacementNomineeRosterId] ?? cycle.replacementNomineeRosterId} as the replacement nominee.
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/50">{cycle?.vetoUsed ? 'Replacement not yet set.' : 'No replacement (veto not used).'}</p>
            )}
          </>
        )}
        {tab === 'Eviction' && (
          <>
            <h3 className="text-sm font-medium text-white/90">Eviction</h3>
            {cycle?.evictedRosterId ? (
              <p className="mt-2 text-sm text-white/70">
                {names[cycle.evictedRosterId] ?? cycle.evictedRosterId} was evicted this week.
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/50">Eviction not yet held.</p>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-white/40">Host recap and ceremony copy appear in league chat and from Chimmy.</p>
    </div>
  )
}
