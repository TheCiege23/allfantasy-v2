'use client'

import { AlertCircle, Zap, Bot, TrendingUp } from 'lucide-react'
import type { DraftHelperPanelProps } from '@/components/app/draft-room/DraftHelperPanel'

/** Mirrors draft-room helper feed shapes so callers can pass `DraftHelperPanelProps['sportsFeed']` unchanged. */
interface DraftHelperIntelligenceProps {
  aiFeatureStatus?: DraftHelperPanelProps['aiFeatureStatus']
  sportsFeed?: DraftHelperPanelProps['sportsFeed']
}

export function DraftHelperIntelligence({ aiFeatureStatus, sportsFeed }: DraftHelperIntelligenceProps) {
  const features = [
    { name: 'Chimmy Ready', active: aiFeatureStatus?.chimmyReady, icon: Bot },
    { name: 'Live Brain', active: aiFeatureStatus?.liveBrainReady, icon: Zap },
    { name: 'AI ADP', active: aiFeatureStatus?.aiAdpEnabled, icon: TrendingUp },
    { name: 'Queue Reorder', active: aiFeatureStatus?.queueReorderEnabled, icon: TrendingUp },
  ]

  const activeFeatures = features.filter((f) => f.active)
  const headlines = sportsFeed?.headlines?.slice(0, 3) || []
  const injuries = sportsFeed?.injuries?.slice(0, 2) || []

  return (
    <div className="space-y-2 p-2">
      {/* AI Features Status */}
      {activeFeatures.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Active Features
          </h5>
          <div className="flex flex-wrap gap-1">
            {activeFeatures.map((feature) => (
              <span key={feature.name} className="rounded border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
                ✓ {feature.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Headlines */}
      {headlines.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Headlines
          </h5>
          <div className="space-y-1">
            {headlines.map((headline, idx) => (
              <div key={idx} className="rounded border border-white/12 bg-[#0c1630]/80 p-2 text-xs">
                <p className="text-slate-200 line-clamp-2">{headline.title}</p>
                {headline.playerName && <p className="text-slate-500 text-[10px] mt-1">{headline.playerName}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Injuries */}
      {injuries.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-400 mb-2">Injury Updates</h5>
          <div className="space-y-1">
            {injuries.map((injury, idx) => (
              <div key={idx} className="rounded border border-rose-400/25 bg-rose-500/10 p-2 text-xs">
                <p className="text-red-300 font-medium">{injury.playerName}</p>
                {injury.status && <p className="text-red-200 text-[10px]">{injury.status}</p>}
                {injury.note && <p className="text-slate-400 text-[10px] mt-0.5">{injury.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeFeatures.length && !headlines.length && !injuries.length && (
        <div className="text-center py-4 text-slate-500">
          <p className="text-xs">No intelligence available</p>
        </div>
      )}
    </div>
  )
}
