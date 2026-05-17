"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPlayoffBracketChallengeClient } from "@/lib/playoffs/playoffClientApi"
import { defaultPlayoffChallengeConfig } from "@/lib/playoffs/playoffChallengeConfig"
import type { PlayoffSport } from "@/lib/playoffs/types"

export default function QuickCreatePlayoffPoolButton({
  sport,
  label,
}: {
  sport: PlayoffSport
  label: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function quickCreate() {
    setPending(true)
    try {
      const result = await createPlayoffBracketChallengeClient({
        sport,
        seasonYear: new Date().getUTCFullYear(),
        isTestMode: false,
        config: defaultPlayoffChallengeConfig(),
      })
      router.push(result.redirectUrl)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={quickCreate}
      disabled={pending}
      className="rounded-lg border px-2 py-1 text-[10px] font-semibold transition disabled:opacity-50"
      style={{ borderColor: "rgba(56,189,248,0.28)", color: "rgba(186,230,253,0.92)" }}
      data-testid={`quick-create-${sport}-pool-button`}
    >
      {pending ? "Creating..." : label}
    </button>
  )
}
