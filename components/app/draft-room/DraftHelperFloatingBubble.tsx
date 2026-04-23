'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraftHelperFloatingBubbleProps {
  badgeCount: number
  onClick: () => void
  hasContent: boolean
  className?: string
}

export function DraftHelperFloatingBubble({
  badgeCount,
  onClick,
  hasContent,
  className,
}: DraftHelperFloatingBubbleProps) {
  if (!hasContent) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-20',
        'flex items-center justify-center',
        'w-14 h-14 rounded-full',
        'bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700',
        'text-white shadow-lg hover:shadow-xl',
        'transition-all duration-200 ease-out hover:scale-110',
        'border border-purple-500/50',
        className
      )}
      aria-label={`Draft Helper with ${badgeCount} items`}
    >
      <Sparkles className="w-6 h-6" />

      {/* Badge */}
      {badgeCount > 0 && (
        <div
          className={cn(
            'absolute -top-2 -right-2',
            'flex items-center justify-center',
            'w-6 h-6 rounded-full',
            'bg-red-500 text-white text-xs font-bold',
            'border-2 border-white',
            'animate-pulse'
          )}
        >
          {badgeCount}
        </div>
      )}
    </button>
  )
}
