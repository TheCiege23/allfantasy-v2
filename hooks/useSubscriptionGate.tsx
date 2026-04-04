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
import type { FeatureKey } from '@/lib/monetization/entitlements'

type GateState = {
  isOpen: boolean
  featureKey: FeatureKey | null
  featureLabel: string | undefined
  highlightFeature: string | undefined
}

type SubscriptionGateContextValue = {
  gate: (featureKey: FeatureKey, opts?: { featureLabel?: string; highlightFeature?: string }) => void
  close: () => void
  state: GateState
}

const SubscriptionGateContext = createContext<SubscriptionGateContextValue | null>(null)

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({
    isOpen: false,
    featureKey: null,
    featureLabel: undefined,
    highlightFeature: undefined,
  })

  const gate = useCallback(
    (featureKey: FeatureKey, opts?: { featureLabel?: string; highlightFeature?: string }) => {
      setState({
        isOpen: true,
        featureKey,
        featureLabel: opts?.featureLabel,
        highlightFeature: opts?.highlightFeature,
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
        featureKey={state.featureKey ?? 'commissioner_ai_tools'}
        featureLabel={state.featureLabel}
        highlightFeature={state.highlightFeature}
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
