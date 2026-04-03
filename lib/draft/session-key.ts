/** Session keys for `DraftRoomStateRow.id` and queue/autopick lookups */
export function sessionKeyMock(roomId: string): string {
  return `mock:${roomId}`
}

export function sessionKeyLive(leagueId: string): string {
  return `live:${leagueId}`
}

export function parseSessionKey(key: string): { mode: 'mock' | 'live'; id: string } {
  if (key.startsWith('mock:')) return { mode: 'mock', id: key.slice(5) }
  if (key.startsWith('live:')) return { mode: 'live', id: key.slice(5) }
  throw new Error('Invalid session key')
}
