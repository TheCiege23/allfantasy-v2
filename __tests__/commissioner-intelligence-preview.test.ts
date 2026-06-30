/**
 * Source-invariant tests for CommissionerIntelligencePreview.
 *
 * Checks the key customer-facing strings and structural contracts in
 * the component source — same pattern as import-page-provider-flow.test.ts.
 * Does not require a JSDOM environment.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const componentSrc = fs.readFileSync(
  path.resolve(root, 'components/league-import/CommissionerIntelligencePreview.tsx'),
  'utf8',
)
const flowSrc = fs.readFileSync(
  path.resolve(root, 'components/unified-import-ui/LeagueImportFlow.tsx'),
  'utf8',
)

describe('CommissionerIntelligencePreview — component structure', () => {
  it('exports the component and payload type', () => {
    expect(componentSrc).toContain('export function CommissionerIntelligencePreview(')
    expect(componentSrc).toContain('export type CommissionerPreviewPayload')
    expect(componentSrc).toContain('export type CommissionerIntelligencePreviewProps')
  })

  it('renders as a fixed modal overlay with correct aria attributes', () => {
    expect(componentSrc).toContain('fixed inset-0 z-50')
    expect(componentSrc).toContain('role="dialog"')
    expect(componentSrc).toContain('aria-modal="true"')
    expect(componentSrc).toContain('aria-label="Commissioner Intelligence Preview"')
    expect(componentSrc).toContain('data-testid="commissioner-intelligence-preview"')
  })

  it('shows the Commissioner Intelligence Preview heading', () => {
    expect(componentSrc).toContain('Commissioner Intelligence Preview')
  })
})

describe('CommissionerIntelligencePreview — health score', () => {
  it('displays a League Health Score with bar', () => {
    expect(componentSrc).toContain('League Health Score')
    expect(componentSrc).toContain('data-testid="health-bar"')
    expect(componentSrc).toContain('/ 100')
  })

  it('maps health tier to human-readable labels', () => {
    expect(componentSrc).toContain("strong: 'Strong'")
    expect(componentSrc).toContain("good: 'Good'")
    expect(componentSrc).toContain("fair: 'Fair'")
    expect(componentSrc).toContain("poor: 'Needs work'")
  })

  it('derives health score with penalties for empty rosters and review required', () => {
    expect(componentSrc).toContain('emptyRosters * 8')
    expect(componentSrc).toContain('canonical.reviewRequired')
    expect(componentSrc).toContain('healthScore -= 10')
  })
})

describe('CommissionerIntelligencePreview — metrics grid', () => {
  it('renders all six required metric cards', () => {
    expect(componentSrc).toContain('Retention Risk')
    expect(componentSrc).toContain('Manager Activity')
    expect(componentSrc).toContain('Roster Completeness')
    expect(componentSrc).toContain('Trade Activity')
    expect(componentSrc).toContain('Waiver Activity')
    expect(componentSrc).toContain('Engagement Score')
  })

  it('uses customer-friendly language for metric states', () => {
    expect(componentSrc).toContain('All managers are active')
    expect(componentSrc).toContain('need attention')
    expect(componentSrc).toContain('Roster completeness is strong')
    expect(componentSrc).toContain('Trade activity is low this season')
    expect(componentSrc).toContain('Managers are actively trading')
    expect(componentSrc).toContain('League engagement is strong')
    expect(componentSrc).toContain('More insights unlock after league activity')
  })

  it('renders progress bars for roster completeness and engagement', () => {
    expect(componentSrc).toContain('progress={intel.rosterCoverage}')
    expect(componentSrc).toContain('progress={intel.engagementScore}')
  })
})

describe('CommissionerIntelligencePreview — workload and recommendations', () => {
  it('renders Commissioner Workload section', () => {
    expect(componentSrc).toContain('Commissioner Workload')
    expect(componentSrc).toContain('workloadLevel')
    expect(componentSrc).toContain("'Light'")
    expect(componentSrc).toContain("'Moderate'")
    expect(componentSrc).toContain("'Heavy'")
  })

  it('shows no-action message when workload is light', () => {
    expect(componentSrc).toContain('No immediate action required — league is in good shape')
  })

  it('renders Recommended Actions section with numbered items', () => {
    expect(componentSrc).toContain('Recommended Actions')
    expect(componentSrc).toContain('intel.recommendations.map')
    expect(componentSrc).toContain('Post a weekly recap to keep managers engaged')
  })
})

describe('CommissionerIntelligencePreview — CTAs and graceful degradation', () => {
  it('has Continue to import and Back buttons', () => {
    expect(componentSrc).toContain('Continue to import')
    expect(componentSrc).toContain('data-testid="continue-to-import"')
    expect(componentSrc).toContain('onContinue')
    expect(componentSrc).toContain('onClose')
  })

  it('shows graceful placeholder when no meaningful data is available', () => {
    expect(componentSrc).toContain('hasMeaningfulData')
    expect(componentSrc).toContain('More insights unlock after league activity is available.')
  })

  it('uses no backend/internal terminology', () => {
    expect(componentSrc).not.toContain('Canonical World')
    expect(componentSrc).not.toContain('Decision OS')
    expect(componentSrc).not.toContain('shadow')
    expect(componentSrc).not.toContain('parity')
    expect(componentSrc).not.toContain('provenance')
    expect(componentSrc).not.toContain('canonicalBridge')
  })
})

describe('LeagueImportFlow — intelligence modal integration', () => {
  it('imports CommissionerIntelligencePreview', () => {
    expect(flowSrc).toContain('CommissionerIntelligencePreview')
    expect(flowSrc).toContain('CommissionerPreviewPayload')
  })

  it('tracks modal open state and stores raw payload', () => {
    expect(flowSrc).toContain('intelligenceModalOpen')
    expect(flowSrc).toContain('setIntelligenceModalOpen')
    expect(flowSrc).toContain('rawPayload')
  })

  it('opens the modal on successful preview', () => {
    expect(flowSrc).toContain('setIntelligenceModalOpen(true)')
  })

  it('resets modal state at the start of a new preview run', () => {
    expect(flowSrc).toContain('setIntelligenceModalOpen(false)')
  })

  it('renders the modal when intelligenceModalOpen and previewInfo are both set', () => {
    expect(flowSrc).toContain('intelligenceModalOpen && previewInfo &&')
  })

  it('wires onContinue to close modal and scroll to preview section', () => {
    expect(flowSrc).toContain('onContinue={() => {')
    expect(flowSrc).toContain('setIntelligenceModalOpen(false)')
    expect(flowSrc).toContain('previewSectionRef.current?.scrollIntoView')
  })

  it('resets modal when user switches provider tabs', () => {
    expect(flowSrc).toMatch(/setDiscoveredLeagues\(\[\]\)\s*\n\s*setIntelligenceModalOpen\(false\)/)
  })
})
