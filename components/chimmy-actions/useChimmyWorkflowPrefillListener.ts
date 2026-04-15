'use client'

import { useEffect } from 'react'
import type { AIWorkflowType } from '@/lib/chimmy-actions'

export const CHIMMY_WORKFLOW_PREFILL_EVENT = 'chimmy:workflow-prefill'

export interface ChimmyWorkflowPrefillDetail {
  actionId: string
  actionType: string
  prefillTarget?: string | null
  prefillData?: Record<string, unknown>
  workflowPrefill?: {
    workflowType: AIWorkflowType
    sport?: string | null
    leagueId?: string | null
    teamId?: string | null
    values: Record<string, unknown>
  } | null
}

export type ChimmyWorkflowPrefillHandlers = Partial<
  Record<AIWorkflowType, (detail: ChimmyWorkflowPrefillDetail) => void>
>

export interface ChimmyWorkflowPrefillListenerOptions {
  handlers: ChimmyWorkflowPrefillHandlers
  onUnhandled?: (detail: ChimmyWorkflowPrefillDetail) => void
}

/**
 * Registers a global listener for Chimmy workflow prefill events.
 * Returns an unsubscribe callback.
 */
export function addChimmyWorkflowPrefillListener(
  options: ChimmyWorkflowPrefillListenerOptions,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<ChimmyWorkflowPrefillDetail>
    const detail = customEvent.detail
    const workflowType = detail?.workflowPrefill?.workflowType

    if (!detail || !workflowType) return

    const handler = options.handlers[workflowType]
    if (handler) {
      handler(detail)
      return
    }

    options.onUnhandled?.(detail)
  }

  window.addEventListener(CHIMMY_WORKFLOW_PREFILL_EVENT, listener)
  return () => window.removeEventListener(CHIMMY_WORKFLOW_PREFILL_EVENT, listener)
}

/**
 * React hook wrapper for addChimmyWorkflowPrefillListener.
 */
export function useChimmyWorkflowPrefillListener(
  options: ChimmyWorkflowPrefillListenerOptions,
): void {
  useEffect(() => addChimmyWorkflowPrefillListener(options), [options])
}
