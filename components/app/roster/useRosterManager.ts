"use client"

import { useCallback, useEffect, useState } from "react"

export type RosterSectionKey = "starters" | "bench" | "ir" | "taxi" | "devy"

export type RosterPlayer = {
  id: string
  name: string
  team: string
  position: string
  opponent: string
  gameTime: string
  projection: number
  actual: number | null
  status: "healthy" | "q" | "out" | "ir"
  slot: RosterSectionKey
}

export type RosterState = {
  starters: RosterPlayer[]
  bench: RosterPlayer[]
  ir: RosterPlayer[]
  taxi: RosterPlayer[]
  devy: RosterPlayer[]
}

export type RosterManagerOptions = {
  leagueId?: string
}

export function useRosterManager(options: RosterManagerOptions = {}) {
  const [roster, setRoster] = useState<RosterState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  // Placeholder: load from API later; for now seed with mock data.
  useEffect(() => {
    const mock: RosterState = {
      starters: [
        {
          id: "p1",
          name: "Patrick Mahomes",
          team: "KC",
          position: "QB",
          opponent: "@ BUF",
          gameTime: "Sun 4:25 PM",
          projection: 24.8,
          actual: null,
          status: "healthy",
          slot: "starters",
        },
        {
          id: "p2",
          name: "Christian McCaffrey",
          team: "SF",
          position: "RB",
          opponent: "vs DAL",
          gameTime: "Sun 8:20 PM",
          projection: 22.3,
          actual: null,
          status: "healthy",
          slot: "starters",
        },
      ],
      bench: [
        {
          id: "p3",
          name: "Garrett Wilson",
          team: "NYJ",
          position: "WR",
          opponent: "@ MIA",
          gameTime: "Sun 1:00 PM",
          projection: 17.4,
          actual: null,
          status: "q",
          slot: "bench",
        },
      ],
      ir: [
        {
          id: "p4",
          name: "Mike Williams",
          team: "NYJ",
          position: "WR",
          opponent: "—",
          gameTime: "IR",
          projection: 0,
          actual: null,
          status: "ir",
          slot: "ir",
        },
      ],
      taxi: [],
      devy: [],
    }
    setRoster(mock)
  }, [options.leagueId])

  const movePlayer = useCallback(
    (playerId: string, toSlot: RosterSectionKey) => {
      if (!roster) return
      let moved: RosterPlayer | null = null

      const next: RosterState = {
        starters: [],
        bench: [],
        ir: [],
        taxi: [],
        devy: [],
      }

      ;(Object.keys(roster) as RosterSectionKey[]).forEach((key) => {
        roster[key].forEach((p) => {
          if (p.id === playerId) {
            moved = { ...p, slot: toSlot }
          } else {
            next[key].push(p)
          }
        })
      })

      if (moved) {
        next[toSlot] = [...next[toSlot], moved]
        setRoster(next)
        void autoSave(next)
      }
    },
    [roster],
  )

  const swapPlayers = useCallback(
    (aId: string, bId: string) => {
      if (!roster) return
      const next: RosterState = { ...roster, starters: [...roster.starters], bench: [...roster.bench], ir: [...roster.ir], taxi: [...roster.taxi], devy: [...roster.devy] }

      let aRef: { section: RosterSectionKey; index: number } | null = null
      let bRef: { section: RosterSectionKey; index: number } | null = null

      ;(Object.keys(next) as RosterSectionKey[]).forEach((key) => {
        const section = key as RosterSectionKey
        next[section].forEach((p, idx) => {
          if (p.id === aId) aRef = { section, index: idx }
          if (p.id === bId) bRef = { section, index: idx }
        })
      })

      if (!aRef || !bRef) return

      type Ref = { section: RosterSectionKey; index: number }
      const aR = aRef as Ref
      const bR = bRef as Ref
      const a = next[aR.section][aR.index]
      const b = next[bR.section][bR.index]

      next[aR.section][aR.index] = { ...b, slot: aR.section }
      next[bR.section][bR.index] = { ...a, slot: bR.section }

      setRoster(next)
      void autoSave(next)
    },
    [roster],
  )

  const dropPlayer = useCallback(
    (playerId: string) => {
      if (!roster) return
      const next: RosterState = {
        starters: [],
        bench: [],
        ir: [],
        taxi: [],
        devy: [],
      }
      ;(Object.keys(roster) as RosterSectionKey[]).forEach((key) => {
        roster[key].forEach((p) => {
          if (p.id !== playerId) {
            next[key].push(p)
          }
        })
      })
      setRoster(next)
      void autoSave(next)
    },
    [roster],
  )

  const addPlayer = useCallback(
    (player: RosterPlayer, toSlot: RosterSectionKey = "bench") => {
      if (!roster) return
      const next: RosterState = {
        ...roster,
        [toSlot]: [...roster[toSlot], { ...player, slot: toSlot }],
      }
      setRoster(next)
      void autoSave(next)
    },
    [roster],
  )

  const autoSave = useCallback(
    async (state: RosterState) => {
      setSaving(true)
      setSaveError(null)
      try {
        await fetch("/api/leagues/roster/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            leagueId: options.leagueId || null,
            roster: state,
          }),
        })
        setLastSavedAt(Date.now())
      } catch (err: any) {
        setSaveError(err?.message || "Unable to save lineup.")
      } finally {
        setSaving(false)
      }
    },
    [options.leagueId],
  )

  return {
    roster,
    saving,
    saveError,
    lastSavedAt,
    movePlayer,
    swapPlayers,
    dropPlayer,
    addPlayer,
  }
}

