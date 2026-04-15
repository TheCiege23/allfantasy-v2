'use client'

import type { AIAction } from '@/lib/chimmy-actions'

interface ChimmySecondaryActionButtonProps {
  action: AIAction
  onClick: (action: AIAction) => void
  isLoading?: boolean
  className?: string
}

/**
 * Secondary (ghost) action button for additional Chimmy-recommended actions.
 * Smaller and less prominent than ChimmyPrimaryActionButton.
 */
export function ChimmySecondaryActionButton({
  action,
  onClick,
  isLoading = false,
  className = '',
}: ChimmySecondaryActionButtonProps) {
  const disabled = !action.isAvailable || isLoading

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(action)}
      className={[
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
        disabled
          ? 'cursor-not-allowed text-white/20'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95',
        className,
      ].join(' ')}
      aria-label={action.label}
    >
      {isLoading ? (
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/60"
          aria-hidden="true"
        />
      ) : null}
      <span>{action.label}</span>
    </button>
  )
}
