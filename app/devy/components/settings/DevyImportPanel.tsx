'use client'

import Link from 'next/link'

export function DevyImportPanel({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-5 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <Link
        href={`/devy/${leagueId}/import`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-[13px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/25"
        data-testid="devy-open-import-wizard"
      >
        Open import wizard
      </Link>
      <section className="rounded-xl border border-white/[0.08] bg-[#0a1228] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-white/80">Connected sources</h3>
        <p className="mt-2 text-[12px] text-white/50">Past sources and re-import actions will list here after merge sessions.</p>
      </section>
    </div>
  )
}
