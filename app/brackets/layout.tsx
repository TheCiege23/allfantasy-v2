import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'
import { BracketsPageHeader } from './components/BracketsPageHeader'
import { buildMetadata, getSEOPageConfig } from '@/lib/seo'

export const metadata: Metadata = buildMetadata(
  getSEOPageConfig('brackets') ?? {
    title: 'Bracket Pools | AllFantasy',
    description:
      'Create or join bracket pools — FIFA World Cup, NBA/NHL playoffs, and more. AI analysis, live leaderboards, invite codes. Free forever.',
    canonical: 'https://allfantasy.ai/brackets',
  }
)

export default function BracketsLayout({ children }: { children: ReactNode }) {
  return (
    <ProductShellLayout hideHeader hideSidebar>
      <BracketsPageHeader />
      {children}
    </ProductShellLayout>
  )
}
