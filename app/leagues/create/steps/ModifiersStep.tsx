'use client'

import { getLeagueFormatDefinition, type LeagueFormatModifierId } from '@/lib/league/format-engine'
import { LeagueCreateStepProps } from '../types'

const MODIFIER_LABELS: Record<LeagueFormatModifierId, string> = {
  superflex: 'Superflex',
  idp: 'IDP',
  te_premium: 'TE Premium',
  taxi: 'Taxi Squad',
  devy: 'Devy Assets',
  c2c: 'College Scoring',
  salary_cap: 'Salary Cap',
  best_ball: 'Best Ball',
}

export function ModifiersStep({ state, setState }: LeagueCreateStepProps) {
  const format = getLeagueFormatDefinition(state.formatId)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {format.supportedModifiers.map((modifier) => {
        const checked = state.modifiers.includes(modifier)
        return (
          <label
            key={modifier}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
              checked
                ? 'border-cyan-300/60 bg-cyan-300/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  modifiers: event.target.checked
                    ? [...new Set([...current.modifiers, modifier])]
                    : current.modifiers.filter((entry) => entry !== modifier),
                }))
              }
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-white">{MODIFIER_LABELS[modifier]}</div>
              <div className="mt-1 text-xs text-white/55">
                Enable {MODIFIER_LABELS[modifier].toLowerCase()} rules for this format.
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}
