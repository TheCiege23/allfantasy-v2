import type { ReactNode } from 'react'
import { Suspense } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'
import { LeagueEmbedGate } from '@/components/navigation/LeagueEmbedGate'

export default function LeagueSegmentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ProductShellLayout hideSidebar>{children}</ProductShellLayout>}>
      <LeagueEmbedGate fallback={<ProductShellLayout hideSidebar>{children}</ProductShellLayout>}>
        {children}
      </LeagueEmbedGate>
    </Suspense>
  )
}
