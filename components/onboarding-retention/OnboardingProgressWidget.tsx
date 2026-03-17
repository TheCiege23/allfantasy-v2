"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckCircle2, ListTodo } from "lucide-react"
import type { OnboardingChecklistState } from "@/lib/onboarding-retention"

export interface OnboardingProgressWidgetProps {
  initialState?: OnboardingChecklistState | null
  className?: string
}

export function OnboardingProgressWidget({ initialState, className = "" }: OnboardingProgressWidgetProps) {
  const [state, setState] = useState<OnboardingChecklistState | null>(initialState ?? null)

  useEffect(() => {
    if (initialState) {
      setState(initialState)
      return
    }
    fetch("/api/onboarding/checklist", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setState(data))
      .catch(() => setState(null))
  }, [initialState])

  if (!state || state.isFullyComplete) return null

  return (
    <Link
      href="/onboarding/funnel"
      className={`flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 hover:bg-cyan-500/15 transition ${className}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
        <ListTodo className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-cyan-100">Onboarding progress</p>
        <p className="text-xs text-white/60">
          {state.completedCount} of {state.totalCount} steps complete
        </p>
      </div>
      <CheckCircle2 className="h-5 w-5 text-cyan-400/60 shrink-0" />
    </Link>
  )
}
