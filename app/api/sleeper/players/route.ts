import { NextResponse } from 'next/server'

export const revalidate = 86400

export type SlimPlayer = {
  id: string
  name: string
  position: string
  team: string
  espn_id?: string
}

/** Slim map of Sleeper NFL players — cached 24h via segment config. */
export async function GET() {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return NextResponse.json({})
    }
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({})
    }

    const out: Record<string, SlimPlayer> = {}
    for (const [playerId, raw] of Object.entries(data as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const p = raw as Record<string, unknown>
      const fullName = typeof p.full_name === 'string' ? p.full_name.trim() : ''
      const fn = typeof p.first_name === 'string' ? p.first_name.trim() : ''
      const ln = typeof p.last_name === 'string' ? p.last_name.trim() : ''
      const name =
        fullName || [fn, ln].filter(Boolean).join(' ').trim() || String(p.player_id ?? playerId)
      const position = typeof p.position === 'string' ? p.position : ''
      const teamRaw = typeof p.team === 'string' ? p.team.trim() : ''
      const team = teamRaw || 'FA'
      const espnRaw = p.espn_id
      const espn_id =
        espnRaw != null && espnRaw !== ''
          ? typeof espnRaw === 'number'
            ? String(espnRaw)
            : String(espnRaw).trim()
          : undefined
      out[playerId] = { id: playerId, name, position, team, ...(espn_id ? { espn_id } : {}) }
    }

    return NextResponse.json(out)
  } catch {
    return NextResponse.json({})
  }
}
