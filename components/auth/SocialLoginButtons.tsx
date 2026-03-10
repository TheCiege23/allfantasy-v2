"use client"

import { signIn } from "next-auth/react"

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 transition"
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => signIn("apple", { callbackUrl })}
        className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 transition"
      >
        Continue with Apple
      </button>
    </div>
  )
}
