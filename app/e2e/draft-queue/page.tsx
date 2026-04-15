import { notFound } from 'next/navigation'
import { DraftQueueHarnessClient } from './DraftQueueHarnessClient'

export default function E2EDraftQueuePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <DraftQueueHarnessClient />
}
