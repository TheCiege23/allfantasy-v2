"use client"

import { useEffect, useState } from "react"
import LeagueChatPanel from "@/components/chat/LeagueChatPanel"
import type { LeagueTabProps } from "@/components/app/tabs/types"

export default function LeagueChatTab({ leagueId }: LeagueTabProps) {
  const [isCommissioner, setIsCommissioner] = useState(false)

  useEffect(() => {
    let active = true
    async function loadCommissionerStatus() {
      if (!leagueId) return
      try {
        const res = await fetch(`/api/commissioner/leagues/${encodeURIComponent(leagueId)}/check`, {
          cache: "no-store",
        })
        const json = await res.json().catch(() => ({}))
        if (active) setIsCommissioner(Boolean(json?.isCommissioner))
      } catch {
        if (active) setIsCommissioner(false)
      }
    }
    void loadCommissionerStatus()
    return () => {
      active = false
    }
  }, [leagueId])

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <LeagueChatPanel
        leagueId={leagueId}
        leagueName={undefined}
        isCommissioner={isCommissioner}
        defaultOpen
        className="min-h-[480px]"
      />
      <aside className="hidden lg:block space-y-3 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <h3 className="font-semibold" style={{ color: "var(--text)" }}>Chat tips</h3>
        <ul className="space-y-1.5" style={{ color: "var(--muted2)" }}>
          <li>· Use <strong>@username</strong> to mention — they get a notification.</li>
          <li>· Commissioners can send <strong>@everyone</strong> broadcasts.</li>
          <li>· Pin important messages so they appear at the top.</li>
          <li>· Chat Stats Bot posts weekly Best/Worst Team and streaks.</li>
          <li>· The chat dock stays open when you switch league tabs.</li>
        </ul>
      </aside>
    </section>
  )
}
