"use client"

import { useParams } from "next/navigation"
import LeagueChatDock from "@/components/chat/LeagueChatDock"

/**
 * Client wrapper that reads leagueId from route params and renders the persistent chat dock.
 * Used in app/app/league/[leagueId]/layout.tsx so chat stays open when navigating league tabs.
 */
export default function LeagueChatDockClient() {
  const params = useParams<{ leagueId: string }>()
  const leagueId = params?.leagueId ?? ""

  if (!leagueId) return null

  return (
    <LeagueChatDock
      leagueId={leagueId}
      isCommissioner={false}
    />
  )
}
