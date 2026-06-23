"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import SettingsFullPage from "@/app/settings/SettingsFullPage"

export default function LeagueSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params?.leagueId as string
  const [isLoading, setIsLoading] = useState(true)
  const [isCommissioner, setIsCommissioner] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch(`/api/commissioner/leagues/${leagueId}/check`)
        const data = await res.json()
        setIsCommissioner(data.isCommissioner || false)
      } catch (error) {
        console.error("Failed to check commissioner status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (leagueId) {
      checkAccess()
    }
  }, [leagueId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white/60">Loading settings...</div>
      </div>
    )
  }

  if (!isCommissioner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <div className="text-white/60">You don't have permission to view this page.</div>
        <button
          onClick={() => router.push(`/league/${leagueId}`)}
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to League
        </button>
      </div>
    )
  }

  return <SettingsFullPage />
}