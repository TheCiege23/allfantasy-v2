'use client'

/**
 * Page 2 — League Identity.
 *
 * Collects: name, description, timezone, language, scoring source,
 * trade review mode. Everything else is deferred to the backend defaults.
 */

import type { AccentTone } from '@/lib/create-league-v2/theme'
import type {
  CreateLeagueV2State,
  ScoringSource,
  TradeReviewMode,
} from '@/lib/create-league-v2/state'
import {
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  SectionHeader,
  Segmented,
  SelectableCard,
} from './primitives'

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

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

type ScoringCard = { id: ScoringSource; title: string; subtitle: string }
const SCORING_SOURCES: ScoringCard[] = [
  { id: 'af', title: 'AF Default', subtitle: 'Tuned for AllFantasy' },
  { id: 'sleeper', title: 'Sleeper', subtitle: 'Mirror Sleeper defaults' },
  { id: 'espn', title: 'ESPN', subtitle: 'Mirror ESPN defaults' },
  { id: 'yahoo', title: 'Yahoo', subtitle: 'Mirror Yahoo defaults' },
]

const TRADE_REVIEW_OPTIONS: { value: TradeReviewMode; label: string; hint: string }[] = [
  { value: 'none', label: 'No Review', hint: 'Instant trades' },
  { value: 'commissioner', label: 'Commissioner', hint: 'You approve each trade' },
  { value: 'league_vote', label: 'League Vote', hint: 'Majority decides' },
]

export interface Page2IdentityProps {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

export function Page2Identity({ state, accent, onChange }: Page2IdentityProps) {
  const trimmedLen = state.name.trim().length
  const nameError =
    state.name.length > 0 && (trimmedLen < 3 || trimmedLen > 100)
      ? 'League name must be 3–100 characters'
      : null

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Basics" hint="The league name appears everywhere — make it yours." />
        <div className="space-y-4">
          <GlassInput
            label="League Name"
            value={state.name}
            onChange={(v) => onChange({ name: v })}
            placeholder="e.g. The Midnight Gridiron"
            accent={accent}
            maxLength={100}
            error={nameError}
            hint={`${trimmedLen}/100`}
          />
          <GlassTextarea
            label="Description"
            value={state.description}
            onChange={(v) => onChange({ description: v })}
            placeholder="What makes your league special?"
            rows={3}
            maxLength={500}
            accent={accent}
            hint={`${state.description.length}/500 — optional`}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Regional" hint="Drives draft clock, waiver timing, and UI locale." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GlassSelect
            label="Timezone"
            value={state.timezone}
            onChange={(timezone) => onChange({ timezone })}
            options={TIMEZONES}
            accent={accent}
          />
          <GlassSelect
            label="Language"
            value={state.language}
            onChange={(language) => onChange({ language })}
            options={LANGUAGES}
            accent={accent}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader
          title="Scoring Source"
          hint="Pick a preset to inherit — you can still customize every value later."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SCORING_SOURCES.map((src) => (
            <SelectableCard
              key={src.id}
              selected={state.scoringSource === src.id}
              onClick={() => onChange({ scoringSource: src.id })}
              accent={accent}
              title={src.title}
              subtitle={src.subtitle}
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Trade Review" hint="How trades clear once two managers agree." />
        <Segmented
          options={TRADE_REVIEW_OPTIONS}
          value={state.tradeReviewMode}
          onChange={(tradeReviewMode) => onChange({ tradeReviewMode })}
          accent={accent}
          ariaLabel="Trade review mode"
        />
      </GlassCard>
    </div>
  )
}
