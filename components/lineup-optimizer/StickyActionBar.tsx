'use client'

import { Loader2, RotateCcw, Lock, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function StickyActionBar({
  onOptimize,
  onReset,
  onLock,
  onShare,
  loading,
  canApply,
  pulseAnalyze,
  className,
}: {
  onOptimize: () => void
  onReset: () => void
  onLock: () => void
  onShare: () => void
  loading: boolean
  canApply?: boolean
  /** Subtle attention hint when roster is ready */
  pulseAnalyze?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#040915]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none',
        className
      )}
      data-testid="lineup-optimizer-sticky-actions"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-3 lg:justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onOptimize}
          disabled={loading}
          className={cn(
            'group gap-2 border border-cyan-400/40 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30',
            pulseAnalyze && !loading && 'animate-pulse shadow-[0_0_24px_rgba(34,211,238,0.25)]'
          )}
          data-testid="lineup-optimizer-btn-optimize"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyze lineup
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canApply}
          className="border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
        >
          Apply changes
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="text-white/70 hover:text-white"
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onLock}
          className="text-white/70 hover:text-white"
        >
          <Lock className="mr-1 h-4 w-4" />
          Lock
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onShare}
          className="text-white/70 hover:text-white"
        >
          <Share2 className="mr-1 h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  )
}
