import { describe, expect, it } from 'vitest'
import { validateTradeAssets } from '@/lib/league-trade-engine/tradeValidationService'
import { resolveLeagueTradeSettings } from '@/lib/league-trade-engine/tradeSettingsResolver'
import {
  buildEngineTestLeague,
  buildEngineTestRoster,
  buildPlayerSwapTradeAssets,
} from '@/lib/engine-testing/fixtures/enginePayloadBuilders'

describe('validateTradeAssets', () => {
  it('accepts valid player swap', () => {
    const lg = buildEngineTestLeague()
    const proposer = buildEngineTestRoster('r1', lg.id, 'u1', { players: ['p1', 'p2'] })
    const receiver = buildEngineTestRoster('r2', lg.id, 'u2', { players: ['p3'] })
    const settings = resolveLeagueTradeSettings(lg)
    const v = validateTradeAssets({
      league: lg,
      settings,
      proposer,
      receiver,
      assets: buildPlayerSwapTradeAssets({
        proposerRosterId: 'r1',
        receiverRosterId: 'r2',
        proposerSendsPlayerId: 'p1',
        receiverSendsPlayerId: 'p3',
      }),
      currentWeek: 5,
    })
    expect(v.ok).toBe(true)
  })

  it('rejects asset not on roster', () => {
    const lg = buildEngineTestLeague()
    const proposer = buildEngineTestRoster('r1', lg.id, 'u1', { players: ['p1'] })
    const receiver = buildEngineTestRoster('r2', lg.id, 'u2', { players: ['p3'] })
    const settings = resolveLeagueTradeSettings(lg)
    const v = validateTradeAssets({
      league: lg,
      settings,
      proposer,
      receiver,
      assets: [
        {
          itemType: 'player',
          itemReference: 'ghost',
          fromRosterId: 'r1',
          toRosterId: 'r2',
        },
      ],
      currentWeek: 5,
    })
    expect(v.ok).toBe(false)
  })
})
