/**
 * Does Stripe actually charge what the pricing page advertises?
 *
 * ⚠ NOTHING IN THE APP CHECKS THIS, AND A COMMENT CLAIMS IT IS GUARANTEED.
 * StripeCheckoutSession's header says the charge is "structurally guaranteed to
 * equal the catalog's displayed amountUsd". It is not. The line item is a Stripe
 * Price ID resolved from `STRIPE_PRICE_AF_*`; `amountUsd` is a number in our
 * repo that no code path compares against it. They have been kept in sync by
 * hand, and the guarantee is a description of that habit rather than a mechanism.
 *
 * This matters most on the day prices change. Stripe Prices are IMMUTABLE — you
 * cannot edit an existing one, you create a new Price and repoint the env var.
 * Edit the catalog and forget that step and the page advertises the new price
 * while every customer is billed the old one. That failure is silent, it is on
 * the money path, and the customer discovers it on their card statement.
 *
 * Usage:
 *   npx tsx scripts/verify-stripe-price-parity.ts
 *
 * Exits non-zero on any mismatch so it can gate a deploy.
 */
import Stripe from 'stripe'
import { getMonetizationCatalog } from '../lib/monetization/catalog'

type Row = {
  sku: string
  envVar: string
  advertised: number
  charged: number | null
  status: 'ok' | 'MISMATCH' | 'ENV UNSET' | 'PRICE MISSING' | 'NOT A PRICE'
  detail: string
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    console.error(
      'STRIPE_SECRET_KEY is not set. This check talks to Stripe — it cannot be run offline,\n' +
        'and skipping it silently is exactly the failure mode it exists to catch.'
    )
    process.exit(2)
  }

  const stripe = new Stripe(secret, { apiVersion: '2026-02-25.clover' })
  const items = getMonetizationCatalog().all
  const rows: Row[] = []

  for (const item of items) {
    const envVar = item.stripePriceEnvVar
    const priceId = process.env[envVar]?.trim()

    if (!priceId) {
      rows.push({
        sku: item.sku,
        envVar,
        advertised: item.amountUsd,
        charged: null,
        status: 'ENV UNSET',
        // Checkout fails soft on an unset price id (503), so this is a broken
        // buy button rather than a wrong charge — bad, but bad differently.
        detail: 'no price id configured — this SKU cannot be purchased at all',
      })
      continue
    }

    try {
      const price = await stripe.prices.retrieve(priceId)
      /*
       * ⚠ COMPARED IN CENTS, NEVER IN FLOATING-POINT DOLLARS. 79.99 * 100 is
       * 7998.999999999999 in IEEE 754, so a naive equality check would report a
       * mismatch on a price that is exactly right — and the natural "fix" for
       * that false alarm is a tolerance, which would then hide a real one-cent
       * error. Rounding once, here, keeps the comparison exact.
       */
      const chargedCents = price.unit_amount
      const advertisedCents = Math.round(item.amountUsd * 100)

      if (chargedCents == null) {
        rows.push({
          sku: item.sku, envVar, advertised: item.amountUsd, charged: null,
          status: 'NOT A PRICE',
          detail: 'price has no unit_amount (tiered or metered?) — cannot be compared',
        })
        continue
      }

      rows.push({
        sku: item.sku,
        envVar,
        advertised: item.amountUsd,
        charged: chargedCents / 100,
        status: chargedCents === advertisedCents ? 'ok' : 'MISMATCH',
        detail:
          chargedCents === advertisedCents
            ? ''
            : `page says $${item.amountUsd}, Stripe charges $${(chargedCents / 100).toFixed(2)}`,
      })
    } catch (e) {
      rows.push({
        sku: item.sku, envVar, advertised: item.amountUsd, charged: null,
        status: 'PRICE MISSING',
        detail: `Stripe rejected ${priceId}: ${String((e as Error).message).slice(0, 80)}`,
      })
    }
  }

  const pad = (s: string, n: number) => s.padEnd(n)
  console.log(
    pad('SKU', 26) + pad('ADVERTISED', 12) + pad('STRIPE', 12) + 'STATUS'
  )
  for (const r of rows) {
    console.log(
      pad(r.sku, 26) +
        pad(`$${r.advertised.toFixed(2)}`, 12) +
        pad(r.charged == null ? '—' : `$${r.charged.toFixed(2)}`, 12) +
        r.status +
        (r.detail ? `  — ${r.detail}` : '')
    )
  }

  const broken = rows.filter((r) => r.status !== 'ok')
  console.log(`\n${rows.length - broken.length}/${rows.length} SKUs charge what they advertise.`)
  if (broken.length > 0) {
    console.log('\nStripe Prices are immutable: create a NEW Price at the correct amount and')
    console.log('repoint the env var. Editing the catalog alone changes the label, not the charge.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
