"use client"

import { useState } from "react"
import Link from "next/link"
import type { LeagueTabProps } from "@/components/app/tabs/types"
import { Building2, RefreshCw, ExternalLink } from "lucide-react"

export default function GMEconomyPanel({ leagueId }: LeagueTabProps) {
  const [runLoading, setRunLoading] = useState(false)

  const runEngine = () => {
    setRunLoading(true)
    fetch("/api/gm-economy/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(() => {})
      .finally(() => setRunLoading(false))
  }

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Building2 className="h-4 w-4 text-cyan-400" />
        GM Career & Franchise Value
      </h3>
      <p className="mt-2 text-xs text-white/65">
        Cross-league career progression: franchise value, GM prestige, championships, win rate.
        Data is aggregated from rosters and season results. View the leaderboard and run the engine
        from the <strong>Career</strong> tab.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/app/league/${encodeURIComponent(leagueId)}?tab=Career`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open Career tab
        </Link>
        <button
          type="button"
          onClick={runEngine}
          disabled={runLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${runLoading ? "animate-spin" : ""}`} />
          {runLoading ? "Running…" : "Run GM economy"}
        </button>
      </div>
    </section>
  )
}
