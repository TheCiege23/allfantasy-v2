"use client"

import Link from "next/link"
import { Share2, Gift, Trophy } from "lucide-react"

export interface ReferralCTACardProps {
  title?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  variant?: "default" | "rewards" | "leaderboard"
}

export function ReferralCTACard({
  title = "Share your referral link",
  description = "Earn rewards when friends sign up with your link.",
  ctaLabel = "Get your link",
  ctaHref = "/referrals",
  variant = "default",
}: ReferralCTACardProps) {
  const Icon = variant === "rewards" ? Gift : variant === "leaderboard" ? Trophy : Share2

  return (
    <div
      className="rounded-xl border p-4 transition hover:opacity-95"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </h3>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
            {description}
          </p>
          <Link
            href={ctaHref}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
