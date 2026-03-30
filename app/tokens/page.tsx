'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Coins, Loader2 } from 'lucide-react'
import { usePostPurchaseSync } from '@/hooks/usePostPurchaseSync'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { confirmTokenSpend } from '@/lib/tokens/client-confirm'
import { resolveCheckoutUrl } from '@/lib/monetization/checkout-client'
import { MonetizationComplianceNotice } from '@/components/monetization/MonetizationComplianceNotice'
import {
  trackInsufficientTokenFlowViewed,
  trackMonetizationPageVisited,
  trackTokenPurchaseClicked,
} from '@/lib/monetization-analytics'

type TokenPack = {
  sku: string
  title: string
  description: string
  amountUsd: number
  tokenAmount: number
  stripePriceConfigured: boolean
}

type SpendRule = {
  code: string
  category: string
  featureLabel: string
  description: string
  tokenCost: number
  baseTokenCost: number
  pricingTier: 'low' | 'mid' | 'high'
  requiredPlan: string | null
  discountPct: number
  chargeMode: 'tokens_only' | 'subscriber_discounted_tokens'
  subscriptionEligible: boolean
  policyMessage: string
  monthlyIncludedPremiumCredits: number | null
  supportsUnlimitedLowTierInFuture: boolean
}

type LedgerEntry = {
  id: string
  entryType: string
  tokenDelta: number
  balanceAfter: number
  spendFeatureLabel: string | null
  description: string | null
  createdAt: string
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}`
}

function formatPlanLabel(plan: string | null): string {
  if (!plan) return 'Any plan'
  if (plan === 'all_access') return 'AF All-Access'
  if (plan === 'war_room') return 'AF War Room'
  if (plan === 'commissioner') return 'AF Commissioner'
  if (plan === 'pro') return 'AF Pro'
  return plan
}

function tierTitle(tier: 'low' | 'mid' | 'high'): string {
  if (tier === 'low') return 'Low-cost'
  if (tier === 'mid') return 'Mid-cost'
  return 'High-cost'
}

export default function TokensPage() {
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useTokenBalance()
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([])
  const [rules, setRules] = useState<SpendRule[]>([])
  const [history, setHistory] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingSku, setPendingSku] = useState<string | null>(null)
  const [pendingSpend, setPendingSpend] = useState(false)
  const [selectedRuleCode, setSelectedRuleCode] = useState<string>('')
  const [historyOpen, setHistoryOpen] = useState(true)
  const [spendMessage, setSpendMessage] = useState<string | null>(null)
  const [pricingSearch, setPricingSearch] = useState('')
  const [pricingCategory, setPricingCategory] = useState('all')
  const [discountOnly, setDiscountOnly] = useState(false)
  const trackedPageVisit = useRef(false)

  useEffect(() => {
    if (trackedPageVisit.current) return
    trackedPageVisit.current = true
    trackMonetizationPageVisited({
      pagePath: '/tokens',
      surface: 'tokens_page',
      focusPlanTier: 'tokens',
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [catalogRes, rulesRes, historyRes] = await Promise.all([
        fetch('/api/monetization/catalog', { cache: 'no-store' }),
        fetch('/api/tokens/spend-rules', { cache: 'no-store' }),
        fetch('/api/tokens/history?limit=30', { cache: 'no-store' }),
      ])

      const [catalogJson, rulesJson, historyJson] = await Promise.all([
        catalogRes.json().catch(() => ({})),
        rulesRes.json().catch(() => ({})),
        historyRes.json().catch(() => ({})),
      ])

      if (!catalogRes.ok) throw new Error(catalogJson.error || 'Failed to load token packs')
      if (!rulesRes.ok) throw new Error(rulesJson.error || 'Failed to load spend rules')
      if (!historyRes.ok) throw new Error(historyJson.error || 'Failed to load token history')

      const packs = Array.isArray(catalogJson?.catalog?.tokenPacks) ? catalogJson.catalog.tokenPacks : []
      const nextRules = Array.isArray(rulesJson?.rules) ? rulesJson.rules : []
      const nextHistory = Array.isArray(historyJson?.entries) ? historyJson.entries : []

      setTokenPacks(
        packs.map((pack: any) => ({
          sku: String(pack.sku),
          title: String(pack.title),
          description: String(pack.description ?? ''),
          amountUsd: Number(pack.amountUsd ?? 0),
          tokenAmount: Number(pack.tokenAmount ?? 0),
          stripePriceConfigured: Boolean(pack.stripePriceConfigured),
        }))
      )
      setRules(
        nextRules.map((rule: any) => ({
          code: String(rule.code),
          category: String(rule.category),
          featureLabel: String(rule.featureLabel),
          description: String(rule.description ?? ''),
          tokenCost: Number(rule.tokenCost ?? 0),
          baseTokenCost: Number(rule.baseTokenCost ?? rule.tokenCost ?? 0),
          pricingTier:
            rule.pricingTier === 'low' || rule.pricingTier === 'mid' || rule.pricingTier === 'high'
              ? rule.pricingTier
              : 'mid',
          requiredPlan: rule.requiredPlan ? String(rule.requiredPlan) : null,
          discountPct: Number(rule.discountPct ?? 0),
          chargeMode:
            rule.chargeMode === 'subscriber_discounted_tokens'
              ? 'subscriber_discounted_tokens'
              : 'tokens_only',
          subscriptionEligible: Boolean(rule.subscriptionEligible),
          policyMessage: String(rule.policyMessage ?? ''),
          monthlyIncludedPremiumCredits:
            typeof rule.monthlyIncludedPremiumCredits === 'number'
              ? Number(rule.monthlyIncludedPremiumCredits)
              : null,
          supportsUnlimitedLowTierInFuture: Boolean(rule.supportsUnlimitedLowTierInFuture),
        }))
      )
      setHistory(
        nextHistory.map((entry: any) => ({
          id: String(entry.id),
          entryType: String(entry.entryType),
          tokenDelta: Number(entry.tokenDelta ?? 0),
          balanceAfter: Number(entry.balanceAfter ?? 0),
          spendFeatureLabel: entry.spendFeatureLabel ? String(entry.spendFeatureLabel) : null,
          description: entry.description ? String(entry.description) : null,
          createdAt: String(entry.createdAt),
        }))
      )
      if (nextRules[0]?.code) {
        setSelectedRuleCode((prev) => prev || String(nextRules[0].code))
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load token center')
    } finally {
      setLoading(false)
    }
  }, [])

  const postPurchaseSync = usePostPurchaseSync({
    successMessage: 'Token purchase complete. Your balance and history are refreshed.',
    tokenSuccessMessage: 'Tokens added. Your balance and history are refreshed.',
    onSuccess: () => {
      void load()
    },
  })

  useEffect(() => {
    void load()
  }, [load])

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.code === selectedRuleCode) ?? null,
    [rules, selectedRuleCode]
  )
  const matrixCategories = useMemo(() => {
    const values = Array.from(new Set(rules.map((rule) => rule.category).filter(Boolean)))
    values.sort((a, b) => a.localeCompare(b))
    return values
  }, [rules])
  const filteredRules = useMemo(() => {
    const query = pricingSearch.trim().toLowerCase()
    return rules.filter((rule) => {
      if (pricingCategory !== 'all' && rule.category !== pricingCategory) return false
      if (discountOnly && !(rule.discountPct > 0 && rule.tokenCost < rule.baseTokenCost)) return false
      if (!query) return true
      return (
        rule.featureLabel.toLowerCase().includes(query) ||
        rule.description.toLowerCase().includes(query) ||
        rule.code.toLowerCase().includes(query)
      )
    })
  }, [rules, pricingSearch, pricingCategory, discountOnly])
  const pricingByTier = useMemo(() => {
    const bucket: Record<'low' | 'mid' | 'high', SpendRule[]> = { low: [], mid: [], high: [] }
    for (const rule of filteredRules) {
      bucket[rule.pricingTier].push(rule)
    }
    for (const tier of ['low', 'mid', 'high'] as const) {
      bucket[tier].sort((a, b) => {
        if (a.tokenCost !== b.tokenCost) return a.tokenCost - b.tokenCost
        return a.featureLabel.localeCompare(b.featureLabel)
      })
    }
    return bucket
  }, [filteredRules])
  const hasSubscriberDiscounts = useMemo(
    () => rules.some((rule) => rule.discountPct > 0 && rule.tokenCost < rule.baseTokenCost),
    [rules]
  )

  async function startCheckout(sku: string) {
    setPendingSku(sku)
    setSpendMessage(null)
    trackTokenPurchaseClicked({
      sku,
      surface: 'tokens_page_pack_card',
      pagePath: '/tokens',
    })
    const result = await resolveCheckoutUrl({ sku, productType: 'token_pack', returnPath: '/tokens' })
    if (!result.ok) {
      setError(result.error)
      setPendingSku(null)
      return
    }
    window.location.assign(result.url)
  }

  async function runSpendSimulator() {
    if (!selectedRule) return
    setPendingSpend(true)
    setSpendMessage(null)
    try {
      const { confirmed, preview } = await confirmTokenSpend(selectedRule.code)
      if (!preview.canSpend) {
        trackInsufficientTokenFlowViewed({
          surface: 'tokens_page_simulator',
          ruleCode: selectedRule.code,
          tokenCost: preview.tokenCost,
          currentBalance: preview.currentBalance,
        })
        setSpendMessage(
          `Insufficient balance: need ${preview.tokenCost} token${preview.tokenCost === 1 ? '' : 's'}, current balance is ${preview.currentBalance}.`
        )
        return
      }
      if (!confirmed) {
        setSpendMessage('Spend cancelled.')
        return
      }

      const res = await fetch('/api/tokens/spend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ruleCode: selectedRule.code,
          confirmed: true,
          sourceType: 'tokens_page_simulator',
          sourceId: `simulator:${Date.now()}`,
          description: `Token simulator spend for ${selectedRule.featureLabel}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Spend failed')
      }

      setSpendMessage(
        `Spent ${selectedRule.tokenCost} token${selectedRule.tokenCost === 1 ? '' : 's'} on ${selectedRule.featureLabel}.`
      )
      await Promise.all([refetchBalance(), load()])
    } catch (e: any) {
      setSpendMessage(e?.message || 'Unable to spend tokens')
    } finally {
      setPendingSpend(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-white/10 bg-[#0a1228] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-300/80">AllFantasy token center</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">AI Tokens</h1>
            <p className="mt-2 text-sm text-white/65">
              Buy token packs, preview feature costs, and review every token movement in your ledger.
            </p>
          </div>
          <Link
            href="/pricing"
            className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs text-white/80 hover:bg-white/[0.08]"
          >
            Back to pricing
          </Link>
        </div>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2"
          data-testid="tokens-balance-display"
        >
          <Coins className="h-4 w-4 text-amber-300" />
          {balanceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
          ) : (
            <span className="text-sm font-semibold text-amber-100 tabular-nums">{balance}</span>
          )}
          <span className="text-xs text-amber-100/80">tokens available</span>
        </div>
      </header>

      {postPurchaseSync.state.phase !== 'idle' ? (
        <section
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            postPurchaseSync.state.phase === 'success'
              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
              : postPurchaseSync.state.phase === 'cancelled'
                ? 'border-amber-300/35 bg-amber-500/10 text-amber-100'
                : postPurchaseSync.state.phase === 'failed'
                  ? 'border-red-400/35 bg-red-500/10 text-red-100'
                  : 'border-cyan-300/35 bg-cyan-500/10 text-cyan-100'
          }`}
          data-testid="post-purchase-sync-banner"
        >
          <p data-testid="post-purchase-sync-status">{postPurchaseSync.state.message}</p>
          {(postPurchaseSync.state.phase === 'pending' ||
            postPurchaseSync.state.phase === 'failed') ? (
            <button
              type="button"
              onClick={() => void postPurchaseSync.retrySync()}
              disabled={postPurchaseSync.isSyncing}
              className="mt-2 rounded-lg border border-white/25 bg-black/25 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="post-purchase-sync-retry"
            >
              {postPurchaseSync.isSyncing ? 'Refreshing...' : 'Refresh token state'}
            </button>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
          Loading token center...
        </div>
      ) : (
        <>
          <section className="mt-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Buy token packs</h2>
            <p className="mt-1 text-xs text-white/60">
              Tokens are pay-per-use access credits. Different AI actions cost different token amounts.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {tokenPacks.map((pack) => (
                <article key={pack.sku} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-sm font-semibold text-white">{pack.title}</h3>
                  <p className="mt-1 text-xs text-white/60">{pack.description}</p>
                  <div className="mt-2 text-lg font-bold text-cyan-300">{formatUsd(pack.amountUsd)}</div>
                  <button
                    type="button"
                    onClick={() => void startCheckout(pack.sku)}
                    disabled={pendingSku != null || !pack.stripePriceConfigured}
                    className="mt-3 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid={`tokens-buy-cta-${pack.sku}`}
                  >
                    {pendingSku === pack.sku ? 'Starting checkout...' : 'Buy token pack'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <MonetizationComplianceNotice />
          </section>

          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="tokens-pricing-matrix">
            <h2 className="text-sm font-semibold text-white">Token pricing matrix</h2>
            <p className="mt-1 text-xs text-white/60">
              Heavier and league-wide actions cost more tokens than quick one-off explanations.
            </p>
            {hasSubscriberDiscounts ? (
              <p className="mt-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100">
                Subscriber-effective pricing is active for eligible features.
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={pricingSearch}
                onChange={(event) => setPricingSearch(event.target.value)}
                placeholder="Search features"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/45"
                data-testid="tokens-pricing-search-input"
              />
              <select
                value={pricingCategory}
                onChange={(event) => setPricingCategory(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-white"
                data-testid="tokens-pricing-category-select"
              >
                <option value="all">All categories</option>
                {matrixCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setDiscountOnly((prev) => !prev)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  discountOnly
                    ? 'border-emerald-300/35 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/20 bg-black/25 text-white/75 hover:bg-black/35'
                }`}
                data-testid="tokens-pricing-discount-toggle"
              >
                {discountOnly ? 'Discounted only: on' : 'Discounted only'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingSearch('')
                  setPricingCategory('all')
                  setDiscountOnly(false)
                }}
                className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-xs text-white/80 hover:bg-black/35"
                data-testid="tokens-pricing-clear-filters"
              >
                Clear
              </button>
            </div>
            <p className="mt-2 text-[11px] text-white/55" data-testid="tokens-pricing-results-count">
              Showing {filteredRules.length} of {rules.length} features
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {(['low', 'mid', 'high'] as const).map((tier) => (
                <article
                  key={tier}
                  className="rounded-lg border border-white/10 bg-black/25 p-3"
                  data-testid={`tokens-pricing-tier-${tier}`}
                >
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
                    {tierTitle(tier)}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {pricingByTier[tier].length > 0 ? (
                      pricingByTier[tier].map((rule) => (
                        <div key={rule.code} className="rounded-md border border-white/10 bg-black/30 px-2 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-white/90">{rule.featureLabel}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                rule.discountPct > 0 && rule.tokenCost < rule.baseTokenCost
                                  ? 'border border-emerald-300/40 bg-emerald-500/15 text-emerald-100'
                                  : 'border border-cyan-300/35 bg-cyan-500/15 text-cyan-100'
                              }`}
                              data-testid={`tokens-pricing-effective-badge-${rule.code}`}
                            >
                              {rule.tokenCost} token{rule.tokenCost === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-white/60">{formatPlanLabel(rule.requiredPlan)}</p>
                          {rule.discountPct > 0 && rule.tokenCost < rule.baseTokenCost ? (
                            <p className="mt-1 text-[10px] text-emerald-200/90">
                              Subscriber price (was {rule.baseTokenCost}, {rule.discountPct}% off)
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-white/50">No rules in this tier.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-white">Feature cost preview</h2>
            <p className="mt-1 text-xs text-white/60">
              Token costs vary by compute intensity and user value. Every spend requires explicit confirmation.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedRuleCode}
                onChange={(event) => setSelectedRuleCode(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-white"
                data-testid="tokens-spend-rule-select"
              >
                {rules.map((rule) => (
                  <option key={rule.code} value={rule.code}>
                    {rule.featureLabel} ({rule.tokenCost} token{rule.tokenCost === 1 ? '' : 's'}
                    {rule.discountPct > 0 && rule.tokenCost < rule.baseTokenCost
                      ? `, was ${rule.baseTokenCost}`
                      : ''})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void runSpendSimulator()}
                disabled={!selectedRule || pendingSpend}
                className="rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                data-testid="tokens-spend-confirm"
              >
                {pendingSpend ? 'Processing...' : 'Confirm spend'}
              </button>
            </div>
            {selectedRule ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-white/65">{selectedRule.description}</p>
                <p className="text-[11px] text-white/55">
                  Tier: {tierTitle(selectedRule.pricingTier)} • Plan: {formatPlanLabel(selectedRule.requiredPlan)}
                </p>
                {selectedRule.policyMessage ? (
                  <p className="text-[11px] text-white/60">{selectedRule.policyMessage}</p>
                ) : null}
              </div>
            ) : null}
            {spendMessage ? (
              <p
                className="mt-3 rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100"
                data-testid="tokens-insufficient-state"
              >
                {spendMessage}
              </p>
            ) : null}
          </section>

          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Usage history</h2>
              <button
                type="button"
                onClick={() => setHistoryOpen((prev) => !prev)}
                className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-white/80 hover:bg-black/30"
                data-testid="tokens-usage-history-toggle"
              >
                {historyOpen ? 'Hide history' : 'Open history'}
              </button>
            </div>
            {historyOpen ? (
              <div className="mt-3 space-y-2" data-testid="tokens-usage-history-panel">
                {history.length > 0 ? (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2"
                    >
                      <div className="min-w-[220px] flex-1">
                        <p className="text-xs text-white/90">
                          {entry.spendFeatureLabel || entry.description || entry.entryType}
                        </p>
                        <p className="text-[11px] text-white/55">
                          {new Date(entry.createdAt).toLocaleString()} • {entry.entryType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            entry.tokenDelta < 0 ? 'text-red-200' : 'text-emerald-200'
                          }`}
                        >
                          {formatDelta(entry.tokenDelta)}
                        </p>
                        <p className="text-[11px] text-white/55">Balance: {entry.balanceAfter}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/55">No token activity yet.</p>
                )}
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  )
}
