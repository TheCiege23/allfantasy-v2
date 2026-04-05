import type { Metadata } from 'next'
import { buildSeoMeta } from '@/lib/seo'

export const metadata: Metadata = buildSeoMeta({
  title: 'Create Account | AllFantasy.ai',
  description:
    'Create your AllFantasy.ai account — fantasy sports leagues, AI tools, and commissioner controls.',
  canonicalPath: '/signup',
})

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
