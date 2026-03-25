import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'
import BracketTopNav from '@/components/bracket/BracketTopNav'
import { buildMetadata, getSEOPageConfig } from '@/lib/seo'

export const metadata: Metadata = buildMetadata(
  getSEOPageConfig('brackets') ?? {
    title: 'NCAA Bracket Challenge | AllFantasy',
    description:
      'Create a March Madness bracket league and compete with friends. Live scoring, invite codes, and leaderboards.',
    canonical: 'https://allfantasy.ai/brackets',
  }
)

export default function BracketsLayout({ children }: { children: ReactNode }) {
  return (
    <ProductShellLayout>
      <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
        <BracketTopNav />
      </div>
      {children}
    </ProductShellLayout>
  )
}
