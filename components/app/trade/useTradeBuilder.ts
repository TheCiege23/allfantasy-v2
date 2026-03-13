"use client"

import { useCallback, useState } from "react"

export type TradeSide = {
  userId: string
  teamName: string
  players: string[]
  picks: string[]
}

export type TradeProposal = {
  leagueId?: string
  from: TradeSide
  to: TradeSide
}

export function useTradeBuilder(initial: Partial<TradeProposal> = {}) {
  const [proposal, setProposal] = useState<TradeProposal>({
    leagueId: initial.leagueId,
    from: initial.from || { userId: "", teamName: "Your Team", players: [], picks: [] },
    to: initial.to || { userId: "", teamName: "Trade Partner", players: [], picks: [] },
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setPartner = useCallback((userId: string, teamName: string) => {
    setProposal((prev) => ({
      ...prev,
      to: { ...prev.to, userId, teamName },
    }))
  }, [])

  const togglePlayer = useCallback(
    (side: "from" | "to", playerId: string) => {
      setProposal((prev) => {
        const current = prev[side]
        const exists = current.players.includes(playerId)
        const nextPlayers = exists
          ? current.players.filter((id) => id !== playerId)
          : [...current.players, playerId]
        return {
          ...prev,
          [side]: { ...current, players: nextPlayers },
        }
      })
    },
    [],
  )

  const togglePick = useCallback(
    (side: "from" | "to", pickId: string) => {
      setProposal((prev) => {
        const current = prev[side]
        const exists = current.picks.includes(pickId)
        const next = exists
          ? current.picks.filter((id) => id !== pickId)
          : [...current.picks, pickId]
        return {
          ...prev,
          [side]: { ...current, picks: next },
        }
      })
    },
    [],
  )

  const submitProposal = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await fetch("/api/trades/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proposal),
      })
    } catch (err: any) {
      setError(err?.message || "Unable to submit trade.")
    } finally {
      setSaving(false)
    }
  }, [proposal])

  return {
    proposal,
    setPartner,
    togglePlayer,
    togglePick,
    submitProposal,
    saving,
    error,
  }
}

