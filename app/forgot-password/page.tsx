import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthStatusLoadingFallback } from '@/components/auth/AuthStatusShell'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | AllFantasy.ai',
}

function Fallback() {
  return <AuthStatusLoadingFallback />
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ForgotPasswordClient />
    </Suspense>
  )
}
