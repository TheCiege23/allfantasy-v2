"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

type ProfileView = {
  id: string
  managerId: string
  sportLabel: string
  profileLabels: string[]
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
}

const SCORE_KEYS: Array<{ key: keyof ProfileView; label: string }> = [
  { key: "aggressionScore", label: "Aggression" },
  { key: "activityScore", label: "Activity" },
  { key: "tradeFrequencyScore", label: "Trade" },
  { key: "waiverFocusScore", label: "Waiver" },
  { key: "riskToleranceScore", label: "Risk" },
]

function ProfileColumn({ title, profile }: { title: string; profile: ProfileView | null }) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/60">
        {title}: no profile selected.
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
      <div className="text-sm text-white/90">
        {title}: <span className="font-medium">{profile.managerId}</span> · {profile.sportLabel}
      </div>
      <div className="flex flex-wrap gap-1">
        {profile.profileLabels.map((label) => (
          <span
            key={`${profile.id}-${label}`}
            className="rounded border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-200"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SCORE_KEYS.map((s) => (
          <div key={s.key} className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
            <div className="text-[9px] text-white/45">{s.label}</div>
            <div className="text-xs font-semibold text-white">{Math.round(Number(profile[s.key]))}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PsychologicalProfileComparePage() {
  const params = useParams<{ leagueId: string }>()
  const search = useSearchParams()
  const leagueId = params?.leagueId ?? ""
  const managerAFromQuery = search.get("managerAId") ?? ""
  const managerBFromQuery = search.get("managerBId") ?? ""
  const sportFromQuery = search.get("sport") ?? "ALL"
  const [sportFilter, setSportFilter] = useState<string>(sportFromQuery)
  const [managerAId, setManagerAId] = useState(managerAFromQuery)
  const [managerBId, setManagerBId] = useState(managerBFromQuery)
  const [profiles, setProfiles] = useState<ProfileView[]>([])
  const [comparison, setComparison] = useState<{ managerA: ProfileView | null; managerB: ProfileView | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const managerOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.managerId))).sort((a, b) => a.localeCompare(b)),
    [profiles]
  )

  const loadProfiles = async () => {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sportFilter !== "ALL") params.set("sport", sportFilter)
      params.set("limit", "200")
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles?${params.toString()}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("Failed to load profile list")
      const data = await res.json().catch(() => ({}))
      const rows = Array.isArray(data.profiles) ? data.profiles : []
      setProfiles(rows)
    } catch (e) {
      setProfiles([])
      setError(e instanceof Error ? e.message : "Failed to load profile list")
    } finally {
      setLoading(false)
    }
  }

  const loadComparison = async () => {
    if (!leagueId || !managerAId || !managerBId) {
      setComparison(null)
      return
    }
    setError(null)
    try {
      const params = new URLSearchParams({
        managerAId,
        managerBId,
      })
      if (sportFilter !== "ALL") params.set("sport", sportFilter)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles?${params.toString()}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("Failed to compare profiles")
      const data = await res.json().catch(() => ({}))
      setComparison(data.comparison ?? null)
    } catch (e) {
      setComparison(null)
      setError(e instanceof Error ? e.message : "Failed to compare profiles")
    }
  }

  useEffect(() => {
    void loadProfiles()
  }, [leagueId, sportFilter])

  useEffect(() => {
    void loadComparison()
  }, [leagueId, managerAId, managerBId, sportFilter])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-4">
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-white">Manager Style Comparison</h1>
          <Link
            href={`/app/league/${encodeURIComponent(leagueId)}?tab=Settings`}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            Back
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white/80"
            aria-label="Comparison sport filter"
          >
            <option value="ALL">All sports</option>
            {SUPPORTED_SPORTS.map((s) => (
              <option key={s} value={s}>
                {s === "NCAAB" ? "NCAA Basketball" : s === "NCAAF" ? "NCAA Football" : s}
              </option>
            ))}
          </select>
          <select
            value={managerAId}
            onChange={(e) => setManagerAId(e.target.value)}
            className="rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white/80"
            aria-label="Comparison manager A"
          >
            <option value="">Manager A</option>
            {managerOptions.map((m) => (
              <option key={`a-${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={managerBId}
            onChange={(e) => setManagerBId(e.target.value)}
            className="rounded border border-white/20 bg-black/40 px-2.5 py-1.5 text-xs text-white/80"
            aria-label="Comparison manager B"
          >
            <option value="">Manager B</option>
            {managerOptions.map((m) => (
              <option key={`b-${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading && <p className="text-sm text-white/60">Loading profiles...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {!loading && (
        <section className="grid gap-3 md:grid-cols-2">
          <ProfileColumn title="Manager A" profile={comparison?.managerA ?? null} />
          <ProfileColumn title="Manager B" profile={comparison?.managerB ?? null} />
        </section>
      )}
    </main>
  )
}
