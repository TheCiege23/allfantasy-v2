"use client"

import Link from "next/link"
import { Inbox } from "lucide-react"

export interface EmptyStateAction {
  id: string
  label: string
  href?: string
  onClick?: () => void
  testId?: string
}

export interface EmptyStateRendererProps {
  title: string
  description: string
  icon?: React.ReactNode
  actions?: EmptyStateAction[]
  compact?: boolean
  testId?: string
}

export default function EmptyStateRenderer({
  title,
  description,
  icon,
  actions = [],
  compact = false,
  testId,
}: EmptyStateRendererProps) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] text-center ${
        compact ? "px-4 py-5" : "px-6 py-8"
      }`}
      data-testid={testId}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-cyan-200">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
        {actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={action.id}
                  href={action.href}
                  data-testid={action.testId}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-white/[0.08]"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  data-testid={action.testId}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-white/[0.08]"
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
