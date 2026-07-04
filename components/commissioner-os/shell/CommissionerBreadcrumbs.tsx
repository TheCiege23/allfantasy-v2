'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useCommissionerNavigation } from '@/components/commissioner-os/providers/CommissionerNavigationProvider'

/**
 * Per the Design Language & Experience System §3: breadcrumbs appear only
 * at depth 2 and depth 3 — this component renders nothing on a depth-1
 * module landing page, where the sidebar already shows where you are.
 */
export function CommissionerBreadcrumbs() {
  const { breadcrumbs } = useCommissionerNavigation()
  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-1 py-2 text-sm" style={{ color: 'var(--muted)' }}>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={14} aria-hidden />}
            {isLast ? (
              <span aria-current="page" style={{ color: 'var(--text)' }}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="focus-ring rounded" style={{ color: 'var(--muted)' }}>
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
