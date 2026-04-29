/**
 * NFL redraft snake draft — pre-draft validation integration lock (Commit F).
 *
 * Locks the contract that pre-draft validation:
 *   1. Renders inside the existing draft-room shell — not as a route swap or
 *      a second `<DraftRoomShell>` / `<DraftBoard>`.
 *   2. Never introduces navigation. Failed validation does NOT call
 *      `router.push`, `router.replace`, or `window.location.replace`.
 *   3. Reuses the existing `handleCommissionerAction('start')` path on
 *      successful validation — no parallel start codepath.
 *   4. The orchestrator and route do not redirect either; they return
 *      structured JSON.
 *   5. Commit E's unified-state contract for the snake board still holds
 *      (no shell duplication, no board duplication, no status-driven
 *      shell swap from the wizard's mount).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Pre-draft validation — wizard component is navigation-free', () => {
  const src = read('components/commissioner/PreDraftWizard.tsx')

  it('does not import next/navigation or next/router', () => {
    expect(src).not.toMatch(/from 'next\/navigation'/)
    expect(src).not.toMatch(/from 'next\/router'/)
  })

  it('does not call router.push, router.replace, window.location.replace, or redirect()', () => {
    expect(src).not.toMatch(/router\.push\(/)
    expect(src).not.toMatch(/router\.replace\(/)
    expect(src).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
    expect(src).not.toMatch(/\bredirect\(/)
  })

  it('exposes onClose and onValidationComplete callbacks for parent-driven flow', () => {
    expect(src).toMatch(/onClose:\s*\(\) => void/)
    expect(src).toMatch(/onValidationComplete\?:\s*\(canStart: boolean\) => void/)
  })

  it('fetches the validation report from the canonical route and surfaces canStartDraft', () => {
    expect(src).toMatch(
      /fetch\(`\/api\/leagues\/\$\{leagueId\}\/draft\/\$\{draftId\}\/validate-pre-draft`/,
    )
    expect(src).toMatch(/onValidationComplete\?\.\(data\.canStartDraft\)/)
  })
})

describe('Pre-draft validation — orchestrator is navigation-free + schema-correct', () => {
  const src = read('lib/draft/validation/DraftValidationOrchestrator.ts')

  it('does not import next/navigation, next/router, or call redirect()', () => {
    expect(src).not.toMatch(/from 'next\/navigation'/)
    expect(src).not.toMatch(/from 'next\/router'/)
    expect(src).not.toMatch(/\bredirect\(/)
    expect(src).not.toMatch(/router\.push\(/)
    expect(src).not.toMatch(/window\.location/)
  })

  it('queries Roster.platformUserId (the real schema field), not Roster.userId', () => {
    expect(src).toMatch(/platformUserId:\s*true/)
    // Negative guard: the previous incorrect query selected `userId` from
    // Roster, which does not exist on the committed schema. Use a
    // negative-lookbehind to avoid matching `platformUserId` (the correct
    // field) which contains `userId` as a suffix.
    expect(src).not.toMatch(/(?<!platform)userId:\s*true/)
  })

  it('queries League.rosterSize / League.starters / League.scoring (no LeagueSettings.starterSlots etc)', () => {
    expect(src).toMatch(/rosterSize:\s*true/)
    expect(src).toMatch(/starters:\s*true/)
    expect(src).toMatch(/scoring:\s*true/)
    // Negative: do not query the non-existent LeagueSettings fields.
    expect(src).not.toMatch(/leagueSettings\.findUnique[\s\S]*?starterSlots/)
    expect(src).not.toMatch(/leagueSettings\.findUnique[\s\S]*?scoringFormat/)
  })

  it('uses prisma.draftSession (NOT prisma.draft, which does not exist) to read draftType', () => {
    expect(src).toMatch(/prisma\.draftSession\.findUnique\(/)
    expect(src).not.toMatch(/prisma\.draft\.findUnique\(/)
  })

  it('returns the canonical DraftValidationReport shape', () => {
    expect(src).toMatch(/canStartDraft:\s*boolean/)
    expect(src).toMatch(/results:\s*ValidationResult\[\]/)
    expect(src).toMatch(/timestamp:\s*string/)
  })
})

describe('Pre-draft validation — route is non-redirecting', () => {
  const src = read('app/api/leagues/[leagueId]/draft/[draftId]/validate-pre-draft/route.ts')

  it('exports a GET handler', () => {
    expect(src).toMatch(/export async function GET/)
  })

  it('does not redirect, push, replace, or change window.location', () => {
    expect(src).not.toMatch(/from 'next\/navigation'/)
    expect(src).not.toMatch(/\bredirect\(/)
    expect(src).not.toMatch(/router\.push\(/)
    expect(src).not.toMatch(/router\.replace\(/)
    expect(src).not.toMatch(/window\.location/)
  })

  it('wraps DraftValidationOrchestrator and returns JSON', () => {
    expect(src).toMatch(
      /import \{ DraftValidationOrchestrator \} from '@\/lib\/draft\/validation\/DraftValidationOrchestrator'/,
    )
    expect(src).toMatch(/DraftValidationOrchestrator\.validateDraft\(/)
    expect(src).toMatch(/NextResponse\.json\(/)
  })
})

describe('Pre-draft validation — DraftRoomPageClient integration preserves Commit E contract', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('imports PreDraftWizard via dynamic() (avoids server-side render of the modal)', () => {
    expect(src).toMatch(
      /const PreDraftWizard = dynamic\(\s*\(\) => import\('@\/components\/commissioner\/PreDraftWizard'\)\.then\(\(m\) => m\.PreDraftWizard\)/,
    )
  })

  it('wires showPreDraftValidationWizard state through useState', () => {
    expect(src).toMatch(
      /const \[showPreDraftValidationWizard, setShowPreDraftValidationWizard\] = useState\(false\)/,
    )
  })

  it('handleStartDraft preflights the validation route before commissioner action', () => {
    const startStart = src.indexOf('const handleStartDraft = useCallback(')
    const startEnd = startStart >= 0 ? src.indexOf('const handleSettingsPatch', startStart) : -1
    const startBody = startStart >= 0 && startEnd > startStart ? src.slice(startStart, startEnd) : ''

    expect(startBody).toMatch(/\/api\/leagues\/\$\{encodeURIComponent\(leagueId\)\}\/draft\/\$\{encodeURIComponent\(draftId\)\}\/validate-pre-draft/)
    expect(startBody).toMatch(/canStartDraft === false/)
    expect(startBody).toMatch(/setShowPreDraftValidationWizard\(true\)/)
  })

  it('failed validation NEVER calls navigation — handleStartDraft contains no router.push/replace/window.location.replace', () => {
    const startStart = src.indexOf('const handleStartDraft = useCallback(')
    const startEnd = startStart >= 0 ? src.indexOf('const handleSettingsPatch', startStart) : -1
    const startBody = startStart >= 0 && startEnd > startStart ? src.slice(startStart, startEnd) : ''

    expect(startBody).not.toMatch(/router\.push\(/)
    expect(startBody).not.toMatch(/router\.replace\(/)
    expect(startBody).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
  })

  it('successful validation re-uses the existing handleCommissionerAction(\'start\') path', () => {
    const startStart = src.indexOf('const handleStartDraft = useCallback(')
    const startEnd = startStart >= 0 ? src.indexOf('const handleSettingsPatch', startStart) : -1
    const startBody = startStart >= 0 && startEnd > startStart ? src.slice(startStart, startEnd) : ''

    // The existing start path stays intact — the only change is a preflight
    // that may bail out via setShowPreDraftValidationWizard before the
    // existing call site runs.
    expect(startBody).toMatch(/handleCommissionerAction\('start'\)/)
  })

  it('wizard is rendered as an in-place overlay, not as a parallel DraftRoomShell or DraftBoard', () => {
    expect(src).toMatch(/data-testid="pre-draft-validation-wizard"/)
    // The wizard render block must NOT mount another shell or board.
    const wizardRenderIdx = src.indexOf('data-testid="pre-draft-validation-wizard"')
    expect(wizardRenderIdx).toBeGreaterThan(0)
    // Look at the surrounding 800 chars; this overlay must not introduce
    // a second shell/board mount.
    const window = src.slice(Math.max(0, wizardRenderIdx - 400), wizardRenderIdx + 800)
    expect(window).not.toMatch(/<DraftRoomShell\b/)
    expect(window).not.toMatch(/<DraftBoard\b/)
  })

  it('Commit E lock holds — still exactly one <DraftRoomShell> and one <DraftBoard>', () => {
    // This is also covered by `__tests__/nfl-redraft-snake-draft-board-state.test.ts`
    // — duplicated here so a maintainer touching the wizard sees the
    // contract violation immediately in this file's failure output.
    const shellMatches = src.match(/<DraftRoomShell\b/g) ?? []
    const boardMatches = src.match(/<DraftBoard\b/g) ?? []
    expect(shellMatches.length).toBe(1)
    expect(boardMatches.length).toBe(1)
  })

  it('onValidationComplete(canStart=true) closes the wizard and starts the draft via the existing path', () => {
    const wizardRenderIdx = src.indexOf('data-testid="pre-draft-validation-wizard"')
    const window = src.slice(wizardRenderIdx, wizardRenderIdx + 1000)
    expect(window).toMatch(/onValidationComplete=\{\(canStart\) =>/)
    expect(window).toMatch(/setShowPreDraftValidationWizard\(false\)/)
    expect(window).toMatch(/handleCommissionerAction\('start'\)/)
  })
})
