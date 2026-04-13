'use client'

/**
 * components/league-settings/MemberSettingsCommissionerPanel.tsx
 * Commissioner member settings panel matching Sleeper UI.
 * Shows each team with:
 *  - Avatar, team name, owner name
 *  - Starters list (player names)
 *  - Numbered position (draft order slot)
 *  - "Unassign/Remove" button for assigned teams
 *  - "Add" button for unassigned/orphan teams → user picker
 * Works for ALL sports and ALL league types including specialty leagues.
 */

import { useCallback, useEffect, useState } from 'react'
import { UserMinus, UserPlus, X } from 'lucide-react'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamMember {
  teamId: string
  teamName: string
  ownerName: string
  avatarUrl: string | null
  rosterId: string | null
  platformUserId: string | null
  isOrphan: boolean
  isCommissioner: boolean
  isCoCommissioner: boolean
  starters: string[]  // player display names
  allPlayers: string[] // all player display names on roster
  position: number // 1-based order
}

interface AvailableUser {
  id: string
  username: string | null
  displayName: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  leagueId: string
}

export function MemberSettingsCommissionerPanel({ leagueId }: Props) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [addPickerOpen, setAddPickerOpen] = useState<string | null>(null) // teamId of open picker

  // Load member data
  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/commissioner/leagues/${encodeURIComponent(leagueId)}/managers`,
        { cache: 'no-store' }
      )
      if (res.status === 403) {
        // Non-commissioner: load teams from league data instead
        const leagueRes = await fetch(
          `/api/commissioner/leagues/${encodeURIComponent(leagueId)}/division-settings`,
          { cache: 'no-store' }
        )
        if (leagueRes.ok) {
          const leagueData = await leagueRes.json()
          setIsCommissioner(leagueData.isCommissioner ?? false)
          const teams = (leagueData.teams ?? []) as Array<{
            id: string; teamName: string | null; ownerName: string | null; avatarUrl: string | null
          }>
          setMembers(teams.map((t, i) => ({
            teamId: t.id,
            teamName: t.teamName ?? `Team ${i + 1}`,
            ownerName: t.ownerName ?? '',
            avatarUrl: t.avatarUrl,
            rosterId: null,
            platformUserId: null,
            isOrphan: !t.ownerName || t.ownerName.startsWith('Team '),
            isCommissioner: false,
            isCoCommissioner: false,
            starters: [],
            allPlayers: [],
            position: i + 1,
          })))
        }
        return
      }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }

      setIsCommissioner(true)

      const teamsRaw = data.teams ?? []
      const rostersRaw = data.rosters ?? []
      const managersRaw = data.managers ?? []

      // Build roster map: rosterId -> { platformUserId }
      const rosterMap = new Map<string, { id: string; platformUserId: string | null }>()
      for (const r of rostersRaw) rosterMap.set(r.id, r)

      // Build manager map: rosterId -> manager info
      const managerMap = new Map<string, { rosterId: string; userId: string | null; displayName: string | null }>()
      for (const m of managersRaw) managerMap.set(m.rosterId, m)

      // Also fetch rosters with player data for starters display
      let rosterPlayers: Record<string, { starters: string[]; allPlayers: string[] }> = {}
      try {
        const rpRes = await fetch(
          `/api/leagues/${encodeURIComponent(leagueId)}/roster-players`,
          { cache: 'no-store' }
        )
        if (rpRes.ok) {
          rosterPlayers = await rpRes.json()
        }
      } catch { /* silent - starters just won't show */ }

      const memberList: TeamMember[] = teamsRaw.map((t: Record<string, unknown>, i: number) => {
        const teamId = t.id as string
        const externalId = t.externalId as string
        const roster = rosterMap.get(externalId) ?? null
        const manager = roster ? managerMap.get(roster.id) : null
        const isOrphan = !manager?.userId
          || (manager.userId as string).startsWith('orphan-')
          || (t.ownerName as string ?? '').toLowerCase().includes('unassigned')
        const rp = roster ? (rosterPlayers[roster.id] ?? { starters: [], allPlayers: [] }) : { starters: [], allPlayers: [] }

        return {
          teamId,
          teamName: (t.teamName as string) ?? `Team ${i + 1}`,
          ownerName: isOrphan ? '' : ((t.ownerName as string) ?? ''),
          avatarUrl: (t.avatarUrl as string) ?? null,
          rosterId: roster?.id ?? null,
          platformUserId: manager?.userId ?? null,
          isOrphan,
          isCommissioner: false,
          isCoCommissioner: false,
          starters: rp.starters,
          allPlayers: rp.allPlayers,
          position: i + 1,
        }
      })

      setMembers(memberList)

      // Build available users list from league invite candidates
      const assignedUserIds = new Set(memberList.filter(m => !m.isOrphan).map(m => m.platformUserId).filter(Boolean))
      const unassigned = managersRaw
        .filter((m: Record<string, unknown>) => !assignedUserIds.has(m.userId as string))
        .map((m: Record<string, unknown>) => ({
          id: m.userId as string,
          username: m.username as string | null,
          displayName: m.displayName as string | null,
        }))
      setAvailableUsers(unassigned)
    } catch {
      setError('Failed to load member settings')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { load() }, [load])

  // Unassign/Remove a manager from a team
  const handleUnassign = useCallback(async (rosterId: string) => {
    if (!rosterId) return
    setActionLoading(rosterId)
    setError(null); setSuccess(null)
    try {
      const res = await fetch(
        `/api/commissioner/leagues/${encodeURIComponent(leagueId)}/managers?rosterId=${encodeURIComponent(rosterId)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to remove'); return }
      setSuccess(t('member.removed'))
      setTimeout(() => setSuccess(null), 3000)
      await load() // Reload
    } catch { setError('Request failed') }
    finally { setActionLoading(null) }
  }, [leagueId, load])

  // Assign a user to an orphan team
  const handleAssign = useCallback(async (rosterId: string, userId: string) => {
    if (!rosterId || !userId) return
    setActionLoading(rosterId)
    setError(null); setSuccess(null)
    setAddPickerOpen(null)
    try {
      const res = await fetch(
        `/api/commissioner/leagues/${encodeURIComponent(leagueId)}/managers`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rosterId, userId }),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to assign'); return }
      setSuccess(t('member.assigned'))
      setTimeout(() => setSuccess(null), 3000)
      await load() // Reload
    } catch { setError('Request failed') }
    finally { setActionLoading(null) }
  }, [leagueId, load])

  if (loading) {
    return <div className="py-8 text-center text-sm text-white/50">Loading member settings...</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-white">{t('member.title')}</h3>
        <p className="mt-0.5 text-xs text-white/50">{t('member.subtitle')}</p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">{success}</div>
      )}

      {/* Team list */}
      <div className="space-y-0">
        {members.map((member) => (
          <div key={member.teamId} className="border-b border-white/[0.06] py-4 last:border-0">
            {/* Team header: avatar + name + owner */}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="shrink-0">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white/30">
                    {(member.teamName ?? '?')[0]}
                  </div>
                )}
              </div>

              {/* Name + owner */}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-white">
                  {member.teamName}
                  {member.isOrphan && (
                    <span className="ml-1.5 text-[11px] font-normal text-white/30">{t('member.unassigned')}</span>
                  )}
                </p>
                {member.ownerName && !member.isOrphan && (
                  <p className="mt-0.5 text-[12px] text-white/40">{member.ownerName}</p>
                )}
              </div>
            </div>

            {/* Player names - starters + all */}
            {member.allPlayers.length > 0 && (
              <div className="mt-2 pl-[52px]">
                {/* Top row of player names */}
                <p className="text-[12px] text-white/50 leading-relaxed">
                  {member.allPlayers.slice(0, 4).join(', ')}
                  {member.allPlayers.length > 4 && ','}
                </p>

                {/* Starters label + more names */}
                {member.starters.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] font-semibold text-white/30">{t('member.starters')}</p>
                    <p className="text-[12px] text-white/50 leading-relaxed">
                      {member.starters.slice(0, 5).join(', ')}
                      {member.starters.length > 5 && ','}
                    </p>
                  </div>
                )}

                {/* Remaining players */}
                {member.allPlayers.length > 4 && (
                  <p className="mt-1 text-[12px] text-white/40 leading-relaxed">
                    {member.allPlayers.slice(4).join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Position number + action button */}
            <div className="mt-2 flex items-center justify-between pl-[52px]">
              <span className="text-[13px] font-medium text-white/30">{member.position}.</span>

              {/* Action buttons - commissioner only */}
              {isCommissioner && (
                <div>
                  {member.isOrphan ? (
                    /* ADD button for unassigned teams */
                    <div className="relative">
                      <button
                        type="button"
                        disabled={actionLoading === member.rosterId}
                        onClick={() => setAddPickerOpen(addPickerOpen === member.teamId ? null : member.teamId)}
                        className="flex items-center gap-1 text-[12px] font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {t('member.add')}
                      </button>

                      {/* User picker dropdown */}
                      {addPickerOpen === member.teamId && (
                        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-white/15 bg-[#0d1526] py-1 shadow-xl">
                          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                              {t('member.selectManager')}
                            </span>
                            <button type="button" onClick={() => setAddPickerOpen(null)}>
                              <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />
                            </button>
                          </div>
                          {availableUsers.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto">
                              {availableUsers.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => member.rosterId && handleAssign(member.rosterId, user.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                                >
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/40">
                                    {(user.displayName ?? user.username ?? '?')[0]?.toUpperCase()}
                                  </div>
                                  <span>{user.displayName ?? user.username ?? user.id}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="px-3 py-3 text-[11px] text-white/30">
                              {t('member.noAvailable')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* UNASSIGN/REMOVE button for assigned teams */
                    <button
                      type="button"
                      disabled={actionLoading === member.rosterId}
                      onClick={() => member.rosterId && handleUnassign(member.rosterId)}
                      className="flex items-center gap-1 text-[12px] font-medium text-white/40 hover:text-red-400 disabled:opacity-50 transition"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {t('member.unassignRemove')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="py-8 text-center text-[13px] text-white/30">
            {t('member.noMembers')}
          </div>
        )}
      </div>

      {/* Non-commissioner notice */}
      {!isCommissioner && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/40">
          {t('member.readOnlyBanner')}
        </div>
      )}
    </div>
  )
}
