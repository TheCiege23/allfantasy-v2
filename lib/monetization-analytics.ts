/**
 * Monetization analytics — purchase return, subscription, token events.
 * PROMPT 267.
 */

import { gtagEvent } from '@/lib/gtag'

const CONVERSION_CATEGORY = 'monetization'

/** Fire when user returns from checkout with success (subscription or tokens). */
export function trackPurchaseReturnSuccess(params: { returnPath: string }) {
  gtagEvent('purchase_return_success', {
    event_category: CONVERSION_CATEGORY,
    ...params,
  })
}
