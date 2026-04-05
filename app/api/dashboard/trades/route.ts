import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SleeperTransaction } from '@/lib/sleeper-client'
import { getAllPlayers } from '@/lib/sleeper-client'
import type {
  PendingTrade,
  PendingTradeLeague,
  TradeAsset,
  TradesDashboardResponse,
} from '@/app/dashboard/dashboardStripApiTypes'

export const dynamic = 'force-dynamic'

const SLEEPER = 'https://api.sleeper.app/v1'

type SleeperRoster = {
  roster_id?: number
  owner_id?: string
}

type SleeperUser = {
  user_id: string
  display_name?: string
  metadata?: { team_name?: string }
}

function isPendingTradeStatus(s: string | undefined): boolean {
  if (!s) return false
  const u = s.toLowerCase()
  return u === 'pending' || u === 'proposed' || u === 'waiting' || u === 'requested'
}

function buildTradeAssetsForRoster(args: {
  tx: SleeperTransaction
  userRosterId: number
  players: Record<string, { full_name?: string; first_name?: string; last_name?: string; position?: string; team?: string }>
}): { assetsGiven: TradeAsset[]; assetsReceived: TradeAsset[] } {
  const { tx, userRosterId, players } = args
  const assetsGiven: TradeAsset[] = []
  const assetsReceived: TradeAsset[] = []

  const drops = tx.drops ?? {}
  const adds = tx.adds ?? {}

  for (const [playerId, rosterId] of Object.entries(drops)) {
    if (Number(rosterId) !== userRosterId) continue
    const pl = players[playerId]
    const name =
      pl?.full_name ??
      ([pl?.first_name, pl?.last_name].filter(Boolean).join(' ') || playerId)
    assetsGiven.push({
      playerId,
      playerName: name,
      position: pl?.position ?? '—',
      team: pl?.team ?? '—',
    })
  }

  for (const [playerId, rosterId] of Object.entries(adds)) {
    if (Number(rosterId) !== userRosterId) continue
    const pl = players[playerId]
    const name =
      pl?.full_name ??
      ([pl?.first_name, pl?.last_name].filter(Boolean).join(' ') || playerId)
    assetsReceived.push({
      playerId,
      playerName: name,
      position: pl?.position ?? '—',
      team: pl?.team ?? '—',
    })
  }

  for (const pick of tx.draft_picks ?? []) {
    const roundLabel = `${pick.season} ${pick.round}${pick.round === 1 ? 'st' : pick.round === 2 ? 'nd' : pick.round === 3 ? 'rd' : 'th'}`
    if (pick.roster_id === userRosterId) {
      assetsReceived.push({
        playerId: null,
        playerName: `Draft pick`,
        position: 'PICK',
        team: '—',
        isPick: true,
        pickRound: roundLabel,
      })
    }
  }

  return { assetsGiven, assetsReceived }
}

