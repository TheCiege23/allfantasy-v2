'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WizardPrivacySettings } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

const VISIBILITY_OPTS: { value: WizardPrivacySettings['visibility']; label: string; title?: string }[] = [
  { value: 'private', label: 'Private — only people you invite', title: 'Recommended until you invite managers' },
  { value: 'unlisted', label: 'Unlisted — anyone with the link can view', title: 'Not in discovery; link required' },
  { value: 'public', label: 'Public — discoverable in league discovery', title: 'Anyone can find and request to join' },
]

export type LeaguePrivacyPanelProps = {
  value: WizardPrivacySettings
  onChange: (patch: Partial<WizardPrivacySettings>) => void
}

/**
 * League visibility and invite link. Who can see and join the league.
 */
export function LeaguePrivacyPanel({ value, onChange }: LeaguePrivacyPanelProps) {
  const p = value
  return (
    <div className="space-y-5">
      <StepHeader
        title="Privacy & invitations"
        description="Control who can see your league and whether you can share an invite link. Private is recommended until you've invited managers."
        help={
          <>
            <strong>Private</strong> — Only invited managers. <strong>Unlisted</strong> — Anyone with the link can view; not in discovery. <strong>Public</strong> — League can appear in discovery. Invite link can be toggled separately.
          </>
        }
        helpTitle="Visibility explained"
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/90">Visibility</Label>
          <Select
            value={p.visibility}
            onValueChange={(v) => onChange({ visibility: v as WizardPrivacySettings['visibility'] })}
          >
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title={VISIBILITY_OPTS.find((o) => o.value === p.visibility)?.title}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTS.map(({ value: v, label, title: t }) => (
                <SelectItem key={v} value={v} title={t}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Private is recommended until you've invited your managers.</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer" title="Share a link so others can join">
          <input
            type="checkbox"
            checked={p.allowInviteLink}
            onChange={(e) => onChange({ allowInviteLink: e.target.checked })}
            className="mt-1 rounded border-white/30 bg-gray-900 shrink-0 size-4"
            aria-describedby="invite-help"
          />
          <div>
            <span className="text-sm font-medium text-white/90">Allow invite link</span>
            <p id="invite-help" className="text-xs text-white/50 mt-0.5">Let commissioners share a link to invite people to the league.</p>
          </div>
        </label>
      </div>
    </div>
  )
}
