// @vitest-environment node
/**
 * Optional DB integration: canonical league creation end-to-end inside a rolled-back transaction.
 *
 * Enable with:
 *   ENGINE_INTEGRATION_DB=1
 *   DATABASE_URL (and DIRECT_URL if your Prisma config requires it)
 *
 * PowerShell:
 *   $env:ENGINE_INTEGRATION_DB="1"; npx vitest run __tests__/integration/league-engine-db.integration.test.ts
 */

import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createCanonicalLeagueInTransaction } from '@/lib/league-creation/canonical/createCanonicalLeagueInTransaction'
import { validateCreatePayload } from '@/lib/league-creation/canonical/validateCreateLeague'
import { runPresetEngine } from '@/lib/league-creation/preset-engine/runPresetEngine'

const ROLLBACK = '__ENGINE_INTEGRATION_ROLLBACK__'

const dbEnabled = Boolean(
  process.env.ENGINE_INTEGRATION_DB === '1' && process.env.DATABASE_URL?.trim(),
)

describe.skipIf(!dbEnabled)('league engine DB integration', () => {
  it('creates a canonical NFL league and draft session, then rolls back', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    let caught: unknown
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.appUser.create({
          data: {
            email: `engine-it-${suffix}@test.local`,
            username: `eng_it_${suffix}`,
          },
        })

        const v = validateCreatePayload({
          concept: 'redraft',
          sport: 'NFL',
          teamCount: 12,
          draftType: 'snake',
          scoringPreset: 'half_ppr',
          leagueName: `Engine IT ${suffix}`,
        })
        if (!v.ok) {
          throw new Error(v.error)
        }

        const engine = runPresetEngine({
          concept: v.data.concept,
          sport: v.data.sport,
          teamCount: v.data.teamCount,
          draftType: v.data.draftType,
          scoringPreset: v.data.scoringPreset,
          leagueName: v.data.leagueName,
          commissionerId: user.id,
        })

        const { leagueId } = await createCanonicalLeagueInTransaction(tx, user.id, v.data, engine)

        const ds = await tx.draftSession.findUnique({ where: { leagueId } })
        expect(ds?.leagueId).toBe(leagueId)
        expect(ds?.teamCount).toBe(12)

        throw new Error(ROLLBACK)
      })
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toBe(ROLLBACK)
  })
})
