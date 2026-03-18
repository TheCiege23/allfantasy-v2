"use client"

import React, { useState } from "react"
import { useDraftGrades } from "@/hooks/useDraftGrades"
import { DraftGradesCard } from "@/components/DraftGradesCard"
import { DraftShareModal } from "@/components/draft-sharing"

export function DraftGradesSection(props: { leagueId: string; season: string; defaultWeek: number }) {
  const { rows, loading, error, meta, computeAndPersist } = useDraftGrades({
    leagueId: props.leagueId,
    season: props.season
  })

  const [week, setWeek] = useState<number>(props.defaultWeek)
  const [shareOpen, setShareOpen] = useState(false)

  const rosterOptions = (rows ?? []).map((r: any) => ({
    rosterId: String(r.rosterId),
    name: r.name ?? undefined,
    grade: String(r.grade),
  }))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-zinc-900 p-4 flex items-center justify-between">
        <div>
          <div className="font-bold">Draft grades</div>
          <div className="text-xs opacity-70">Season {props.season} • computed in post_draft phase</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={!rows?.length}
            className="rounded-xl bg-amber-600 text-white px-4 py-2 font-medium hover:bg-amber-500 disabled:opacity-50 text-sm"
          >
            Share
          </button>
          <input
            className="w-24 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
            type="number"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
          />
          <button
            className="rounded-xl bg-white text-black px-4 py-2 font-bold disabled:opacity-60"
            disabled={loading}
            onClick={() => computeAndPersist(week)}
          >
            Compute
          </button>
        </div>
      </div>
      {shareOpen && (
        <DraftShareModal
          leagueId={props.leagueId}
          season={props.season}
          rosterOptions={rosterOptions}
          onClose={() => setShareOpen(false)}
        />
      )}

      {error ? <div className="rounded-2xl bg-zinc-950 p-3 text-sm opacity-80">Note: {error}</div> : null}

      {meta?.fallbackMode && (
        <div className="rounded-2xl bg-yellow-900/20 border border-yellow-700/30 px-4 py-3 text-yellow-300 text-xs">
          {meta.rankingSourceNote}
        </div>
      )}

      <DraftGradesCard rows={rows} />
    </div>
  )
}
