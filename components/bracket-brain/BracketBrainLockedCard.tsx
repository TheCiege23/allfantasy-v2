"use client"

import { Lock } from "lucide-react"

/**
 * Shown when Bracket Brain AI requires AF Pro (-world-cup matchup Ask AI / Explain, etc.).
 */
export default function BracketBrainLockedCard({
  className = "",
}: {
  className?: string
}) {
  return (
    <div
      data-testid="wc-bracket-brain-locked-card"
      className={`rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2 ${className}`}
    >
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/90" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
            Bracket Brain AI
          </p>
          <p className="text-[10px] leading-snug text-white/45">
            Upgrade to AF Pro for Ask AI and deep matchup explanations. Basic matchup stats above remain
            available without Pro.
          </p>
        </div>
      </div>
    </div>
  )
}
