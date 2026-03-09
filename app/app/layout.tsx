import type { ReactNode } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'

export default function AppProductLayout({ children }: { children: ReactNode }) {
  return <ProductShellLayout>{children}</ProductShellLayout>
}
