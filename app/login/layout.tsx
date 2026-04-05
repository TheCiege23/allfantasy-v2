import type { Metadata } from 'next'
import { buildSeoMeta } from '@/lib/seo'

export const metadata: Metadata = buildSeoMeta({
  title: 'Sign In | AllFantasy.ai',
  description:
    'Sign in to AllFantasy.ai — AI-powered fantasy sports tools, leagues, and Chimmy coaching.',
  canonicalPath: '/login',
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
