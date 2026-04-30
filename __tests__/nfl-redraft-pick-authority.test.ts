/**
 * NFL redraft snake draft — pick-write authority lock (Commit L).
 *
 * Locks two contracts:
 *
 *   1. The legacy `executeDraftPick` writer (which writes to
 *      `DraftRoomPickRecord` / `DraftRoomStateRow`) is gated by the
 *      `assertLegacyDraftRuntimeWriteAllowed` guard at the top of its
 *      body. Live-mode session keys throw and the function returns a 410
 *      with a message redirecting callers to the canonical path. Mock-
 *      mode session keys pass through.
 *
 *   2. NFL redraft live pick-write surfaces use the canonical
 *      `submitPick` from `lib/live-draft-engine/PickSubmissionService`.
 *      Specifically:
 *        - POST `/api/leagues/[leagueId]/draft/pick`
 *        - POST `/api/leagues/[leagueId]/draft/autopick-expired`
 *        - POST `/api/leagues/[leagueId]/draft/controls` (for commissioner
 *          assign-pick / autopick paths)
 *        - POST `/api/commissioner/leagues/[leagueId]/draft` (for the
 *          assign_pick action)
 *      None of these import `executeDraftPick`. The legacy entrypoints
 *      (`/api/draft/pick/make`, `/api/draft/picks`, `/api/draft/worker`,
 *      `/api/draft/mock/cpu-pick`) are mock-only by design and continue
 *      to use `executeDraftPick` for mock sessions.
 *
 * Static-source assertions only — JSDOM-rendering or real DB writes
 * would require the full live-draft-engine harness; the source-level
 * invariants are the contract this lock pins down.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Legacy executeDraftPick is guarded against live-mode writes', () => {
  const src = read('lib/draft/execute-pick.ts')

  it('imports the legacy-runtime-write-guard helpers', () => {
    expect(src).toMatch(
      /import \{[\s\S]*?assertLegacyDraftRuntimeWriteAllowed[\s\S]*?LegacyDraftRuntimeWriteBlockedError[\s\S]*?\} from '@\/lib\/draft\/legacy-runtime-write-guard'/,
    )
  })

  it('calls the guard before any prisma write in executeDraftPick', () => {
    // The guard call must precede the first `prisma.draftRoom...` write.
    const guardIdx = src.indexOf('assertLegacyDraftRuntimeWriteAllowed({')
    expect(guardIdx).toBeGreaterThan(0)
    const writeIdx = src.indexOf('prisma.draftRoomPickRecord')
    expect(writeIdx).toBeGreaterThan(guardIdx)
  })

  it('returns a 410 with a canonical-path redirect message when blocked', () => {
    expect(src).toMatch(/status: 410/)
    expect(src).toMatch(
      /Live-mode pick writes must go through the canonical draft authority/,
    )
    expect(src).toMatch(/POST \/api\/leagues\/\{leagueId\}\/draft\/pick/)
  })

  it('forwards the parsed mode to the guard (so mock writes pass through)', () => {
    expect(src).toMatch(/mode: parsed\.mode/)
  })

  it('non-LegacyDraftRuntimeWriteBlockedError errors still propagate (no swallowing)', () => {
    // The catch block must rethrow non-guard errors so transient DB
    // failures surface normally.
    expect(src).toMatch(
      /if \(err instanceof LegacyDraftRuntimeWriteBlockedError\)[\s\S]+?throw err/,
    )
  })
})

describe('Canonical NFL redraft live pick-write surfaces use submitPick', () => {
  const cases: Array<{ path: string; describe: string }> = [
    {
      path: 'app/api/leagues/[leagueId]/draft/pick/route.ts',
      describe: 'user pick submission (canonical)',
    },
    {
      path: 'app/api/leagues/[leagueId]/draft/autopick-expired/route.ts',
      describe: 'autopick on expired timer',
    },
    {
      path: 'app/api/leagues/[leagueId]/draft/controls/route.ts',
      describe: 'commissioner control center',
    },
    {
      path: 'app/api/commissioner/leagues/[leagueId]/draft/route.ts',
      describe: 'commissioner assign-pick action',
    },
  ]

  for (const { path, describe: label } of cases) {
    it(`${label} — ${path} imports submitPick from PickSubmissionService`, () => {
      const src = read(path)
      // Either a static import at the top of the file, or a dynamic
      // `const { submitPick } = await import(...)` inside a handler.
      // Both reach the canonical writer; we accept either form.
      const staticImport = /import \{[^}]*submitPick[^}]*\} from '@\/lib\/live-draft-engine\/PickSubmissionService'/
      const dynamicImport = /(?:const|let|var) \{[^}]*submitPick[^}]*\} = await import\('@\/lib\/live-draft-engine\/PickSubmissionService'\)/
      expect(staticImport.test(src) || dynamicImport.test(src)).toBe(true)
    })

    it(`${label} — ${path} does NOT import the legacy executeDraftPick`, () => {
      const src = read(path)
      expect(src).not.toMatch(/from '@\/lib\/draft\/execute-pick'/)
    })

    it(`${label} — ${path} does NOT directly call prisma.draftPick / prisma.draftRoomPickRecord create/update/delete`, () => {
      // Routes must delegate write logic to submitPick, not write picks
      // themselves. This prevents a future refactor from accidentally
      // bypassing the canonical validators (slot, duplicate, roster fit,
      // keeper locks, specialty pools).
      const src = read(path)
      expect(src).not.toMatch(/prisma\.draftPick\.(create|update|delete|upsert)\(/)
      expect(src).not.toMatch(/prisma\.draftRoomPickRecord\.(create|update|delete|upsert)\(/)
    })
  }
})

describe('Legacy executeDraftPick endpoints stay mock-only by design', () => {
  // These endpoints continue to use executeDraftPick. With Commit L's
  // guard in place, they now reject live-mode session keys (returning
  // 410) and only accept mock-mode keys. This lock asserts the guard is
  // active for these endpoints and that they have not started silently
  // routing live picks again.
  const cases = [
    'app/api/draft/pick/make/route.ts',
    'app/api/draft/picks/route.ts',
    'app/api/draft/worker/route.ts',
    'app/api/draft/mock/cpu-pick/route.ts',
  ]

  for (const path of cases) {
    it(`${path} delegates to executeDraftPick (the guarded legacy path)`, () => {
      const src = read(path)
      expect(src).toMatch(/from '@\/lib\/draft\/execute-pick'/)
      expect(src).toMatch(/executeDraftPick\(/)
    })
  }
})

describe('Commit E unified-board + Commit J session-mismatch contracts still hold after Slice L', () => {
  // Belt-and-suspenders: this commit doesn't touch DraftRoomPageClient,
  // but lock the cross-commit contract so a future refactor can't
  // silently regress while reshaping pick authority.
  const drpc = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('still exactly one <DraftRoomShell>', () => {
    expect((drpc.match(/<DraftRoomShell\b/g) ?? []).length).toBe(1)
  })

  it('still exactly one <DraftBoard>', () => {
    expect((drpc.match(/<DraftBoard\b/g) ?? []).length).toBe(1)
  })

  it('still has the 409 / DRAFT_SESSION_MISMATCH handler from Commit J', () => {
    expect(drpc).toMatch(
      /res\.status === 409 && \(data as \{ code\?: unknown \}\)\?\.code === 'DRAFT_SESSION_MISMATCH'/,
    )
    expect(drpc).toMatch(/setSessionMismatchRecovering\(true\)/)
  })

  it('DraftRoomPageClient does not import executeDraftPick (live picks stay canonical)', () => {
    expect(drpc).not.toMatch(/from '@\/lib\/draft\/execute-pick'/)
  })
})
