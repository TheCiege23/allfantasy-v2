/**
 * Pre-draft fix-action wiring lock (Commit G — Target A).
 *
 * The `PreDraftWizard`'s "Fix" buttons hand a canonical action key back to
 * the parent (`DraftRoomPageClient`) which deep-links the existing
 * `LeagueSettingsModal` at the matching panel. This is the only sanctioned
 * way to surface a fix flow — neither the wizard nor the parent may use
 * `router.push`, `router.replace`, or `window.location` to navigate.
 *
 * Static-source assertions only.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('PreDraftWizard exposes a typed fix-action callback', () => {
  const src = read('components/commissioner/PreDraftWizard.tsx')

  it('exports the canonical PreDraftFixAction union', () => {
    expect(src).toMatch(/export type PreDraftFixAction =/)
    expect(src).toMatch(/'invite_managers'/)
    expect(src).toMatch(/'set_draft_order'/)
    expect(src).toMatch(/'configure_roster'/)
    expect(src).toMatch(/'configure_scoring'/)
    expect(src).toMatch(/'fix_duplicate_managers'/)
    expect(src).toMatch(/'configure_draft_type'/)
  })

  it('declares onFixAction on PreDraftWizardProps', () => {
    expect(src).toMatch(/onFixAction\?:\s*\(action: PreDraftFixAction\) => void/)
  })

  it('handleFixAction forwards canonical actions to the parent and ignores unknown keys', () => {
    expect(src).toMatch(/onFixAction\?\.\(action as PreDraftFixAction\)/)
  })

  it('still has zero navigation imports / calls', () => {
    expect(src).not.toMatch(/from 'next\/navigation'/)
    expect(src).not.toMatch(/from 'next\/router'/)
    expect(src).not.toMatch(/router\.push\(/)
    expect(src).not.toMatch(/router\.replace\(/)
    expect(src).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
    expect(src).not.toMatch(/\bredirect\(/)
  })

  it('no longer logs the fix action to console (the placeholder is replaced)', () => {
    // The previous implementation had a console.log + TODO comment. Both
    // should be gone now that the canonical wiring exists.
    expect(src).not.toMatch(/console\.log\([\s\S]*?fixing/)
    expect(src).not.toMatch(/TODO: Implement route-based fixes/)
  })
})

describe('DraftRoomPageClient forwards fix actions via a navigation-free event bus', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('passes onFixAction to PreDraftWizard inside the wizard overlay', () => {
    expect(src).toMatch(/onFixAction=\{\(action\)/)
  })

  it('maps every canonical action to a real settings panel id', () => {
    // Each row of this map must point at a panel id handled by
    // `LeagueSettingsSubPanels.tsx` so the dashboard side can deep-link
    // the modal correctly when it picks up the event.
    expect(src).toMatch(/invite_managers:\s*'invite'/)
    expect(src).toMatch(/set_draft_order:\s*'draft'/)
    expect(src).toMatch(/configure_roster:\s*'roster'/)
    expect(src).toMatch(/configure_scoring:\s*'scoring'/)
    expect(src).toMatch(/fix_duplicate_managers:\s*'members-commish'/)
    expect(src).toMatch(/configure_draft_type:\s*'draft'/)
  })

  it('the fix-action handler dispatches af-pre-draft-fix-action and closes the wizard — no navigation', () => {
    const wizardRenderIdx = src.indexOf('data-testid="pre-draft-validation-wizard"')
    const window = src.slice(wizardRenderIdx, wizardRenderIdx + 2200)
    expect(window).toMatch(/setShowPreDraftValidationWizard\(false\)/)
    // The forward path is a CustomEvent — dashboard listeners pick this up
    // on `/league/[id]` and deep-link the existing settings modal there.
    // Inside the draft route, no modal is auto-opened (no LeagueSettingsModal
    // in DRPC scope) so the contract stays navigation-free.
    expect(window).toMatch(/new CustomEvent\(\s*'af-pre-draft-fix-action'/)
    expect(window).toMatch(/detail:\s*\{\s*leagueId,\s*action,\s*panel\s*\}/)
    // Negative guard: the in-place fix flow must NOT introduce any
    // navigation. The Commit E lock already covers handleStartDraft /
    // handleCommissionerAction; this is a focused guard on the wizard
    // fix path.
    expect(window).not.toMatch(/router\.push\(/)
    expect(window).not.toMatch(/router\.replace\(/)
    expect(window).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
  })
})

describe('LeagueSettingsSubPanels covers every panel id we deep-link into', () => {
  // Belt-and-suspenders: if a panel id is renamed/removed, the wizard
  // would silently land on a generic fallback. Lock the panel ids.
  const src = read('app/league/[leagueId]/components/LeagueSettingsSubPanels.tsx')

  for (const panelId of ['draft', 'roster', 'scoring', 'invite', 'members-commish'] as const) {
    it(`SettingsSubPanelBody handles case '${panelId}'`, () => {
      expect(src).toMatch(new RegExp(`case '${panelId}':`))
    })
  }
})
