import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import DraftSettingsHarnessClient from './DraftSettingsHarnessClient'

export const dynamic = 'force-dynamic'

export default function E2EDraftSettingsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <Suspense>
      <DraftSettingsHarnessClient />
    </Suspense>
  )
}
