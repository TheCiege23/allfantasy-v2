"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  Crown,
  Flame,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react"
import { trackWcLandingViewContent, trackWcFunnelEvent } from "@/lib/world-cup/worldCupFunnelAnalytics"

// Route the Create CTA to the guest-first draft flow
const createHref = "/world-cup/create"
const joinHref = "/brackets/world-cup/join"
const bracketHref = "/brackets/world-cup"
const proHref = "/pricing?highlight=af-pro&intent=world-cup"
const commissionerHref = "/pricing?highlight=af-commissioner&intent=world-cup"

const steps = [
  {
    num: "1",
    color: "bg-cyan-300",
    title: "Name your pool",
    body: "Start with a free World Cup pool and default scoring that works for casual fans.",
  },
  {
    num: "2",
    color: "bg-amber-300",
    title: "Invite your crew",
    body: "Share your pool link with friends, family, coworkers, group chats, or soccer communities.",
  },
  {
    num: "3",
    color: "bg-emerald-300",
    title: "Make picks before kickoff",
    body: "Build your bracket, follow group-stage action, and compete for bragging rights.",
  },
]

const aiCards = [
  {
    title: "AF Pro",
    price: "$9.99/mo",
    Icon: Sparkles,
    body: "Bracket grades, group-stage advice, knockout strategy, upset picks, team comparisons, and saved AI reports.",
    href: proHref,
    cta: "Unlock AI tools",
    accent: "amber",
  },
  {
    title: "AF Commissioner",
    price: "$4.99/mo",
    Icon: Crown,
    body: "Custom scoring, bigger pools, pool announcements, invite tools, leaderboard exports, and AI commissioner recaps.",
    href: commissionerHref,
    cta: "Upgrade commissioner tools",
    accent: "violet",
  },
]

const trustItems = [
  { Icon: CheckCircle2, label: "Free to start", color: "text-emerald-300" },
  { Icon: ShieldCheck, label: "No gambling", color: "text-cyan-300" },
  { Icon: Bot, label: "AI optional", color: "text-amber-200" },
  { Icon: Lock, label: "Private groups", color: "text-white/60" },
]

