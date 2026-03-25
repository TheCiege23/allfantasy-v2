"use client"

import { useMemo } from "react"
import { LeagueRecruitmentTools } from "@/components/app/recruitment"

export default function ViralLeagueInviteHarnessClient({ leagueId }: { leagueId: string }) {
  const initialInvite = useMemo(
    () => ({
      joinUrl: `http://localhost:3000/join?code=${encodeURIComponent("VIRAL105")}`,
      inviteCode: "VIRAL105",
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      inviteExpired: false,
    }),
    []
  )

  return (
    <main className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <h1 className="mb-4 text-xl font-semibold">Viral League Invite Harness</h1>
      <LeagueRecruitmentTools leagueId={leagueId} initialInvite={initialInvite} isCommissioner />
    </main>
  )
}
