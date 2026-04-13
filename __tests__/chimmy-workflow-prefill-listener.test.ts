import { describe, expect, it, vi } from 'vitest'
import {
  CHIMMY_WORKFLOW_PREFILL_EVENT,
  addChimmyWorkflowPrefillListener,
} from '@/components/chimmy-actions/useChimmyWorkflowPrefillListener'

describe('chimmy workflow prefill listener', () => {
  it('routes event detail to workflow-specific handler', () => {
    const waiverHandler = vi.fn()

    const unsubscribe = addChimmyWorkflowPrefillListener({
      handlers: {
        waiver_claim: waiverHandler,
      },
    })

    window.dispatchEvent(
      new CustomEvent(CHIMMY_WORKFLOW_PREFILL_EVENT, {
        detail: {
          actionId: 'action-1',
          actionType: 'claim_player',
          prefillTarget: 'waiver_claim_modal',
          prefillData: { playerId: 'player-1' },
          workflowPrefill: {
            workflowType: 'waiver_claim',
            values: { playerId: 'player-1' },
          },
        },
      }),
    )

    expect(waiverHandler).toHaveBeenCalledTimes(1)
    expect(waiverHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'action-1',
      }),
    )

    unsubscribe()
  })

  it('calls onUnhandled when no workflow handler is registered', () => {
    const onUnhandled = vi.fn()

    const unsubscribe = addChimmyWorkflowPrefillListener({
      handlers: {},
      onUnhandled,
    })

    window.dispatchEvent(
      new CustomEvent(CHIMMY_WORKFLOW_PREFILL_EVENT, {
        detail: {
          actionId: 'action-2',
          actionType: 'analyze_trade',
          workflowPrefill: {
            workflowType: 'trade_analysis',
            values: {},
          },
        },
      }),
    )

    expect(onUnhandled).toHaveBeenCalledTimes(1)
    expect(onUnhandled).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'action-2',
      }),
    )

    unsubscribe()
  })
})
