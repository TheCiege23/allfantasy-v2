"use client"

import SocialLoginButtons from "@/components/auth/SocialLoginButtons"

export default function AuthSocialBlock({ callbackUrl }: { callbackUrl: string }) {
  return (
    <>
      <div className="flex items-center gap-3 my-2">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/40">or sign in with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <SocialLoginButtons callbackUrl={callbackUrl} />
    </>
  )
}
