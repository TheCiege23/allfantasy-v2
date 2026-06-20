import { describe, it, expect } from 'vitest'
import { mapAddDropErrorCode, addDropErrorStatus, ADD_DROP_ERROR_COPY } from '@/lib/waiver-wire/addDropErrors'

describe('mapAddDropErrorCode', () => {
  it('roster-limit message → DROP_REQUIRED when no drop, ROSTER_FULL when a drop is provided', () => {
    expect(mapAddDropErrorCode('Your roster is already at the limit. Choose a player to drop.', { hasDrop: false })).toBe('DROP_REQUIRED')
    expect(mapAddDropErrorCode('You cannot add this player because your roster would be over the limit.', { hasDrop: true })).toBe('ROSTER_FULL')
  })

  it('maps player availability + ownership messages', () => {
    expect(mapAddDropErrorCode('This player is already on your roster.', { hasDrop: false })).toBe('PLAYER_ALREADY_ROSTERED')
    expect(mapAddDropErrorCode('This player is already on another roster in this league.', { hasDrop: false })).toBe('PLAYER_UNAVAILABLE')
    expect(mapAddDropErrorCode('This player is no longer available.', { hasDrop: false })).toBe('PLAYER_UNAVAILABLE')
  })

  it('maps drop legality and lock messages', () => {
    expect(mapAddDropErrorCode('Drop player is not on your roster.', { hasDrop: true })).toBe('INVALID_DROP')
    expect(mapAddDropErrorCode('This player is on the commissioner undroppable list and cannot be dropped.', { hasDrop: true })).toBe('INVALID_DROP')
    expect(mapAddDropErrorCode('This starter is locked because their game has started.', { hasDrop: false })).toBe('PLAYER_LOCKED')
    expect(mapAddDropErrorCode('This bench player is locked until the league allows drops after lock.', { hasDrop: false })).toBe('PLAYER_LOCKED')
  })

  it('maps league-state and waiver-required messages', () => {
    expect(mapAddDropErrorCode('This league season is complete; roster moves are locked.', { hasDrop: false })).toBe('LEAGUE_NOT_ACTIVE')
    expect(mapAddDropErrorCode('All roster moves are locked by the commissioner.', { hasDrop: false })).toBe('LEAGUE_NOT_ACTIVE')
    expect(mapAddDropErrorCode('This player must go through waivers.', { hasDrop: false })).toBe('WAIVER_REQUIRED')
  })

  it('maps auth + falls back to VALIDATION_FAILED', () => {
    expect(mapAddDropErrorCode('Unauthorized', { hasDrop: false })).toBe('UNAUTHORIZED')
    expect(mapAddDropErrorCode('Roster not found or does not belong to this league.', { hasDrop: false })).toBe('UNAUTHORIZED')
    expect(mapAddDropErrorCode('Some unexpected thing happened.', { hasDrop: false })).toBe('VALIDATION_FAILED')
  })

  it('every code has friendly copy and a sane status', () => {
    const codes = Object.keys(ADD_DROP_ERROR_COPY) as Array<keyof typeof ADD_DROP_ERROR_COPY>
    for (const code of codes) {
      expect(ADD_DROP_ERROR_COPY[code].length).toBeGreaterThan(0)
      expect(addDropErrorStatus(code)).toBeGreaterThanOrEqual(400)
    }
    expect(addDropErrorStatus('UNAUTHORIZED')).toBe(401)
    expect(addDropErrorStatus('PLAYER_LOCKED')).toBe(423)
    expect(addDropErrorStatus('WAIVER_REQUIRED')).toBe(409)
    expect(addDropErrorStatus('LEAGUE_NOT_ACTIVE')).toBe(403)
  })
})
