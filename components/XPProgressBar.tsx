"use client"

/**
 * Progress within current tier (0–100). Legendary shows full.
 */
export function XPProgressBar({
  progressInTier = 0,
  totalXP,
  xpRemainingToNextTier,
  currentTier,
  className = "",
}: {
  progressInTier?: number
  totalXP: number
  xpRemainingToNextTier: number
  currentTier: string
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, progressInTier ?? 0))
  const isLegendary = currentTier === "Legendary GM"

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-white/60">
        <span>{totalXP} XP</span>
        {!isLegendary && xpRemainingToNextTier > 0 && (
          <span>{xpRemainingToNextTier} to next tier</span>
        )}
        {isLegendary && <span>Max tier</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-cyan-500/80 transition-all duration-300"
          style={{ width: `${isLegendary ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}
