import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import DraftQueueHarnessClient from './DraftQueueHarnessClient'

export const dynamic = 'force-dynamic'

export default function E2EDraftQueuePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense>
      <DraftQueueHarnessClient />
    </Suspense>
  )
}
