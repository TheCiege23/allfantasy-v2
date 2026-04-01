'use client'

import { Input } from '@/components/ui/input'
import { getFormatIntroMetadata } from '@/lib/league/format-engine'
import { LeagueCreateStepProps } from '../types'

const VISIBILITY = ['private', 'unlisted', 'public'] as const

export function InviteStep({ state, setState }: LeagueCreateStepProps) {
  const intro = getFormatIntroMetadata({
    sport: state.sport,
    leagueType: state.formatId,
    requestedModifiers: state.modifiers,
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {VISIBILITY.map((visibility) => (
          <button
            key={visibility}
            type="button"
            onClick={() =>
              setState((current) => ({
                ...current,
                visibility,
              }))
            }
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              state.visibility === visibility
                ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
            }`}
          >
            {visibility}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
        <input
          type="checkbox"
          checked={state.allowInviteLink}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              allowInviteLink: event.target.checked,
            }))
          }
        />
        Allow shareable invite link
      </label>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Invite Emails</label>
        <Input
          value={state.inviteEmails}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              inviteEmails: event.target.value,
            }))
          }
          placeholder="comma,separated@example.com"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
          Intro Video Preview
        </div>
        <div className="text-sm font-semibold text-white">{intro.title}</div>
        <div className="mt-1 text-sm text-white/65">{intro.subtitle}</div>
        <div className="mt-3 text-xs text-white/50">
          Asset: <span className="text-white/70">{intro.introVideo}</span>
        </div>
      </div>
    </div>
  )
}
