"use client"

import { useOptionalLanguage } from "@/components/i18n/LanguageProviderClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const BENEFIT_SECTIONS = [
  { titleKey: "signup.benefits.fantasyApp.title", descKey: "signup.benefits.fantasyApp.desc", icon: "🏈" },
  { titleKey: "signup.benefits.leagueOS.title", descKey: "signup.benefits.leagueOS.desc", icon: "📊" },
  { titleKey: "signup.benefits.partnerPortal.title", descKey: "signup.benefits.partnerPortal.desc", icon: "🤝" },
  { titleKey: "signup.benefits.secure.title", descKey: "signup.benefits.secure.desc", icon: "🔒" },
] as const

/** Index after which the "requires approval" note renders — right after Partner Portal, covering it + League OS above it. */
const APPROVAL_NOTE_AFTER_INDEX = 2

export default function AccountBenefitsCard() {
  const { t } = useOptionalLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signup.benefits.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {BENEFIT_SECTIONS.map((section, index) => (
          <div key={section.titleKey}>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none" aria-hidden>
                {section.icon}
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {t(section.titleKey)}
                </div>
                <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--muted2)" }}>
                  {t(section.descKey)}
                </p>
              </div>
            </div>
            {index === APPROVAL_NOTE_AFTER_INDEX && (
              <p className="mt-2 pl-8 text-[11px] italic" style={{ color: "var(--muted2)" }}>
                {t("signup.benefits.approvalNote")}
              </p>
            )}
          </div>
        ))}
        <div
          className="rounded-xl border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
        >
          <a
            href="mailto:support@allfantasy.ai?subject=AllFantasy%20Demo%20Request"
            className="underline"
            style={{ color: "var(--accent-cyan)" }}
          >
            {t("signup.benefits.demoRequest")}
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
