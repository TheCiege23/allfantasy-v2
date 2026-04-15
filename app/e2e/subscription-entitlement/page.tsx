import { notFound } from 'next/navigation'
import { SubscriptionEntitlementHarnessClient } from './SubscriptionEntitlementHarnessClient'

export default function SubscriptionEntitlementHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <SubscriptionEntitlementHarnessClient />
}
