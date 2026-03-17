"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { OnboardingStepId } from "@/lib/onboarding-funnel"

const TOOL_LINKS = [
  { label: "Trade analyzer & finder", href: "/af-legacy?tab=trade-center" },
  { label: "Mock draft & war room", href: "/af-legacy?tab=mock-draft" },
  { label: "Brackets & pools", href: "/brackets" },
  { label: "Chimmy AI chat", href: "/chimmy" },
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
            Get started by creating a league, joining a league, trying brackets, or using our AI tools.
            We&apos;ll walk you through a few quick steps—or you can skip and explore on your own.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Sport selection */}
      {step === "sport_selection" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Choose your sports</h2>
          <p className="text-white/80">
            Select the sports you follow. We&apos;ll use this to personalize leagues and content.
          </p>
          <div className="flex flex-wrap gap-2">
            {sportOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSport(opt.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
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
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Tool suggestions */}
      {step === "tool_suggestions" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Try these AI tools</h2>
          <p className="text-white/80">
            Trade analyzer, mock draft, brackets, and Chimmy—your AI assistant. Click any link to try
            them.
          </p>
          <ul className="space-y-2">
            {TOOL_LINKS.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => advance(false)}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* League creation prompt */}
      {step === "league_prompt" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Create or join a league</h2>
          <p className="text-white/80">
            You&apos;re all set. Create a league, join one with a code, or create a bracket pool.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/leagues"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 text-center"
            >
              Create league
            </Link>
            <Link
              href="/app/discover"
              className="rounded-xl border border-cyan-400/50 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 text-center"
            >
              Join league
            </Link>
            <Link
              href="/brackets/leagues/new"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 text-center"
            >
              Create bracket pool
            </Link>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => advance(true)}
              disabled={loading}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              Skip — go to dashboard
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-white/50">
        Step {["welcome", "sport_selection", "tool_suggestions", "league_prompt"].indexOf(step) + 1} of 4
      </p>
    </div>
  )
}
