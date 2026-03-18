"use client"

import Link from "next/link"
import { AlertTriangle, Home, RotateCcw } from "lucide-react"

type DashboardUnavailableStateProps = {
  title: string
  message: string
  missing?: string[]
  onRetry?: () => void
}

export default function DashboardUnavailableState({
  title,
  message,
  missing = [],
  onRetry,
}: DashboardUnavailableStateProps) {
  const uniqueMissing = Array.from(new Set(missing.filter(Boolean)))

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full overflow-hidden rounded-3xl border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_55%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(15,23,42,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500" />
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
                Dashboard status
              </p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">{message}</p>
            </div>
          </div>

          {uniqueMissing.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Missing configuration
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {uniqueMissing.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-white/55">
                If you manage this deployment, add the missing environment variables in Vercel and
                redeploy before retrying.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/25"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
            )}
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
              Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
