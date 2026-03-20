import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadSportPresetForCreationMock = vi.fn()
const resolveSportDefaultsMock = vi.fn()

vi.mock('@/lib/league-creation/SportPresetLoader', () => ({
  loadSportPresetForCreation: loadSportPresetForCreationMock,
}))

vi.mock('@/lib/sport-defaults/SportDefaultsResolver', () => ({
  resolveSportDefaults: resolveSportDefaultsMock,
}))

describe('GET /api/sport-defaults variant routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadSportPresetForCreationMock.mockResolvedValue({
      sport: 'NFL',
      leagueVariant: 'HALF_PPR',
      scoring: {
        scoring_template_id: 'default-NFL-HALF_PPR',
        scoring_format: 'Half PPR',
        category_type: 'points',
      },
      scoringTemplate: {
        templateId: 'default-NFL-HALF_PPR',
        name: 'NFL Half PPR',
        formatType: 'Half PPR',
        rules: [],
      },
      rosterTemplate: {
        templateId: 'default-NFL-HALF_PPR',
        name: 'NFL Half PPR Roster',
        formatType: 'Half PPR',
        slots: [],
      },
    })
    resolveSportDefaultsMock.mockReturnValue({ sport_type: 'NFL' })
  })

  it('passes variant through creation load and returns variant-specific template payload', async () => {
    const { GET } = await import('@/app/api/sport-defaults/route')

    const req = new Request(
      'http://localhost/api/sport-defaults?sport=NFL&load=creation&variant=HALF_PPR'
    )

    const res = await GET(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(loadSportPresetForCreationMock).toHaveBeenCalledWith('NFL', 'HALF_PPR')
    expect(body.leagueVariant).toBe('HALF_PPR')
    expect(body.scoringTemplate.formatType).toBe('Half PPR')
    expect(body.scoring.scoring_template_id).toBe('default-NFL-HALF_PPR')
  })

  it('returns offensive + IDP roster slot groups for DYNASTY_IDP creation payload', async () => {
    loadSportPresetForCreationMock.mockResolvedValueOnce({
      sport: 'NFL',
      leagueVariant: 'DYNASTY_IDP',
      roster: {
        starter_slots: {
          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          K: 1,
          DE: 2,
          DT: 1,
          LB: 2,
          CB: 2,
          S: 2,
          DL: 1,
          DB: 1,
          IDP_FLEX: 1,
        },
        bench_slots: 7,
        IR_slots: 2,
        flex_definitions: [
          { slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'] },
          { slotName: 'DL', allowedPositions: ['DE', 'DT'] },
          { slotName: 'DB', allowedPositions: ['CB', 'S'] },
          { slotName: 'IDP_FLEX', allowedPositions: ['DE', 'DT', 'LB', 'CB', 'S'] },
        ],
      },
      rosterTemplate: {
        templateId: 'default-NFL-IDP',
        name: 'NFL IDP Roster',
        formatType: 'IDP',
        slots: [],
      },
      scoring: {
        scoring_template_id: 'default-NFL-IDP',
        scoring_format: 'IDP',
        category_type: 'points',
      },
      scoringTemplate: {
        templateId: 'default-NFL-IDP',
        name: 'NFL IDP',
        formatType: 'IDP',
        rules: [],
      },
    })

    const { GET } = await import('@/app/api/sport-defaults/route')
    const req = new Request(
      'http://localhost/api/sport-defaults?sport=NFL&load=creation&variant=DYNASTY_IDP'
    )

    const res = await GET(req as any)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(loadSportPresetForCreationMock).toHaveBeenCalledWith('NFL', 'DYNASTY_IDP')
    expect(body.leagueVariant).toBe('DYNASTY_IDP')
    expect(body.roster.starter_slots).toEqual(
      expect.objectContaining({
        QB: 1,
        RB: 2,
        WR: 2,
        TE: 1,
        FLEX: 1,
        DE: 2,
        DT: 1,
        LB: 2,
        CB: 2,
        S: 2,
        DL: 1,
        DB: 1,
        IDP_FLEX: 1,
      })
    )
    expect(body.roster.flex_definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slotName: 'DL', allowedPositions: ['DE', 'DT'] }),
        expect.objectContaining({ slotName: 'DB', allowedPositions: ['CB', 'S'] }),
        expect.objectContaining({
          slotName: 'IDP_FLEX',
          allowedPositions: ['DE', 'DT', 'LB', 'CB', 'S'],
        }),
      ])
    )
  })
})
