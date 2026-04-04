'use client'

import type { ReactNode } from 'react'
import { SubscriptionGateProvider } from '@/hooks/useSubscriptionGate'

/** Mount once under `SessionAppProvider` so `useAfSubGate` can open the gate modal app-wide. */
export function SubscriptionGateRoot({ children }: { children: ReactNode }) {
  return <SubscriptionGateProvider>{children}</SubscriptionGateProvider>
}
