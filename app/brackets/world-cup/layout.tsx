import { Suspense } from 'react'
import { WorldCupIntroGate } from '@/components/world-cup/WorldCupIntroGate'

/**
 * Layout for all /brackets/world-cup/** routes.
 *
 * Wraps every World Cup bracket page with WorldCupIntroGate so the intro video
 * plays before any bracket content is visible, regardless of which CTA the
 * user clicked (landing page, dashboard, direct URL, shared bracket link, etc.).
 *
 * Suspense is required because WorldCupIntroGate calls useSearchParams(),
 * which opts into dynamic rendering under Next.js App Router.
 *
 * After the intro completes (or if the user has already seen it this session),
 * the gate renders children directly with no additional navigation.
 */
export default function WorldCupBracketsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense>
      <WorldCupIntroGate>{children}</WorldCupIntroGate>
    </Suspense>
  )
}
