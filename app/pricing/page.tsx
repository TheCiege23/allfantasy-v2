"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePostPurchaseSync } from "@/hooks/usePostPurchaseSync"

type PlanFamily = "af_pro" | "af_commissioner" | "af_war_room" | "af_all_access"

type CatalogItem = {
  sku: string
  type: "subscription" | "token_pack"
  title: string
  description: string
  amountUsd: number
  currency: "usd"
  interval: "month" | "year" | null
  tokenAmount: number | null
  planFamily: PlanFamily | null
  stripePriceId: string | null
  stripePriceConfigured: boolean
}

type CatalogPayload = {
  catalog: {
    subscriptions: CatalogItem[]
    tokenPacks: CatalogItem[]
    all: CatalogItem[]
  }
  fancredBoundary: {
    version: string
    short: string
    long: string
    checklist: readonly string[]
  }
}

const PLAN_FAMILY_ORDER: PlanFamily[] = ["af_pro", "af_commissioner", "af_war_room", "af_all_access"]

const PLAN_FAMILY_LABELS: Record<PlanFamily, string> = {
  af_pro: "AF Pro",
  af_commissioner: "AF Commissioner",
  af_war_room: "AF War Room",
  af_all_access: "AF All-Access Bundle",
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export default function PricingPage() {
  const [payload, setPayload] = useState<CatalogPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingSku, setPendingSku] = useState<string | null>(null)

  usePostPurchaseSync({
    successMessage: "Purchase complete. We refreshed your access and token balance.",
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch("/api/monetization/catalog")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load catalog (${response.status})`)
        }
        return (await response.json()) as CatalogPayload
      })
      .then((json) => {
        if (cancelled) return
        setPayload(json)
        setLoadError(null)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError("Pricing is temporarily unavailable. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const plansByFamily = useMemo(() => {
    const map = new Map<PlanFamily, { monthly: CatalogItem | null; yearly: CatalogItem | null }>()
    for (const family of PLAN_FAMILY_ORDER) {
      map.set(family, { monthly: null, yearly: null })
    }
    for (const item of payload?.catalog.subscriptions ?? []) {
      if (!item.planFamily || !map.has(item.planFamily)) continue
      const bucket = map.get(item.planFamily)
      if (!bucket) continue
      if (item.interval === "month") bucket.monthly = item
      if (item.interval === "year") bucket.yearly = item
    }
    return map
  }, [payload])

  async function startCheckout(
    endpoint: "/api/monetization/checkout/subscription" | "/api/monetization/checkout/tokens",
    sku: string
  ) {
    setCheckoutError(null)
    setPendingSku(sku)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku, returnPath: "/pricing" }),
      })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        setCheckoutError(data.error ?? "Unable to start checkout. Please try again.")
        return
      }
      window.location.assign(data.url)
    } catch {
      setCheckoutError("Unable to start checkout. Please try again.")
    } finally {
      setPendingSku(null)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[160px]" />
        <div className="absolute top-52 -left-56 h-[520px] w-[520px] rounded-full bg-fuchsia-500/7 blur-[180px]" />
        <div className="absolute -bottom-64 right-0 h-[560px] w-[560px] rounded-full bg-indigo-500/9 blur-[190px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-white/50 transition hover:text-white/80 sm:mb-8"
        >
          <span aria-hidden>&larr;</span> Back to Home
        </Link>

        <div className="mb-6 text-center sm:mb-10">
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mt-2 text-sm text-white/50 sm:mt-3 sm:text-base">
            Subscriptions and tokens are powered by Stripe. League dues and payouts remain external via FanCred.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">AF Free</div>
          <div className="mt-2 text-2xl font-black">$0 <span className="text-sm font-medium text-white/60">/forever</span></div>
          <p className="mt-2 text-sm text-white/65">League creation and league operations are free.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
            Loading pricing catalog...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {loadError}
          </div>
        ) : (
          <>
            {checkoutError ? (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {checkoutError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {PLAN_FAMILY_ORDER.map((family) => {
                const plan = plansByFamily.get(family)
                if (!plan) return null
                const monthly = plan.monthly
                const yearly = plan.yearly
                if (!monthly && !yearly) return null
                const primary = monthly ?? yearly
                if (!primary) return null
                return (
                  <article
                    key={family}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0f1d] via-[#0b1326] to-[#080d19] p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">{PLAN_FAMILY_LABELS[family]}</div>
                    <h2 className="mt-2 text-lg font-semibold text-white">{primary.title.replace(" Monthly", "").replace(" Yearly", "")}</h2>
                    <p className="mt-1 text-sm text-white/60">{primary.description}</p>
                    <div className="mt-3 space-y-1 text-sm">
                      {monthly ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between text-white/85">
                            <span>Monthly</span>
                            <span className="font-semibold">{formatUsd(monthly.amountUsd)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startCheckout("/api/monetization/checkout/subscription", monthly.sku)}
                            disabled={pendingSku != null || !monthly.stripePriceConfigured}
                            className="mt-2 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            data-testid={`pricing-subscription-cta-${monthly.sku}`}
                          >
                            {pendingSku === monthly.sku ? "Starting checkout..." : "Checkout monthly"}
                          </button>
                        </div>
                      ) : null}
                      {yearly ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between text-white/85">
                            <span>Yearly</span>
                            <span className="font-semibold">{formatUsd(yearly.amountUsd)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startCheckout("/api/monetization/checkout/subscription", yearly.sku)}
                            disabled={pendingSku != null || !yearly.stripePriceConfigured}
                            className="mt-2 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            data-testid={`pricing-subscription-cta-${yearly.sku}`}
                          >
                            {pendingSku === yearly.sku ? "Starting checkout..." : "Checkout yearly"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[11px] text-white/50">
                      Stripe setup: {primary.stripePriceConfigured ? "configured" : "pending"}
                    </p>
                  </article>
                )
              })}
            </div>

            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">AI Token Packs</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(payload?.catalog.tokenPacks ?? []).map((pack) => (
                  <article key={pack.sku} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="text-sm font-semibold text-white">{pack.title}</h3>
                    <p className="mt-1 text-xs text-white/60">{pack.description}</p>
                    <div className="mt-2 text-lg font-bold text-cyan-300">{formatUsd(pack.amountUsd)}</div>
                    <button
                      type="button"
                      onClick={() => startCheckout("/api/monetization/checkout/tokens", pack.sku)}
                      disabled={pendingSku != null || !pack.stripePriceConfigured}
                      className="mt-3 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid={`pricing-token-cta-${pack.sku}`}
                    >
                      {pendingSku === pack.sku ? "Starting checkout..." : "Buy token pack"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-100">{payload?.fancredBoundary.short}</p>
              <p className="mt-2 text-xs text-amber-200/80">{payload?.fancredBoundary.long}</p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
