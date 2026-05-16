"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertTriangle, Calendar, Copy, Globe, Loader2, Lock, Share2, Trophy, Users } from "lucide-react"
import { signupUrlWithReturnTo } from "@/lib/auth/auth-intent-resolver"
import {
  type InviteInfo,
  getBrowserWorldCupInviteUrl,
  getBracketBlockReason,
  mapJoinError,
} from "@/lib/world-cup/worldCupBracketUtils"

export type { InviteInfo }
export { getBracketBlockReason, mapJoinError }

export default function WorldCupJoinInvite({ invite }: { invite: InviteInfo }) {
  const router = useRouter()
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinPassword, setJoinPassword] = useState("")
  const autoContinueAttemptedRef = useRef(false)

  const blockReason = getBracketBlockReason(invite)
  const joinPath = `/join/bracket/${invite.inviteCode}`
  const requiresJoinPassword = Boolean(invite.joinPreview?.requiresJoinPassword)
  const isLocked = invite.status === "locked"
  const canJoin = !blockReason && !isLocked

  async function copyLink() {
    const currentInviteUrl = getBrowserWorldCupInviteUrl({ inviteCode: invite.inviteCode })
    try {
      await navigator.clipboard?.writeText(currentInviteUrl)
    } catch {
      // Clipboard can be unavailable in some browser contexts.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  async function shareLink() {
    const currentInviteUrl = getBrowserWorldCupInviteUrl({ inviteCode: invite.inviteCode })
    if (navigator.share) {
      try {
        await navigator.share({
          title: invite.name,
          text: `Join my ${invite.seasonYear} FIFA World Cup bracket challenge`,
          url: currentInviteUrl,
        })
        return
      } catch {
        // fallthrough to copy
      }
    }
    await copyLink()
  }

  const join = useCallback(async (options?: { auto?: boolean }) => {
    if (requiresJoinPassword && options?.auto) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/brackets/world-cup/invite/${invite.inviteCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinPassword: requiresJoinPassword ? joinPassword : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const mapped = mapJoinError(data.error ?? "")
        if (mapped === "__login__") {
          router.push(`/login?callbackUrl=${encodeURIComponent(joinPath)}&returnTo=${encodeURIComponent(joinPath)}`)
          return
        }
        throw new Error(mapped)
      }
      router.push(`/brackets/world-cup/${data.challengeId}?tab=group-stage`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join bracket")
    } finally {
      setLoading(false)
    }
  }, [invite.inviteCode, joinPassword, joinPath, requiresJoinPassword, router])

  useEffect(() => {
    if (status !== "authenticated") return
    if (autoContinueAttemptedRef.current) return
    if (!canJoin || requiresJoinPassword) return
    autoContinueAttemptedRef.current = true
    void join({ auto: true })
  }, [canJoin, join, requiresJoinPassword, status])

  useEffect(() => {
    if (status !== "unauthenticated") return
    if (!canJoin) return
    router.push(`/login?callbackUrl=${encodeURIComponent(joinPath)}&returnTo=${encodeURIComponent(joinPath)}`)
  }, [canJoin, joinPath, router, status])

  return (
    <div className="min-h-screen bg-[#05070b] px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40">
          {/* Icon + title */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-300 text-black">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black leading-tight">{invite.name}</h1>
          <p className="mt-2 text-sm text-white/50">
            {invite.ownerName} invited you to a {invite.seasonYear} FIFA World Cup bracket challenge.
          </p>

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                <Users className="h-3 w-3" /> Players
              </div>
              <div className="mt-1 font-black">{invite.participantCount}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                <Globe className="h-3 w-3" /> Status
              </div>
              <div className="mt-1 font-black capitalize">{invite.status}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                <Calendar className="h-3 w-3" /> Season
              </div>
              <div className="mt-1 font-black">{invite.seasonYear}</div>
            </div>
          </div>

          {/* Block reason banner */}
          {blockReason && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>{blockReason}</span>
            </div>
          )}

          {/* Locked notice */}
          {isLocked && !blockReason && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>Picks are locked for this bracket. You can join to view the leaderboard but cannot make picks.</span>
            </div>
          )}

          {/* API error */}
          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CTA */}
          <div className="mt-5 space-y-3">
            {canJoin ? (
              <>
                {requiresJoinPassword ? (
                  <label className="block text-xs font-bold text-white/65">
                    Join password
                    <input
                      type="password"
                      data-testid="world-cup-invite-join-password"
                      value={joinPassword}
                      onChange={(event) => setJoinPassword(event.target.value)}
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/45"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  data-testid="world-cup-invite-join-submit"
                  onClick={() => void join()}
                  disabled={loading || (requiresJoinPassword && joinPassword.trim().length === 0)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-black disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Join and Make Picks
                </button>
              </>
            ) : (
              <Link
                href={`/brackets/world-cup/${invite.challengeId}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/70"
              >
                View Bracket
              </Link>
            )}

            {/* Share row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/[0.08]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                onClick={shareLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/[0.08]"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>

          {canJoin ? (
            <p className="mt-4 text-center text-xs text-white/45">
              New to AllFantasy?{" "}
              <Link href={signupUrlWithReturnTo(joinPath)} className="font-bold text-cyan-200 underline">
                Create an account to join this pool.
              </Link>
            </p>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
