"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { RefreshCw, Trophy, Plus, Users, Link2, Clipboard, Settings2, ArrowRightCircle } from "lucide-react"
import { toast } from "sonner"
import type { PlayoffChallengeView } from "@/lib/playoffs/types"
import {
  createPlayoffBracketEntryClient,
  getPlayoffBracketViewClient,
  savePlayoffBracketPickClient,
} from "@/lib/playoffs/playoffClientApi"
import PlayoffBracketBoard from "./PlayoffBracketBoard"

type Props = {
  initialView: PlayoffChallengeView
}

export default function PlayoffBracketShell({ initialView }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState(initialView)
  const [saving, startSaving] = useTransition()
  const [refreshing, startRefreshing] = useTransition()
  const [creatingEntry, startCreatingEntry] = useTransition()

  const pickCount = view.activeEntry?.pickCount ?? view.picks.length
  const totalSeries = view.series.length
  const viewerEntryCount = view.entries.filter((entry) => entry.userId === view.viewerUserId).length
  const canCreateEntry = viewerEntryCount < view.challenge.maxEntriesPerParticipant
  const title = useMemo(() => {
    const sportLabelMap: Record<string, string> = {
      nba: "NBA",
      nhl: "NHL",
      soccer: "Soccer",
    }
    const sportLabel = sportLabelMap[String(view.challenge.sport).toLowerCase()] ?? String(view.challenge.sport).toUpperCase()
    return `${sportLabel} Playoff Bracket`
  }, [view.challenge.sport])
  const leaderboardRows = useMemo(
    () =>
      [...view.entries]
        .sort((a, b) => b.pickCount - a.pickCount)
        .map((entry, index) => ({
          rank: index + 1,
          id: entry.id,
          name: entry.name || `Bracket ${index + 1}`,
          picks: entry.pickCount,
        })),
    [view.entries]
  )

  function handlePick(seriesId: string, teamName: string) {
    if (!view.activeEntry) return
    startSaving(async () => {
      const next = await savePlayoffBracketPickClient({
        challengeId: view.challenge.id,
        entryId: view.activeEntry!.id,
        seriesId,
        pickTeamName: teamName,
      })
      setView(next)
    })
  }

  function handleRefresh() {
    startRefreshing(async () => {
      const latest = await getPlayoffBracketViewClient(view.challenge.id)
      setView(latest)
    })
  }

  function openEntry(entryId: string) {
    const url = `/brackets/playoffs/${view.challenge.id}?entryId=${encodeURIComponent(entryId)}`
    router.push(url)
  }

  function handleCreateEntry() {
    startCreatingEntry(async () => {
      try {
        const nextEntryIndex = viewerEntryCount + 1
        if (nextEntryIndex > view.challenge.maxEntriesPerParticipant) {
          toast.error("Entry limit reached (max 5 per user)")
          return
        }

        const created = await createPlayoffBracketEntryClient({
          challengeId: view.challenge.id,
          name: `Bracket ${nextEntryIndex}`,
        })

        toast.success(`Bracket ${nextEntryIndex} created.`)
        router.push(created.redirectUrl)
        const latest = await getPlayoffBracketViewClient(view.challenge.id)
        setView(latest)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create entry"
        toast.error(message)
      }
    })
  }

  async function copyInvite() {
    try {
      const absoluteUrl = `${window.location.origin}${view.challenge.inviteUrl}`
      await navigator.clipboard.writeText(`${absoluteUrl}?code=${view.challenge.inviteCode}`)
      toast.success("Invite link copied")
    } catch {
      toast.error("Could not copy invite link")
    }
  }

  const showBoard = searchParams?.get("view") === "board"

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-6">
      <section className="rounded-3xl border border-slate-300 bg-[linear-gradient(130deg,#fff7ed_0%,#ecfeff_45%,#eef2ff_100%)] p-6 shadow-[0_20px_50px_rgba(30,41,59,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sleeper-style board</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-slate-700">{view.challenge.name} - {view.challenge.seasonYear}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push(`/brackets/playoffs/${view.challenge.id}?view=board`)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowRightCircle className="h-4 w-4" />
              Open Bracket
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-white">
            <Trophy className="h-4 w-4" />
            {pickCount}/{totalSeries} picks
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">{view.challenge.sport.toUpperCase()}</span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-900">
            {view.participants.length} participant{view.participants.length !== 1 ? "s" : ""}
          </span>
          {saving ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Saving pick...</span> : null}
          {view.challenge.isTestMode ? <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-900">Test mode</span> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">League Details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
            <div><dt className="font-semibold">Visibility</dt><dd>{view.challenge.visibility}</dd></div>
            <div><dt className="font-semibold">Max Users</dt><dd>{view.challenge.maxParticipants}</dd></div>
            <div><dt className="font-semibold">Brackets per User</dt><dd>{view.challenge.maxEntriesPerParticipant}</dd></div>
            <div><dt className="font-semibold">Scoring Style</dt><dd>{view.challenge.scoringStyle}</dd></div>
            <div><dt className="font-semibold">Lock Rule</dt><dd>{view.challenge.lockRule}</dd></div>
            <div><dt className="font-semibold">Invite Code</dt><dd>{view.challenge.inviteCode}</dd></div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateEntry}
              disabled={!canCreateEntry || creatingEntry}
              data-testid="playoff-fill-bracket-cta"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {view.entries.length === 0 ? "Fill In Bracket" : "Create Bracket Entry"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/brackets/playoffs/${view.challenge.id}?view=board`)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              Open Bracket
            </button>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
            >
              <Clipboard className="h-4 w-4" />
              Invite
            </button>
            {view.challenge.ownerUserId === view.viewerUserId ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </button>
            ) : null}
          </div>
          {!canCreateEntry ? (
            <p className="mt-2 text-xs font-semibold text-rose-700">Entry limit reached. Bracket 6 is blocked.</p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Invite Panel</h2>
          <p className="mt-2 text-sm text-slate-700">
            Share this link: <span className="font-semibold">{view.challenge.inviteUrl}?code={view.challenge.inviteCode}</span>
          </p>
          <button
            type="button"
            onClick={copyInvite}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <Link2 className="h-4 w-4" />
            Copy invite link
          </button>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Participants</h2>
          <p className="mt-1 text-sm text-slate-600">
            {view.participants.length} participant{view.participants.length !== 1 ? "s" : ""}
          </p>
          <ul className="mt-3 space-y-2">
            {view.participants.map((participant) => (
              <li key={participant.userId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{participant.displayName}</span>
                <span className="text-slate-600">{participant.entryCount} entries</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Entries</h2>
          {view.entries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Create your first bracket</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {view.entries.map((entry, index) => (
                <li key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{entry.name || `Bracket ${index + 1}`}</p>
                    <p className="text-xs text-slate-600">
                      {entry.pickCount}/{totalSeries} picks · {entry.isComplete ? "Complete" : "In progress"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEntry(entry.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="playoff-dashboard-leaderboard">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Leaderboard</h2>
        {leaderboardRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No leaderboard entries yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {leaderboardRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">#{row.rank} {row.name}</span>
                <span className="text-slate-600">{row.picks} picks</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {showBoard ? (
        <PlayoffBracketBoard rounds={view.rounds} series={view.series} picks={view.picks} onPick={handlePick} />
      ) : null}
    </div>
  )
}
