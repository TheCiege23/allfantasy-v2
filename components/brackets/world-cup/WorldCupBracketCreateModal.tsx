"use client"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Info, Loader2, Lock, Trophy, Users } from "lucide-react"

const WC_LOGO_SRC = "/images/brackets/world-cup/af-world-cup-logo.png"

const MAX_USERS = 100
const MAX_ENTRIES = 5
const allowCreateWithTestFixtures = process.env.NEXT_PUBLIC_WORLD_CUP_ALLOW_CREATE_TEST_FIXTURES === "true"

export default function WorldCupBracketCreateModal() {
  const router = useRouter()
  const [name, setName] = useState("World Cup Bracket Pool")
  const [visibility, setVisibility] = useState<"private" | "public">("private")
  const [lockStrategy, setLockStrategy] = useState<"per_match" | "tournament_start">("tournament_start")
  const [includeThirdPlace, setIncludeThirdPlace] = useState(false)
  const [seedTestFixtures, setSeedTestFixtures] = useState(false)
  const [maxUsers, setMaxUsers] = useState(MAX_USERS)
  const [maxEntries, setMaxEntries] = useState(MAX_ENTRIES)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "creating" | "opening">("idle")
  const [error, setError] = useState<string | null>(null)

  // Client-side validation
  const nameError = !name.trim() ? "Pool name cannot be blank." : null
  const maxUsersError = maxUsers < 2 || maxUsers > MAX_USERS ? `Must be between 2 and ${MAX_USERS}.` : null
  const maxEntriesError = maxEntries < 1 || maxEntries > MAX_ENTRIES ? `Must be between 1 and ${MAX_ENTRIES}.` : null
  const hasErrors = Boolean(nameError || maxUsersError || maxEntriesError)
  const lockRuleCopy =
    lockStrategy === "tournament_start"
      ? "Picks can be edited until the first World Cup match begins."
      : "Each matchup can be edited until that match kicks off."

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) return
    setError(null)
    setLoading(true)
    setStatus("creating")

    try {
      const res = await fetch("/api/brackets/world-cup/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          seasonYear: 2026,
          visibility,
          pickLockStrategy: lockStrategy,
          includeThirdPlace,
          maxParticipants: maxUsers,
          maxEntriesPerParticipant: maxEntries,
          isTestMode: allowCreateWithTestFixtures && seedTestFixtures,
          seedTestFixtures: allowCreateWithTestFixtures && seedTestFixtures,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        throw new Error("Please sign in to create a bracket.")
      }
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status})`)
      }

      const createdId =
        data?.challengeId ??
        data?.id ??
        data?.challenge?.id ??
        (data?.challenge as any)?.challengeId

      if (!createdId) {
        throw new Error("Bracket was created but the server did not return an ID. Please refresh the page.")
      }

      setStatus("opening")
      router.push(`/brackets/world-cup/${createdId}${allowCreateWithTestFixtures && seedTestFixtures ? "?guided=1" : ""}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bracket")
      setStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  const submitLabel =
    status === "creating"
      ? "Creating…"
      : status === "opening"
        ? "Created, opening…"
        : "Create Pool"

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070b] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-black">Create World Cup Bracket Pool</h1>
          <p className="text-xs text-white/45">2026 FIFA World Cup · round-by-round scoring</p>
        </div>
      </header>

      <main className="overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-3 py-4 pb-28 sm:px-4 sm:py-8 sm:pb-8">
          <form onSubmit={submit} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40">
            {/* Title block */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 p-1">
                <Image
                  src={WC_LOGO_SRC}
                  alt="AllFantasy World Cup"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-white">2026 FIFA World Cup</div>
                <div className="text-xs text-white/45">Create a pool container — invite friends and let them build their brackets inside.</div>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">

            {/* Pool name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Pool Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
                required
                maxLength={80}
                placeholder="e.g. Office World Cup Pool 2026"
              />
              {nameError && <p className="mt-1 text-[11px] text-rose-300">{nameError}</p>}
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Privacy */}
            <div>
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Pool Visibility
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`rounded-lg border p-3 text-left transition-colors ${visibility === "private" ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </div>
                  <div className="mt-0.5 text-xs text-white/45">Invite link required to join</div>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`rounded-lg border p-3 text-left transition-colors ${visibility === "public" ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    <Users className="h-3.5 w-3.5" />
                    Public
                  </div>
                  <div className="mt-0.5 text-xs text-white/45">Anyone can discover and join</div>
                </button>
              </div>
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Max users + max entries */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Max Users
                </label>
                <input
                  type="number"
                  min={2}
                  max={MAX_USERS}
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(Math.min(MAX_USERS, Math.max(1, Number(e.target.value))))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
                />
                {maxUsersError
                  ? <p className="mt-1 text-[11px] text-rose-300">{maxUsersError}</p>
                  : <p className="mt-1 text-[11px] text-white/35">Maximum {MAX_USERS} per pool</p>}
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Brackets per User
                </label>
                <input
                  type="number"
                  min={1}
                  max={MAX_ENTRIES}
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Math.min(MAX_ENTRIES, Math.max(1, Number(e.target.value))))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
                />
                {maxEntriesError
                  ? <p className="mt-1 text-[11px] text-rose-300">{maxEntriesError}</p>
                  : <p className="mt-1 text-[11px] text-white/35">Maximum {MAX_ENTRIES} per user</p>}
              </div>
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Lock rule */}
            <div>
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Pick Lock Rule
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLockStrategy("tournament_start")}
                  className={`rounded-lg border p-3 text-left transition-colors ${lockStrategy === "tournament_start" ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <div className="text-sm font-black">Tournament Lock</div>
                  <div className="mt-0.5 text-xs text-white/45">All picks lock when the first match begins</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLockStrategy("per_match")}
                  className={`rounded-lg border p-3 text-left transition-colors ${lockStrategy === "per_match" ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <div className="text-sm font-black">Per-Match Lock</div>
                  <div className="mt-0.5 text-xs text-white/45">Each match locks at its own kickoff</div>
                </button>
              </div>
            </div>

            {/* Scoring profile info */}
            <div className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/60" />
              <div className="text-xs text-white/45">
                <span className="font-bold text-white/60">Round-by-round scoring:</span> 10 pts Round of 32 · 20 pts Round of 16 · 40 pts QF · 80 pts SF · 160 pts Final · 320 pts Champion bonus
              </div>
            </div>

            {/* Helper notes */}
            <ul className="space-y-1 text-[11px] text-white/40">
              <li>• Each user can create up to {maxEntries} bracket entr{maxEntries === 1 ? "y" : "ies"}.</li>
              <li>• {lockRuleCopy}</li>
              <li>• The leaderboard ranks finalized bracket entries, not drafts.</li>
              {visibility === "private" && (
                <li>• An invite link will be shown after creation.</li>
              )}
            </ul>

            {/* Third-place */}
            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-white/75">
              <input
                type="checkbox"
                checked={includeThirdPlace}
                onChange={(e) => setIncludeThirdPlace(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Include third-place match
            </label>

            {allowCreateWithTestFixtures && (
              <label className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-500/[0.06] p-3 text-sm font-bold text-amber-100">
                <input
                  type="checkbox"
                  checked={seedTestFixtures}
                  onChange={(e) => setSeedTestFixtures(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                <span>
                  <span className="block">Seed Test Fixtures</span>
                  <span className="mt-0.5 block text-[11px] font-medium leading-5 text-amber-100/70">
                    Adds mock Round of 32 teams, flags, kickoff times, and venues so this pool is pickable immediately.
                  </span>
                </span>
              </label>
            )}

            {status === "opening" && !error && (
              <div className="flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm text-cyan-100">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Created bracket, opening…
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || hasErrors}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-black text-black shadow-lg shadow-cyan-300/20 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
              {submitLabel}
            </button>

            </div>{/* end inner padding div */}
          </form>
        </div>
      </main>
    </div>
  )
}

