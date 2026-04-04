export type AFCrestSize = 'xs' | 'sm' | 'md'

export type AFCrestButtonProps = {
  playerId: string
  playerName: string
  sport: string
  position: string
  baselineProjection: number
  lat?: number | null
  lng?: number | null
  gameTime?: string | null
  isIndoor?: boolean
  isDome?: boolean
  roofClosed?: boolean
  week?: number
  season?: number
  eventId?: string
  size?: AFCrestSize
  className?: string
}
