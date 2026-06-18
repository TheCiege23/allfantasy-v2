import { describe, expect, it } from 'vitest'

import { normalizeRIDepthChartPlayers } from '@/lib/rolling-insights'

describe('Rolling Insights depth chart normalization', () => {
  it('skips null and incomplete provider rows without dropping valid players', () => {
    const players = normalizeRIDepthChartPlayers('WR', [
      null,
      undefined,
      {},
      { id: null, player: 'Missing Id' },
      { id: '123', player: '' },
      { id: '456', player: 'Rome Odunze', number: '15', status: 'Active', img: 'headshot.png' },
      { player_id: 789, name: 'Backup Receiver', position: 'WR2' },
    ])

    expect(players).toEqual([
      {
        id: '456',
        player: 'Rome Odunze',
        position: 'WR',
        number: 15,
        status: 'Active',
        img: 'headshot.png',
      },
      {
        id: '789',
        player: 'Backup Receiver',
        position: 'WR2',
        number: null,
        status: null,
        img: null,
      },
    ])
  })
})
