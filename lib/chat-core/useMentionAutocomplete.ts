'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type MentionType = '@global' | '@chimmy' | '@all' | '@username'

export type MentionSuggestion = {
  type: MentionType
  value: string
  label: string
  description?: string
  avatarUrl?: string
}

export function useMentionAutocomplete({
  text,
  cursorPos,
  leagueId,
  chatType,
  isCommissioner,
}: {
  text: string
  cursorPos: number
  leagueId?: string | null
  chatType: 'league' | 'huddle' | 'dm' | 'chimmy' | 'draft'
  isCommissioner?: boolean
}) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [atQuery, setAtQuery] = useState<string | null>(null)

  const staticPart = useMemo(() => {
    const before = text.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    if (!match) return null
    return match[1]!.toLowerCase()
  }, [text, cursorPos])

  const buildStatic = useCallback(
    (query: string): MentionSuggestion[] => {
      const results: MentionSuggestion[] = []
      if (chatType === 'chimmy') return results

      if (isCommissioner && chatType !== 'dm' && chatType !== 'draft' && 'global'.startsWith(query)) {
        results.push({
          type: '@global',
          value: '@global ',
          label: '@global',
          description: 'Broadcast to all your leagues',
        })
      }

      if ('chimmy'.startsWith(query)) {
        results.push({
          type: '@chimmy',
          value: '@chimmy ',
          label: '@chimmy',
          description: 'Private message to Chimmy AI (only you see this)',
        })
      }

      if ((chatType === 'league' || chatType === 'huddle') && 'all'.startsWith(query)) {
        results.push({
          type: '@all',
          value: '@all ',
          label: '@all',
          description: 'Notify everyone in this chat',
        })
      }

      return results
    },
    [chatType, isCommissioner]
  )

  useEffect(() => {
    if (staticPart === null) {
      setAtQuery(null)
      setSuggestions([])
      return
    }
    setAtQuery(staticPart)

    const handle = window.setTimeout(() => {
      const base = buildStatic(staticPart)
      if (chatType === 'chimmy' || !leagueId || staticPart.length < 1) {
        setSuggestions(base)
        return
      }

      void fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/members/autocomplete?q=${encodeURIComponent(staticPart)}`,
        { cache: 'no-store' }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((list: { username: string; displayName: string; avatarUrl?: string }[]) => {
          const memberSug: MentionSuggestion[] = Array.isArray(list)
            ? list.map((m) => ({
                type: '@username' as MentionType,
                value: `@${m.username} `,
                label: `@${m.username}`,
                description: m.displayName,
                avatarUrl: m.avatarUrl,
              }))
            : []
          setSuggestions([...base, ...memberSug])
        })
        .catch(() => setSuggestions(base))
    }, 200)

    return () => window.clearTimeout(handle)
  }, [staticPart, leagueId, chatType, buildStatic])

  return { suggestions, atQuery }
}
