'use client'

import { Shield, CheckCircle, AlertCircle, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

export function AFWarRoomModal({ open, onClose, leagueName }: { open: boolean; onClose: () => void; leagueName: string }) {
  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="AF War Room" subtitle="Executive strategy command center"
      accentColor="rose"
      icon={<Shield className="h-5 w-5" />}
      chimmyPrompt={`Give me a full strategic analysis and action plan for ${leagueName}`}
    >
      {/* Premium hero section */}
      <div className="mb-5 rounded-2xl border border-rose-500/15 bg-gradient-to-br from-rose-500/[0.06] to-violet-500/[0.04] px-5 py-5">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-rose-400/60">Season Strategy</p>
        <p className="text-[14px] font-bold text-white/80">Your front-office command center for long-term dominance.</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Import and sync a league to unlock roster strengths, weaknesses, contender/retool/rebuild reads, and a personalized AI action checklist.
        </p>
      </div>

      {/* Strategy framework */}
      <div className="grid grid-cols-2 gap-2">
        <StrategyCard icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} title="Strengths" desc="Core roster pillars" accent="emerald" />
        <StrategyCard icon={<TrendingDown className="h-4 w-4 text-red-400" />} title="Weaknesses" desc="Gaps to address" accent="red" />
        <StrategyCard icon={<Target className="h-4 w-4 text-cyan-400" />} title="Short-Term" desc="This week's priorities" accent="cyan" />
        <StrategyCard icon={<Shield className="h-4 w-4 text-violet-400" />} title="Long-Term" desc="Season arc planning" accent="violet" />
      </div>

      {/* Action checklist placeholder */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/25">AI Action Checklist</p>
        <div className="space-y-2">
          {['Review trade targets at WR2', 'Monitor RB handcuff availability', 'Lock in lineup by Thursday'].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/15" />
              <span className="text-[11px] text-white/40">{item}</span>
            </div>
          ))}
          <p className="mt-2 text-[9px] text-white/20">Sync a league to generate your personalized checklist.</p>
        </div>
      </div>

      {/* Window label */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/10 bg-rose-500/[0.03] px-4 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400/60" />
        <p className="text-[10px] text-white/35">War Room generates deeper analysis when your league data is imported and synced.</p>
      </div>
    </AIToolModalShell>
  )
}

function StrategyCard({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'border-emerald-500/10 bg-emerald-500/[0.03]',
    red: 'border-red-500/10 bg-red-500/[0.03]',
    cyan: 'border-cyan-500/10 bg-cyan-500/[0.03]',
    violet: 'border-violet-500/10 bg-violet-500/[0.03]',
  }
  return (
    <div className={`rounded-xl border p-3 ${bgMap[accent] ?? ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold text-white/70">{title}</span>
      </div>
      <p className="mt-1 text-[9px] text-white/30">{desc}</p>
    </div>
  )
}
