"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Globe, Lock } from "lucide-react"

export default function NewBracketLeaguePage() {
  const [name, setName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [maxEntriesPerUser, setMaxEntriesPerUser] = useState(1)
  const [tiebreakerEnabled, setTiebreakerEnabled] = useState(true)
  const [tiebreakerType, setTiebreakerType] = useState("championship_total_points")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgeConfirm, setShowAgeConfirm] = useState(false)
  const [ageConfirming, setAgeConfirming] = useState(false)
  const router = useRouter()

  async function handleConfirmAge() {
    setAgeConfirming(true)
    try {
      const res = await fetch("/api/auth/confirm-age", { method: "POST" })
      if (res.ok) {
        setShowAgeConfirm(false)
        setError(null)
        setTimeout(() => submitPool(), 400)
      } else {
        setError("Failed to confirm age. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setAgeConfirming(false)
    }
  }

  async function submitPool() {
    setError(null)
    setShowAgeConfirm(false)
    setLoading(true)

    const returnTo = "/brackets/leagues/new"

    try {
      const res = await fetch("/api/bracket/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          season: new Date().getFullYear(),
          sport: "ncaam",
          maxManagers: 100,
          isPublic,
          bracketType: "mens_ncaa",
          maxEntriesPerUser,
          entriesPerUserFree: maxEntriesPerUser,
          tiebreakerEnabled,
          tiebreakerType,
          incompleteEntryPolicy: "invalid_incomplete",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.error === "UNAUTHENTICATED") {
          router.push(`/login?callbackUrl=${encodeURIComponent(returnTo)}`)
          return
        }
        if (data.error === "AGE_REQUIRED") {
          setShowAgeConfirm(true)
          return
        }
        if (data.error === "VERIFICATION_REQUIRED") {
          router.push(`/verify?error=VERIFICATION_REQUIRED&returnTo=${encodeURIComponent(returnTo)}`)
          return
        }
        setError(data.error ?? "Failed to create pool")
        return
      }
      router.push(`/brackets/leagues/${data.leagueId}`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function createPool(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await submitPool()
  }

  return (
    <div className="mode-surface mode-readable min-h-screen">
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <button
          onClick={() => router.back()}
          className="mode-muted mb-8 flex items-center gap-2 text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl font-bold text-center mb-8">Create NCAA Bracket Pool</h1>

        <form onSubmit={createPool} className="space-y-6 pb-24 sm:pb-0">
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Pool Name</label>
            <input
              className="mt-2 w-full bg-transparent border-b-2 pb-2 text-lg outline-none transition"
              style={{ borderColor: "var(--accent)", color: "var(--text)" }}
              placeholder="Madness"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Pool Visibility</label>
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className="flex-1 flex items-center gap-3 rounded-xl p-3.5 transition"
                style={{
                  background: !isPublic ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'color-mix(in srgb, var(--panel2) 84%, transparent)',
                  border: `1.5px solid ${!isPublic ? "color-mix(in srgb, var(--accent) 38%, transparent)" : "var(--border)"}`,
                }}
              >
                <Lock className="w-5 h-5 flex-shrink-0" style={{ color: !isPublic ? "var(--accent)" : "var(--muted2)" }} />
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color: !isPublic ? "var(--text)" : "var(--muted)" }}>Private</div>
                  <div className="text-[10px] mt-0.5" style={{ color: !isPublic ? "var(--muted)" : "var(--muted2)" }}>
                    Invite only via code
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className="flex-1 flex items-center gap-3 rounded-xl p-3.5 transition"
                style={{
                  background: isPublic ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'color-mix(in srgb, var(--panel2) 84%, transparent)',
                  border: `1.5px solid ${isPublic ? "color-mix(in srgb, var(--accent) 38%, transparent)" : "var(--border)"}`,
                }}
              >
                <Globe className="w-5 h-5 flex-shrink-0" style={{ color: isPublic ? "var(--accent)" : "var(--muted2)" }} />
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color: isPublic ? "var(--text)" : "var(--muted)" }}>Public</div>
                  <div className="text-[10px] mt-0.5" style={{ color: isPublic ? "var(--muted)" : "var(--muted2)" }}>
                    Anyone can find & join
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="mode-panel-soft rounded-xl p-3.5">
            <label className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Entries Per User</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={maxEntriesPerUser}
                onChange={(e) => setMaxEntriesPerUser(Number(e.target.value))}
                disabled={loading}
                className="w-full"
              />
              <span className="w-8 text-sm font-semibold mode-text">{maxEntriesPerUser}</span>
            </div>
          </div>

          <div className="mode-panel-soft rounded-xl p-3.5">
            <label className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Tiebreaker</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm mode-muted">
                <input
                  type="checkbox"
                  checked={tiebreakerEnabled}
                  onChange={(e) => setTiebreakerEnabled(e.target.checked)}
                  disabled={loading}
                />
                Enable championship total points tiebreaker
              </label>
              <select
                disabled={!tiebreakerEnabled || loading}
                value={tiebreakerType}
                onChange={(e) => setTiebreakerType(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm mode-text" style={{ border: "1px solid var(--border)", background: "color-mix(in srgb, var(--panel2) 88%, transparent)" }}
              >
                <option value="championship_total_points">Championship Total Points</option>
              </select>
            </div>
          </div>

          {showAgeConfirm && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              <p className="mode-muted text-sm">
                You must confirm you are 18 or older to create a bracket pool.
              </p>
              <button
                type="button"
                onClick={handleConfirmAge}
                disabled={ageConfirming}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50 transition"
                style={{ background: "var(--accent)" }}
              >
                {ageConfirming ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </span>
                ) : (
                  "I confirm I am 18 or older"
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'color-mix(in srgb, var(--accent-red-strong) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-red-strong) 38%, transparent)', color: 'var(--accent-red)' }}>
              {error}
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-4 sm:static sm:p-0">
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-40 transition"
              style={{ background: "var(--accent)" }}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Pool"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
