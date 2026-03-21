'use client'

import { StepHeader } from './StepHelp'
import type { WizardScheduleSettings } from '@/lib/league-creation-wizard/types'

const SCHEDULE_UNIT_OPTIONS = ['week', 'round', 'series', 'slate', 'scoring_period'] as const
const CADENCE_OPTIONS = ['weekly', 'daily', 'round', 'slate'] as const
const HEAD_TO_HEAD_OPTIONS = ['head_to_head', 'points_only', 'both'] as const
const LOCK_TIME_OPTIONS = ['game_time', 'first_game', 'slate_lock', 'manual'] as const
const LOCK_WINDOW_OPTIONS = ['first_game_of_week', 'first_game_of_slate', 'game_time', 'slate_lock', 'manual'] as const
const SCORING_PERIOD_OPTIONS = ['full_period', 'daily_rolling', 'slate_based'] as const
const RESCHEDULE_OPTIONS = ['use_final_time', 'use_original_time', 'exclude'] as const
const DOUBLEHEADER_OPTIONS = ['all_games_count', 'single_score_per_slot'] as const
const STRATEGY_OPTIONS = ['round_robin', 'division_based', 'random'] as const

export function ScheduleSettingsPanel(props: {
  sport: string
  leagueVariant: string | null
  scheduleSettings: WizardScheduleSettings
  onScheduleSettingsChange: (patch: Partial<WizardScheduleSettings>) => void
}) {
  const { sport, leagueVariant, scheduleSettings, onScheduleSettingsChange } = props

  return (
    <div className="space-y-5">
      <StepHeader
        title="Schedule settings"
        description="Set default season timeline, matchup cadence, and scoring windows."
        helpTitle="Schedule defaults explained"
        help={(
          <>
            These defaults initialize league schedule behavior by sport and variant. Commissioners can still override them later.
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Schedule unit</span>
          <select
            aria-label="Schedule unit"
            value={scheduleSettings.scheduleUnit}
            onChange={(e) => onScheduleSettingsChange({ scheduleUnit: e.target.value as WizardScheduleSettings['scheduleUnit'] })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {SCHEDULE_UNIT_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Regular season length</span>
          <input
            aria-label="Regular season length"
            type="number"
            min={1}
            value={scheduleSettings.regularSeasonLength}
            onChange={(e) =>
              onScheduleSettingsChange({ regularSeasonLength: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Matchup frequency</span>
          <select
            aria-label="Matchup frequency"
            value={scheduleSettings.matchupFrequency}
            onChange={(e) =>
              onScheduleSettingsChange({ matchupFrequency: e.target.value as WizardScheduleSettings['matchupFrequency'] })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {CADENCE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Matchup cadence</span>
          <select
            aria-label="Matchup cadence"
            value={scheduleSettings.matchupCadence}
            onChange={(e) =>
              onScheduleSettingsChange({ matchupCadence: e.target.value as WizardScheduleSettings['matchupCadence'] })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {CADENCE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Head-to-head / points behavior</span>
          <select
            aria-label="Head-to-head / points behavior"
            value={scheduleSettings.headToHeadOrPointsBehavior}
            onChange={(e) => onScheduleSettingsChange({ headToHeadOrPointsBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {HEAD_TO_HEAD_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Lock time behavior</span>
          <select
            aria-label="Lock time behavior"
            value={scheduleSettings.lockTimeBehavior}
            onChange={(e) =>
              onScheduleSettingsChange({ lockTimeBehavior: e.target.value as WizardScheduleSettings['lockTimeBehavior'] })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {LOCK_TIME_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Lock window behavior</span>
          <select
            aria-label="Lock window behavior"
            value={scheduleSettings.lockWindowBehavior}
            onChange={(e) => onScheduleSettingsChange({ lockWindowBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {LOCK_WINDOW_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Scoring period behavior</span>
          <select
            aria-label="Scoring period behavior"
            value={scheduleSettings.scoringPeriodBehavior}
            onChange={(e) => onScheduleSettingsChange({ scoringPeriodBehavior: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {SCORING_PERIOD_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Reschedule handling</span>
          <select
            aria-label="Reschedule handling"
            value={scheduleSettings.rescheduleHandling}
            onChange={(e) => onScheduleSettingsChange({ rescheduleHandling: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {RESCHEDULE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Doubleheader / multi-game handling</span>
          <select
            aria-label="Doubleheader / multi-game handling"
            value={scheduleSettings.doubleheaderOrMultiGameHandling}
            onChange={(e) => onScheduleSettingsChange({ doubleheaderOrMultiGameHandling: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {DOUBLEHEADER_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Playoff transition point</span>
          <input
            aria-label="Playoff transition point"
            type="number"
            min={1}
            value={scheduleSettings.playoffTransitionPoint ?? ''}
            onChange={(e) =>
              onScheduleSettingsChange({
                playoffTransitionPoint: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
            placeholder="None"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm text-white/85">Schedule generation strategy</span>
          <select
            aria-label="Schedule generation strategy"
            value={scheduleSettings.scheduleGenerationStrategy}
            onChange={(e) => onScheduleSettingsChange({ scheduleGenerationStrategy: e.target.value })}
            className="w-full rounded-lg border border-white/20 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {STRATEGY_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
