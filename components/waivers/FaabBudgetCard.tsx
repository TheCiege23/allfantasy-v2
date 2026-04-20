"use client"

import { DollarSign } from "lucide-react"

type Props = {
  faabRemaining: number | null
  /** League cap from settings, if known */
  budgetCap?: number | null
  loading?: boolean
  className?: string
}

/**
 * FAAB balance chip for waiver wire header / sidebar.
 */
export default function FaabBudgetCard({ faabRemaining, budgetCap, loading, className = "" }: Props) {
  if (loading) {
    return (
      <span
        className={`inline-flex h-8 min-w-[7rem] animate-pulse rounded-lg border border-white/10 bg-white/5 ${className}`}
        data-testid="faab-budget-card-loading"
      />
    )
  }
  if (faabRemaining == null) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200 sm:text-sm ${className}`}
      data-testid="faab-budget-card"
    >
      <DollarSign className="h-3.5 w-3.5 shrink-0" />
      FAAB: {faabRemaining}
      {budgetCap != null && budgetCap > 0 ? (
        <span className="text-cyan-200/70">/ {budgetCap}</span>
      ) : null}
    </span>
  )
}
