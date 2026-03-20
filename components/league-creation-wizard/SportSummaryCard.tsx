'use client'

import type { LeagueCreationPresetPayload, ScheduleTemplatePayload, SeasonCalendarPayload, SportFeatureFlagsPayload } from '@/hooks/useSportPreset'
import { resolveSportAwareFrontendContext } from '@/lib/league-creation/SportAwareFrontendResolver'

export interface SportSummaryCardProps {
  preset: LeagueCreationPresetPayload
}

/** Single summary card (sport, scoring, roster, schedule, or season calendar). Preset loads first; customization allowed where supported. */
function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h4>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  )
}

function scheduleSummary(t: ScheduleTemplatePayload | undefined): string {
  if (!t) return 'Default'
  const parts: string[] = []
  parts.push(`${t.matchupType.replace(/_/g, ' ')}`)
  parts.push(`${t.regularSeasonWeeks} wk regular`)
  if (t.playoffWeeks > 0) parts.push(`${t.playoffWeeks} wk playoffs`)
  if (t.fantasyPlayoffDefault) parts.push(`(fantasy playoffs: ${t.fantasyPlayoffDefault.startWeek}–${t.fantasyPlayoffDefault.endWeek})`)
  if (t.lineupLockMode) parts.push(`• ${t.lineupLockMode} lock`)
  if (t.bracketModeSupported) parts.push('• Bracket supported')
  if (t.marchMadnessMode) parts.push('• March Madness')
  if (t.bowlPlayoffMetadata) parts.push('• Bowl/playoff')
  return parts.join(' · ')
}

function calendarSummary(c: SeasonCalendarPayload | undefined): string {
  if (!c?.regularSeasonPeriod) return '—'
  const p = c.regularSeasonPeriod
  const reg = p.label ?? (p.monthStart != null && p.monthEnd != null ? `${p.monthStart}–${p.monthEnd}` : '—')
  const parts = [reg]
  if (c.playoffsPeriod?.label) parts.push(`Playoffs: ${c.playoffsPeriod.label}`)
  if (c.championshipPeriod?.label) parts.push(c.championshipPeriod.label)
  if (c.internationalBreaksSupported) parts.push('(international breaks)')
  return parts.join(' · ')
}

function rosterSummary(preset: LeagueCreationPresetPayload): string {
  const r = preset.rosterTemplate
  if (!r?.slots?.length) {
    const starter = preset.roster?.starter_slots
    if (starter && typeof starter === 'object')
      return Object.entries(starter)
        .filter(([, n]) => Number(n) > 0)
        .map(([pos, n]) => (Number(n) > 1 ? `${pos}×${n}` : pos))
        .join(', ')
    return 'Default'
  }
  return r.slots
    .filter((s) => s.starterCount > 0 || s.slotName === 'BENCH' || s.slotName === 'IR')
    .map((s) =>
      s.starterCount > 0 ? (s.starterCount > 1 ? `${s.slotName}×${s.starterCount}` : s.slotName) : s.slotName
    )
    .join(', ')
}

function scoringSummary(preset: LeagueCreationPresetPayload): string {
  const t = preset.scoringTemplate
  if (!t) return preset.scoring?.scoring_format ?? 'Default'
  const name = t.name ?? t.formatType
  const ruleCount = t.rules?.length ?? 0
  return ruleCount > 0 ? `${name} (${ruleCount} stats)` : name
}

function featureTogglesSummary(flags: SportFeatureFlagsPayload | undefined): string | null {
  if (!flags) return null
  const on: string[] = []
  if (flags.supportsSuperflex) on.push('Superflex')
  if (flags.supportsTePremium) on.push('TE Premium')
  if (flags.supportsKickers) on.push('K')
  if (flags.supportsTeamDefense) on.push('DEF')
  if (flags.supportsIdp) on.push('IDP')
  if (flags.supportsDailyLineups) on.push('Daily lineups')
  if (flags.supportsBracketMode) on.push('Bracket')
  if (flags.supportsDevy) on.push('Devy')
  if (flags.supportsTaxi) on.push('Taxi')
  if (flags.supportsIr) on.push('IR')
  if (on.length === 0) return null
  return on.join(', ')
}

function teamMetadataSummary(preset: LeagueCreationPresetPayload): {
  teamCount: number
  samples: Array<{ abbreviation: string; teamName: string; primaryLogo: string | null }>
} | null {
  const teams = preset.teamMetadata?.teams
  if (!teams || teams.length === 0) return null
  return {
    teamCount: teams.length,
    samples: teams.slice(0, 6).map((t) => ({
      abbreviation: t.abbreviation,
      teamName: t.team_name,
      primaryLogo: t.primary_logo,
    })),
  }
}

/**
 * Sport summary card for league creation: five summary cards (sport, scoring, roster, schedule, season calendar)
 * plus compatible feature toggles. Preset loads first; customization allowed where supported.
 */
export function SportSummaryCard({ preset }: SportSummaryCardProps) {
  const features = featureTogglesSummary(preset.featureFlags)
  const teamMeta = teamMetadataSummary(preset)
  const initContext = resolveSportAwareFrontendContext(preset)

  return (
    <div className="space-y-3">
      <SummaryCard title="Sport">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{initContext.branding.displayName}</span>
          {preset.metadata?.short_name && (
            <span className="text-xs text-white/50">({preset.metadata.short_name})</span>
          )}
        </div>
      </SummaryCard>
      <SummaryCard title="Initialization scope">
        <div className="space-y-1">
          <p>{initContext.playerPool.scopeLabel}</p>
          <p className="text-xs text-white/60">
            Roster template: {initContext.defaults.rosterTemplateId || 'default'} · Scoring template: {initContext.defaults.scoringTemplateId || 'default'}
          </p>
        </div>
      </SummaryCard>
      <SummaryCard title="Default scoring">{scoringSummary(preset)}</SummaryCard>
      <SummaryCard title="Default roster">{rosterSummary(preset)}</SummaryCard>
      <SummaryCard title="Fantasy schedule">{scheduleSummary(preset.scheduleTemplate)}</SummaryCard>
      <SummaryCard title="Season calendar">{calendarSummary(preset.seasonCalendar)}</SummaryCard>
      {teamMeta && (
        <SummaryCard title="Team metadata">
          <div className="space-y-2">
            <p className="text-white/70">{teamMeta.teamCount} teams with sport-specific logos loaded</p>
            <div className="flex flex-wrap gap-2">
              {teamMeta.samples.map((team) => (
                <span
                  key={team.abbreviation}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs"
                  title={team.teamName}
                >
                  {team.primaryLogo ? (
                    <img
                      src={team.primaryLogo}
                      alt={`${team.abbreviation} logo`}
                      className="h-3.5 w-3.5 rounded-full object-contain"
                      loading="lazy"
                    />
                  ) : null}
                  <span>{team.abbreviation}</span>
                </span>
              ))}
            </div>
          </div>
        </SummaryCard>
      )}
      {features && (
        <SummaryCard title="Available options (compatible toggles)">{features}</SummaryCard>
      )}
    </div>
  )
}
