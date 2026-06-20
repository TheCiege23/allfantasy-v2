import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WaiverPlayerRow from '@/components/waiver-wire/WaiverPlayerRow'
import WaiverWirePage from '@/components/waiver-wire/WaiverWirePage'
import type { UnifiedPlayerWireDto } from '@/lib/player-data/serializeUnifiedPlayerForApi'

vi.mock('@/hooks/useUserTimezone', () => ({
  useUserTimezone: () => ({
    timezone: 'UTC',
    formatInTimezone: (value: string) => value,
    formatTimeInTimezone: (value: string) => value,
    formatDateInTimezone: (value: string) => value,
  }),
}))

vi.mock('@/hooks/useAIAssistantAvailability', () => ({
  useAIAssistantAvailability: () => ({ enabled: false, loading: false }),
}))

vi.mock('@/components/player-comparison-ui', () => ({
  usePlayerComparisonUIOptional: () => null,
}))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function player(partial: Partial<UnifiedPlayerWireDto> = {}): UnifiedPlayerWireDto {
  return {
    id: 'player-1',
    name: 'Brock Bowers',
    position: 'TE',
    team: 'LV',
    sport: 'NFL',
    headshotUrl: null,
    injuryStatus: null,
    fantasyPointsPerGame: 12.4,
    projectedPoints: 13.8,
    adp: 28.2,
    aiAdp: null,
    aiAdpSampleSize: null,
    collegeClass: 'unknown',
    collegeClassLabel: null,
    soccerLeague: null,
    nflRookieIsRookie: null,
    nflRookieSource: null,
    lowConfidence: false,
    profileSource: 'rolling_insights',
    statsSource: 'rolling_insights',
    projectionsSource: 'allfantasy:rolling_insights',
    normalizedStats: { fantasyPointsPerGame: 12.4, receivingYards: 1120, receivingTouchdowns: 6 },
    normalizedProjections: {},
    product: { unified: {} as UnifiedPlayerWireDto['product']['unified'], yearsExp: 1, isRookie: false, byeWeek: 8 },
    ...partial,
  }
}

function mockWaiverPageFetch(players: UnifiedPlayerWireDto[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/waiver-wire/leagues/league-1/settings')) {
      return jsonResponse({ waiverType: 'faab', sport: 'NFL', faabBudget: 100 })
    }
    if (url.includes('/api/waiver-wire/leagues/league-1/claims?type=history')) {
      return jsonResponse({ claims: [], transactions: [] })
    }
    if (url.includes('/api/waiver-wire/leagues/league-1/claims')) {
      return jsonResponse({ claims: [] })
    }
    if (url.includes('/api/waiver-wire/leagues/league-1/players')) {
      return jsonResponse({ players, rosteredCount: 0 })
    }
    if (url.includes('/api/league/roster?leagueId=league-1')) {
      return jsonResponse({
        roster: [],
        faabRemaining: 100,
        waiverPriority: 1,
        slotLimits: { starters: 9, bench: 7 },
        starterAllowedPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX'],
      })
    }
    if (url.includes('/api/waiver-wire/leagues/league-1/state')) {
      return jsonResponse({ state: { nextRunAt: null, processingLocked: false } })
    }
    if (url.includes('/api/commissioner/leagues/league-1/waivers?type=settings')) {
      return jsonResponse({ error: 'forbidden' }, 403)
    }
    if (url.includes('/api/monetization/context')) {
      return jsonResponse({})
    }
    return jsonResponse({})
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Redraft Players + Waivers deep build', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
        clear: () => {
          store.clear()
        },
      },
    })
  })

  it('renders complete player card data with source labels and position color chip', () => {
    render(
      <WaiverPlayerRow
        sport="NFL"
        player={{
          id: 'bowers',
          name: 'Brock Bowers',
          position: 'TE',
          team: 'LV',
          headshotUrl: null,
          injuryStatus: 'Questionable',
          projectedPoints: 13.8,
          adp: 28.2,
          aiAdp: null,
          byeWeek: 8,
          rank: 32,
          projectionSourceLabel: 'Projection: AF rolling insights',
          adpSourceLabel: 'Provider ADP',
          statsSourceLabel: 'Stats: rolling insights',
          dataQualityLabels: ['AF ADP coming soon'],
          seasonStatsSummary: ['PPG 12.4', 'YDS 1120'],
        }}
        onAddClick={vi.fn()}
      />,
    )

    expect(screen.getByText('Brock Bowers')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-player-position-chip-bowers')).toHaveTextContent('TE')
    expect(screen.getByTestId('waiver-player-projection-bowers')).toHaveTextContent('13.8')
    expect(screen.getByTestId('waiver-player-adp-bowers')).toHaveTextContent('28.2')
    expect(screen.getByText('Provider ADP')).toBeInTheDocument()
    expect(screen.getByText('Projection: AF rolling insights')).toBeInTheDocument()
    expect(screen.getByText('AF ADP coming soon')).toBeInTheDocument()
    expect(screen.getByText('PPG 12.4')).toBeInTheDocument()
  })

  it('renders media fallbacks and NCAAF limited-data labels safely', () => {
    render(
      <WaiverPlayerRow
        sport="NCAAF"
        player={{
          id: 'college-qb',
          name: 'College QB',
          position: 'QB',
          team: null,
          headshotUrl: null,
          projectedPoints: null,
          adp: null,
          aiAdp: null,
          projectionSourceLabel: 'Fallback projection',
          adpSourceLabel: 'Missing ADP',
          statsSourceLabel: 'Missing stats',
          dataQualityLabels: ['NCAAF limited data', 'Missing stats'],
          seasonStatsSummary: [],
        }}
        onAddClick={vi.fn()}
      />,
    )

    expect(screen.getByText('College QB')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-player-team-logo-fallback-FA')).toBeInTheDocument()
    expect(screen.getAllByText('NCAAF limited data')).toHaveLength(2)
    expect(screen.getByText('Missing stats')).toBeInTheDocument()
    expect(screen.getByTestId('waiver-player-projection-college-qb')).toHaveTextContent('-')
  })

  it('uses local search/filter/sort and does not render the full large player list', async () => {
    const players = Array.from({ length: 130 }, (_, index) =>
      player({
        id: `p-${index + 1}`,
        name: index === 129 ? 'Needle Runner' : `Player ${index + 1}`,
        position: index % 2 === 0 ? 'RB' : 'WR',
        team: index % 2 === 0 ? 'KC' : 'DAL',
        projectedPoints: index,
        adp: 200 - index,
      }),
    )
    const fetchMock = mockWaiverPageFetch(players)

    render(<WaiverWirePage leagueId="league-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('waiver-player-render-limit-note')).toHaveTextContent('Showing 120 of 130')
    })

    const firstRow = screen.getByTestId('waiver-player-row-p-130')
    expect(within(firstRow).getByText('Needle Runner')).toBeInTheDocument()
    expect(screen.queryByTestId('waiver-player-row-p-1')).toBeNull()

    fireEvent.change(screen.getByTestId('waiver-search-input'), { target: { value: 'Needle' } })
    await waitFor(() => {
      expect(screen.getByText('Needle Runner')).toBeInTheDocument()
      expect(screen.queryByTestId('waiver-player-render-limit-note')).toBeNull()
    })

    fireEvent.click(screen.getByTestId('waiver-position-filter-WR'))
    await waitFor(() => {
      expect(screen.getByText('Needle Runner')).toBeInTheDocument()
    })

    const playerFetches = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/players'))
    expect(playerFetches).toHaveLength(1)
    expect(String(playerFetches[0]?.[0])).toContain('limit=200')
  })
})
