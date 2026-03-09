import { Suspense } from 'react'
import ForgotPasswordClient from './ForgotPasswordClient'

function Fallback() {
  return <div className="min-h-screen bg-neutral-950" />
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ForgotPasswordClient />
    </Suspense>
  )
}
