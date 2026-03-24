"use client"

import { Loader2 } from "lucide-react"

export interface LoadingStateRendererProps {
  label?: string
  compact?: boolean
  testId?: string
}

export default function LoadingStateRenderer({
  label = "Loading...",
  compact = false,
  testId,
}: LoadingStateRendererProps) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] ${
        compact ? "px-4 py-5" : "px-6 py-8"
      }`}
      data-testid={testId}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
        <span>{label}</span>
      </div>
    </div>
  )
}
