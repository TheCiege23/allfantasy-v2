import { LeagueSport, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Platform = 'sleeper' | 'yahoo' | 'mfl' | 'espn' | 'fleaflicker' | 'fantrax'

type TransferStep =
  | 'validating'
  | 'settings'
  | 'rosters'
  | 'drafts'
  | 'playoffs'
  | 'trades'
  | 'waivers'
  | 'complete'
  | 'error'
  | 'unavailable'

type TransferProgress = {
  step: TransferStep
  progress: number
  message: string
  leagueId?: string
  error?: string
}

type SleeperLeague = {
  league_id?: string | number
  name?: string | null
  sport?: string | null
  season?: string | number | null
  total_rosters?: number | null
  status?: string | null
  avatar?: string | null
  roster_positions?: string[] | null
  scoring_settings?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

type SleeperUser = {
  user_id?: string | null
  username?: string | null
  display_name?: string | null
  avatar?: string | null
  metadata?: Record<string, unknown> | null
}

type SleeperRoster = {
  roster_id?: string | number | null
  owner_id?: string | null
  starters?: string[] | null
  players?: string[] | null
  reserve?: string[] | null
  taxi?: string[] | null
  settings?: Record<string, unknown> | null
}

type SleeperDraft = {
  draft_id?: string | number | null
  season?: string | number | null
  status?: string | null
  type?: string | null
  settings?: Record<string, unknown> | null
}

type SleeperDraftPick = {
  round?: string | number | null
  pick_no?: string | number | null
  player_id?: string | null
  picked_by?: string | null
  roster_id?: string | number | null
  metadata?: Record<string, unknown> | null
}

type SleeperTransaction = {
  transaction_id?: string | null
  type?: string | null
  status?: string | null
  leg?: string | number | null
  creator?: string | null
  consenter_ids?: Array<string | number> | null
  roster_ids?: Array<string | number> | null
  adds?: Record<string, string | number> | null
  drops?: Record<string, string | number> | null
  draft_picks?: unknown[] | null
  metadata?: Record<string, unknown> | null
}

type TransferOptions = {
  copyDraftHistory: boolean
  copyPlayoffHistory: boolean
  copyTradeHistory: boolean
  copyWaiverHistory: boolean
  copyRosters: boolean
  copySettings: boolean
}

type TransferPreview = {
  available: boolean
  alreadyTransferred?: boolean
  existingLeagueId?: string
  message?: string
  league?: {
    name: string
    season: string
    sport: string
    teamCount: number
    format: string
    managers: Array<{ name: string; avatar?: string }>
    rosterPositions: string[]
    playoffTeams?: number
    hasDraft: boolean
  }
}

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1'

const transferOptionsSchema = z.object({
  copyDraftHistory: z.boolean().default(true),
  copyPlayoffHistory: z.boolean().default(true),
  copyTradeHistory: z.boolean().default(true),
  copyWaiverHistory: z.boolean().default(false),
  copyRosters: z.boolean().default(true),
  copySettings: z.boolean().default(true),
})

const transferRequestSchema = z.object({
  platform: z.enum(['sleeper', 'yahoo', 'mfl', 'espn', 'fleaflicker', 'fantrax']),
  leagueId: z.string().trim().min(1),
  options: transferOptionsSchema.default({
    copyDraftHistory: true,
    copyPlayoffHistory: true,
    copyTradeHistory: true,
    copyWaiverHistory: false,
    copyRosters: true,
    copySettings: true,
  }),
})

function serializeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map((item) => serializeForJson(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, serializeForJson(entry)])
    )
  }
  return value
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return serializeForJson(value) as Prisma.InputJsonValue
}

function readNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function toLeagueSport(rawSport: string | null | undefined): LeagueSport {
  switch ((rawSport ?? '').trim().toLowerCase()) {
    case 'nba':
      return LeagueSport.NBA
    case 'mlb':
      return LeagueSport.MLB
    case 'nhl':
      return LeagueSport.NHL
    case 'ncaaf':
      return LeagueSport.NCAAF
    case 'ncaab':
      return LeagueSport.NCAAB
    case 'soccer':
      return LeagueSport.SOCCER
    case 'nfl':
    default:
      return LeagueSport.NFL
  }
}

function getSleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  return `https://sleepercdn.com/avatars/${avatar}`
}

function getSleeperScoringLabel(league: SleeperLeague): string {
  const receptionPoints = readNumber(league.scoring_settings?.rec) ?? 0
  let scoringType = 'standard'
  if (receptionPoints === 1) scoringType = 'ppr'
  else if (receptionPoints === 0.5) scoringType = 'half_ppr'
  if ((league.roster_positions ?? []).includes('SUPER_FLEX')) scoringType += '_superflex'
  return scoringType
}

