/**
 * Frontend sport-aware resolver for league creation UI.
 * Derives display-ready initialization context from sport preset payload.
 */

export interface SportAwareFrontendContext {
  sport: string
  branding: {
    displayName: string
    icon: string
    logoStrategy: string
    teamCount: number
  }
  playerPool: {
    scopeLabel: string
  }
  defaults: {
    scoringTemplateId: string
    rosterTemplateId: string
    scheduleUnit: string
    matchupFrequency: string
  }
}

export function resolveSportAwareFrontendContext(
  preset: {
    sport: string
    metadata?: { display_name?: string; icon?: string; logo_strategy?: string }
    teamMetadata?: { teams?: unknown[] }
    scoringTemplate?: { templateId?: string }
    rosterTemplate?: { templateId?: string }
    defaultLeagueSettings?: { schedule_unit?: string; matchup_frequency?: string }
  }
): SportAwareFrontendContext {
  const sport = String(preset.sport || 'NFL').toUpperCase()
  const displayName = preset.metadata?.display_name ?? sport
  const icon = preset.metadata?.icon ?? ''
  const logoStrategy = preset.metadata?.logo_strategy ?? 'none'
  const teamCount = Array.isArray(preset.teamMetadata?.teams) ? preset.teamMetadata!.teams!.length : 0

  const poolLabelBySport: Record<string, string> = {
    NFL: 'NFL teams and NFL players only',
    NBA: 'NBA teams and NBA players only',
    MLB: 'MLB teams and MLB players only',
    NHL: 'NHL teams and NHL players only',
    NCAAF: 'College football teams and players only',
    NCAAB: 'College basketball teams and players only',
    SOCCER: 'Soccer teams and soccer players only',
  }

  return {
    sport,
    branding: {
      displayName,
      icon,
      logoStrategy,
      teamCount,
    },
    playerPool: {
      scopeLabel: poolLabelBySport[sport] ?? `${sport} teams and players only`,
    },
    defaults: {
      scoringTemplateId: preset.scoringTemplate?.templateId ?? '',
      rosterTemplateId: preset.rosterTemplate?.templateId ?? '',
      scheduleUnit: preset.defaultLeagueSettings?.schedule_unit ?? 'week',
      matchupFrequency: preset.defaultLeagueSettings?.matchup_frequency ?? 'weekly',
    },
  }
}

/**
 * Get team logos for a specific sport (for sport selector or team display).
 * Used in league creation wizard to show team previews per sport.
 */
export async function resolveSportTeamLogos(
  sport: string
): Promise<Array<{ abbreviation: string; primary_logo_url: string | null }>> {
  const { getTeamMetadataForSportDbAware } = await import('@/lib/sport-teams/SportTeamMetadataRegistry')
  try {
    const teams = await getTeamMetadataForSportDbAware(sport as any)
    return teams.map((t) => ({
      abbreviation: t.abbreviation,
      primary_logo_url: t.primary_logo_url,
    }))
  } catch {
    return []
  }
}
