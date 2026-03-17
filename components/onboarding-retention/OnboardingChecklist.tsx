"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, ChevronRight, Loader2 } from "lucide-react"
import type { OnboardingChecklistState } from "@/lib/onboarding-retention"

const MILESTONE_BY_TASK: Record<string, string> = {
  choose_tools: "onboarding_tool_visit",
  first_ai_action: "onboarding_first_ai",
  referral_share: "onboarding_referral_share",
}

export interface OnboardingChecklistProps {
  initialState?: OnboardingChecklistState | null
  onTaskClick?: (taskId: string, href: string) => void
  className?: string
}

export function OnboardingChecklist({
  initialState,
  onTaskClick,
  className = "",
}: OnboardingChecklistProps) {
  const [state, setState] = useState<OnboardingChecklistState | null>(initialState ?? null)
  const [loading, setLoading] = useState(!initialState)

  const fetchChecklist = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/onboarding/checklist", { cache: "no-store" })
      const data = await res.json()
      if (res.ok) setState(data)
      else setState(null)
    } catch {
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialState) {
      setState(initialState)
      setLoading(false)
      return
    }
    fetchChecklist()
  }, [initialState, fetchChecklist])

  if (loading && !state) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-center gap-2 text-white/50 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading checklist…</span>
      </div>
    )
  }

  if (!state || state.tasks.length === 0) return null

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Get started</h3>
        <span className="text-xs text-white/50">
          {state.completedCount} of {state.totalCount} complete
        </span>
      </div>
      <ul className="space-y-2">
        {state.tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={task.href}
              onClick={() => {
                onTaskClick?.(task.id, task.href)
                const milestone = MILESTONE_BY_TASK[task.id]
                if (milestone && !task.completed) {
                  fetch("/api/onboarding/checklist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ milestone }),
                  }).catch(() => {})
                }
              }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition"
            >
              <div className="shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
                ) : (
                  <Circle className="h-5 w-5 text-white/30" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completed ? "text-white/70" : "text-white"}`}>
                  {task.label}
                </p>
                <p className="text-xs text-white/50 mt-0.5">{task.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {state.isFullyComplete && (
        <p className="mt-3 text-xs text-emerald-400/80">All set! You’re ready to get the most out of AllFantasy.</p>
      )}
    </div>
  )
}
