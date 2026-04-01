import { Suspense } from 'react'
import { AuthStatusLoadingFallback } from '@/components/auth/AuthStatusShell'
import ForgotPasswordClient from './ForgotPasswordClient'

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
