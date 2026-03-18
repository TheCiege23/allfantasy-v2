'use client'

import { FileText } from 'lucide-react'

export interface ZombieWeeklyBoardProps {
  leagueId: string
  week: number
  headline?: string
  body?: string
  pinned?: boolean
}

export function ZombieWeeklyBoard({ week, headline, body, pinned }: ZombieWeeklyBoardProps) {
  const title = headline ?? `Week ${week} update`
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <FileText className="h-5 w-5 text-cyan-400" />
        Weekly Board
        {pinned && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">Pinned</span>
        )}
      </h2>
      <article className="rounded-xl border border-white/5 bg-black/20 p-4">
        <h3 className="font-medium text-white/90">{title}</h3>
        {body ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{body}</p>
        ) : (
          <p className="mt-2 text-sm text-white/50">Here’s how we look heading into Week {week}. Check back for the full update.</p>
        )}
      </article>
    </section>
  )
}
