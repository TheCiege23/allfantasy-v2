/**
 * PROMPT 169 — Landing page conversion tracking.
 * CTA clicks, tool page visits, signups. All events go to gtag for GA/ads.
 */

import { gtagEvent } from '@/lib/gtag'

const CONVERSION_CATEGORY = 'landing_conversion'

/** Track CTA click (primary: Open App, secondary: Create Free Account, or tool card). */
export function trackLandingCtaClick(params: {
  cta_label: string
  cta_destination: string
  cta_type: 'primary' | 'secondary' | 'tool_card' | 'feature_card' | 'ai_value'
  source?: string
}) {
  gtagEvent('landing_cta_click', {
    event_category: CONVERSION_CATEGORY,
    ...params,
  })
}

/** Track visit to a tool page (from landing or direct). Use on tool landing pages. */
export function trackLandingToolVisit(params: { path: string; tool_name?: string }) {
  gtagEvent('landing_tool_visit', {
    event_category: CONVERSION_CATEGORY,
    ...params,
  })
}

/** Track signup completion (call on success/thank-you page). */
export function trackLandingSignupComplete(params?: { existing_user?: boolean; source?: string }) {
  gtagEvent('signup_complete', {
    event_category: CONVERSION_CATEGORY,
    event_label: 'Landing Signup',
    ...params,
  })
}
