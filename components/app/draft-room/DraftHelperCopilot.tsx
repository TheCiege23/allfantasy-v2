'use client'

import { Sparkles } from 'lucide-react'
import type { DraftRecommendation } from '@/components/app/draft-room/DraftHelperPanel'

interface DraftHelperCopilotProps {
  loading: boolean
  recommendation: DraftRecommendation | null
  alternatives: Array<{ player: { name: string; position: string; team?: string | null }; reason: string; confidence: number }>
  onRefresh: () => void
  onPlayerClick?: (player: { name: string; position: string; team?: string | null }) => void
  explanation: string
  evidence: string[]
  caveats: string[]
  round: number
  pick: number
  sport: string
}

export function DraftHelperCopilot({
  loading,
  recommendation,
  alternatives,
  onRefresh,
  explanation,
  evidence,
  caveats,
}: DraftHelperCopilotProps) {
  if (!recommendation?.player?.name) {
    return (
      <div className="text-center py-4 text-slate-400">
        <p className="text-sm">No recommendation available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-2">
      {/* Main Recommendation */}
      <div className="bg-slate-800/50 rounded p-3 border border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-white">{recommendation.player.name}</h4>
            <p className="text-xs text-slate-400">
              {recommendation.player.position}
              {recommendation.player.team && ` • ${recommendation.player.team}`}
            </p>
            <p className="text-xs text-slate-300 mt-1">{recommendation.reason}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-cyan-400">{Math.round(recommendation.confidence * 100)}%</div>
            <div className="text-xs text-slate-500">confidence</div>
          </div>
        </div>
      </div>

      {/* Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-2">Alternatives</h5>
          <div className="space-y-1">
            {alternatives.slice(0, 3).map((alt, idx) => (
              <div key={idx} className="text-xs bg-slate-900/50 p-2 rounded border border-slate-700/50">
                <p className="text-white font-medium">{alt.player.name}</p>
                <p className="text-slate-500">{alt.player.position}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-1">Explanation</h5>
          <p className="text-xs text-slate-300 bg-slate-900/30 p-2 rounded">{explanation}</p>
        </div>
      )}

      {/* Evidence */}
      {evidence && evidence.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-1">Evidence</h5>
          <ul className="text-xs text-slate-300 space-y-1 ml-3">
            {evidence.slice(0, 3).map((item, idx) => (
              <li key={idx} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
      >
        {loading ? 'Refreshing...' : 'Refresh Recommendation'}
      </button>
    </div>
  )
}
