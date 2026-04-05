'use client'

import { X } from 'lucide-react'
import type { WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import { ProLeagueLink } from '@/components/dashboard/ProLeagueLink'

type Props = {
  isOpen: boolean
  onClose: () => void
  data: WaiverDashboardResponse | null
  loading: boolean
  hasProAccess: boolean
}

export function WaiverRecommendationsModal({ isOpen, onClose, data, loading, hasProAccess }: Props) {
  if (!isOpen) return null

  const recs = data?.recommendations ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="relative max-h-[80vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0f1521] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waiver-rec-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/[0.06] px-5 pb-4 pt-5 pr-12">
          <h2 id="waiver-rec-title" className="text-[17px] font-bold text-white">
            📋 Waiver recommendations
          </h2>
          <p className="mt-1 text-[12px] text-white/50">
            {loading ? 'Loading your leagues…' : `${recs.length} connected league${recs.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.05]" />
              ))}
            </div>
          ) : recs.length === 0 ? (
            <p className="text-center text-[13px] text-emerald-300/90">✅ No waiver recommendations right now.</p>
          ) : (
            <div className="space-y-3">
              {recs.map((lg) => (
                <div key={lg.leagueId} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {lg.leagueAvatar ? (
                        <img src={lg.leagueAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white/50">
                          {(lg.leagueName || 'L').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-white">{lg.leagueName}</p>
                      <p className="text-[11px] text-white/40">
                        {lg.sport} · {lg.platform}
                      </p>
                    </div>
                  </div>

                  {lg.pickups.length > 0 && (
                    <>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">Recommended pickups</p>
                      <div className="mt-1 space-y-1.5">
                        {lg.pickups.map((p) => (
                          <div key={p.playerId} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
                            <span className="text-green-400">+ {p.playerName}</span>
                            <span className="text-white/40">
                              {p.position} · {p.team}
                            </span>
                            <span className="text-[10px] text-white/35">{p.addReason}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {lg.drops.length > 0 && (
                    <>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">Drop candidates</p>
                      <div className="mt-1 space-y-1">
                        {lg.drops.map((d) => (
                          <div key={d.playerId} className="text-[12px]">
                            <span className="text-red-400">− {d.playerName}</span>
                            <span className="text-white/40">
                              {' '}
                              {d.position} · {d.team}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-3 rounded-lg border border-cyan-500/[0.12] bg-cyan-500/[0.06] p-3">
                    <div className="flex gap-2">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-[9px] font-bold text-white"
                        aria-hidden
                      >
                        CH
                      </div>
                      <p className="text-[12px] leading-snug text-cyan-100">{lg.chimmyAdvice}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('af-chimmy-shortcut', {
                            detail: { prompt: `Give me detailed waiver wire advice for ${lg.leagueName}` },
                          })
                        )
                      }
                      className="text-[11px] font-semibold text-cyan-400 transition hover:text-cyan-300"
                    >
                      → Ask Chimmy for full waiver analysis
                    </button>
                    <ProLeagueLink
                      leagueId={lg.leagueId}
                      leagueName={lg.leagueName}
                      label="Open league →"
                      hasProAccess={hasProAccess}
                      href={`/league/${lg.leagueId}?tab=players`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] py-2.5 text-[13px] font-semibold text-white/80 transition hover:bg-white/[0.08]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
