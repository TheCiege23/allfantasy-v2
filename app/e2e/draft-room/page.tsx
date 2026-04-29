import { notFound } from 'next/navigation'
import E2EDraftRoomHarnessClient from './E2EDraftRoomHarnessClient'

export default function E2EDraftRoomHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <E2EDraftRoomHarnessClient />
}
