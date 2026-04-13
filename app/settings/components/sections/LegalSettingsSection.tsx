"use client"

import Link from "next/link"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"
import type { SettingsProfile } from "./settings-types"

export function LegalSettingsSection({
  profile,
}: {
  profile: SettingsProfile
}) {
  const { t } = useLanguage()
  const legalState = profile?.settings?.legalAcceptanceState
  const yn = (v: boolean | undefined) => (v ? t("settings.legal.yes") : t("settings.legal.no"))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          {t("settings.legal.title")}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {t("settings.legal.subtitle")}
        </p>
      </div>
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t("settings.legal.acceptanceState")}</p>
        <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
          <li>
            {t("settings.legal.ageVerified")}: {yn(legalState?.ageVerified)}
          </li>
          <li>
            {t("settings.legal.disclaimerAccepted")}: {yn(legalState?.disclaimerAccepted)}
          </li>
          <li>
            {t("settings.legal.termsAccepted")}: {yn(legalState?.termsAccepted)}
          </li>
          <li>
            {t("settings.legal.acceptedAt")}:{" "}
            {legalState?.acceptedAt
              ? formatInTimezone(legalState.acceptedAt, profile?.timezone, undefined, profile?.preferredLanguage)
              : t("settings.legal.notRecorded")}
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/disclaimer" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          {t("settings.legal.linkDisclaimer")}
        </Link>
        <Link href="/terms" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          {t("settings.legal.linkTerms")}
        </Link>
        <Link href="/privacy" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          {t("settings.legal.linkPrivacy")}
        </Link>
        <Link href="/privacy" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          {t("settings.legal.linkCookies")}
        </Link>
        <Link href="/data-deletion" className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
          {t("settings.legal.linkDataDeletion")}
        </Link>
      </div>
    </div>
  )
}
