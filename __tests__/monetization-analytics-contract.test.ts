import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resolvePlanTierFromSku,
  trackPlanCheckoutClicked,
  trackSubscriptionPurchaseSuccess,
  trackTokenPurchaseClicked,
} from '@/lib/monetization-analytics'

const gtagEventMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/gtag', () => ({
  gtagEvent: gtagEventMock,
}))

describe('monetization analytics taxonomy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps plan tiers from sku-like values', () => {
    expect(resolvePlanTierFromSku('af_pro_monthly')).toBe('pro')
    expect(resolvePlanTierFromSku('af_commissioner_yearly')).toBe('commissioner')
    expect(resolvePlanTierFromSku('af_war_room_monthly')).toBe('war_room')
    expect(resolvePlanTierFromSku('af_all_access_yearly')).toBe('all_access')
    expect(resolvePlanTierFromSku('af_tokens_25')).toBe('tokens')
  })

  it('emits plan checkout click event with normalized payload', () => {
    trackPlanCheckoutClicked({
      sku: 'af_pro_monthly',
      planTier: 'pro',
      interval: 'month',
      surface: 'pricing_plan_card',
      pagePath: '/pricing',
    })

    expect(gtagEventMock).toHaveBeenCalledWith(
      'monetization_plan_checkout_clicked',
      expect.objectContaining({
        event_category: 'monetization',
        sku: 'af_pro_monthly',
        plan_tier: 'pro',
        billing_interval: 'month',
      })
    )
  })

  it('emits token purchase click and subscription success events', () => {
    trackTokenPurchaseClicked({
      sku: 'af_tokens_10',
      surface: 'tokens_page_pack_card',
      pagePath: '/tokens',
    })
    trackSubscriptionPurchaseSuccess({
      returnPath: '/pricing',
      sessionId: 'cs_test_123',
      effectivePlanTiers: ['pro'],
    })

    expect(gtagEventMock).toHaveBeenNthCalledWith(
      1,
      'monetization_token_purchase_clicked',
      expect.objectContaining({
        plan_tier: 'tokens',
        sku: 'af_tokens_10',
      })
    )
    expect(gtagEventMock).toHaveBeenNthCalledWith(
      2,
      'monetization_subscription_purchase_success',
      expect.objectContaining({
        session_id: 'cs_test_123',
        primary_plan_tier: 'pro',
      })
    )
  })
})
