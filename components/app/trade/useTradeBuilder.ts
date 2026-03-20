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

  const setFromTeam = useCallback((userId: string, teamName: string) => {
    setProposal((prev) => ({
      ...prev,
      from: { ...prev.from, userId, teamName },
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
      const offerFrom = Number(proposal.from.userId)
      const offerTo = Number(proposal.to.userId)

      if (!proposal.leagueId) {
        throw new Error("Missing league context for this trade proposal.")
      }
      if (!Number.isFinite(offerFrom) || !Number.isFinite(offerTo)) {
        throw new Error("Trade proposal is not connected to real roster IDs yet.")
      }

      const res = await fetch("/api/trade/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leagueId: proposal.leagueId,
          offerFrom,
          offerTo,
          adds: [...proposal.from.players, ...proposal.from.picks],
          drops: [...proposal.to.players, ...proposal.to.picks],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Unable to submit trade.")
      }
    } catch (err: any) {
      setError(err?.message || "Unable to submit trade.")
    } finally {
      setSaving(false)
    }
  }, [proposal])

  return {
    proposal,
    setFromTeam,
    setPartner,
    togglePlayer,
    togglePick,
    submitProposal,
    saving,
    error,
  }
}

