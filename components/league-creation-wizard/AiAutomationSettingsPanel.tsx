'use client'

import { useRouter } from 'next/navigation'
import { useEntitlement } from '@/hooks/useEntitlement'
import type {
  WizardAISettings,
  WizardAutomationSettings,
  WizardCommissionerPreferences,
} from '@/lib/league-creation-wizard/types'
import { getUpgradeUrlWithHighlightForFeature } from '@/lib/subscription/featureGating'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StepHeader } from './StepHelp'

export type AutomationDraftPreset = 'alerts_only' | 'standard' | 'full'

const AUTOMATION_PRESET_LABEL: Record<AutomationDraftPreset, string> = {
  alerts_only: 'Draft alerts only',
  standard: 'Standard (alerts, queue autopick, reminders)',
  full: 'Full draft assistance (all alerts and reminders on)',
}

function presetToSettings(preset: AutomationDraftPreset): Partial<WizardAutomationSettings> {
  switch (preset) {
    case 'alerts_only':
      return {
        draftNotificationsEnabled: true,
        autopickFromQueueEnabled: false,
        slowDraftRemindersEnabled: false,
      }
    case 'standard':
      return {
        draftNotificationsEnabled: true,
        autopickFromQueueEnabled: true,
        slowDraftRemindersEnabled: true,
      }
    case 'full':
    default:
      return {
        draftNotificationsEnabled: true,
        autopickFromQueueEnabled: true,
        slowDraftRemindersEnabled: true,
      }
  }
}

function detectPreset(a: WizardAutomationSettings): AutomationDraftPreset {
  if (a.draftNotificationsEnabled && !a.autopickFromQueueEnabled && !a.slowDraftRemindersEnabled) {
    return 'alerts_only'
  }
  if (a.draftNotificationsEnabled && a.autopickFromQueueEnabled && a.slowDraftRemindersEnabled) {
    return 'full'
  }
  return 'standard'
}

export type AiAutomationSettingsPanelProps = {
  sport: string
  aiSettings: WizardAISettings
  automationSettings: WizardAutomationSettings
  commissionerPreferences: WizardCommissionerPreferences
  onAiChange: (patch: Partial<WizardAISettings>) => void
  onAutomationChange: (patch: Partial<WizardAutomationSettings>) => void
  onCommissionerChange: (patch: Partial<WizardCommissionerPreferences>) => void
}

/**
 * Draft AI + free draft automation presets + AF Commissioner AI tools (subscription-gated).
 */
