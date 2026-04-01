'use client'

import { getFormatsForSport } from '@/lib/league/format-engine'
import { FormatCard } from '@/components/league/FormatCard'
import { LeagueCreateStepProps } from '../types'

export function FormatStep({ state, setState }: LeagueCreateStepProps) {
  const formats = getFormatsForSport(state.sport)

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {formats.map((format) => (
        <FormatCard
          key={format.id}
          title={format.label}
          description={format.description}
          selected={state.formatId === format.id}
          badges={[
            format.defaultRosterMode.toUpperCase(),
            `${format.draftTypes.length} draft styles`,
          ]}
          onClick={() =>
            setState((current) => ({
              ...current,
              formatId: format.id,
            }))
          }
        />
      ))}
    </div>
  )
}
