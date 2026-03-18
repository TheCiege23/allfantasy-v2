"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Trophy,
  DraftingCompass,
  Bot,
  BarChart3,
  ClipboardList,
  Target,
  MessageCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import type { OnboardingStepId } from "@/lib/onboarding-funnel"

const WALKTHROUGH_CARDS = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your home base: leagues, matchups, and quick actions.",
  },
  {
    icon: Trophy,
    title: "Leagues",
    description: "Create or join leagues, manage rosters, and track standings.",
  },
  {
    icon: DraftingCompass,
    title: "Draft & tools",
    description: "Mock drafts, war room, trade analyzer, and waiver AI.",
  },
  {
    icon: Bot,
    title: "AI assistant",
    description: "Chimmy helps with trades, waivers, drafts, and strategy.",
  },
]

const AI_FEATURE_CARDS = [
  {
    icon: BarChart3,
    title: "Trade Analyzer",
    description: "AI fairness grades and counter-offers for any trade.",
    href: "/trade-analyzer",
  },
  {
    icon: ClipboardList,
    title: "Waiver AI",
    description: "Pickup priorities and lineup suggestions for your league.",
    href: "/waiver-ai",
  },
  {
    icon: Target,
    title: "Draft War Room",
    description: "Mock drafts and AI pick suggestions in real time.",
    href: "/mock-draft",
  },
  {
    icon: MessageCircle,
    title: "Chimmy Chat",
    description: "Ask anything about your league—drafts, trades, waivers.",
    href: "/chimmy",
  },
]

const STEP_ORDER: OnboardingStepId[] = [
  "welcome",
  "app_walkthrough",
  "sport_selection",
  "tool_suggestions",
  "league_prompt",
]

interface OnboardingFunnelClientProps {
  initialStep: OnboardingStepId
  sportOptions: { value: string; label: string }[]
  preferredSportsInitial: string[]
}

export default function OnboardingFunnelClient({
  initialStep,
  sportOptions,
  preferredSportsInitial,
}: OnboardingFunnelClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStepId>(initialStep)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedSports, setSelectedSports] = useState<string[]>(preferredSportsInitial)

  useEffect(() => {
    setStep(initialStep)
  }, [initialStep])

  useEffect(() => {
    if (step === "completed") {
      router.replace("/dashboard")
      return
    }
  }, [step, router])

  async function advance(completeFunnel = false) {
    setLoading(true)
    setError("")
    try {
      const body: { step: OnboardingStepId; completeFunnel?: boolean; preferredSports?: string[] } = {
        step,
        ...(completeFunnel && { completeFunnel: true }),
      }
      if (step === "sport_selection" && selectedSports.length > 0) {
        body.preferredSports = selectedSports
      }
      const res = await fetch("/api/onboarding/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        setLoading(false)
        return
      }
      setStep(data.nextStep ?? "completed")
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setLoading(false)
  }

  function toggleSport(value: string) {
    setSelectedSports((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  const stepIndex = STEP_ORDER.indexOf(step)
  const stepLabel = stepIndex >= 0 ? `Step ${stepIndex + 1} of ${STEP_ORDER.length}` : ""

  if (step === "completed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/80">
        <p>Taking you to your dashboard…</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Welcome */}
      {step === "welcome" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Welcome to AllFantasy</h2>
          <p className="text-white/80">
            We&apos;ll walk you through the app, your favorite sports, AI features, and how to find or create a league. Takes about a minute—or skip and explore on your own.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="min-h-[44px] rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 touch-manipulation"
            >
              Start walkthrough
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* App walkthrough */}
      {step === "app_walkthrough" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Quick app tour</h2>
          <p className="text-white/80">
            Here&apos;s what you&apos;ll find inside AllFantasy:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {WALKTHROUGH_CARDS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-white">{title}</span>
                </div>
                <p className="text-xs text-white/70">{description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="min-h-[44px] rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 touch-manipulation"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Sport selection */}
      {step === "sport_selection" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Pick your favorite sports</h2>
          <p className="text-white/80">
            We&apos;ll use this to suggest leagues and personalize your experience.
          </p>
          <div className="flex flex-wrap gap-2">
            {sportOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSport(opt.value)}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm touch-manipulation ${
                  selectedSports.includes(opt.value)
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                    : "border-white/20 text-white/80 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="min-h-[44px] rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 touch-manipulation"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* AI features */}
      {step === "tool_suggestions" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            AI features to try
          </h2>
          <p className="text-white/80">
            Trade grades, waiver priorities, draft help, and Chimmy—your AI assistant. Click any card to try it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {AI_FEATURE_CARDS.map(({ icon: Icon, title, description, href }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-cyan-400/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-white">{title}</span>
                </div>
                <p className="text-xs text-white/70 mb-3 flex-1">{description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400">
                  Try it <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="min-h-[44px] rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 touch-manipulation"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* League suggest */}
      {step === "league_prompt" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Create or join a league</h2>
          <p className="text-white/80">
            You&apos;re all set. Create your own league, discover leagues we suggest based on your sports, or join one with a code.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/create-league"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 text-center touch-manipulation"
            >
              Create league
            </Link>
            <Link
              href="/app/discover"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 text-center touch-manipulation"
            >
              <Sparkles className="h-4 w-4" />
              Discover suggested leagues
            </Link>
            <Link
              href="/brackets/leagues/new"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 text-center touch-manipulation"
            >
              Create bracket pool
            </Link>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="min-h-[44px] rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50 touch-manipulation"
            >
              Skip — go to dashboard
            </button>
          </div>
        </div>
      )}

      {stepLabel && (
        <p className="text-xs text-white/50">{stepLabel}</p>
      )}
    </div>
  )
}
