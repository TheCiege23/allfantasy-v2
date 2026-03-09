import type { ReactNode } from 'react'
import ProductShellLayout from '@/components/navigation/ProductShellLayout'

export default function BracketProductLayout({ children }: { children: ReactNode }) {
  return <ProductShellLayout>{children}</ProductShellLayout>
}