export function AiAutomationSettingsPanel({
  sport,
  aiSettings,
  automationSettings,
  commissionerPreferences,
  onAiChange,
  onAutomationChange,
  onCommissionerChange,
}: AiAutomationSettingsPanelProps) {
  const router = useRouter()
  const { loading, featureAccess, upgradePath } = useEntitlement('commissioner_automation')
  const locked = !loading && !featureAccess
  const upgradeUrl = getUpgradeUrlWithHighlightForFeature('commissioner_automation')

  const goSubscribe = () => {
    router.push(upgradeUrl || upgradePath || '/commissioner-upgrade')
  }

  const preset = detectPreset(automationSettings)

  const commissionerRows: {
    key: keyof WizardCommissionerPreferences
    label: string
    description: string
  }[] = [
    {
      key: 'leagueAutomation',
      label: 'League automation',
      description: 'AI-assisted league cycles and commissioner workflows.',
    },
    {
      key: 'integrityMonitoring',
      label: 'Integrity monitoring',
      description: 'Flags unusual patterns for commissioner review.',
    },
    {
      key: 'weeklyRecaps',
      label: 'Weekly recaps',
      description: 'Narrated summaries for your league channel.',
    },
    {
      key: 'draftCopilot',
      label: 'Draft copilot',
      description: 'Deeper draft-room guidance for commissioners.',
    },
    {
      key: 'matchupNarration',
      label: 'Matchup narration',
      description: 'Story-style matchup previews and results.',
    },
    {
      key: 'fairnessAudit',
      label: 'Fairness audit',
      description: 'Trade and roster fairness highlights.',
    },
    {
      key: 'powerRankingsAi',
      label: 'AI power rankings',
      description: 'League power ranks with explanations.',
    },
    {
      key: 'constitutionAssistant',
      label: 'Rules assistant',
      description: 'Help drafting and clarifying league rules.',
    },
  ]

  return (
    <div className="space-y-8">
      <StepHeader
        title="Draft help & automation"
        description="Free draft alerts and queue behavior. Advanced commissioner AI is optional and can be managed later in league settings."
        help={
          <>
            <strong>Free</strong> — draft notifications, autopick from queue, and slow-draft reminders (Sleeper-style draft
            hygiene). <strong>AF Commissioner</strong> — optional AI tools for running the league; requires an active
            subscription.
          </>
        }
        helpTitle="How this step works"
      />

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <h4 className="text-sm font-semibold text-cyan-200/90">Draft assistance (free)</h4>
        <div className="space-y-3">
          <Label className="text-white/80">Draft automation</Label>
          <Select
            value={preset}
            onValueChange={(v) => onAutomationChange(presetToSettings(v as AutomationDraftPreset))}
          >
            <SelectTrigger className="min-h-[44px] border-white/20 bg-[#030a20] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AUTOMATION_PRESET_LABEL) as AutomationDraftPreset[]).map((id) => (
                <SelectItem key={id} value={id}>
                  {AUTOMATION_PRESET_LABEL[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-white/50">
            These options only affect draft notifications and autopick — no subscription required.
          </p>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiSettings.aiAdpEnabled}
              onChange={(e) => onAiChange({ aiAdpEnabled: e.target.checked })}
              className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            />
            <div>
              <span className="text-sm font-medium text-white/90">AI rankings in draft room</span>
              <p className="text-xs text-white/50 mt-0.5">Use AI-assisted player lists during the draft ({sport}).</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiSettings.draftHelperEnabled}
              onChange={(e) => onAiChange({ draftHelperEnabled: e.target.checked })}
              className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            />
            <div>
              <span className="text-sm font-medium text-white/90">Draft suggestions</span>
              <p className="text-xs text-white/50 mt-0.5">Pick suggestions and queue hints while drafting.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiSettings.orphanTeamAiManagerEnabled}
              onChange={(e) => onAiChange({ orphanTeamAiManagerEnabled: e.target.checked })}
              className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            />
            <div>
              <span className="text-sm font-medium text-white/90">Auto-pick for open teams</span>
              <p className="text-xs text-white/50 mt-0.5">When a team has no manager, use smart picks on the clock.</p>
            </div>
          </label>
        </div>
      </section>

      <section
        className={`space-y-4 rounded-2xl border p-4 ${
          locked ? 'border-white/10 bg-white/[0.02]' : 'border-cyan-400/20 bg-cyan-400/[0.04]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-white">AF Commissioner AI</h4>
          {loading ? (
            <span className="text-xs text-white/45">Checking subscription…</span>
          ) : locked ? (
            <span className="text-xs text-amber-200/80">Subscription required</span>
          ) : (
            <span className="text-xs text-emerald-200/80">Included with AF Commissioner</span>
          )}
        </div>
        <p className="text-xs text-white/55">
          Turn on the tools you want available for this league. Full commissioner controls stay under League → Settings
          after creation.
        </p>
        <div className="space-y-3">
          {commissionerRows.map((row) => {
            const checked = commissionerPreferences[row.key]
            return (
              <label
                key={row.key}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                  locked
                    ? 'cursor-pointer border-white/10 bg-black/30 opacity-70'
                    : 'cursor-pointer border-white/15 bg-black/25 hover:bg-black/35'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={locked ? false : checked}
                  onChange={(e) => {
                    if (locked) {
                      goSubscribe()
                      return
                    }
                    onCommissionerChange({ [row.key]: e.target.checked })
                  }}
                  className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4 disabled:opacity-50"
                />
                <span>
                  <span className="block text-sm font-medium text-white/90">{row.label}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{row.description}</span>
                  {locked ? (
                    <span className="mt-1 block text-xs text-amber-200/90">Requires AF Commissioner — click to subscribe</span>
                  ) : null}
                </span>
              </label>
            )
          })}
        </div>
      </section>
    </div>
  )
}
