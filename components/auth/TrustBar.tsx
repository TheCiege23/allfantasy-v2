"use client"

import { useOptionalLanguage } from "@/components/i18n/LanguageProviderClient"

const TRUST_ITEMS = [
  { titleKey: "signup.trust.fantasyOnly.title", descKey: "signup.trust.fantasyOnly.desc" },
  { titleKey: "signup.trust.commissioners.title", descKey: "signup.trust.commissioners.desc" },
  { titleKey: "signup.trust.dataResults.title", descKey: "signup.trust.dataResults.desc" },
  { titleKey: "signup.trust.free.title", descKey: "signup.trust.free.desc" },
] as const

export default function TrustBar() {
  const { t } = useOptionalLanguage()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.titleKey}
          className="rounded-xl border p-4 text-center sm:text-left"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t(item.titleKey)}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--muted2)" }}>
            {t(item.descKey)}
          </div>
        </div>
      ))}
    </div>
  )
}
