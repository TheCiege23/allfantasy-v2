'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SubscriptionGateModal } from '@/components/subscription/SubscriptionGateModal'
import type { SubscriptionFeatureId } from '@/lib/subscription/types'

type GateState = {
  isOpen: boolean
  featureId: SubscriptionFeatureId | null
  featureLabel: string | undefined
  highlightParam: string | undefined
}

type SubscriptionGateContextValue = {
  gate: (
    featureId: SubscriptionFeatureId,
    opts?: { featureLabel?: string; highlightParam?: string }
  ) => void
  close: () => void
  state: GateState
}

const SubscriptionGateContext = createContext<SubscriptionGateContextValue | null>(null)

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({
    isOpen: false,
    featureId: null,
    featureLabel: undefined,
    highlightParam: undefined,
  })

  const gate = useCallback(
    (featureId: SubscriptionFeatureId, opts?: { featureLabel?: string; highlightParam?: string }) => {
      setState({
        isOpen: true,
        featureId,
        featureLabel: opts?.featureLabel,
        highlightParam: opts?.highlightParam,
      })
    },
    []
  )

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }))
  }, [])

  const value = useMemo(() => ({ gate, close, state }), [gate, close, state])

  return (
    <SubscriptionGateContext.Provider value={value}>
      {children}
      <SubscriptionGateModal
        isOpen={state.isOpen}
        onClose={close}
        featureId={state.featureId ?? 'commissioner_ai_tools'}
        featureLabel={state.featureLabel}
        highlightParam={state.highlightParam}
      />
    </SubscriptionGateContext.Provider>
  )
}

export function useSubscriptionGate(): SubscriptionGateContextValue {
  const ctx = useContext(SubscriptionGateContext)
  if (!ctx) {
    throw new Error('useSubscriptionGate must be used within SubscriptionGateProvider')
  }
  return ctx
}

/** When the panel may render outside `SubscriptionGateProvider` (e.g. legacy tabs), returns null. */
export function useSubscriptionGateOptional(): SubscriptionGateContextValue | null {
  return useContext(SubscriptionGateContext)
}