async function chimmyTradeVerdict(args: {
  leagueName: string
  gives: string
  gets: string
}): Promise<{ verdict: 'accept' | 'decline' | 'negotiate'; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return { verdict: 'negotiate', reason: 'Review the trade in the app before accepting.' }
  }
  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 220,
      system:
        'You are Chimmy, AllFantasy AI trade evaluator. Respond ONLY with JSON: {"verdict":"accept"|"decline"|"negotiate","reason":"1 sentence"}',
      messages: [
        {
          role: 'user',
          content: `League: ${args.leagueName}. User gives: ${args.gives}. User receives: ${args.gets}. Quick verdict?`,
        },
      ],
    })
    const block = msg.content[0]
    const raw = block?.type === 'text' ? block.text.trim() : ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { verdict?: string; reason?: string }
    const v = parsed.verdict?.toLowerCase()
    const verdict =
      v === 'accept' || v === 'decline' || v === 'negotiate' ? v : 'negotiate'
    return {
      verdict,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Weigh roster fit and future value before deciding.',
    }
  } catch {
    return { verdict: 'negotiate', reason: 'Compare this to consensus values in your league chat before locking in.' }
  }
}

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagues = await prisma.league.findMany({
    where: {
      platform: 'sleeper',
      OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      platformLeagueId: true,
      avatarUrl: true,
      teams: {
        where: { claimedByUserId: userId },
        select: { platformUserId: true },
        take: 1,
      },
    },
  })

  const nflPlayers = await getAllPlayers().catch(() => ({} as Record<string, unknown>))

  const weeksToScan = Array.from({ length: 18 }, (_, i) => i + 1)

  const tradesOut: PendingTradeLeague[] = []
  let totalPending = 0

  for (const league of leagues) {
    if (!league.platformLeagueId) continue

    const ownerSleeperId = league.teams[0]?.platformUserId?.trim()
    if (!ownerSleeperId) continue

    const leagueTrades: PendingTrade[] = []
    const prismaSport = String(league.sport)

    try {
      const [rostersRes, usersRes] = await Promise.all([
        fetch(`${SLEEPER}/league/${encodeURIComponent(league.platformLeagueId)}/rosters`, { next: { revalidate: 30 } }),
        fetch(`${SLEEPER}/league/${encodeURIComponent(league.platformLeagueId)}/users`, { next: { revalidate: 120 } }),
      ])

      const rosters = rostersRes.ok ? ((await rostersRes.json()) as SleeperRoster[]) : []
      const users = usersRes.ok ? ((await usersRes.json()) as SleeperUser[]) : []

      const roster = Array.isArray(rosters)
        ? rosters.find((r) => String(r.owner_id) === String(ownerSleeperId))
        : undefined
      const userRosterId = roster?.roster_id
      if (userRosterId == null) continue

      const userById = new Map(users.map((u) => [u.user_id, u]))
      const seenTx = new Set<string>()

      const playersMap: Record<string, { full_name?: string; first_name?: string; last_name?: string; position?: string; team?: string }> =
        prismaSport.toUpperCase() === 'NFL' ? (nflPlayers as Record<string, any>) : {}

      for (const week of weeksToScan) {
        const txRes = await fetch(
          `${SLEEPER}/league/${encodeURIComponent(league.platformLeagueId)}/transactions/${week}`,
          { next: { revalidate: 15 } }
        )
        if (!txRes.ok) continue
        const transactions = (await txRes.json()) as SleeperTransaction[]
        if (!Array.isArray(transactions)) continue

        for (const tx of transactions) {
          if (tx.type !== 'trade') continue
          if (!isPendingTradeStatus(tx.status)) continue
          if (!tx.roster_ids?.includes(userRosterId)) continue
          if (seenTx.has(tx.transaction_id)) continue
          seenTx.add(tx.transaction_id)

          const { assetsGiven, assetsReceived } = buildTradeAssetsForRoster({
            tx,
            userRosterId,
            players: playersMap,
          })

          const creator = tx.creator ? userById.get(tx.creator) : undefined
          const proposedBy =
            creator?.metadata?.team_name ||
            creator?.display_name ||
            (tx.creator ? `Manager ${tx.creator.slice(0, 6)}` : 'Another team')

          const gives = assetsGiven.map((a) => a.playerName).join(', ') || '(picks only)'
          const gets = assetsReceived.map((a) => a.playerName).join(', ') || '(picks only)'

          const verdict = await chimmyTradeVerdict({
            leagueName: league.name ?? 'League',
            gives,
            gets,
          })

          leagueTrades.push({
            transactionId: tx.transaction_id,
            proposedBy,
            proposedAt: tx.created ? new Date(tx.created).toISOString() : null,
            assetsGiven,
            assetsReceived,
            chimmyVerdict: verdict.verdict,
            chimmyReason: verdict.reason,
          })
        }
      }
    } catch {
      /* skip league */
    }

    if (leagueTrades.length > 0) {
      totalPending += leagueTrades.length
      tradesOut.push({
        leagueId: league.id,
        leagueName: league.name ?? 'League',
        leagueAvatar: league.avatarUrl ?? null,
        sport: prismaSport,
        trades: leagueTrades,
      })
    }
  }

  const body: TradesDashboardResponse = {
    totalPending,
    trades: tradesOut,
  }

  return NextResponse.json(body)
}
