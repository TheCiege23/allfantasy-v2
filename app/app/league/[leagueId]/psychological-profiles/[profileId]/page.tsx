"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

type EvidenceRow = {
  id: string
  evidenceType: string
  value: number
  sourceReference: string | null
  createdAt: string
}

type ProfileRow = {
  id: string
  leagueId: string
  managerId: string
  sport: string
  sportLabel: string
  profileLabels: string[]
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
  evidenceCount?: number
}

const SCORE_KEYS: Array<{ key: keyof ProfileRow; label: string }> = [
  { key: "aggressionScore", label: "Aggression" },
  { key: "activityScore", label: "Activity" },
  { key: "tradeFrequencyScore", label: "Trade Freq" },
  { key: "waiverFocusScore", label: "Waiver Focus" },
  { key: "riskToleranceScore", label: "Risk" },
]

export default function PsychologicalProfileDetailPage() {
  const params = useParams<{ leagueId: string; profileId: string }>()
  const search = useSearchParams()
  const leagueId = params?.leagueId ?? ""
  const profileId = params?.profileId ?? ""
  const tabParam = search.get("tab") ?? ""
  const defaultSeason = search.get("season") ?? ""
  const [seasonFilter, setSeasonFilter] = useState(defaultSeason)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [evidence, setEvidence] = useState<EvidenceRow[]>([])
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const evidenceSectionRef = useRef<HTMLElement | null>(null)

  const seasonOptions = useMemo(() => {
    const years = new Set<number>()
    for (const ev of evidence) {
      const year = new Date(ev.createdAt).getUTCFullYear()
      if (!Number.isNaN(year)) years.add(year)
    }
    return [...years].sort((a, b) => b - a)
  }, [evidence])

  const loadProfile = async () => {
    if (!leagueId || !profileId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ includeEvidence: "1" })
      if (seasonFilter) params.set("season", seasonFilter)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles/${encodeURIComponent(
          profileId
        )}?${params.toString()}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("Failed to load profile")
      const data = await res.json()
      setProfile(data)
      setEvidence(Array.isArray(data.evidence) ? data.evidence : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile")
      setProfile(null)
      setEvidence([])
    } finally {
      setLoading(false)
    }
  }

  const loadEvidence = async () => {
    if (!leagueId || !profileId) return
    setEvidenceLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (seasonFilter) params.set("season", seasonFilter)
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles/${encodeURIComponent(
          profileId
        )}/evidence?${params.toString()}`,
        { cache: "no-store" }
      )
      if (!res.ok) throw new Error("Failed to load evidence")
      const data = await res.json()
      setEvidence(Array.isArray(data.evidence) ? data.evidence : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evidence")
      setEvidence([])
    } finally {
      setEvidenceLoading(false)
    }
  }

  const explain = async () => {
    if (!leagueId || !profileId) return
    setExplaining(true)
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/psychological-profiles/explain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId }),
        }
      )
      const data = await res.json().catch(() => ({}))
      setNarrative(data?.narrative ?? "No explanation available.")
    } catch {
      setNarrative("Could not load explanation.")
    } finally {
      setExplaining(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [leagueId, profileId])

  useEffect(() => {
    if (!loading) void loadEvidence()
  }, [seasonFilter])

  useEffect(() => {
    if (tabParam !== "evidence") return
    if (!evidenceSectionRef.current) return
    evidenceSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [tabParam, loading, evidence.length])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-4">
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-white">Manager Psychological Profile</h1>
            <p className="text-xs text-white/55">League {leagueId}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/league/${encodeURIComponent(leagueId)}?tab=Settings`}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Back
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadProfile()
                void loadEvidence()
              }}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void explain()}
              disabled={explaining}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {explaining ? "Explaining..." : "Explain this manager style"}
            </button>
          </div>
        </div>
      </section>

      {loading && <p className="text-sm text-white/60">Loading profile...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {!loading && profile && (
        <>
          <section className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-white/85">
                Manager <span className="font-medium">{profile.managerId}</span> · {profile.sportLabel}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/app/league/${encodeURIComponent(
                    leagueId
                  )}/psychological-profiles/compare?managerAId=${encodeURIComponent(profile.managerId)}`}
                  className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:bg-white/10"
                >
                  Open comparison
                </Link>
                <Link
                  href={`/app/league/${encodeURIComponent(
                    leagueId
                  )}/drama?relatedManagerId=${encodeURIComponent(profile.managerId)}${
                    seasonFilter ? `&season=${encodeURIComponent(seasonFilter)}` : ""
                  }`}
                  className="rounded border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
                >
                  Open drama context
                </Link>
                <Link
                  href={`/league/${encodeURIComponent(leagueId)}?tab=Trades`}
                  className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                >
                  Open trade context
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.profileLabels.map((label) => (
                <span
                  key={label}
                  className="rounded border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-200"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {SCORE_KEYS.map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="text-[10px] text-white/45">{label}</div>
                  <div className="text-sm font-semibold text-white">{Math.round(Number(profile[key]))}</div>
                </div>
              ))}
            </div>
            {narrative && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-white/85">
                {narrative}
              </div>
            )}
          </section>

          <section
            ref={evidenceSectionRef}
            className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-white/85">Evidence</h2>
              <div className="flex items-center gap-2">
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white/80"
                  aria-label="Profile season filter"
                >
                  <option value="">All seasons</option>
                  {seasonOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void loadEvidence()}
                  className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:bg-white/10"
                >
                  Refresh evidence
                </button>
              </div>
            </div>
            {evidenceLoading ? (
              <p className="text-sm text-white/60">Loading evidence...</p>
            ) : evidence.length === 0 ? (
              <p className="text-sm text-white/60">No evidence records found.</p>
            ) : (
              <ul className="space-y-1.5">
                {evidence.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-white/75"
                  >
                    <span className="text-white/45">{ev.evidenceType}</span> — {ev.value.toFixed(1)}
                    {ev.sourceReference ? ` · ${ev.sourceReference}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
