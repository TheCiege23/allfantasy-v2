import { notFound } from 'next/navigation'
import PublicLeagueDiscoveryHarnessClient from './PublicLeagueDiscoveryHarnessClient'

export default function E2EPublicLeagueDiscoveryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <PublicLeagueDiscoveryHarnessClient />
}
