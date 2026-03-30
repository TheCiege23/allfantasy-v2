'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEntitlement } from '@/hooks/useEntitlement'
import { LockedFeatureCard } from '@/components/subscription/LockedFeatureCard'

type BackendGateResult =
  | { kind: 'idle' }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string }

export function SubscriptionEntitlementHarnessClient() {
  const {
    entitlement,
    loading,
    featureAccess,
    hasAccess,
    upgradePath,
  } = useEntitlement('ai_chat')
  const [gateResult, setGateResult] = useState<BackendGateResult>({ kind: 'idle' })

  const bundleProAccess = hasAccess('trade_analyzer')
  const bundleCommissionerAccess = hasAccess('commissioner_automation')
  const bundleWarRoomAccess = hasAccess('draft_strategy_build')

  async function runBackendGateCheck() {
    setGateResult({ kind: 'idle' })
    try {
      const res = await fetch('/api/subscription/feature-gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ featureId: 'ai_chat' }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        message?: string
        error?: string
      }
      if (res.ok) {
        setGateResult({ kind: 'ok', text: data.message ?? 'Access granted.' })
      } else {
        setGateResult({
          kind: 'error',
          text: data.message ?? data.error ?? `Gate check failed (${res.status})`,
        })
      }
    } catch {
      setGateResult({ kind: 'error', text: 'Gate check failed (network error)' })
    }
  }

  return (
    <main className="min-h-screen bg-[#040915] p-4 text-white">
      <h1 className="text-xl font-semibold" data-testid="subscription-entitlement-harness-heading">
        Subscription Entitlement Harness
      </h1>
      <p className="mt-2 text-sm text-white/70">
        Validates locked flows, entitled flows, expired messaging, and bundle inheritance.
      </p>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Entitlement snapshot</p>
        {loading ? (
          <p className="mt-2 text-sm text-white/60" data-testid="entitlement-loading">
            Loading entitlement...
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p data-testid="entitlement-status">Status: {entitlement?.status ?? 'none'}</p>
            <p data-testid="entitlement-plans">Plans: {(entitlement?.plans ?? []).join(', ') || 'none'}</p>
            <p data-testid="entitlement-effective-plans">
              Effective plans: {(entitlement?.bundleInheritance?.effectivePlanIds ?? entitlement?.plans ?? []).join(', ') || 'none'}
            </p>
            <p data-testid="entitlement-message">{entitlement?.message ?? 'Upgrade to access this feature.'}</p>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Primary gated feature (AI Chat)</p>
        {!loading && !featureAccess ? (
          <LockedFeatureCard
            featureName="AI Chat"
            featureId="ai_chat"
            requiredPlan="AF Pro"
            upgradeHref={upgradePath}
            statusMessage={entitlement?.message}
            tokenCost={1}
            tokenHref="/tokens?ruleCode=ai_chimmy_chat_message"
            entitlementStatus={entitlement?.status ?? 'none'}
            className="mt-3"
          />
        ) : (
          <Link
            href="/app/home"
            className="mt-3 inline-flex rounded-lg bg-cyan-500/80 px-3 py-2 text-sm font-semibold text-[#041322]"
            data-testid="entitled-feature-link"
          >
            Open AI chat-enabled surface
          </Link>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Bundle inheritance checks</p>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
          <div data-testid="bundle-check-pro">Pro feature: {bundleProAccess ? 'granted' : 'locked'}</div>
          <div data-testid="bundle-check-commissioner">
            Commissioner feature: {bundleCommissionerAccess ? 'granted' : 'locked'}
          </div>
          <div data-testid="bundle-check-warroom">
            War Room feature: {bundleWarRoomAccess ? 'granted' : 'locked'}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-wide text-white/50">Backend feature gate API</p>
        <button
          type="button"
          onClick={runBackendGateCheck}
          className="mt-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          data-testid="backend-feature-gate-check-button"
        >
          Check backend gate
        </button>
        {gateResult.kind !== 'idle' ? (
          <p
            className={`mt-2 text-sm ${gateResult.kind === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`}
            data-testid="backend-feature-gate-result"
          >
            {gateResult.text}
          </p>
        ) : null}
      </section>
    </main>
  )
}
