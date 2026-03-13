"use client"

import { useCallback, useState } from "react"

export type DraftQueueItem = {
  id: string
  name: string
  position: string
  team: string
  rank: number
}

export function useDraftQueue(initial: DraftQueueItem[] = []) {
  const [queue, setQueue] = useState<DraftQueueItem[]>(initial)

  const addToQueue = useCallback((item: DraftQueueItem) => {
    setQueue((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev
      return [...prev, item]
    })
  }, [])

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const moveItem = useCallback((id: string, newIndex: number) => {
    setQueue((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx === -1 || newIndex < 0 || newIndex >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.splice(newIndex, 0, item)
      return next
    })
  }, [])

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
  }, [])

  return {
    queue,
    addToQueue,
    removeFromQueue,
    moveItem,
    reorder,
  }
}

