"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Users, Loader2 } from "lucide-react"
import { groupLeaguesBySport } from "@/lib/dashboard"
import type { LeagueForGrouping } from "@/lib/dashboard"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

export function ActiveLeaguesSection() {
  const { t } = useLanguage()
  const [leagues, setLeagues] = useState<LeagueForGrouping[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/league/list")
      .then((r) => (r.status === 401 ? { leagues: [] } : r.json()))
      .then((data) => {
        setLeagues(data.leagues ?? [])
      })
      .catch(() => setLeagues([]))
      .finally(() => setLoading(false))
  }, [])

  const groups = groupLeaguesBySport(leagues)

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-cyan-400" />
            {t("dashboard.activeLeagues")}
          </div>
          <Link href="/leagues" className="text-xs text-white/50 hover:text-white/70">{t("dashboard.viewAll")}</Link>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      </section>
    )
  }

  if (leagues.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-cyan-400" />
            {t("dashboard.activeLeagues")}
          </div>
          <Link href="/leagues" className="text-xs text-white/50 hover:text-white/70">{t("dashboard.viewAll")}</Link>
        </div>
        <p className="text-sm text-white/40 py-4">{t("dashboard.activeLeagues.empty")}</p>
        <Link href="/app/home" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">{t("dashboard.action.openWebApp")} <ChevronRight className="h-3.5 w-3.5" /></Link>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-cyan-400" />
          {t("dashboard.activeLeagues")}
        </div>
        <Link href="/leagues" className="text-xs text-white/50 hover:text-white/70">{t("dashboard.viewAll")}</Link>
      </div>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.sport}>
            <h4 className="text-xs font-medium text-white/50 mb-2 flex items-center gap-1.5">
              <span>{group.emoji}</span>
              <span>{group.label}</span>
            </h4>
            <div className="space-y-2">
              {group.leagues.slice(0, 3).map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05] transition group"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{league.name || t("dashboard.unnamedLeague")}</div>
                    <div className="text-xs text-white/40">{league.leagueSize ?? "?"}-{t("dashboard.team")} · {league.isDynasty ? t("dashboard.dynasty") : t("dashboard.redraft")}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 shrink-0" />
                </Link>
              ))}
              {group.leagues.length > 3 && (
                <Link href="/leagues" className="block text-xs text-white/40 hover:text-white/60 py-1">+{group.leagues.length - 3} {t("dashboard.more")}</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
