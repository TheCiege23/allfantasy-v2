"use client"

import { useLanguage } from "@/components/i18n/LanguageProviderClient"

export default function RecentAIActivity() {
  const { t } = useLanguage()
  const items = [t("dashboard.ai.1"), t("dashboard.ai.2"), t("dashboard.ai.3")]

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-sm font-semibold text-white">{t("dashboard.ai.title")}</h3>
      <ul className="mt-3 space-y-2 text-xs text-white/70">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
