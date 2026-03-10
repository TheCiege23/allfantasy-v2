import type { ReactNode } from 'react'
import GlobalAppShell from '@/components/shared/GlobalAppShell'

export default async function ProductShellLayout({ children }: { children: ReactNode }) {
  return <GlobalAppShell>{children}</GlobalAppShell>
}
