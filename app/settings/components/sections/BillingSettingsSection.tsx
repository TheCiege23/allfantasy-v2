"use client"

import Link from "next/link"
import { useEntitlements } from "@/hooks/useEntitlements"

export function BillingSettingsSection() {
  const ents = useEntitlements()

  if (ents.loading) {
    return <div className="animate-pulse h-20 rounded-xl bg-white/[0.05]" data-testid="settings-billing-loading" />
  }

  const snap = ents.snapshot
  const hasAnySub = ents.hasAnyPaid
  const status = snap?.status ?? "none"

  return (
    <section className="space-y-4" data-testid="settings-billing-section">
      <h2 className="text-sm font-bold uppercase tracking-wider text-white/40">
        Subscription &amp; Billing
      </h2>

      <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-white/40">Current plan</p>
            {hasAnySub ? (
              <div className="flex flex-wrap items-center gap-2">
                {ents.hasAllAccess && (
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                    AF All-Access
                  </span>
                )}
                {!ents.hasAllAccess && ents.hasCommissioner && (
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-300">
                    AF Commissioner
                  </span>
                )}
                {!ents.hasAllAccess && ents.hasPro && (
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-300">
                    AF Pro
                  </span>
                )}
                {!ents.hasAllAccess && ents.hasWarRoom && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    AF War Room
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-white">AF Free</p>
            )}
          </div>

          <span
            className={[
              "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              status === "active"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : status === "grace"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : status === "past_due"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-white/[0.1] bg-white/[0.03] text-white/40",
            ].join(" ")}
          >
            {status === "none" ? "Free" : status.replace(/_/g, " ")}
          </span>
        </div>

        {snap?.currentPeriodEnd && (
          <p className="mt-2 text-xs text-white/40">
            {status === "active" ? "Renews" : "Access until"}{" "}
            {new Date(snap.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        {status === "past_due" && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
            Your last payment failed. Update your billing method to keep access.
          </div>
        )}

        {status === "grace" && snap?.gracePeriodEnd && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Access extended until {new Date(snap.gracePeriodEnd).toLocaleDateString()}. Renew to keep
            your subscription.
          </div>
        )}
      </div>

      {ents.error && (
        <p className="text-xs text-red-400" data-testid="settings-billing-error">
          {ents.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {hasAnySub ? (
          <a
            href="/api/subscription/billing-portal"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            data-testid="settings-billing-manage"
          >
            Manage billing
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M3.5 8h9M9 5l3.5 3L9 11" strokeLinecap="round" />
            </svg>
          </a>
        ) : null}
        <Link
          href="/pricing"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-bold text-[#030b14] transition hover:from-cyan-400 hover:to-sky-400"
          data-testid="settings-billing-pricing"
        >
          {hasAnySub ? "Change plan" : "View plans"}
        </Link>
      </div>
    </section>
  )
}
