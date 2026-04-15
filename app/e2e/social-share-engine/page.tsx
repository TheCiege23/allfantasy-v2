import { notFound } from 'next/navigation'
import SocialShareEngineHarnessClient from './SocialShareEngineHarnessClient'

export default function E2ESocialShareEnginePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <SocialShareEngineHarnessClient />
}
