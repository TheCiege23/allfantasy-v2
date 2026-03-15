/**
 * MockDraftEngine — platform-wide mock draft: runs full draft with AI opponents and optional user picks.
 */

import { makeAIPick } from './DraftAIManager'
import type { MockDraftConfig, DraftPickResult, DraftPlayer, DraftType } from './types'

/** Which team (1-based slot) has the k-th overall pick (0-based index). */
function getSlotForPickIndex(pickIndex: number, numTeams: number, draftType: DraftType): number {
  const round = Math.floor(pickIndex / numTeams) + 1
  const pickInRound = (pickIndex % numTeams) + 1 // 1-based position in round
  if (draftType === 'linear') return pickInRound
  return round % 2 === 1 ? pickInRound : numTeams - pickInRound + 1
}

export interface RunDraftInput {
  config: MockDraftConfig
  playerPool: DraftPlayer[]
}

export interface RunDraftResult {
  picks: DraftPickResult[]
  config: MockDraftConfig
}

/**
 * Run a full mock draft. User picks (if any) are consumed in order when it's the user's turn.
 */
export async function runDraft(input: RunDraftInput): Promise<RunDraftResult> {
  const { config, playerPool } = input
  const {
    numTeams,
    rounds,
    draftType,
    teamNames,
    userSlot = null,
    userPicks = [],
    isSuperflex = false,
  } = config

  const totalPicks = numTeams * rounds
  const picks: DraftPickResult[] = []
  let available = playerPool.slice()
  const rosterBySlot = new Map<number, { position: string }[]>()
  let userPickIndex = 0

  const used = new Set<string>()
  function removePlayer(name: string, position: string): DraftPlayer | null {
    const key = `${name.trim().toLowerCase()}|${position}`
    if (used.has(key)) return null
    const i = available.findIndex(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase() && p.position === position
    )
    if (i < 0) return null
    const [p] = available.splice(i, 1)
    used.add(key)
    return p
  }

  for (let overall = 1; overall <= totalPicks; overall++) {
    const idx = overall - 1
    const round = Math.floor(idx / numTeams) + 1
    const slot1Based = getSlotForPickIndex(idx, numTeams, draftType)
    const manager = teamNames[slot1Based - 1] ?? `Team ${slot1Based}`
    const isUser = userSlot != null && slot1Based === userSlot + 1

    let player: DraftPlayer | null = null

    if (isUser && userPicks.length > userPickIndex) {
      const chosen = userPicks[userPickIndex++]
      player = removePlayer(chosen.name, chosen.position) ?? chosen
    }

    if (!player && available.length > 0) {
      const roster = rosterBySlot.get(slot1Based) ?? []
      player = await makeAIPick({
        sport: config.sport,
        managerName: manager,
        rosterSoFar: roster,
        availablePlayers: available,
        round,
        overall,
        slot: slot1Based,
        numTeams,
        draftType,
        isSuperflex,
        useMeta: true,
      })
      if (player) removePlayer(player.name, player.position)
    }

    if (player) {
      const roster = rosterBySlot.get(slot1Based) ?? []
      roster.push({ position: player.position })
      rosterBySlot.set(slot1Based, roster)

      picks.push({
        overall,
        round,
        slot: slot1Based,
        manager,
        playerName: player.name,
        position: player.position,
        team: player.team,
        isUser: !!isUser,
        adp: player.adp,
      })
    }
  }

  return { picks, config }
}
