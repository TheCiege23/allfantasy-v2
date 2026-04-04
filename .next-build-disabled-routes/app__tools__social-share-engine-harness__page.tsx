import { notFound } from 'next/navigation'
import SocialShareEngineHarnessClient from '@/app/e2e/social-share-engine/SocialShareEngineHarnessClient'

export default function SocialShareEngineHarnessPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <SocialShareEngineHarnessClient />
}
