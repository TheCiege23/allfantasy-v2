'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import EspnImportForm from "@/components/EspnImportForm"

type ImportResult = {
  imported: number
  seasons: number
  sports: Record<string, number>
  years: number[]
  displayName: string
}

function getImportErrorMessage(data: { error?: string } | null | undefined, fallback: string) {
  if (data?.error === "VERIFICATION_REQUIRED") {
    return "Verify your email or phone before importing leagues."
  }
  if (data?.error === "AGE_REQUIRED") {
    return "Confirm that you are 18+ before importing leagues."
  }
  if (
    data?.error === "UNAUTHENTICATED" ||
    data?.error === "Unauthorized" ||
    data?.error === "You must be logged in to import" ||
    data?.error === "Authentication required"
  ) {
    return "Sign in to import leagues."
  }
  return data?.error || fallback
}

export default function ImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/import")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] text-white/70">
        Loading…
      </div>
    )
  }

  if (status === "unauthenticated" || !session?.user?.id) {
    return null
  }

  async function handleSleeperImport() {
    const username = inputRef.current?.value?.trim() || ""
    if (!username) {
      setImportError("Please enter your Sleeper username")
      return
    }
    setLoading(true)
    setImportError(null)
    setResult(null)

    try {
      const res = await fetch("/api/leagues/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, platform: "sleeper" }),
      })

      const text = await res.text()
      let data: ImportResult & { error?: string }
      try {
        data = JSON.parse(text) as ImportResult & { error?: string }
      } catch {
        throw new Error(`Server error: ${text.slice(0, 200)}`)
      }

      if (!res.ok) {
        throw new Error(getImportErrorMessage(data, data.error || `Import failed (HTTP ${res.status})`))
      }

      setResult({
        imported: data.imported ?? 0,
        seasons: data.seasons ?? 0,
        sports: data.sports ?? {},
        years: Array.isArray(data.years) ? data.years : [],
        displayName: data.displayName ?? username,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Import failed. Please try again."
      setImportError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] py-20">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-5xl font-bold text-transparent">
          Import Your League
        </h1>
        <p className="mb-12 text-center text-gray-400">
          Sleeper has broader import coverage today. ESPN currently imports teams and weekly scores.
        </p>

        <div className="space-y-12">
          <div className="rounded-2xl border border-white/10 bg-[#0a1228]/90 p-4 backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex flex-col space-y-1.5 pb-3">
              <div className="flex items-center gap-3 text-xl font-bold leading-none tracking-tight text-white">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] font-black text-white"
                  style={{ background: "linear-gradient(135deg, #1a9e5c, #16a34a)" }}
                  aria-hidden
                >
                  S
                </div>
                <span>Import from Sleeper</span>
              </div>
              <p className="text-xs text-slate-400 sm:text-sm">
                Connect your Sleeper account to import all your leagues and every season automatically — from 2017 to 2027.
              </p>
            </div>

            <div className="space-y-4 pt-0">
              <div>
                <label htmlFor="sleeper-username" className="mb-1 block text-sm text-slate-400">
                  Sleeper Username
                </label>
                <input
                  ref={inputRef}
                  id="sleeper-username"
                  type="text"
                  defaultValue=""
                  placeholder="e.g. your Sleeper username"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-white/30 transition-colors focus:border-cyan-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <ul className="mt-2 space-y-1">
                {["All sports (NFL, NBA)", "All seasons (2017 → 2027)", "Dynasty, redraft, and best ball"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2 text-[12px] text-white/60">
                      <span className="text-green-400">✓</span> {t}
                    </li>
                  ),
                )}
              </ul>

              <button
                type="button"
                onClick={() => void handleSleeperImport()}
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-cyan-600 py-3 text-[14px] font-bold text-white transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Scanning all seasons... (~20s)
                  </span>
                ) : (
                  "Import All Leagues"
                )}
              </button>

              {importError ? (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-[13px] text-red-400">⚠ {importError}</p>
                </div>
              ) : null}

              {result ? (
                <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <p className="mb-1 text-[15px] font-bold text-green-400">✅ Import Complete!</p>
                  <p className="text-[13px] text-white/70">
                    {result.imported} leagues imported across {result.seasons} seasons
                  </p>
                  {Object.keys(result.sports).length > 0 ? (
                    <p className="mt-1 text-[11px] text-white/40">
                      {Object.entries(result.sports)
                        .map(([s, n]) => `${s}: ${n}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black hover:bg-cyan-400"
                  >
                    View My Leagues →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <EspnImportForm />
        </div>
      </div>
    </div>
  )
}
