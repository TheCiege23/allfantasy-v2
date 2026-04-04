/** Client-side offense vs IDP defense split (NFL). No scoring engine imports. */

export function isOffensivePosition(pos: string): boolean {
  const p = pos.toUpperCase()
  return ['QB', 'RB', 'WR', 'TE', 'K', 'FLEX', 'SUPER_FLEX', 'SF', 'SUPER FLEX'].includes(p)
}

export function isIdpDefensivePosition(pos: string): boolean {
  const p = pos.toUpperCase()
  return ['DE', 'DT', 'DL', 'LB', 'CB', 'S', 'SS', 'FS', 'DB', 'IDP_FLEX', 'DEF'].includes(p)
}

export function idpRoleLabel(playerId: string): 'Run Stopper' | 'Edge Rusher' | 'Coverage' | 'Hybrid' {
  let h = 0
  for (let i = 0; i < playerId.length; i++) h = (h + playerId.charCodeAt(i) * (i + 1)) % 4
  return (['Run Stopper', 'Edge Rusher', 'Coverage', 'Hybrid'] as const)[h]
}

export function mockOffensePoints(playerId: string, week: number): { pts: number; proj: number } {
  let s = 0
  for (let i = 0; i < playerId.length; i++) s = (s * 13 + playerId.charCodeAt(i)) | 0
  const base = 6 + (Math.abs(s) % 180) / 10
  const w = (week % 5) * 0.3
  return { pts: Math.round((base + w) * 10) / 10, proj: Math.round((base + 0.8) * 10) / 10 }
}

export function mockIdpPoints(playerId: string, week: number): { pts: number; proj: number } {
  let s = 0
  for (let i = 0; i < playerId.length; i++) s = (s * 31 + playerId.charCodeAt(i)) | 0
  const base = 4 + (Math.abs(s) % 80) / 10
  const wobble = (week % 5) * 0.4
  return { pts: Math.round((base + wobble) * 10) / 10, proj: Math.round((base + 1.2) * 10) / 10 }
}

/** Deterministic mock annual salary (millions) for UI-only cap previews. */
export function mockContractSalaryM(playerId: string): number {
  let s = 0
  for (let i = 0; i < playerId.length; i++) s = (s * 19 + playerId.charCodeAt(i)) | 0
  return Math.round((1.2 + (Math.abs(s) % 2600) / 100) * 10) / 10
}

/** Mock years remaining on contract (1–4) for UI previews. */
export function mockYearsRemaining(playerId: string): number {
  let s = 0
  for (let i = 0; i < playerId.length; i++) s = (s * 7 + playerId.charCodeAt(i)) | 0
  return 1 + (Math.abs(s) % 4)
}

export function mockStatPills(playerId: string) {
  let s = 0
  for (let i = 0; i < playerId.length; i++) s = (s * 17 + playerId.charCodeAt(i)) | 0
  const a = Math.abs(s)
  return {
    soloTackles: 2 + (a % 8),
    assistedTackles: 1 + (a % 5),
    sacks: (a % 3) / 2,
    interceptions: a % 2,
    passDeflections: a % 4,
    forcedFumbles: a % 2,
    fumbleRecoveries: a % 2,
    defensiveTDs: a % 3 === 0 ? 1 : 0,
  }
}
