import type { DraftPickOrderSlot } from '@/lib/draft/pick-order'

export type DraftMode = 'mock' | 'live'

export type DraftPickOrderEntry = DraftPickOrderSlot

export type DraftStatePayload = {
  id: string
  mode: string
  status: string
  currentPick: number
  currentRound: number
  currentTeamIndex: number
  timerEndsAt: string | null
  timerPaused: boolean
  pickOrder: DraftPickOrderEntry[] | null
  leagueId: string | null
  roomId: string | null
  numTeams: number
  numRounds: number
  timerSeconds: number
  updatedAt: string
}

export type DraftPickRecord = {
  id: string
  round: number
  pickNumber: number
  overallPick: number
  originalOwnerId: string
  currentOwnerId: string
  pickedById?: string | null
  playerId: string | null
  playerName: string | null
  position: string | null
  team: string | null
  isTraded: boolean
  autopicked: boolean
  timestamp: string
}

export type DraftPlayerRow = {
  id: string
  name: string
  position: string
  team: string
  imageUrl?: string | null
  adp: number
  proj: number
  bye: number | null
  keyStat: string
}
