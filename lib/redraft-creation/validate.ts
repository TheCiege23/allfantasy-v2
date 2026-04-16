import { z } from 'zod'
import { DRAFT_TYPES_REDRAFT } from '@/lib/redraft-creation/constants'
import { getRedraftMaxTeams } from '@/lib/redraft-creation/sport-config'
import { clampRedraftTeamCount } from '@/lib/redraft-creation/team-limits'
import { isSupportedSport } from '@/lib/sport-scope'

/** Accepts `redraft` or `REDRAFT` (checklist / clients may send uppercase). */
function normalizeRedraftBody(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const o = { ...(input as Record<string, unknown>) }
  if (typeof o.leagueType === 'string') {
    o.leagueType = o.leagueType.trim().toLowerCase()
  }
  return o
}

export const redraftCreateBodySchema = z.object({
  leagueType: z.literal('redraft'),
  sport: z.enum(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']),
  soccerPipeline: z.enum(['mls', 'euro']).optional().nullable(),
  draftType: z.enum(['snake', 'linear', 'auction', 'offline', 'auto']),
  name: z.string().min(1, 'League name is required').max(100),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.enum(['en', 'es']),
  tradeReviewMode: z.enum(['commissioner', 'league_vote', 'instant']),
  teamCount: z.number().int().min(4),
})

export type RedraftCreateBody = z.infer<typeof redraftCreateBodySchema>

export type RedraftValidationIssue = { path: string; message: string }

export function validateRedraftCreatePayload(input: unknown):
  | { ok: true; data: RedraftCreateBody }
  | { ok: false; error: string; status: number; issues: RedraftValidationIssue[] } {
  const parsed = redraftCreateBodySchema.safeParse(normalizeRedraftBody(input))
  if (!parsed.success) {
    const issues: RedraftValidationIssue[] = parsed.error.issues.map((i) => {
      const path = i.path.join('.') || 'request'
      let message = i.message
      if (i.code === 'invalid_enum_value') {
        if (i.path[0] === 'sport') message = 'Invalid sport'
        else if (i.path[0] === 'draftType') message = 'Invalid draft type'
      }
      return { path, message }
    })
    const msg = issues[0]?.message ?? 'Invalid request'
    return { ok: false, error: msg, status: 400, issues }
  }
  const data = parsed.data
  if (!isSupportedSport(data.sport)) {
    return {
      ok: false,
      error: 'Selected sport is not supported',
      status: 400,
      issues: [{ path: 'sport', message: 'Selected sport is not supported' }],
    }
  }
  if (data.sport === 'SOCCER' && !data.soccerPipeline) {
    return {
      ok: false,
      error: 'Choose MLS or European pipeline for Soccer',
      status: 400,
      issues: [{ path: 'soccerPipeline', message: 'Choose MLS or European pipeline for Soccer' }],
    }
  }
  if (data.sport !== 'SOCCER' && data.soccerPipeline) {
    return {
      ok: false,
      error: 'Soccer pipeline is only valid for Soccer',
      status: 400,
      issues: [{ path: 'soccerPipeline', message: 'Soccer pipeline is only valid for Soccer' }],
    }
  }
  if (!DRAFT_TYPES_REDRAFT.includes(data.draftType)) {
    return {
      ok: false,
      error: 'Selected draft type is not supported for redraft',
      status: 400,
      issues: [{ path: 'draftType', message: 'Selected draft type is not supported for redraft' }],
    }
  }
  const max = getRedraftMaxTeams(data.sport, data.soccerPipeline ?? null)
  if (data.teamCount < 4 || data.teamCount > max) {
    return {
      ok: false,
      error: `Team count must be between 4 and ${max} for the selected sport`,
      status: 400,
      issues: [{ path: 'teamCount', message: `Must be between 4 and ${max}` }],
    }
  }
  const clamped = clampRedraftTeamCount(data.sport, data.teamCount, data.soccerPipeline ?? null)
  return { ok: true, data: { ...data, teamCount: clamped } }
}