export default function WorldCupAdLandingPage() {
  useEffect(() => {
    trackWcLandingViewContent()
    trackWcFunnelEvent("WorldCupLandingViewed")
  }, [])

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 pb-28 text-white sm:pb-0">
      {/* ── Urgency banner ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-cyan-200/10 bg-slate-950/90 px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-xl">
        <span className="inline-flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-amber-300" />
          Brackets lock when the tournament starts
          <Flame className="h-3.5 w-3.5 text-amber-300" />
        </span>
      </div>

      {/* ── Atmosphere ──────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.35),transparent_34%),radial-gradient(circle_at_12%_18%,rgba(250,204,21,0.22),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(168,85,247,0.16),transparent_26%),linear-gradient(180deg,#07111f_0%,#020617_58%,#01030a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.45)]">
            AF
          </span>
          <span className="hidden sm:inline">AllFantasy.AI</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-bold">
          <Link
            href={joinHref}
            className="rounded-full border border-white/15 px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Join Pool
          </Link>
          <Link
            href="/login?callbackUrl=/brackets/world-cup"
            className="rounded-full bg-white px-3 py-2 text-slate-950 transition hover:bg-cyan-100"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative isolate mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.20em] text-emerald-200 lg:mx-0">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
              World Cup pools are open
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.0] tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
              Create Your 2026 World Cup Pool{" "}
              <span className="text-cyan-300">in 60 Seconds</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300/85 sm:text-lg lg:mx-0">
              Invite friends, build brackets, track standings, and use Chimmy AI to help predict the tournament.{" "}
              <strong className="text-white">Free to start. No gambling. Just bragging rights.</strong>
            </p>

            {/* 3-step visual */}
            <div className="mt-7 grid gap-2 rounded-3xl border border-white/10 bg-white/[0.055] p-3 text-left shadow-2xl backdrop-blur sm:max-w-xl lg:max-w-none">
              {steps.map(({ num, color, title, body }) => (
                <div key={num} className="flex items-center gap-3 rounded-2xl bg-slate-950/70 px-4 py-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color} text-sm font-black text-slate-950`}>
                    {num}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="text-xs text-white/55">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={createHref}
                onClick={() => trackWcFunnelEvent("WorldCupCreatePoolClicked", { source: "hero" })}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-8 py-4 text-base font-black text-slate-950 shadow-[0_18px_55px_-18px_rgba(34,211,238,0.9)] transition hover:scale-[1.015] active:scale-[0.99]"
              >
                Create Free Pool
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="flex gap-2 sm:gap-3">
                <Link
                  href={joinHref}
                  className="inline-flex flex-1 min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/12"
                >
                  <Users className="h-4 w-4" />
                  Join Pool
                </Link>
                <Link
                  href={bracketHref}
                  className="inline-flex flex-1 min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/12"
                >
                  <ClipboardList className="h-4 w-4" />
                  My Bracket
                </Link>
              </div>
            </div>

            {/* Trust pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-white/65 lg:justify-start">
              {trustItems.map(({ Icon, label, color }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Pool preview card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-cyan-400/15 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.20em] text-cyan-200">Live pool preview</p>
                    <h2 className="mt-1.5 text-xl font-black text-white">Family World Cup Pool</h2>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-2xl text-slate-950 shadow-[0_0_30px_rgba(252,211,77,0.35)]">
                    🏆
                  </div>
                </div>

                {/* Leaderboard preview */}
                <div className="mt-4 space-y-1.5">
                  {[
                    { rank: 1, name: "You", pts: 124, highlight: true },
                    { rank: 2, name: "Mike T.", pts: 118, highlight: false },
                    { rank: 3, name: "Sarah K.", pts: 112, highlight: false },
                    { rank: 4, name: "Dad", pts: 98, highlight: false },
                  ].map(({ rank, name, pts, highlight }) => (
                    <div
                      key={rank}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                        highlight
                          ? "bg-cyan-300/15 border border-cyan-300/25"
                          : "bg-white/[0.04]"
                      }`}
                    >
                      <span className={`w-5 text-center text-xs font-black ${highlight ? "text-cyan-200" : "text-white/40"}`}>
                        #{rank}
                      </span>
                      <span className={`flex-1 text-sm font-bold ${highlight ? "text-cyan-100" : "text-white/70"}`}>
                        {name}
                      </span>
                      <span className={`text-sm font-black tabular-nums ${highlight ? "text-cyan-200" : "text-white/50"}`}>
                        {pts} pts
                      </span>
                    </div>
                  ))}
                </div>

                {/* Invite prompt */}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-cyan-300/30 bg-cyan-300/[0.06] px-3 py-2.5">
                  <Share2 className="h-4 w-4 shrink-0 text-cyan-300" />
                  <span className="flex-1 text-xs text-cyan-200/80">Share your invite link to add friends</span>
                  <Copy className="h-3.5 w-3.5 text-cyan-300/60" />
                </div>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-[10px] text-white/40">
                  <span>8 players</span>
                  <span>·</span>
                  <span>48 group picks</span>
                  <span>·</span>
                  <span className="text-emerald-300/70">● Open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">How AF World Cup Pools Work</h2>
          <p className="mt-2 text-sm text-white/55">Start in seconds. No fantasy sports experience required.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Create your pool", body: "Start with a free World Cup pool and default scoring that works for casual fans.", icon: Trophy, color: "text-cyan-300 bg-cyan-300/10 border-cyan-300/25" },
            { step: "2", title: "Invite your crew", body: "Share your pool link with friends, family, coworkers, group chats, or soccer fans.", icon: Users, color: "text-violet-300 bg-violet-300/10 border-violet-300/25" },
            { step: "3", title: "Build brackets", body: "Make picks before kickoff. Choose group-stage winners and predict the knockout rounds.", icon: ClipboardList, color: "text-amber-300 bg-amber-300/10 border-amber-300/25" },
            { step: "4", title: "Use AI when ready", body: "Upgrade for bracket grades, upset picks, and commissioner intelligence reports.", icon: Bot, color: "text-emerald-300 bg-emerald-300/10 border-emerald-300/25" },
          ].map(({ step, title, body, icon: Icon, color }) => (
            <div key={step} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/30">Step {step}</div>
                <h3 className="text-sm font-black text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-white/55">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Chimmy AI teaser ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.07] to-slate-950 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_40px_-5px_rgba(34,211,238,0.35)]">
              <Bot className="h-8 w-8 text-cyan-300" />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.20em] text-cyan-300">Chimmy AI</div>
              <h2 className="text-xl font-black text-white sm:text-2xl">Your AI World Cup co-pilot</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Ask Chimmy who wins each group, which upsets to pick, how to build your bracket, or who has the best path through the knockout stage. AI help is optional and available when you&apos;re ready to upgrade.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Who wins Group A?", "Best upset picks", "Grade my bracket", "Dark horse teams"].map((q) => (
                  <span key={q} className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1 text-xs font-bold text-cyan-200/70">
                    {q}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/35">AI available with</p>
              <Link
                href={proHref}
                onClick={() => trackWcFunnelEvent("AFProUpsellViewed", { source: "chimmy_section" })}
                className="block rounded-xl bg-amber-300 px-5 py-2.5 text-center text-sm font-black text-slate-950 shadow-[0_8px_25px_-8px_rgba(251,191,36,0.6)] transition hover:bg-amber-200"
              >
                AF Pro — $9.99/mo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Upgrade cards ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black text-white sm:text-2xl">Upgrade your pool experience</h2>
          <p className="mt-1.5 text-sm text-white/50">Start free. Upgrade when your pool is live.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {aiCards.map(({ title, price, Icon, body, href, cta, accent }) => {
            const accentCls = accent === "amber"
              ? "border-amber-300/25 bg-amber-300/[0.06] text-amber-200 from-amber-300 to-amber-400 text-slate-950"
              : "border-violet-400/25 bg-violet-400/[0.06] text-violet-200 from-violet-300 to-violet-400 text-slate-950"
            const btnCls = accent === "amber"
              ? "bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 shadow-[0_8px_25px_-8px_rgba(251,191,36,0.6)]"
              : "bg-gradient-to-b from-violet-300 to-violet-400 text-slate-950 shadow-[0_8px_25px_-8px_rgba(196,181,253,0.5)]"
            const iconBg = accent === "amber" ? "border-amber-300/30 bg-amber-300/10 text-amber-300" : "border-violet-400/30 bg-violet-400/10 text-violet-300"
            return (
              <div
                key={title}
                className={`flex flex-col gap-4 rounded-2xl border p-5 backdrop-blur ${accentCls.split(" ")[0]} ${accentCls.split(" ")[1]}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-black text-white">{title}</div>
                    <div className="text-xs text-white/50">{price}</div>
                  </div>
                </div>
                <p className="flex-1 text-sm leading-6 text-white/60">{body}</p>
                <Link
                  href={href}
                  onClick={() => trackWcFunnelEvent(title === "AF Pro" ? "AFProUpsellViewed" : "AFCommissionerUpsellViewed", { source: "upgrade_cards" })}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition hover:opacity-90 ${btnCls}`}
                >
                  <Zap className="h-4 w-4" />
                  {cta}
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
        <div className="rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-8 backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-300/10 text-3xl">
            🏆
          </div>
          <h2 className="text-2xl font-black text-white">Ready to start your pool?</h2>
          <p className="mt-2 text-sm text-white/55">Takes 60 seconds. No gambling. No commitments.</p>
          <Link
            href={createHref}
            onClick={() => trackWcFunnelEvent("WorldCupCreatePoolClicked", { source: "final_cta" })}
            className="mt-6 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-9 py-4 text-base font-black text-slate-950 shadow-[0_18px_55px_-18px_rgba(34,211,238,0.9)] transition hover:scale-[1.015] active:scale-[0.99]"
          >
            Create Free Pool
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-white/40">
            <span>Free to start</span>
            <span>·</span>
            <span>No gambling</span>
            <span>·</span>
            <span>AI optional</span>
            <span>·</span>
            <span>Private groups</span>
          </div>
        </div>
      </section>

      {/* ── Sticky mobile CTA ────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-950/95 p-4 backdrop-blur-xl sm:hidden border-t border-white/10">
        <Link
          href={createHref}
          onClick={() => trackWcFunnelEvent("WorldCupCreatePoolClicked", { source: "sticky_mobile" })}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-6 text-base font-black text-slate-950 shadow-[0_8px_30px_-8px_rgba(34,211,238,0.8)] active:scale-[0.98]"
        >
          Create Free Pool
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </main>
  )
}
