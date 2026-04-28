import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import DraftApiControlsHarnessClient from './DraftApiControlsHarnessClient'

export const dynamic = 'force-dynamic'

export default function E2EDraftApiControlsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense>
      <DraftApiControlsHarnessClient />
    </Suspense>
  )
}
