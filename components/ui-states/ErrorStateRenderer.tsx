"use client"

import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

export interface ErrorStateAction {
  id: string
  label: string
  href?: string
  onClick?: () => void
  testId?: string
}

export interface ErrorStateRendererProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  actions?: ErrorStateAction[]
  compact?: boolean
  testId?: string
}

export default function ErrorStateRenderer({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  actions = [],
  compact = false,
  testId,
}: ErrorStateRendererProps) {
  return (
    <div
      className={`rounded-3xl border border-amber-400/20 bg-amber-500/10 ${
        compact ? "px-4 py-4" : "px-6 py-6"
      }`}
      data-testid={testId}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-500/15 text-amber-200">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-100">{title}</p>
          <p className="mt-1 text-sm text-amber-50/90">{message}</p>
          {(onRetry || actions.length > 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300/35 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
                  data-testid="error-state-retry"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {retryLabel}
                </button>
              ) : null}
              {actions.map((action) =>
                action.href ? (
                  <Link
                    key={action.id}
                    href={action.href}
                    data-testid={action.testId}
                    className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.12]"
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    data-testid={action.testId}
                    className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.12]"
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
