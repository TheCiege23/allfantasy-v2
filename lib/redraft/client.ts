export type RedraftRosterRow = {
  id: string
  teamName: string | null
  wins: number
  losses: number
  pointsFor: number
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

export async function fetchRedraftSeason(leagueId: string): Promise<{ id: string } | null> {
  const res = await fetch(`/api/redraft/season?leagueId=${encodeURIComponent(leagueId)}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ season?: { id: string } }>(res)
  return body.season ?? null
}

export async function fetchRedraftStandings(seasonId: string): Promise<RedraftRosterRow[]> {
  const res = await fetch(`/api/redraft/standings?seasonId=${encodeURIComponent(seasonId)}`, {
    credentials: 'include',
  })
  const body = await parseJson<{ rosters?: RedraftRosterRow[] }>(res)
  return body.rosters ?? []
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