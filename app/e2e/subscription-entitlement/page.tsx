import { Suspense } from 'react'
import SubscriptionEntitlementHarnessClient from './SubscriptionEntitlementHarnessClient'

export default function SubscriptionEntitlementHarnessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading…</div>}>
      <SubscriptionEntitlementHarnessClient />
    </Suspense>
  )
}
