"use client"

import { useState, useEffect } from "react"
import { VerifiedCreatorBadge } from "./VerifiedCreatorBadge"

export function LeagueCreatorBadge({ leagueId }: { leagueId: string }) {
  const [creator, setCreator] = useState<{ handle: string } | null>(null)

  useEffect(() => {
    fetch(`/api/creators/league/${encodeURIComponent(leagueId)}/creator`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creator) setCreator({ handle: data.creator.handle })
      })
      .catch(() => {})
  }, [leagueId])

  if (!creator) return null
  return (
    <VerifiedCreatorBadge
      handle={creator.handle}
      showLabel={true}
      linkToProfile={true}
      size="sm"
    />
  )
}
