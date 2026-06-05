export type RedraftRosterRow = {
  id: string
  teamName: string | null
  ownerName?: string | null
  wins: number
  losses: number
  ties?: number
  pointsFor: number
  pointsAgainst?: number
  playoffSeed?: number | null
  streak?: string | null
}

export type RedraftSeasonClient = {
  id: string
  leagueId: string
  sport: string
  season: number
  currentWeek: number
  status: string
  rosters: RedraftRosterRow[]
}

export type RedraftWeeklyScore = {
  fantasyPts: number
  isFinalized: boolean
  stats: Record<string, number>
}

export type RedraftRosterPlayerClient = {
  id: string
  playerId: string
  playerName: string
  position: string
  team: string | null
  sport: string
  slotType: string
  injuryStatus: string | null
  weeklyScore: RedraftWeeklyScore | null
}

export type RedraftRosterClient = RedraftRosterRow & {
  players: RedraftRosterPlayerClient[]
}

export type RedraftMatchupClient = {
  id: string
  week: number
  status: string
  homeScore: number
  awayScore: number
  homeRosterId: string
  awayRosterId: string | null
  homeRoster: RedraftRosterRow
  awayRoster: RedraftRosterRow | null
  lineupSnapshots?: unknown
}

export type RedraftWaiverClaimClient = {
  id: string
  addPlayerId: string
  addPlayerName: string
  dropPlayerName: string | null
  bidAmount: number | null
  priority: number | null
  status: string
  submittedAt: string
  processedAt: string | null
  denialReason: string | null
}

export type RedraftTradeProposal = {
  id: string
  leagueId: string
  seasonId: string
  proposerRosterId: string
  receiverRosterId: string
  status: string
  vetoMode: string
  vetoThreshold: number | null
  reason: string | null
  expiresAt: string | null
  createdAt: string
  assets: Array<{
    id: string
    fromRosterId: string
    toRosterId: string
    assetType: string
    playerName: string | null
    pickSeason: number | null
    pickRound: number | null
    pickNumber: number | null
  }>
  votes: Array<{ id: string; rosterId: string; vote: string; reason: string | null }>
  decision?: { id: string; decision: string; decisionReason: string | null } | null
}

type JsonHeaders = Record<string, string>

const jsonHeaders: JsonHeaders = {
  'Content-Type': 'application/json',
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | null
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error?: unknown }).error ?? `Request failed (${res.status})`)
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return (body ?? {}) as T
}

export async function fetchRedraftSeason(leagueId: string): Promise<RedraftSeasonClient | null> {
  const res = await fetch(`/api/redraft/season?leagueId=${encodeURIComponent(leagueId)}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ season?: RedraftSeasonClient }>(res)
  return body.season ?? null
}

export async function fetchRedraftStandings(seasonId: string): Promise<RedraftRosterRow[]> {
  const res = await fetch(`/api/redraft/standings?seasonId=${encodeURIComponent(seasonId)}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ rosters?: RedraftRosterRow[] }>(res)
  return body.rosters ?? []
}

export async function fetchRedraftMatchups(seasonId: string, week: number): Promise<RedraftMatchupClient[]> {
  const qs = new URLSearchParams({ seasonId, week: String(week) })
  const res = await fetch(`/api/redraft/matchup?${qs.toString()}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ matchups?: RedraftMatchupClient[] }>(res)
  return body.matchups ?? []
}

export async function fetchRedraftRoster(rosterId: string, week: number): Promise<RedraftRosterClient | null> {
  const qs = new URLSearchParams({ rosterId, week: String(week) })
  const res = await fetch(`/api/redraft/roster?${qs.toString()}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ roster?: RedraftRosterClient }>(res)
  return body.roster ?? null
}

export async function fetchRedraftWaiverClaims(
  seasonId: string,
  rosterId: string,
): Promise<RedraftWaiverClaimClient[]> {
  const qs = new URLSearchParams({ seasonId, rosterId })
  const res = await fetch(`/api/redraft/waivers?${qs.toString()}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ claims?: RedraftWaiverClaimClient[] }>(res)
  return body.claims ?? []
}

export async function listTradeProposals(params: {
  leagueId: string
  seasonId: string
  status?: string
}): Promise<RedraftTradeProposal[]> {
  const qs = new URLSearchParams({
    leagueId: params.leagueId,
    seasonId: params.seasonId,
    ...(params.status ? { status: params.status } : {}),
  })
  const res = await fetch(`/api/redraft/trade-proposals?${qs.toString()}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ proposals?: RedraftTradeProposal[] }>(res)
  return body.proposals ?? []
}

export async function createTradeProposal(payload: {
  leagueId: string
  seasonId: string
  proposerRosterId: string
  receiverRosterId: string
  reason?: string
}) {
  const res = await fetch('/api/redraft/trade-proposals', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify({
      ...payload,
      assets: [
        {
          fromRosterId: payload.proposerRosterId,
          toRosterId: payload.receiverRosterId,
          assetType: 'future_consideration',
          metadata: {},
        },
      ],
    }),
  })
  return parseJson<{ proposal: RedraftTradeProposal }>(res)
}

export async function submitTradeVote(payload: {
  proposalId: string
  action:
    | 'accept'
    | 'reject'
    | 'cancel'
    | 'commissioner_approve'
    | 'commissioner_veto'
    | 'vote_approve'
    | 'vote_veto'
  reason?: string
}) {
  const res = await fetch('/api/redraft/trade-votes', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return parseJson<{ proposal: RedraftTradeProposal; resolved: boolean }>(res)
}

export async function generatePlayoffs(payload: {
  seasonId: string
  playoffTeams?: number
  regenerate?: boolean
}) {
  const res = await fetch('/api/redraft/playoffs/generate', {
    method: 'POST',
    credentials: 'include',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return parseJson<{
    summary?: { playoffTeams: number; bracketSize: number; byes: number; rounds: number }
  }>(res)
}