function getLeagueFormatLabel(leagueSettings: Record<string, unknown>): string {
  const rawType = readNumber(leagueSettings.type) ?? 0
  if (rawType === 2) return 'Dynasty'
  if (rawType === 1) return 'Keeper'
  return 'Redraft'
}

async function sleeperGet<T>(path: string): Promise<T> {
  const response = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Sleeper API error ${response.status} for ${path}`)
  }

  return (await response.json()) as T
}

async function sleeperGetOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
}

function createImmediateSseResponse(progress: TransferProgress) {
  return createSseResponse(async (emit) => {
    emit(progress)
  })
}

function createSseResponse(run: (emit: (progress: TransferProgress) => void) => Promise<void>) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (progress: TransferProgress) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(serializeForJson(progress))}\n\n`))
      }

      try {
        await run(emit)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Transfer failed.'
        emit({
          step: 'error',
          progress: 0,
          message,
          error: message,
        })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function fetchSleeperPreview(leagueId: string): Promise<TransferPreview['league']> {
  const [leagueData, usersData, draftsData] = await Promise.all([
    sleeperGet<SleeperLeague>(`/league/${encodeURIComponent(leagueId)}`),
    sleeperGet<SleeperUser[]>(`/league/${encodeURIComponent(leagueId)}/users`),
    sleeperGetOptional<SleeperDraft[]>(`/league/${encodeURIComponent(leagueId)}/drafts`),
  ])

  const settings = leagueData.settings ?? {}
  const season = String(leagueData.season ?? new Date().getFullYear())

  return {
    name: readString(leagueData.name) ?? `Sleeper League ${leagueId}`,
    season,
    sport: String(toLeagueSport(readString(leagueData.sport))),
    teamCount: readNumber(leagueData.total_rosters) ?? 0,
    format: getLeagueFormatLabel(settings),
    managers: usersData.map((user) => ({
      name: readString(user.display_name) ?? readString(user.username) ?? 'Unknown',
      ...(getSleeperAvatarUrl(readString(user.avatar)) ? { avatar: getSleeperAvatarUrl(readString(user.avatar)) ?? undefined } : {}),
    })),
    rosterPositions: Array.isArray(leagueData.roster_positions) ? leagueData.roster_positions : [],
    playoffTeams: readNumber(settings.playoff_teams) ?? undefined,
    hasDraft: Array.isArray(draftsData) && draftsData.length > 0,
  }
}

async function transferSleeperLeague(args: {
  leagueId: string
  userId: string
  options: TransferOptions
  emit: (progress: TransferProgress) => void
}): Promise<string> {
  const { leagueId, userId, options, emit } = args

  emit({ step: 'validating', progress: 5, message: 'Fetching Sleeper league...' })

  const [leagueData, rostersData, usersData] = await Promise.all([
    sleeperGet<SleeperLeague>(`/league/${encodeURIComponent(leagueId)}`),
    sleeperGet<SleeperRoster[]>(`/league/${encodeURIComponent(leagueId)}/rosters`),
    sleeperGet<SleeperUser[]>(`/league/${encodeURIComponent(leagueId)}/users`),
  ])

  const leagueSettings = leagueData.settings ?? {}
  const scoringSettings = leagueData.scoring_settings ?? {}
  const rosterPositions = Array.isArray(leagueData.roster_positions) ? leagueData.roster_positions : []
  const sport = toLeagueSport(readString(leagueData.sport))
  const season = readNumber(leagueData.season) ?? new Date().getFullYear()
  const totalTeams = readNumber(leagueData.total_rosters) ?? rostersData.length
  const isDynasty = (readNumber(leagueSettings.type) ?? 0) === 2
  const leagueName = readString(leagueData.name) ?? `Sleeper League ${leagueId}`

  let mergedSettings: Record<string, unknown> = {
    sourcePlatform: 'sleeper',
    sourceLeagueId: leagueId,
    scoringSettings: options.copySettings ? scoringSettings : {},
    rosterPositions: options.copySettings ? rosterPositions : [],
    rawLeagueSettings: options.copySettings ? leagueSettings : {},
    rawLeagueSnapshot: options.copySettings ? leagueData : {},
  }

  emit({ step: 'settings', progress: 18, message: 'Creating AllFantasy league...' })

  const afLeague = await prisma.league.create({
    data: {
      userId,
      platform: 'sleeper',
      platformLeagueId: leagueId,
      name: leagueName,
      sport,
      season,
      leagueSize: totalTeams,
      scoring: getSleeperScoringLabel(leagueData),
      isDynasty,
      rosterSize: rosterPositions.length,
      starters: toJsonInput(rosterPositions),
      settings: toJsonInput(mergedSettings),
      status: readString(leagueData.status) ?? 'active',
      avatarUrl: getSleeperAvatarUrl(readString(leagueData.avatar)),
      lastSyncedAt: new Date(),
      syncStatus: 'transferred',
      importedAt: new Date(),
    },
  })

  emit({ step: 'rosters', progress: 35, message: 'Copying teams and rosters...' })

  if (options.copyRosters) {
    const usersById = new Map(
      usersData
        .filter((user) => readString(user.user_id) != null)
        .map((user) => [readString(user.user_id) as string, user] as const)
    )

    for (const roster of rostersData) {
      const ownerId = readString(roster.owner_id) ?? `unassigned-${readString(roster.roster_id) ?? 'unknown'}`
      const user = usersById.get(ownerId)
      const metadata = user?.metadata ?? {}
      const rosterSettings = roster.settings ?? {}
      const displayName = readString(user?.display_name) ?? readString(user?.username) ?? `Manager ${readString(roster.roster_id) ?? 'Unknown'}`
      const exactTeamName = readString(metadata.team_name) ?? displayName
      const externalId = readString(roster.roster_id) ?? ownerId

      await prisma.leagueTeam.create({
        data: {
          leagueId: afLeague.id,
          externalId,
          ownerName: displayName,
          teamName: exactTeamName,
          avatarUrl: getSleeperAvatarUrl(readString(user?.avatar) ?? readString(metadata.avatar)),
          wins: readNumber(rosterSettings.wins) ?? 0,
          losses: readNumber(rosterSettings.losses) ?? 0,
          ties: readNumber(rosterSettings.ties) ?? 0,
          pointsFor:
            (readNumber(rosterSettings.fpts) ?? 0) +
            ((readNumber(rosterSettings.fpts_decimal) ?? 0) / 100),
          pointsAgainst:
            (readNumber(rosterSettings.fpts_against) ?? 0) +
            ((readNumber(rosterSettings.fpts_against_decimal) ?? 0) / 100),
          currentRank: readNumber(rosterSettings.rank) ?? undefined,
        },
      })

      const waiverBudget = readNumber(leagueSettings.waiver_budget) ?? 100
      const usedBudget = readNumber(rosterSettings.waiver_budget_used)

      await prisma.roster.create({
        data: {
          leagueId: afLeague.id,
          platformUserId: ownerId,
          playerData: toJsonInput({
            starters: Array.isArray(roster.starters) ? roster.starters : [],
            players: Array.isArray(roster.players) ? roster.players : [],
            reserve: Array.isArray(roster.reserve) ? roster.reserve : [],
            taxi: Array.isArray(roster.taxi) ? roster.taxi : [],
            source_provider: 'sleeper',
            source_league_id: leagueId,
            source_team_id: externalId,
            source_manager_id: ownerId,
            source_season_id: season,
            imported_at: new Date().toISOString(),
          }),
          faabRemaining: usedBudget == null ? null : Math.max(0, waiverBudget - usedBudget),
          waiverPriority: readNumber(rosterSettings.waiver_position) ?? undefined,
        },
      })
    }
  }

  if (options.copyDraftHistory) {
    emit({ step: 'drafts', progress: 55, message: 'Fetching draft history...' })
    const drafts = await sleeperGetOptional<SleeperDraft[]>(`/league/${encodeURIComponent(leagueId)}/drafts`)
    if (Array.isArray(drafts)) {
      for (const draft of drafts) {
        const draftId = readString(draft.draft_id)
        if (!draftId) continue
        const picks = (await sleeperGetOptional<SleeperDraftPick[]>(`/draft/${encodeURIComponent(draftId)}/picks`)) ?? []

        await prisma.mockDraft.create({
          data: {
            leagueId: afLeague.id,
            userId,
            rounds: readNumber(draft.settings?.rounds) ?? 15,
            status: readString(draft.status) ?? 'completed',
            results: toJsonInput({
              sourcePlatform: 'sleeper',
              sourceDraftId: draftId,
              draftType: readString(draft.type),
              season: readNumber(draft.season) ?? season,
              picks: picks.map((pick) => ({
                round: readNumber(pick.round),
                pick: readNumber(pick.pick_no),
                playerId: readString(pick.player_id),
                pickedBy: readString(pick.picked_by),
                rosterId: readString(pick.roster_id),
                metadata: pick.metadata ?? {},
              })),
            }),
            metadata: toJsonInput({
              sourcePlatform: 'sleeper',
              sport,
              leagueType: isDynasty ? 'dynasty' : 'redraft',
              draftType: readString(draft.type) ?? 'snake',
              numTeams: totalTeams,
              scoring: getSleeperScoringLabel(leagueData),
              rosterSize: rosterPositions.length,
            }),
          },
        })
      }
    }
  }

  if (options.copyPlayoffHistory) {
    emit({ step: 'playoffs', progress: 72, message: 'Fetching playoff brackets...' })
    const [winnersBracket, losersBracket] = await Promise.all([
      sleeperGetOptional<unknown>(`/league/${encodeURIComponent(leagueId)}/winners_bracket`),
      sleeperGetOptional<unknown>(`/league/${encodeURIComponent(leagueId)}/losers_bracket`),
    ])
    mergedSettings = {
      ...mergedSettings,
      playoffBracket: {
        winners: winnersBracket,
        losers: losersBracket,
      },
    }
  }

  const transactionWeeks = Array.from({ length: 18 }, (_, index) => index + 1)

  if (options.copyTradeHistory || options.copyWaiverHistory) {
    emit({ step: 'trades', progress: 84, message: 'Fetching transaction history...' })
    const weeklyTransactions = await Promise.all(
      transactionWeeks.map(async (week) => ({
        week,
        rows: (await sleeperGetOptional<SleeperTransaction[]>(`/league/${encodeURIComponent(leagueId)}/transactions/${week}`)) ?? [],
      }))
    )

    if (options.copyTradeHistory) {
      const tradeHistory = weeklyTransactions.flatMap(({ week, rows }) =>
        rows
          .filter((row) => row.type === 'trade')
          .map((row) => ({
            week,
            ...row,
          }))
      )
      mergedSettings = { ...mergedSettings, tradeHistory }
    }

    if (options.copyWaiverHistory) {
      emit({ step: 'waivers', progress: 92, message: 'Fetching waiver history...' })
      const waiverHistory = weeklyTransactions.flatMap(({ week, rows }) =>
        rows
          .filter((row) => row.type === 'waiver' || row.type === 'free_agent')
          .map((row) => ({
            week,
            ...row,
          }))
      )
      mergedSettings = { ...mergedSettings, waiverHistory }
    }
  }

  await prisma.league.update({
    where: { id: afLeague.id },
    data: {
      settings: toJsonInput(mergedSettings),
    },
  })

  emit({
    step: 'complete',
    progress: 100,
    message: 'Transfer complete.',
    leagueId: afLeague.id,
  })

  return afLeague.id
}

export async function GET(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = request.nextUrl.searchParams.get('platform') as Platform | null
  const leagueId = request.nextUrl.searchParams.get('leagueId')?.trim()

  if (!platform || !leagueId) {
    return NextResponse.json({ error: 'platform and leagueId required' }, { status: 400 })
  }

  if (platform !== 'sleeper') {
    return NextResponse.json({
      available: false,
      message: `${platform} transfer preview is coming soon.`,
    } satisfies TransferPreview)
  }

  try {
    const existing = await prisma.league.findFirst({
      where: {
        userId,
        platform,
        platformLeagueId: leagueId,
      },
      select: { id: true },
    })

    const preview = await fetchSleeperPreview(leagueId)

    return NextResponse.json({
      available: true,
      alreadyTransferred: Boolean(existing),
      existingLeagueId: existing?.id,
      league: preview,
    } satisfies TransferPreview)
  } catch (error: unknown) {
    return NextResponse.json(
      {
        available: false,
        message: error instanceof Error ? error.message : 'League not found.',
      } satisfies TransferPreview,
      { status: 404 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = transferRequestSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid request body.',
      },
      { status: 400 }
    )
  }

  const { platform, leagueId, options } = parsed.data

  if (platform !== 'sleeper') {
    return createImmediateSseResponse({
      step: 'unavailable',
      progress: 0,
      message: `${platform} transfer is coming soon. Sleeper is fully supported today.`,
    })
  }

  const existing = await prisma.league.findFirst({
    where: {
      userId,
      platform,
      platformLeagueId: leagueId,
    },
    select: { id: true, name: true },
  })

  if (existing) {
    return createImmediateSseResponse({
      step: 'complete',
      progress: 100,
      message: `This league is already on AllFantasy${existing.name ? ` as ${existing.name}` : ''}.`,
      leagueId: existing.id,
    })
  }

  return createSseResponse(async (emit) => {
    await transferSleeperLeague({
      leagueId,
      userId,
      options,
      emit,
    })
  })
}
