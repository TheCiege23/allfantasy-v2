import 'server-only'

import { prisma } from '@/lib/prisma'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { getDraftOrderModeAndLotteryConfig } from '@/lib/draft-lottery/lotteryConfigStorage'
import { normalizeToSupportedSport, DEFAULT_SPORT } from '@/lib/sport-scope'

export type DraftRouteType = 'snake' | 'auction' | 'lottery'

export type LiveDraftRouteContext = {
  kind: 'live'
  draftId: string
  leagueId: string
  leagueName: string
  sport: string
  isDynasty: boolean
  isCommissioner: boolean
  formatType?: string
  routeType: DraftRouteType
  draftType: string
  status: string
}

export type MockDraftRouteContext = {
  kind: 'mock'
  draftId: string
  sport: string
  leagueName: string
  routeType: 'snake'
  draftType: string
  status: string
}

export type DraftRouteContext = LiveDraftRouteContext | MockDraftRouteContext

function parseMockMetadata(raw: unknown) {
  const metadata = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    sport: normalizeToSupportedSport(String(metadata.sport ?? DEFAULT_SPORT)),
    draftType: String(metadata.draftType ?? 'snake').toLowerCase(),
    leagueName: String(metadata.name ?? metadata.leagueName ?? 'Mock Draft'),
  }
}

export async function resolveLiveDraftContextByDraftId(
  draftId: string,
  userId?: string
): Promise<LiveDraftRouteContext | null> {
  const session = await prisma.draftSession.findUnique({
    where: { id: draftId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          sport: true,
          isDynasty: true,
          leagueVariant: true,
        },
      },
    },
  })

  if (!session?.league?.id) {
    return null
  }

  const orderMode = await getDraftOrderModeAndLotteryConfig(session.league.id).catch(() => null)
  const variant = String(session.league.leagueVariant ?? '').toUpperCase()
  const formatType = variant === 'IDP' || variant === 'DYNASTY_IDP' ? 'IDP' : undefined
  const routeType: DraftRouteType =
    session.draftType === 'auction'
      ? 'auction'
      : orderMode?.draftOrderMode === 'weighted_lottery' && session.status === 'pre_draft'
        ? 'lottery'
        : 'snake'

  return {
    kind: 'live',
    draftId: session.id,
    leagueId: session.league.id,
    leagueName: session.league.name ?? 'League Draft',
    sport: normalizeToSupportedSport(String(session.league.sport ?? session.sportType ?? DEFAULT_SPORT)),
    isDynasty: Boolean(session.league.isDynasty),
    isCommissioner: userId ? await isCommissioner(session.league.id, userId).catch(() => false) : false,
    formatType,
    routeType,
    draftType: String(session.draftType ?? 'snake'),
    status: String(session.status ?? 'pre_draft'),
  }
}

export async function resolveDraftRouteContext(
  draftId: string,
  userId?: string
): Promise<DraftRouteContext | null> {
  const live = await resolveLiveDraftContextByDraftId(draftId, userId)
  if (live) return live

  const mockDraft = await prisma.mockDraft.findUnique({
    where: { id: draftId },
    select: { id: true, status: true, metadata: true },
  })

  if (!mockDraft?.id) {
    return null
  }

  const mock = parseMockMetadata(mockDraft.metadata)
  return {
    kind: 'mock',
    draftId: mockDraft.id,
    sport: mock.sport,
    leagueName: mock.leagueName,
    routeType: 'snake',
    draftType: mock.draftType,
    status: String(mockDraft.status ?? 'pre_draft'),
  }
}

export async function assertLiveDraftContext(
  draftId: string,
  userId?: string
): Promise<LiveDraftRouteContext> {
  const context = await resolveLiveDraftContextByDraftId(draftId, userId)
  if (!context) {
    throw new Error('Live draft not found')
  }
  return context
}
