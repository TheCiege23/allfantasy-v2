"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  Crown,
  ExternalLink,
  Loader2,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import { trackWcInviteCopied, trackWcFunnelEvent } from "@/lib/world-cup/worldCupFunnelAnalytics"

type Props = { challengeId: string }

type ChallengeInfo = {
  name: string
  inviteCode: string
  inviteUrl: string | null
  participantCount: number
}

const proHref = "/pricing?highlight=af-pro&intent=world-cup"
const commissionerHref = "/pricing?highlight=af-commissioner&intent=world-cup"

export default function WorldCupSuccessClient({ challengeId }: Props) {
  const [info, setInfo] = useState<ChallengeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    trackWcFunnelEvent("WorldCupPoolCreated", { challenge_id: challengeId })

    async function loadChallenge() {
      try {
        const res = await fetch(`/api/brackets/world-cup/${challengeId}`)
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json()
        const c = data?.challenge ?? data?.view?.challenge ?? data
        setInfo({
          name: c?.name ?? "Your World Cup Pool",
          inviteCode: c?.inviteCode ?? "",
          inviteUrl: c?.inviteUrl ?? null,
          participantCount: c?.participantCount ?? 1,
        })
      } catch {
        // Best effort — fall back to minimal info
        setInfo({
          name: "Your World Cup Pool",
          inviteCode: "",
          inviteUrl: null,
          participantCount: 1,
        })
      } finally {
        setLoading(false)
      }
    }

    loadChallenge()
  }, [challengeId])

  const inviteLink = info?.inviteUrl
    ? info.inviteUrl
    : info?.inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://allfantasy.ai"}/join/${info.inviteCode}`
    : `${typeof window !== "undefined" ? window.location.origin : "https://allfantasy.ai"}/brackets/world-cup/join`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      trackWcInviteCopied(challengeId)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable
    }
  }

  const shareText = `Join my 2026 World Cup pool "${info?.name ?? "World Cup Pool"}" on AllFantasy.AI! Make your picks before the tournament starts. Free to join:`
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodeURIComponent(shareText)}`
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${inviteLink}`)}`

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          <p className="text-sm text-white/50">Loading your pool…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 pb-20 text-white">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.22),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(16,185,129,0.10),transparent_40%),linear-gradient(180deg,#07111f_0%,#020617_100%)]" />
      </div>

      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        {/* Success header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="h-10 w-10 text-emerald-300" />
          </div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">
            Your World Cup pool is live.
          </h1>
          {info?.name && (
            <p className="mt-1.5 text-lg font-bold text-cyan-200">{info.name}</p>
          )}
          <p className="mt-3 text-sm text-white/60">
            Invite your crew now and start the competition.
          </p>
        </div>

        {/* ── Invite section ─────────────────────────────────────────── */}
        <div className="mb-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-cyan-200">
            <Share2 className="h-4 w-4" />
            Share your invite link
          </div>

          {/* Copy link row */}
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5">
            <span className="flex-1 truncate text-xs font-mono text-white/70">
              {inviteLink}
            </span>
            <button
              onClick={handleCopy}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                copied
                  ? "bg-emerald-300/20 text-emerald-300"
                  : "bg-cyan-300/15 text-cyan-200 hover:bg-cyan-300/25"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Social share buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWcFunnelEvent("WorldCupInviteCopied", { method: "facebook" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Facebook
            </a>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWcFunnelEvent("WorldCupInviteCopied", { method: "twitter" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14171A] border border-white/15 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
              Post on X
            </a>
          </div>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={async () => {
                try {
                  await navigator.share({ title: info?.name ?? "World Cup Pool", text: shareText, url: inviteLink })
                  trackWcFunnelEvent("WorldCupInviteCopied", { method: "native_share" })
                } catch {
                  // user cancelled or share failed
                }
              }}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-white/70 transition hover:bg-white/[0.09]"
            >
              <Share2 className="h-4 w-4" />
              Share via…
            </button>
          )}
        </div>

        {/* ── Pool stats ─────────────────────────────────────────────── */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Players", value: info?.participantCount ?? 1, Icon: Users },
            { label: "Brackets", value: "0 / ready", Icon: ClipboardList },
            { label: "Status", value: "Open", Icon: Trophy },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <Icon className="h-4 w-4 text-white/40" />
              <div className="text-lg font-black text-white">{value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Next actions ────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-2">
          <Link
            href={`/brackets/world-cup/${challengeId}`}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-6 py-3.5 text-base font-black text-slate-950 shadow-[0_10px_30px_-8px_rgba(34,211,238,0.7)] transition hover:scale-[1.015]"
          >
            <ClipboardList className="h-5 w-5" />
            Build your bracket
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href={`/brackets/world-cup/${challengeId}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.09]"
          >
            Go to pool dashboard
          </Link>
        </div>

        {/* ── Chimmy AI teaser ────────────────────────────────────────── */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
              <Bot className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Want Chimmy AI to help?</p>
              <p className="mt-1 text-xs text-white/55">
                Upgrade to AF Pro for bracket grades, upset picks, group-stage advice, and saved AI reports.
              </p>
            </div>
          </div>
          <Link
            href={proHref}
            onClick={() => trackWcFunnelEvent("AFProUpsellViewed", { source: "success_page" })}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_6px_20px_-6px_rgba(251,191,36,0.6)] transition hover:bg-amber-200"
          >
            <Sparkles className="h-4 w-4" />
            AF Pro — $9.99/mo
          </Link>
        </div>

        {/* ── Commissioner upsell ─────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-400/[0.05] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10">
              <Crown className="h-5 w-5 text-violet-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Run a bigger, better pool?</p>
              <p className="mt-1 text-xs text-white/55">
                AF Commissioner adds custom scoring, bigger pools, pool announcements, and AI-powered commissioner recaps.
              </p>
            </div>
          </div>
          <Link
            href={commissionerHref}
            onClick={() => trackWcFunnelEvent("AFCommissionerUpsellViewed", { source: "success_page" })}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_6px_20px_-6px_rgba(196,181,253,0.5)] transition hover:bg-violet-300"
          >
            <Crown className="h-4 w-4" />
            AF Commissioner — $4.99/mo
          </Link>
        </div>
      </div>
    </main>
  )
}
