import { describe, expect, it } from 'vitest'
import { getMonetizationCatalog } from '../catalog'
import { SUBSCRIPTION_TOKEN_POLICY_CONFIG } from '@/lib/tokens/subscription-policy'
import { SUPREME_INCLUDED_PLAN_IDS } from '@/lib/subscription/feature-access'

/**
 * The catalog advertises token grants; the POLICY is what Stripe actually credits.
 *
 * ⚠ THIS DRIFTED THREE TIMES AND WAS CAUGHT BY A HUMAN READING A HANDOFF DOC, NOT
 * BY ANY TEST. Supreme was fixed once (its catalog comments record it), and
 * Commissioner and Legacy were left overpromising by 5x and 10.3x — the catalog
 * said Legacy yearly granted 36,000 tokens where `invoice.payment_succeeded`
 * credited 3,500. Nothing failed. Nothing warned. Both numbers were valid
 * TypeScript and every page that rendered either one looked right.
 *
 * The failure mode is structural: two files hold the same fact, only one of them
 * is load-bearing, and the one customers READ is the one that is not. A comment
 * saying "must match" is not a mechanism. This is.
 */

const PLAN_FAMILY_TO_POLICY: Record<string, keyof typeof SUBSCRIPTION_TOKEN_POLICY_CONFIG.plans> = {
  af_pro: 'pro',
  af_commissioner: 'commissioner',
  af_war_room: 'war_room',
  af_supreme: 'supreme',
}

describe('monetization catalog vs subscription token policy', () => {
  const subscriptions = getMonetizationCatalog().subscriptions

  it('has subscriptions to check (guards against a vacuous pass)', () => {
    // A catalog that returned [] would make every assertion below trivially true
    // — the exact way a "green" suite can prove nothing at all.
    expect(subscriptions.length).toBeGreaterThan(0)
  })

  it.each(subscriptions.map((s) => [s.sku, s] as const))(
    '%s advertises exactly what the policy grants',
    (_sku, item) => {
      const policyKey = PLAN_FAMILY_TO_POLICY[item.planFamily as string]
      // A new plan family with no mapping must fail loudly rather than skip:
      // silently not-checking a tier is how the last two got through.
      expect(policyKey, `no policy mapping for planFamily "${item.planFamily}"`).toBeTruthy()

      const policy = SUBSCRIPTION_TOKEN_POLICY_CONFIG.plans[policyKey]
      expect(policy, `no policy entry for "${policyKey}"`).toBeTruthy()

      const granted =
        item.interval === 'year'
          ? policy.yearlyIncludedPremiumCredits
          : policy.monthlyIncludedPremiumCredits

      expect(
        item.tokenAmount,
        `${item.sku} advertises ${item.tokenAmount} tokens but the policy grants ${granted}. ` +
          `The policy is what invoice.payment_succeeded credits, so the catalog is the wrong one. ` +
          `Change BOTH deliberately, never one.`
      ).toBe(granted)
    }
  )
})

/**
 * Descriptions must not claim an inclusion the entitlement code does not grant.
 *
 * ⚠ THE ORIGINAL COPY WAS NOT MERELY VAGUE, IT WAS INVERTED. Legacy advertised
 * "Everything in Supreme plus …" while SUPREME_INCLUDED_PLAN_IDS contains
 * war_room — Supreme includes LEGACY, not the reverse — and Legacy grants 300
 * tokens/mo against Supreme's 1,000 while costing $10 more. Commissioner
 * advertised "Everything in Pro plus …" and grants none of Pro's player tools.
 * Someone buying on either sentence finds features locked that they paid for.
 *
 * Only the plan families Supreme actually inherits may make an inclusion claim.
 */
describe('tier descriptions vs entitlement inheritance', () => {
  const subscriptions = getMonetizationCatalog().subscriptions
  // Supreme is the only bundling tier, so it is the only one permitted to say so.
  const BUNDLING_FAMILIES = new Set(['af_supreme'])

  it('SUPREME_INCLUDED_PLAN_IDS still describes a real bundle', () => {
    // If this list is ever emptied, the exemption below would be silently wrong.
    expect(SUPREME_INCLUDED_PLAN_IDS.length).toBeGreaterThan(0)
  })

  it.each(subscriptions.map((s) => [s.sku, s] as const))(
    '%s does not claim to include another tier unless it does',
    (_sku, item) => {
      const claimsInclusion = /everything in /i.test(item.description)
      if (!claimsInclusion) return
      expect(
        BUNDLING_FAMILIES.has(item.planFamily as string),
        `${item.sku} says "${item.description}" but only Supreme bundles other tiers ` +
          `(SUPREME_INCLUDED_PLAN_IDS = [${SUPREME_INCLUDED_PLAN_IDS.join(', ')}]). ` +
          `Describe what this tier ADDS, not what it contains.`
      ).toBe(true)
    }
  )
})
