"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { ReferralSection } from "@/components/settings/ReferralSection"
import { ReferralProgressWidget } from "@/components/referral/ReferralProgressWidget"
import { ReferralLeaderboard } from "@/components/referral/ReferralLeaderboard"
import { ReferralCTACard } from "@/components/referral/ReferralCTACard"

export default function ReferralDashboardPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--muted)" }}>
        Loading…
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
            Sign in to get your referral code, track progress, and earn rewards.
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="text-sm font-medium mb-6 inline-block" style={{ color: "var(--muted)" }}>
          ← Home
        </Link>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Referral program
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          Share your link. When friends sign up, you earn rewards and climb the leaderboard.
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ReferralSection />
            <ReferralLeaderboard />
          </div>
          <div className="space-y-6">
            <ReferralProgressWidget />
            <ReferralCTACard
              title="Invite friends to leagues"
              description="Create invite links for brackets and creator leagues."
              ctaLabel="Invite links"
              ctaHref="/referrals"
              variant="leaderboard"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
