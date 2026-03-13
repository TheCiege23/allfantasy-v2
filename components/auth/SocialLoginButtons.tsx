"use client"

import { signIn } from "next-auth/react"

const enableGoogle = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"
const enableApple = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true"

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={enableGoogle ? () => signIn("google", { callbackUrl }) : undefined}
          disabled={!enableGoogle}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            enableGoogle
              ? "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10"
              : "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
          }`}
        >
          {enableGoogle ? "Continue with Google" : "Google (connect coming soon)"}
        </button>
        <button
          type="button"
          onClick={enableApple ? () => signIn("apple", { callbackUrl }) : undefined}
          disabled={!enableApple}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            enableApple
              ? "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10"
              : "border-white/10 bg-black/20 text-white/40 cursor-not-allowed"
          }`}
        >
          {enableApple ? "Continue with Apple" : "Apple (connect coming soon)"}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px] text-white/45">
        <button
          type="button"
          disabled
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 cursor-not-allowed"
        >
          Facebook (planned)
        </button>
        <button
          type="button"
          disabled
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 cursor-not-allowed"
        >
          Instagram (planned)
        </button>
        <button
          type="button"
          disabled
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 cursor-not-allowed"
        >
          X / Twitter (planned)
        </button>
      </div>
    </div>
  )
}
