import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import DraftRoomHarnessClient from './DraftRoomHarnessClient'

export const dynamic = 'force-dynamic'

export default function E2EDraftRoomPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense>
      <DraftRoomHarnessClient />
    </Suspense>
  )
}
