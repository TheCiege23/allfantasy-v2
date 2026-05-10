'use client'

import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, TradeReviewMode } from '@/lib/create-league-v2/state'
import { GlassCard, SectionHeader, GlassSelect, Segmented } from '@/components/create-league-v2/primitives'

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const TRADE_REVIEW_OPTIONS: { value: TradeReviewMode; label: string; hint: string }[] = [
  { value: 'none', label: 'No review', hint: 'Trades process immediately' },
  { value: 'commissioner', label: 'Commissioner', hint: 'You approve trades' },
  { value: 'league_vote', label: 'League vote', hint: 'League votes on trades' },
]

type Props = {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

export function LeagueRegionalPreferencesCard({ state, accent, onChange }: Props) {
  const unlocked = Boolean(state.scoringPresetId?.trim())

  return (
    <GlassCard className={!unlocked ? 'pointer-events-none opacity-40' : ''}>
      <SectionHeader
        title="Regional & trades"
        hint="Timezone drives draft clocks and waivers. Trade review applies when your league allows trades."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GlassSelect
          label="Timezone"
          value={state.timezone?.trim() ? state.timezone : 'America/New_York'}
          onChange={(timezone) => onChange({ timezone })}
          options={TIMEZONES}
          accent={accent}
        />
        <GlassSelect
          label="Language"
          value={state.language === 'es' ? 'es' : 'en'}
          onChange={(language) => onChange({ language })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
          ]}
          accent={accent}
        />
      </div>
      <div className="mt-6">
        <SectionHeader title="Trade review" hint="How trades are approved once both managers agree." />
        <Segmented
          options={TRADE_REVIEW_OPTIONS}
          value={state.tradeReviewMode}
          onChange={(tradeReviewMode) => onChange({ tradeReviewMode })}
          accent={accent}
          ariaLabel="Trade review mode"
        />
      </div>
    </GlassCard>
  )
}
