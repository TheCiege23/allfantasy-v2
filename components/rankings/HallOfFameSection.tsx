"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useHallOfFame } from "@/hooks/useHallOfFame"
import { useHallOfFameEntriesAndMoments } from "@/hooks/useHallOfFameEntriesAndMoments"
import { HallOfFameCard } from "@/components/HallOfFameCard"
import { SeasonLeaderboardCard } from "@/components/rankings/SeasonLeaderboardCard"
import type { HallOfFameEntryRow, HallOfFameMomentRow } from "@/hooks/useHallOfFameEntriesAndMoments"

const HOF_SPORTS = ["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"] as const
const HOF_CATEGORIES = [
  "all_time_great_managers",
  "all_time_great_teams",
  "greatest_moments",
  "biggest_upsets",
  "best_championship_runs",
  "longest_dynasties",
  "historic_comebacks",
  "iconic_rivalries",
] as const

export function HallOfFameSection(props: {
  leagueId: string
  seasons: string[]
  defaultSeason?: string
}) {
  const normalizedSeasons = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const s of props.seasons ?? []) {
      const v = String(s)
      if (!seen.has(v)) {
        seen.add(v)
        out.push(v)
      }
    }
    return out
  }, [props.seasons])

  const initialSeason =
    props.defaultSeason && normalizedSeasons.includes(props.defaultSeason)
      ? props.defaultSeason
      : normalizedSeasons?.[0] ?? ""

  const [season, setSeason] = useState<string>(initialSeason)
  const [sportFilter, setSportFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [storyId, setStoryId] = useState<string | null>(null)
  const [storyNarrative, setStoryNarrative] = useState<string | null>(null)
  const [storyLoading, setStoryLoading] = useState<string | null>(null)
  const [syncMomentsLoading, setSyncMomentsLoading] = useState(false)

  useEffect(() => {
    if (props.defaultSeason && normalizedSeasons.includes(props.defaultSeason)) {
      setSeason(props.defaultSeason)
    } else if (!season && normalizedSeasons.length) {
      setSeason(normalizedSeasons[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultSeason, normalizedSeasons])

  const { hofRows, seasonRows, loading, error, meta, rebuild } = useHallOfFame({
    leagueId: props.leagueId,
    season: season || null,
  })

  const {
    entries,
    moments,
    entriesTotal,
    momentsTotal,
    loading: entriesMomentsLoading,
    error: entriesMomentsError,
    refresh: refreshEntriesMoments,
  } = useHallOfFameEntriesAndMoments({
    leagueId: props.leagueId,
    sport: sportFilter || null,
    season: season || null,
    category: categoryFilter || null,
  })

  const tellStory = useCallback(
    (type: "entry" | "moment", id: string) => {
      if (storyId === id && storyNarrative !== null) {
        setStoryId(null)
        setStoryNarrative(null)
        setStoryLoading(null)
        return
      }
      setStoryId(id)
      setStoryNarrative(null)
      setStoryLoading(id)
      fetch(
        `/api/leagues/${encodeURIComponent(props.leagueId)}/hall-of-fame/tell-story`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id }),
        }
      )
        .then((r) => r.json())
        .then((data) => {
          setStoryNarrative(data?.narrative ?? "No explanation available.")
          setStoryLoading(null)
        })
        .catch(() => {
          setStoryNarrative("Could not load explanation.")
          setStoryLoading(null)
        })
    },
    [props.leagueId, storyId, storyNarrative]
  )

  const syncMoments = useCallback(() => {
    setSyncMomentsLoading(true)
    fetch(
      `/api/leagues/${encodeURIComponent(props.leagueId)}/hall-of-fame/sync-moments`,
      { method: "POST" }
    )
      .then((r) => r.json())
      .then(() => refreshEntriesMoments())
      .finally(() => setSyncMomentsLoading(false))
  }, [props.leagueId, refreshEntriesMoments])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-zinc-900 p-4 flex items-center justify-between">
        <div>
          <div className="font-bold">Hall of Fame</div>
          <div className="text-xs opacity-70">All-time leaderboard + season view</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            {normalizedSeasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="rounded-xl bg-white text-black px-4 py-2 font-bold disabled:opacity-60"
            disabled={loading}
            onClick={() => rebuild()}
          >
            Rebuild
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-zinc-950 p-3 text-sm opacity-80">Error: {error}</div>
      ) : null}

      {meta?.fallbackMode && (
        <div className="rounded-2xl bg-yellow-900/20 border border-yellow-700/30 px-4 py-3 text-yellow-300 text-xs">
          {meta.rankingSourceNote}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <HallOfFameCard rows={hofRows} />
        <SeasonLeaderboardCard season={season} rows={seasonRows} />
      </div>

      {/* Inductions & Moments */}
      <div className="rounded-2xl bg-zinc-900 p-4 space-y-4 border border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold">Inductions & Moments</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="">All sports</option>
              {HOF_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {HOF_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={entriesMomentsLoading}
              onClick={() => refreshEntriesMoments()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={syncMomentsLoading}
              onClick={syncMoments}
            >
              {syncMomentsLoading ? "Syncing…" : "Sync moments"}
            </button>
          </div>
        </div>

        {entriesMomentsError && (
          <div className="rounded-xl bg-zinc-950 p-3 text-sm text-red-300">
            {entriesMomentsError}
          </div>
        )}

        {entriesMomentsLoading && (
          <div className="text-sm text-zinc-400">Loading inductions and moments…</div>
        )}

        {!entriesMomentsLoading && (entries.length > 0 || moments.length > 0) && (
          <>
            {entries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Inductions ({entriesTotal})
                </h3>
                <div className="space-y-2">
                  {entries.slice(0, 15).map((e) => (
                    <HallOfFameEntryCard
                      key={e.id}
                      entry={e}
                      leagueId={props.leagueId}
                      storyId={storyId}
                      storyNarrative={storyNarrative}
                      storyLoading={storyLoading}
                      onTellStory={() => tellStory("entry", e.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {moments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Moments timeline ({momentsTotal})
                </h3>
                <div className="space-y-2">
                  {moments.slice(0, 15).map((m) => (
                    <HallOfFameMomentCard
                      key={m.id}
                      moment={m}
                      leagueId={props.leagueId}
                      storyId={storyId}
                      storyNarrative={storyNarrative}
                      storyLoading={storyLoading}
                      onTellStory={() => tellStory("moment", m.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!entriesMomentsLoading && entries.length === 0 && moments.length === 0 && (
          <p className="text-sm text-zinc-500">
            No inductions or moments yet. Use &quot;Sync moments&quot; to detect championships
            and record seasons from league history.
          </p>
        )}

        <p className="text-xs text-zinc-500 mt-2">
          Legacy scores (championships, playoffs, consistency) are in the{" "}
          <a
            href={`/app/league/${encodeURIComponent(props.leagueId)}?tab=Legacy`}
            className="text-amber-400 hover:underline font-medium"
          >
            Legacy
          </a>{" "}
          tab. Trust scores:{" "}
          <a
            href={`/app/league/${encodeURIComponent(props.leagueId)}?tab=Settings`}
            className="text-cyan-400 hover:underline"
          >
            Settings → Reputation
          </a>
          .
        </p>
      </div>
    </div>
  )
}

function HallOfFameEntryCard({
  entry,
  leagueId,
  storyId,
  storyNarrative,
  storyLoading,
  onTellStory,
}: {
  entry: HallOfFameEntryRow
  leagueId: string
  storyId: string | null
  storyNarrative: string | null
  storyLoading: string | null
  onTellStory: () => void
}) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-semibold text-white">{entry.title}</div>
          <div className="text-xs text-zinc-400">
            {entry.category.replace(/_/g, " ")} · {entry.sport}
            {entry.season ? ` · ${entry.season}` : ""}
          </div>
          {entry.summary && (
            <p className="text-sm text-zinc-500 mt-1">{entry.summary}</p>
          )}
        </div>
        <div className="text-xs font-mono text-amber-400 shrink-0">
          {entry.score.toFixed(2)}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={`/app/league/${encodeURIComponent(leagueId)}/hall-of-fame/entries/${entry.id}`}
          className="text-xs text-amber-400 hover:underline"
        >
          Why inducted?
        </a>
        <button
          type="button"
          className="text-xs text-amber-400 hover:underline disabled:opacity-50"
          disabled={storyLoading === entry.id}
          onClick={onTellStory}
        >
          {storyLoading === entry.id
            ? "…"
            : storyId === entry.id && storyNarrative
              ? "Hide"
              : "Tell me why this matters"}
        </button>
      </div>
      {storyId === entry.id && storyNarrative && (
        <div className="mt-2 p-2 rounded-lg bg-zinc-900 text-sm text-zinc-300">
          {storyNarrative}
        </div>
      )}
    </div>
  )
}

function HallOfFameMomentCard({
  moment,
  leagueId,
  storyId,
  storyNarrative,
  storyLoading,
  onTellStory,
}: {
  moment: HallOfFameMomentRow
  leagueId: string
  storyId: string | null
  storyNarrative: string | null
  storyLoading: string | null
  onTellStory: () => void
}) {
  return (
    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-semibold text-white">{moment.headline}</div>
          <div className="text-xs text-zinc-400">
            {moment.sport} · {moment.season}
          </div>
          {moment.summary && (
            <p className="text-sm text-zinc-500 mt-1">{moment.summary}</p>
          )}
        </div>
        <div className="text-xs font-mono text-amber-400 shrink-0">
          {moment.significanceScore.toFixed(2)}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={`/app/league/${encodeURIComponent(leagueId)}/hall-of-fame/moments/${moment.id}`}
          className="text-xs text-amber-400 hover:underline"
        >
          Why inducted?
        </a>
        <button
          type="button"
          className="text-xs text-amber-400 hover:underline disabled:opacity-50"
          disabled={storyLoading === moment.id}
          onClick={onTellStory}
        >
          {storyLoading === moment.id
            ? "…"
            : storyId === moment.id && storyNarrative
              ? "Hide"
              : "Tell me why this matters"}
        </button>
      </div>
      {storyId === moment.id && storyNarrative && (
        <div className="mt-2 p-2 rounded-lg bg-zinc-900 text-sm text-zinc-300">
          {storyNarrative}
        </div>
      )}
    </div>
  )
}
