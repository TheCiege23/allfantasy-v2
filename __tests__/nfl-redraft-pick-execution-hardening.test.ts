/**
 * NFL redraft pick execution hardening — source-level contract lock
 * (Commit M).
 *
 * Pins the race + lockout invariants at the file level so a future
 * refactor can't silently drop:
 *
 *   1. The `expectedOverall` stale-pick guard at the top of `submitPick`
 *      that returns `DRAFT_PICK_STALE_OVERALL` (409 via the central
 *      status mapper).
 *   2. The in-transaction `picks.length !== picksCount` race guard that
 *      tags concurrent commits with `DRAFT_PICK_RACE_RETRY`.
 *   3. The `commissionerOverride` propagation from `submitPick` →
 *      `validatePickSubmission` (so commissioner correction flows skip
 *      the on-clock check while keeping every other lockout active).
 *   4. Both canonical NFL redraft live pick-write routes
 *      (`/api/leagues/[leagueId]/draft/pick` and
 *      `…/draft/autopick-expired`) read structured codes back from
 *      `submitPick` and use the central `httpStatusForPickAuthorityCode`
 *      mapper instead of hard-coded 400 / 409.
 *   5. The pick route reads `expectedOverall` (or `expected_overall`)
 *      from the request body and forwards it to `submitPick`.
 *   6. The Commit J in-place session-mismatch contract still holds and
 *      the Commit L legacy-runtime guard is still wired into
 *      `executeDraftPick`.
 *
 * Static-source assertions only — keeps the lock cheap and avoids the
 * full live-draft-engine harness for what is fundamentally a code-shape
 * contract.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('PickAuthorityCodes module exports the full Commit M code set', () => {
  const src = read('lib/live-draft-engine/pickAuthorityCodes.ts')

  for (const code of [
    'DRAFT_PICK_NOT_LIVE',
    'DRAFT_PICK_NOT_ON_CLOCK',
    'DRAFT_PICK_DUPLICATE_PLAYER',
    'DRAFT_PICK_STALE_OVERALL',
    'DRAFT_PICK_RACE_RETRY',
  ]) {
    it(`exports ${code}`, () => {
      expect(src).toMatch(new RegExp(`export const ${code} = '${code}'`))
    })
  }

  it('exports the central httpStatusForPickAuthorityCode mapper', () => {
    expect(src).toMatch(/export function httpStatusForPickAuthorityCode/)
  })

  it('NOT_ON_CLOCK maps to 403, STALE/RACE map to 409, NOT_LIVE/DUPLICATE map to 400', () => {
    // Status mapping is asserted behaviourally in
    // `__tests__/draft/pick-execution-race-lockout.test.ts`. Here we only
    // pin that the mapper file references the four numeric statuses so a
    // future refactor that drops one would fail at the source level too.
    expect(src).toMatch(/return 403/)
    expect(src).toMatch(/return 409/)
    expect(src).toMatch(/return 400/)
  })
})

describe('PickValidation propagates Commit M codes', () => {
  const src = read('lib/live-draft-engine/PickValidation.ts')

  it('imports the authority codes module', () => {
    expect(src).toMatch(/from '\.\/pickAuthorityCodes'/)
  })

  it('returns DRAFT_PICK_NOT_LIVE when session is not in progress / paused', () => {
    expect(src).toMatch(/code: DRAFT_PICK_NOT_LIVE/)
  })

  it('returns DRAFT_PICK_NOT_ON_CLOCK when roster is not on the clock', () => {
    expect(src).toMatch(/code: DRAFT_PICK_NOT_ON_CLOCK/)
  })

  it('returns DRAFT_PICK_DUPLICATE_PLAYER when player is already drafted', () => {
    expect(src).toMatch(/code: DRAFT_PICK_DUPLICATE_PLAYER/)
  })

  it('accepts a commissionerOverride flag and skips the on-clock check when true', () => {
    expect(src).toMatch(/commissionerOverride\?: boolean/)
    expect(src).toMatch(
      /!input\.commissionerOverride && input\.rosterId !== input\.currentOnClockRosterId/,
    )
  })
})

describe('PickSubmissionService — race & lockout hardening', () => {
  const src = read('lib/live-draft-engine/PickSubmissionService.ts')

  it('imports the authority codes module', () => {
    expect(src).toMatch(/from '\.\/pickAuthorityCodes'/)
  })

  it('declares an optional expectedOverall on SubmitPickInput', () => {
    expect(src).toMatch(/expectedOverall\?: number/)
  })

  it('refuses with DRAFT_PICK_STALE_OVERALL when expectedOverall != server overall', () => {
    expect(src).toMatch(
      /input\.expectedOverall !== overall[\s\S]+?code: DRAFT_PICK_STALE_OVERALL/,
    )
  })

  it('refuses with DRAFT_PICK_NOT_LIVE when current on-clock cannot be resolved', () => {
    expect(src).toMatch(/'Draft is complete or not started'[\s\S]+?code: DRAFT_PICK_NOT_LIVE/)
  })

  it('forwards commissionerOverride into validatePickSubmission', () => {
    expect(src).toMatch(
      /commissionerOverride: input\.commissionerOverride === true \|\| input\.source === 'commissioner'/,
    )
  })

  it('still has the in-transaction picks.length race guard', () => {
    expect(src).toMatch(/locked\.picks\.length !== picksCount/)
    expect(src).toMatch(/throw new Error\('Draft state changed; please retry'\)/)
  })

  it('tags the P2002 unique-constraint loss with DRAFT_PICK_RACE_RETRY', () => {
    expect(src).toMatch(/error\.code === 'P2002'[\s\S]+?code: DRAFT_PICK_RACE_RETRY/)
  })

  it('tags the application-level race ("Draft state changed") with DRAFT_PICK_RACE_RETRY', () => {
    expect(src).toMatch(/\/Draft state changed\/[\s\S]+?code: DRAFT_PICK_RACE_RETRY/)
  })

  it('SubmitPickResult.code now allows PickAuthorityCode (not just ROSTER_CONFIGURATION_INCOMPLETE)', () => {
    expect(src).toMatch(/code\?: 'ROSTER_CONFIGURATION_INCOMPLETE' \| PickAuthorityCode/)
  })
})

describe('Canonical pick route wires structured codes', () => {
  const src = read('app/api/leagues/[leagueId]/draft/pick/route.ts')

  it('imports the central authority-code status mapper', () => {
    expect(src).toMatch(
      /import \{[^}]*httpStatusForPickAuthorityCode[^}]*\} from '@\/lib\/live-draft-engine\/pickAuthorityCodes'/,
    )
  })

  it('forwards expectedOverall (or expected_overall) from the request body to submitPick', () => {
    expect(src).toMatch(/body\.expectedOverall \?\? body\.expected_overall/)
    expect(src).toMatch(/expectedOverall,/)
  })

  it('returns 403 + DRAFT_PICK_NOT_ON_CLOCK when a non-commissioner submits for the wrong roster', () => {
    expect(src).toMatch(
      /code: DRAFT_PICK_NOT_ON_CLOCK[\s\S]+?httpStatusForPickAuthorityCode\(DRAFT_PICK_NOT_ON_CLOCK\)/,
    )
  })

  it('routes submitPick.code through the central status mapper (no hard-coded 400 fallthrough)', () => {
    expect(src).toMatch(/httpStatusForPickAuthorityCode\(result\.code as PickAuthorityCode\)/)
  })

  it('sets commissionerOverride only when source==="commissioner" AND identity check passed', () => {
    expect(src).toMatch(/commissionerOverride: source === 'commissioner' && isComm/)
  })

  it('still uses the canonical submitPick (Commit L lock not regressed)', () => {
    expect(src).toMatch(
      /import \{[^}]*submitPick[^}]*\} from '@\/lib\/live-draft-engine\/PickSubmissionService'/,
    )
    expect(src).not.toMatch(/from '@\/lib\/draft\/execute-pick'/)
  })
})

describe('Autopick-expired route wires structured codes', () => {
  const src = read('app/api/leagues/[leagueId]/draft/autopick-expired/route.ts')

  it('imports the central authority-code status mapper', () => {
    expect(src).toMatch(
      /import \{[^}]*httpStatusForPickAuthorityCode[^}]*\} from '@\/lib\/live-draft-engine\/pickAuthorityCodes'/,
    )
  })

  it('returns DRAFT_PICK_NOT_ON_CLOCK with the central status when roster is not on the clock', () => {
    expect(src).toMatch(
      /code: DRAFT_PICK_NOT_ON_CLOCK[\s\S]+?httpStatusForPickAuthorityCode\(DRAFT_PICK_NOT_ON_CLOCK\)/,
    )
  })

  it('routes submitPick.code through the central status mapper', () => {
    expect(src).toMatch(/httpStatusForPickAuthorityCode\(result\.code as PickAuthorityCode\)/)
  })

  it('still delegates to the canonical submitPick (autopick is not a separate write path)', () => {
    expect(src).toMatch(
      /import \{[^}]*submitPick[^}]*\} from '@\/lib\/live-draft-engine\/PickSubmissionService'/,
    )
    expect(src).not.toMatch(/from '@\/lib\/draft\/execute-pick'/)
  })
})

describe('Commit E / Commit J / Commit L locks still hold after Commit M', () => {
  it('Commit E — DraftRoomPageClient still mounts exactly one <DraftRoomShell> and <DraftBoard>', () => {
    const drpc = read('components/app/draft-room/DraftRoomPageClient.tsx')
    expect((drpc.match(/<DraftRoomShell\b/g) ?? []).length).toBe(1)
    expect((drpc.match(/<DraftBoard\b/g) ?? []).length).toBe(1)
  })

  it('Commit J — DraftRoomPageClient still has the 409 / DRAFT_SESSION_MISMATCH in-place handler', () => {
    const drpc = read('components/app/draft-room/DraftRoomPageClient.tsx')
    expect(drpc).toMatch(
      /res\.status === 409 && \(data as \{ code\?: unknown \}\)\?\.code === 'DRAFT_SESSION_MISMATCH'/,
    )
    expect(drpc).toMatch(/setSessionMismatchRecovering\(true\)/)
  })

  it('Commit L — executeDraftPick still calls assertLegacyDraftRuntimeWriteAllowed before any prisma write', () => {
    const exec = read('lib/draft/execute-pick.ts')
    const guardIdx = exec.indexOf('assertLegacyDraftRuntimeWriteAllowed({')
    expect(guardIdx).toBeGreaterThan(0)
    const writeIdx = exec.indexOf('prisma.draftRoomPickRecord')
    expect(writeIdx).toBeGreaterThan(guardIdx)
  })
})
