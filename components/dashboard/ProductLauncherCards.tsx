"use client"

import Link from "next/link"
import { Trophy, Gamepad2, BarChart3, ChevronRight } from "lucide-react"
import { getProductLauncherCards } from "@/lib/dashboard"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

const iconMap = {
  bracket: Trophy,
  webapp: Gamepad2,
  legacy: BarChart3,
} as const

type Props = {
  poolCount?: number
  entryCount?: number
}

const cardStyles = {
  bracket: "rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 hover:bg-cyan-500/10 transition text-cyan-200",
  webapp: "rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 hover:bg-purple-500/10 transition text-purple-200",
  legacy: "rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 hover:bg-emerald-500/10 transition text-emerald-200",
} as const

export default function ProductLauncherCards({ poolCount = 0, entryCount = 0 }: Props) {
  const { t } = useLanguage()
  const cards = getProductLauncherCards({ poolCount, entryCount })

  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="Product launchers">
      {cards.map((card) => {
        const Icon = iconMap[card.product]
        const title = card.product === "bracket"
          ? t("dashboard.card.bracket")
          : card.product === "webapp"
            ? t("dashboard.card.webapp")
            : t("dashboard.card.legacy")
        const desc = card.product === "bracket"
          ? `${entryCount} ${t("dashboard.entries")} ${t("dashboard.across")} ${poolCount} ${t("dashboard.pools")}.`
          : card.product === "webapp"
            ? t("dashboard.card.webapp.desc")
            : t("dashboard.card.legacy.desc")
        const highlight = card.product === "bracket"
          ? t("dashboard.card.bracket.highlight")
          : card.product === "webapp"
            ? t("dashboard.card.webapp.highlight")
            : t("dashboard.card.legacy.highlight")
        return (
          <Link
            key={card.id}
            href={card.href}
            className={cardStyles[card.product]}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {title}
              </h2>
              <Icon className="h-4 w-4 opacity-80" />
            </div>
            <p className="mt-2 text-xs opacity-90">{desc}</p>
            {card.highlight && <p className="mt-2 text-xs opacity-70">{highlight}</p>}
            <div className="mt-4 inline-flex items-center gap-1 text-xs">
              {t("dashboard.open")} {title} <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )
      })}
    </section>
  )
}
