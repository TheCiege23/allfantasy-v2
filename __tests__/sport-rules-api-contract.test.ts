import { describe, expect, it } from 'vitest'

type LeagueSport = 'NFL' | 'NHL' | 'NBA' | 'MLB' | 'NCAAB' | 'NCAAF' | 'SOCCER'

describe('GET /api/sport-rules contract', () => {
  it('returns roster/scoring/player-pool/draft rules for all supported sports', async () => {
    const { GET } = await import('@/app/api/sport-rules/route')
    const sports: LeagueSport[] = ['NFL', 'NHL', 'NBA', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER']

    for (const sport of sports) {
      const req = new Request(`http://localhost/api/sport-rules?sport=${sport}`)
      const res = await GET(req as any)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.sport).toBe(sport)
      expect(body.roster?.slots?.length).toBeGreaterThan(0)
      expect(Array.isArray(body.roster?.allPositions)).toBe(true)
      expect(body.roster?.allPositions?.length).toBeGreaterThan(0)

      expect(body.scoring?.sport).toBe(sport)
      expect(Array.isArray(body.scoring?.validFormats)).toBe(true)
      expect(body.scoring?.validFormats?.length).toBeGreaterThan(0)

      expect(body.playerPool?.sport).toBe(sport)
      expect(Array.isArray(body.playerPool?.validPositions)).toBe(true)
      expect(body.playerPool?.validPositions?.length).toBeGreaterThan(0)
      expect(typeof body.playerPool?.source).toBe('string')
      expect(body.playerPool?.poolSizeLimit).toBeGreaterThan(0)

      expect(body.draft?.sport).toBe(sport)
      expect(Array.isArray(body.draft?.allowedDraftTypes)).toBe(true)
      expect(body.draft?.allowedDraftTypes).toEqual(
        expect.arrayContaining(['snake', 'linear', 'auction', 'slow_draft', 'mock_draft'])
      )
      expect(typeof body.draft?.defaultDraftType).toBe('string')
    }
  })

  it('returns NFL IDP-capable player positions when format=IDP', async () => {
    const { GET } = await import('@/app/api/sport-rules/route')

    const req = new Request('http://localhost/api/sport-rules?sport=NFL&format=IDP')
    const res = await GET(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.sport).toBe('NFL')
    expect(body.roster?.allPositions).toEqual(
      expect.arrayContaining(['DE', 'DT', 'LB', 'CB', 'S'])
    )
  })

  it('returns 400 for unsupported sport', async () => {
    const { GET } = await import('@/app/api/sport-rules/route')

    const req = new Request('http://localhost/api/sport-rules?sport=CRICKET')
    const res = await GET(req as any)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(String(body.error ?? '')).toMatch(/unsupported sport/i)
    expect(Array.isArray(body.validSports)).toBe(true)
    expect(body.validSports).toEqual(
      expect.arrayContaining(['NFL', 'NHL', 'NBA', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER'])
    )
  })
})
