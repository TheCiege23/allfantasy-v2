export function normalizePositionToken(raw: string): string {
  const token = raw.trim().toUpperCase()
  if (!token) return ''
  if (token === 'PK' || token === 'KICKER') return 'K'
  if (token === 'DEF/ST' || token === 'D/ST') return 'DST'
  return token
}
