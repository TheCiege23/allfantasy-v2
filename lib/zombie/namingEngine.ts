/**
 * Algorithmic zombie universe / league naming (no AI required).
 * AI-enhanced naming should validate uniqueness then persist via `ZombieNameRecord`.
 */

const UNIVERSE_ADJECTIVES = [
  'Dead',
  'Fallen',
  'Last',
  'Dark',
  'Silent',
  'Forsaken',
  'Rotting',
  'Hollow',
  'Broken',
  'Cursed',
  'Ash',
  'Rusted',
] as const
const UNIVERSE_NOUNS = [
  'World',
  'Earth',
  'Zone',
  'Empire',
  'Dominion',
  'Frontier',
  'Wastes',
  'Grounds',
  'Sector',
  'Territory',
] as const

const LOCATIONS = [
  'Bunker',
  'Outpost',
  'Sector',
  'Zone',
  'District',
  'Compound',
  'Station',
  'Refuge',
  'Citadel',
  'Bastion',
] as const
const LOCATION_DESCS = ['Fallen', 'Dead', 'Last', 'Silent', 'Dark', 'Zero'] as const

const CREATURES = ['Horde', 'Hive', 'Swarm', 'Pack', 'Legion', 'Plague'] as const
const STATES = ['Rising', 'Falling', 'Raging', 'Spreading', 'Awakening'] as const

const POOL_C_FIXED = [
  'Iron Survivors',
  'Last Stand',
  'The Resistance',
  'Remnant Squad',
  'Hollow Guard',
  'Zero Hour',
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pick<T extends readonly string[]>(arr: T, seed: number, i: number): T[number] {
  return arr[(seed + i * 17) % arr.length]
}

/**
 * Unique universe-style name: "{Adj} {Noun} Universe"
 */
export function generateUniverseName(existing: string[]): string {
  const lower = new Set(existing.map((x) => x.toLowerCase()))
  let seed = Date.now()
  for (let attempt = 0; attempt < 400; attempt++) {
    seed += attempt * 997
    const adj = pick(UNIVERSE_ADJECTIVES, seed, 0)
    const noun = pick(UNIVERSE_NOUNS, seed, 1)
    const name = `${adj} ${noun} Universe`
    if (!lower.has(name.toLowerCase())) return name
  }
  return `Dead Zone Universe ${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Unique league name within a universe (or global list).
 */
export function generateLeagueName(
  existingNamesInUniverse: string[],
  poolPreference?: 'A' | 'B' | 'C',
): string {
  const lower = new Set(existingNamesInUniverse.map((x) => x.toLowerCase()))
  const seedBase = hashString(existingNamesInUniverse.join('|')) || Date.now()
  const rotate: ('A' | 'B' | 'C')[] = ['A', 'B', 'C']
  const start = poolPreference ? rotate.indexOf(poolPreference) : seedBase % 3

  for (let round = 0; round < 120; round++) {
    const pool = rotate[(start + round) % 3]
    let candidate = ''
    if (pool === 'A') {
      const loc = pick(LOCATIONS, seedBase, round * 2)
      const d = pick(LOCATION_DESCS, seedBase, round * 2 + 1)
      candidate = `${d} ${loc}`
    } else if (pool === 'B') {
      const c = pick(CREATURES, seedBase, round)
      const st = pick(STATES, seedBase, round + 11)
      candidate = `${c} ${st}`
    } else {
      candidate = pick(POOL_C_FIXED, seedBase, round)
    }
    if (!lower.has(candidate.toLowerCase())) return candidate
  }
  return `Dead Outpost ${Math.random().toString(36).slice(2, 8)}`
}
