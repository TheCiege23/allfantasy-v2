'use client'

import { StepHeader } from './StepHelp'
import type { WizardWaiverSettings } from '@/lib/league-creation-wizard/types'

const WAIVER_TYPE_OPTIONS: Array<{ value: WizardWaiverSettings['waiverType']; label: string }> = [
  { value: 'faab', label: 'FAAB' },
  { value: 'rolling', label: 'Rolling waivers' },
  { value: 'reverse_standings', label: 'Reverse standings' },
  { value: 'fcfs', label: 'Free agents (FCFS)' },
  { value: 'standard', label: 'Standard waivers' },
]

const CLAIM_PRIORITY_OPTIONS = [
  { value: 'faab_highest', label: 'Highest FAAB bid' },
  { value: 'priority_lowest_first', label: 'Waiver priority (lowest first)' },
  { value: 'reverse_standings', label: 'Reverse standings' },
  { value: 'earliest_claim', label: 'Earliest claim timestamp' },
]

const FREE_AGENT_UNLOCK_OPTIONS = [
  { value: 'after_waiver_run', label: 'After waiver run' },
  { value: 'daily', label: 'Daily unlock' },
  { value: 'instant', label: 'Instant FCFS' },
  { value: 'game_lock', label: 'At game lock' },
  { value: 'slate_lock', label: 'At slate lock' },
]

const GAME_LOCK_OPTIONS = [
  { value: 'game_time', label: 'Individual game time' },
  { value: 'first_game', label: 'First game of day/week' },
  { value: 'slate_lock', label: 'Slate lock' },
  { value: 'manual', label: 'Manual commissioner lock' },
]

const SAME_DAY_OPTIONS = [
  { value: 'allow_if_not_played', label: 'Allow if player has not played' },
  { value: 'allow', label: 'Always allow' },
  { value: 'disallow', label: 'Disallow same-day add/drop' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function WaiverSettingsPanel(props: {
  sport: string
  leagueVariant: string | null
  waiverSettings: WizardWaiverSettings
  onWaiverSettingsChange: (patch: Partial<WizardWaiverSettings>) => void
}) {
  const { sport, leagueVariant, waiverSettings, onWaiverSettingsChange } = props
  const normalizedSport = String(sport).toUpperCase()
  const normalizedVariant = String(leagueVariant ?? '').toUpperCase()
  const isNflIdp = normalizedSport === 'NFL' && (normalizedVariant === 'IDP' || normalizedVariant === 'DYNASTY_IDP')

  const faabEnabled = waiverSettings.waiverType === 'faab' || waiverSettings.faabEnabled

  return (
    <div className="space-y-5">
      <StepHeader
        title="Waiver settings"
        description="Choose default waiver behavior for this league. These values are saved at creation and can be overridden later by commissioners."
        helpTitle="Waiver defaults explained"
        help={(
          <>
            Set waiver mode, processing cadence, FAAB defaults, and lock behavior. These power claim processing, waiver UI, and AI waiver recommendations.
          </>
        )}
      />

      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70">
        Sport: <span className="text-white/90">{sport}</span>
        {leagueVariant ? (
          <>
            {' '}· Variant: <span className="text-white/90">{leagueVariant}</span>
          </>
        ) : null}
        {isNflIdp ? <div className="mt-1 text-amber-300">NFL IDP keeps offensive + defensive claim support enabled.</div> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Waiver type</span>
          <select
            value={waiverSettings.waiverType}
            onChange={(e) => {
              const nextType = e.target.value as WizardWaiverSettings['waiverType']
              onWaiverSettingsChange({
                waiverType: nextType,
                faabEnabled: nextType === 'faab',
                claimPriorityBehavior:
                  nextType === 'faab'
                    ? 'faab_highest'
                    : nextType === 'reverse_standings'
                      ? 'reverse_standings'
                      : nextType === 'fcfs'
                        ? 'earliest_claim'
                        : 'priority_lowest_first',
              })
            }}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {WAIVER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Processing time (UTC)</span>
          <input
            type="time"
            value={waiverSettings.processingTimeUtc ?? ''}
            onChange={(e) =>
              onWaiverSettingsChange({ processingTimeUtc: e.target.value ? e.target.value : null })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm text-white/85">Processing days</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((label, dayIdx) => {
            const checked = waiverSettings.processingDays.includes(dayIdx)
            return (
              <label key={label} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/20 px-2.5 py-1.5 text-xs text-white/85">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? Array.from(new Set([...waiverSettings.processingDays, dayIdx])).sort((a, b) => a - b)
                      : waiverSettings.processingDays.filter((d) => d !== dayIdx)
                    onWaiverSettingsChange({ processingDays: next })
                  }}
                  className="rounded border-white/30"
                />
                {label}
              </label>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Claim priority</span>
          <select
            value={waiverSettings.claimPriorityBehavior ?? 'priority_lowest_first'}
            onChange={(e) => onWaiverSettingsChange({ claimPriorityBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {CLAIM_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Max claims per period</span>
          <input
            type="number"
            min={0}
            value={waiverSettings.maxClaimsPerPeriod ?? ''}
            onChange={(e) =>
              onWaiverSettingsChange({
                maxClaimsPerPeriod: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
            placeholder="Unlimited"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Free agent unlock</span>
          <select
            value={waiverSettings.freeAgentUnlockBehavior ?? 'after_waiver_run'}
            onChange={(e) => onWaiverSettingsChange({ freeAgentUnlockBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {FREE_AGENT_UNLOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Game lock behavior</span>
          <select
            value={waiverSettings.gameLockBehavior ?? 'game_time'}
            onChange={(e) => onWaiverSettingsChange({ gameLockBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {GAME_LOCK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Same-day add/drop</span>
          <select
            value={waiverSettings.sameDayAddDropRules ?? 'allow_if_not_played'}
            onChange={(e) => onWaiverSettingsChange({ sameDayAddDropRules: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {SAME_DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85">
          <input
            type="checkbox"
            checked={waiverSettings.continuousWaiversBehavior}
            onChange={(e) => onWaiverSettingsChange({ continuousWaiversBehavior: e.target.checked })}
            className="rounded border-white/30"
          />
          Continuous waivers
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85">
          <input
            type="checkbox"
            checked={faabEnabled}
            onChange={(e) =>
              onWaiverSettingsChange({
                faabEnabled: e.target.checked,
                waiverType: e.target.checked ? 'faab' : waiverSettings.waiverType === 'faab' ? 'standard' : waiverSettings.waiverType,
              })
            }
            className="rounded border-white/30"
          />
          Enable FAAB
        </label>

        {faabEnabled ? (
          <label className="space-y-1.5">
            <span className="text-sm text-white/85">FAAB budget</span>
            <input
              type="number"
              min={0}
              value={waiverSettings.faabBudget ?? ''}
              onChange={(e) =>
                onWaiverSettingsChange({
                  faabBudget: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
