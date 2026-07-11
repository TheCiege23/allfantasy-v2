import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/**
 * Calm, never styled like a Critical severity finding (Design Constitution
 * §18) — an error is a technical fact, not a league-health signal, and
 * must never be visually confusable with one.
 */
export function ErrorState({ message = "Couldn't load this right now.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center" role="alert">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {message}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
