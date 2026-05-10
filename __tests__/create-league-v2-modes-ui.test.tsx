import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CreateLeagueUnifiedForm } from '@/components/create-league-v2/CreateLeagueUnifiedForm'
import { CreateLeagueReviewStep } from '@/components/create-league-v2/CreateLeagueReviewStep'
import { DEFAULT_V2_STATE, type CreateLeagueV2State } from '@/lib/create-league-v2/state'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
}))

vi.mock('@/components/i18n/LanguageProviderClient', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    tInterpolate: (key: string) => key,
  }),
}))

vi.mock('@/lib/i18n/createLeagueWire', () => ({
  localizeDraftTypeOption: (_t: (key: string) => string, option: { id: string; label: string; hint: string }) => option,
}))

vi.mock('@/components/create-league', () => ({
  ConceptSelector: () => <section data-testid="concept-section">concept</section>,
  SportScoringSelector: () => <section data-testid="sport-scoring-section">sport-scoring</section>,
  TeamNameSection: () => <section data-testid="team-name-section">teams-name</section>,
  DraftTypeSelector: () => <section data-testid="draft-type-section">draft-type</section>,
  DynastyAdvancedSettings: () => <section data-testid="dynasty-advanced-section">dynasty-advanced</section>,
  KeeperAdvancedSettings: () => <section data-testid="keeper-advanced-section">keeper-advanced</section>,
  BestBallAdvancedSettings: () => <section data-testid="bestball-advanced-section">bestball-advanced</section>,
}))

function state(overrides: Partial<CreateLeagueV2State> = {}): CreateLeagueV2State {
  return {
    ...DEFAULT_V2_STATE,
    leagueType: 'dynasty',
    sport: 'NFL',
    scoringPresetId: 'fb_half_ppr',
    draftType: 'snake',
    name: 'Mode Test League',
    nameTouched: true,
    ...overrides,
  }
}

const accent = {
  name: 'cyan',
  hex: '#22d3ee',
  hexSoft: '#67e8f9',
  ring: 'ring-cyan-400/40',
  glow: 'shadow-[0_0_20px_-8px_rgba(34,211,238,0.8)]',
  text: 'text-cyan-300',
  border: 'border-cyan-400/30',
  from: 'from-cyan-400/20',
  to: 'to-cyan-200/10',
} as const

describe('create-league-v2 creation modes UI', () => {
  it('quick mode hides advanced commissioner sections', () => {
    render(
      <CreateLeagueUnifiedForm
        state={state({ creationMode: 'quick', leagueType: 'dynasty' })}
        accent={accent}
        onChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('concept-section')).toBeInTheDocument()
    expect(screen.getByTestId('sport-scoring-section')).toBeInTheDocument()
    expect(screen.getByTestId('draft-type-section')).toBeInTheDocument()
    expect(screen.getByTestId('team-name-section')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()

    expect(screen.queryByTestId('dynasty-advanced-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('keeper-advanced-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bestball-advanced-section')).not.toBeInTheDocument()
  })

  it('advanced mode shows advanced sections when concept matches', () => {
    render(
      <CreateLeagueUnifiedForm
        state={state({ creationMode: 'advanced', leagueType: 'dynasty' })}
        accent={accent}
        onChange={() => undefined}
      />,
    )

    expect(screen.getByTestId('dynasty-advanced-section')).toBeInTheDocument()
  })

  it('review labels quick and advanced modes and rank-window message', () => {
    const { rerender } = render(<CreateLeagueReviewStep state={state({ creationMode: 'quick' })} accent={accent} />)

    expect(screen.getByText('Creation mode')).toBeInTheDocument()
    expect(screen.getByText('Quick')).toBeInTheDocument()
    expect(screen.getByText('Rank window will be calculated after creation.')).toBeInTheDocument()

    rerender(<CreateLeagueReviewStep state={state({ creationMode: 'advanced' })} accent={accent} />)
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })
})
