export type PlayoffSport = "nba" | "nhl"

export type PlayoffRoundKey = "round_1" | "conference_semifinals" | "conference_finals" | "finals"

export type PlayoffSeriesStatus = "scheduled" | "in_progress" | "final"

export type PlayoffSeriesSlot = "home" | "away"

export type PlayoffConference = "east" | "west" | "finals"

export type PlayoffChallengeView = {
  challenge: {
    id: string
    name: string
    ownerUserId: string
    sport: PlayoffSport
    seasonYear: number
    status: string
    isTestMode: boolean
    createdAt: string
    updatedAt: string
  }
  activeEntry: {
    id: string
    name: string
    userId: string
    createdAt: string
  } | null
  entries: Array<{
    id: string
    name: string
    userId: string
    createdAt: string
  }>
  series: PlayoffSeriesView[]
  picks: PlayoffPickView[]
  rounds: PlayoffRoundKey[]
}

export type PlayoffSeriesView = {
  id: string
  round: PlayoffRoundKey
  roundIndex: number
  seriesNumber: number
  conference: PlayoffConference
  homeSeed: number
  awaySeed: number
  homeTeamName: string
  awayTeamName: string
  winnerTeamName: string | null
  bestOf: number
  status: PlayoffSeriesStatus
  startsAt: string | null
  nextSeriesNumber: number | null
  nextSeriesSlot: PlayoffSeriesSlot | null
}

export type PlayoffPickView = {
  id: string
  entryId: string
  seriesId: string
  pickTeamName: string
  createdAt: string
  updatedAt: string
}

export type BuildPlayoffTemplateInput = {
  sport: PlayoffSport
  seasonYear: number
  isTestMode?: boolean
}

export type PlayoffTemplateSeries = Omit<PlayoffSeriesView, "id"> & {
  sourceSeriesHome: number | null
  sourceSeriesAway: number | null
}
