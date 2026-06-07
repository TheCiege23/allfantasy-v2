import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cfbdProvider } from '@/lib/workers/providers/cfbd'

describe('cfbdProvider supports sport normalization', () => {
  const originalApiKey = process.env.CFBD_API_KEY
  const originalLegacyKey = process.env.CFBD_KEY

  beforeEach(() => {
    delete process.env.CFBD_API_KEY
    delete process.env.CFBD_KEY
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalApiKey === undefined) delete process.env.CFBD_API_KEY
    else process.env.CFBD_API_KEY = originalApiKey
    if (originalLegacyKey === undefined) delete process.env.CFBD_KEY
    else process.env.CFBD_KEY = originalLegacyKey
  })

  it('accepts lowercase, uppercase, and alias NCAAF values', () => {
    expect(cfbdProvider.supports({ sport: 'ncaaf', dataType: 'schedule' })).toBe(true)
    expect(cfbdProvider.supports({ sport: 'NCAAF', dataType: 'schedule' })).toBe(true)
    expect(cfbdProvider.supports({ sport: 'CFB', dataType: 'teams' })).toBe(true)
  })

  it('does not claim non-NCAAF sports or unsupported data types', () => {
    expect(cfbdProvider.supports({ sport: 'NFL', dataType: 'schedule' })).toBe(false)
    expect(cfbdProvider.supports({ sport: 'NCAAF', dataType: 'injuries' })).toBe(false)
  })

  it('uses CFBD_KEY as a supported production alias when CFBD_API_KEY is absent', async () => {
    process.env.CFBD_KEY = 'legacy-cfbd-key'
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, school: 'Example State', abbreviation: 'EXS', conference: 'Test' }],
    })

    const rows = await cfbdProvider.fetch({
      sport: 'NCAAF',
      dataType: 'teams',
      query: { season: '2026' },
    })

    expect(rows).toEqual([
      expect.objectContaining({ id: '1', name: 'Example State', source: 'cfbd' }),
    ])
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/teams/fbs?year=2026'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer legacy-cfbd-key' }),
      })
    )
  })
})
