'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface RankSummary {
  aiReportGrade: string
  aiScore: number
  careerTierName: string
  careerTier: number
}

type RankingsCardProps = {
  /** Opens Chimmy with rankings context (dashboard wiring). */
  onAskChimmy?: () => void
}

export function RankingsCard({ onAskChimmy }: RankingsCardProps) {
  const [rank, setRank] = useState<RankSummary | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)

  useEffect(() => {
    fetch('/api/user/rank', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.rank) setRank(data.rank)
      })
      .catch(() => null)
  }, [])

  return (
    <section className="space-y-3" data-testid="dashboard-rankings-card">
      <div className="rounded-[28px] border border-white/10 bg-[#0b1120] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-white/40">Rankings</p>
          {onAskChimmy ? (
            <button
              type="button"
              onClick={onAskChimmy}
              className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Ask Chimmy →
            </button>
          ) : (
            <Link
              href="/dashboard/rankings"
              className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Ask Chimmy →
            </Link>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Player Rankings</h2>
            <p className="mt-1 text-sm text-white/55">Personalized to your leagues&apos; scoring formats</p>
            <ul className="mt-3 space-y-1 text-xs text-white/55">
              <li>✓ PPR / Half-PPR / Standard rankings</li>
              <li>✓ Dynasty &amp; Redraft values</li>
              <li>✓ Waiver wire priority list</li>
              <li>✓ Updated based on your league history</li>
            </ul>
          </div>

          {rank ? (
            <div className="flex shrink-0 flex-col items-center gap-1">
              <div
                className="min-w-[64px] rounded-2xl border px-4 py-3 text-center"
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  borderColor: 'rgba(124,58,237,0.4)',
                }}
              >
                <div className="text-2xl font-black text-violet-300">{rank.aiReportGrade}</div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/40">AI Grade</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">{rank.aiScore}</div>
                <div className="text-[10px] text-white/30">/ 100</div>
              </div>
              <div className="text-[10px] font-semibold text-white/50">{rank.careerTierName}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/rankings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            View Rankings →
          </Link>
          <button
            type="button"
            onClick={() => setFaqOpen((o) => !o)}
            className="text-sm text-white/35 transition-colors hover:text-white/60"
          >
            How does it work?
          </button>
        </div>
        {faqOpen ? (
          <div className="mt-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/50">
            AllFantasy&apos;s rankings system uses your league history to calibrate player values. It takes into account
            your scoring format (PPR, half-PPR, standard), league size, and your draft history to show you the most
            relevant rankings for your leagues. Rankings update daily and are powered by Chimmy, your AI fantasy
            assistant.
          </div>
        ) : null}
      </div>
    </section>
  )
}
