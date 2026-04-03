"use client"

import Link from "next/link"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"
import type { SettingsProfile } from "./settings-types"

export function LegalSettingsSection({
  profile,
}: {
  profile: SettingsProfile
}) {
  const legalState = profile?.settings?.legalAcceptanceState

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Legal & Agreements</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Terms and privacy policy.
        </p>
      </div>
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Acceptance state</p>
        <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
          <li>Age verified: {legalState?.ageVerified ? "Yes" : "No"}</li>
          <li>Disclaimer accepted: {legalState?.disclaimerAccepted ? "Yes" : "No"}</li>
          <li>Terms accepted: {legalState?.termsAccepted ? "Yes" : "No"}</li>
          <li>
            Accepted at:{" "}
            {legalState?.acceptedAt
              ? formatInTimezone(legalState.acceptedAt, profile?.timezone, undefined, profile?.preferredLanguage)
              : "Not recorded"}
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/disclaimer" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Disclaimer
        </Link>
        <Link href="/terms" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Terms of Service
        </Link>
        <Link href="/privacy" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Privacy Policy
        </Link>
        <Link href="/privacy" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Cookies and tracking
        </Link>
        <Link href="/data-deletion" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          Data Deletion
        </Link>
      </div>
    </div>
  )
}
