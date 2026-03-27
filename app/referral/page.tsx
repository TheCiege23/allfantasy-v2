"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { ReferralDashboard } from "@/components/referral/ReferralDashboard"

export default function ReferralDashboardPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Loading...
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen mode-surface mode-readable">
        <div className="max-w-xl mx-auto px-4 py-12">
          <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
            Referral program
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Sign in to unlock your referral code, creator tiers, onboarding tracking, and reward claims.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/" className="mb-6 inline-block text-sm font-medium" style={{ color: "var(--muted)" }}>
          ← Home
        </Link>
        <ReferralDashboard />
      </div>
    </div>
  )
}
