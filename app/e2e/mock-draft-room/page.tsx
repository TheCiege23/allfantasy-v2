import { notFound } from 'next/navigation'
import E2EMockDraftRoomHarnessClient from './E2EMockDraftRoomHarnessClient'

export default function E2EMockDraftRoomHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <E2EMockDraftRoomHarnessClient />
}
