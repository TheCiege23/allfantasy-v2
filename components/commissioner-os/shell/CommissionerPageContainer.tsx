import type { ReactNode } from 'react'

/**
 * Content-width container, per Design Language & Experience System §2:
 * depth-1 dashboards get the wide container; depth-2/3 detail and
 * evidence content gets the narrower reading width.
 */
export function CommissionerPageContainer({
  children,
  variant = 'dashboard',
}: {
  children: ReactNode
  variant?: 'dashboard' | 'reading'
}) {
  return (
    <div
      className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8"
      style={{
        maxWidth: variant === 'dashboard' ? 'var(--container-width-dashboard)' : 'var(--container-width-reading)',
      }}
    >
      {children}
    </div>
  )
}
