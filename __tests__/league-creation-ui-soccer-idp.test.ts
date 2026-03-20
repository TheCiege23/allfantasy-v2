import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as typeof globalThis & { React?: typeof React }).React = React

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
    React.createElement('label', props, children),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectTrigger: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
    React.createElement('div', props, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement('span', null, placeholder ?? 'value'),
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-value': value }, children),
}))

vi.mock('@/hooks/useSportRules', () => ({
  useSportRules: vi.fn(() => ({
    rules: {
      roster: {
        slots: [
          { slotName: 'QB', starterCount: 1 },
          { slotName: 'RB', starterCount: 2 },
          { slotName: 'DE', starterCount: 2 },
          { slotName: 'BENCH', starterCount: 0 },
        ],
      },
    },
  })),
}))

vi.mock('@/hooks/useSportPreset', () => ({
  useSportPreset: vi.fn((_sport: string, _variant?: string | null) => ({
    preset: {
      scheduleTemplate: {
        regularSeasonWeeks: 14,
        playoffWeeks: 3,
        matchupType: 'head_to_head',
      },
      seasonCalendar: {
        regularSeasonPeriod: {
          label: 'Regular Season',
        },
      },
      teamMetadata: {
        teams: [{ team_id: '1', abbreviation: 'MIA', team_name: 'Inter Miami CF', city: 'Miami', primary_logo: null, alternate_logo: null }],
      },
      league: {
        default_team_count: 12,
        default_playoff_team_count: 6,
        default_regular_season_length: 14,
        default_matchup_unit: 'weeks',
      },
    },
  })),
}))

describe('Prompt 15 league creation UI copy', () => {
  it('explains that Soccer is a sport and IDP is an NFL preset in the sport selector', async () => {
    const { LeagueCreationSportSelector } = await import('@/components/league-creation/LeagueCreationSportSelector')

    const html = renderToStaticMarkup(
      React.createElement(LeagueCreationSportSelector, { value: 'SOCCER', onChange: () => undefined, showHelper: true })
    )

    expect(html).toContain('Soccer')
    expect(html).toContain('is its own sport with its own roster and scoring')
    expect(html).toContain('IDP')
    expect(html).toContain('is an NFL preset')
    expect(html).not.toContain('league type')
  })

  it('labels NFL presets clearly and calls out IDP behavior', async () => {
    const { LeagueCreationPresetSelector } = await import('@/components/league-creation/LeagueCreationPresetSelector')

    const html = renderToStaticMarkup(
      React.createElement(LeagueCreationPresetSelector, {
        sport: 'NFL',
        variantOptions: [
          { value: 'PPR', label: 'PPR' },
          { value: 'IDP', label: 'IDP' },
        ],
        value: 'IDP',
        onChange: () => undefined,
        showHelper: true,
      })
    )

    expect(html).toContain('NFL preset')
    expect(html).toContain('Choose an NFL preset')
    expect(html).toContain('IDP and Dynasty IDP add defensive players and IDP scoring')
  })

  it('shows soccer-specific preview context before creation', async () => {
    const { LeagueSettingsPreviewPanel } = await import('@/components/league-creation/LeagueSettingsPreviewPanel')

    const html = renderToStaticMarkup(
      React.createElement(LeagueSettingsPreviewPanel, {
        sport: 'SOCCER',
        presetLabel: 'Standard',
        preset: {
          sport: 'SOCCER',
          metadata: { display_name: 'Soccer', short_name: 'SOC', icon: 'soccer', logo_strategy: 'local' },
          league: {
            default_league_name_pattern: 'Soccer League',
            default_team_count: 12,
            default_playoff_team_count: 6,
            default_regular_season_length: 38,
            default_matchup_unit: 'weeks',
            default_trade_deadline_logic: 'week_based',
          },
          roster: {
            starter_slots: { GKP: 1, DEF: 4, MID: 4, FWD: 2 },
            bench_slots: 4,
            IR_slots: 1,
          },
          scoring: { scoring_template_id: 'soccer-standard', scoring_format: 'standard', category_type: 'points' },
          draft: { draft_type: 'snake', rounds_default: 15, timer_seconds_default: 90, pick_order_rules: 'snake' },
          waiver: { waiver_type: 'faab', processing_days: [3], FAAB_budget_default: 100 },
          rosterTemplate: { templateId: 'r1', name: 'Soccer Default', formatType: 'standard', slots: [] },
          scoringTemplate: { templateId: 's1', name: 'Soccer Standard', formatType: 'standard', rules: [] },
          defaultLeagueSettings: {},
          teamMetadata: { sport_type: 'SOCCER', teams: [] },
        },
      })
    )

    expect(html).toContain('Soccer is a separate sport selection')
    expect(html).toContain('Soccer players (GKP/GK, DEF, MID, FWD)')
  })

  it('shows review context for NFL IDP as an NFL preset instead of a separate sport', async () => {
    const { LeagueSummaryPanel } = await import('@/components/league-creation-wizard/LeagueSummaryPanel')

    const html = renderToStaticMarkup(
      React.createElement(LeagueSummaryPanel, {
        state: {
          sport: 'NFL',
          leagueType: 'dynasty',
          draftType: 'snake',
          name: 'IDP Review League',
          teamCount: 12,
          rosterSize: 24,
          leagueVariant: 'DYNASTY_IDP',
          scoringPreset: 'DYNASTY_IDP',
          draftSettings: { rounds: 20, timerSeconds: 90 },
          aiSettings: { aiAdpEnabled: true, orphanTeamAiManagerEnabled: false, draftHelperEnabled: true },
          automationSettings: { draftNotificationsEnabled: true, autopickFromQueueEnabled: true, slowDraftRemindersEnabled: false },
          privacySettings: { visibility: 'private', allowInviteLink: true },
        } as any,
      })
    )

    expect(html).toContain('NFL offensive + IDP defenders (DL, LB, DB, IDP FLEX)')
    expect(html).toContain('NFL sport with an IDP preset layered on top of NFL defaults')
  })
})