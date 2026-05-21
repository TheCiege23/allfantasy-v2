import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'
import { buildMetadata, getSEOPageConfig } from '@/lib/seo'

export const metadata: Metadata = buildMetadata(
  getSEOPageConfig('brackets') ?? {
    title: 'World Cup Bracket Challenge | AllFantasy',
    description:
      'Create a FIFA World Cup 2026 bracket pool and compete with friends. AI analysis, live leaderboards, invite codes. Free forever.',
    canonical: 'https://allfantasy.ai/brackets',
  }
)

export default function BracketsLayout({ children }: { children: ReactNode }) {
  return (
    <ProductShellLayout hideSidebar>
      {children}
    </ProductShellLayout>
  )
}
