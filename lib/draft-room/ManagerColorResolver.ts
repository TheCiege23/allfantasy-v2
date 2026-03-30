/**
 * Deterministic manager color resolver for draft UI.
 * Keeps manager identity styling consistent across strips, board cells, and mock/live variants.
 */

export type ManagerColorDescriptor = {
  textClass: string
  chipClass: string
  tintHex: string
}

const MANAGER_PALETTE: ManagerColorDescriptor[] = [
  { textClass: 'text-cyan-200', chipClass: 'bg-cyan-500/20 border-cyan-400/50', tintHex: '#22d3ee' },
  { textClass: 'text-emerald-200', chipClass: 'bg-emerald-500/20 border-emerald-400/50', tintHex: '#34d399' },
  { textClass: 'text-violet-200', chipClass: 'bg-violet-500/20 border-violet-400/50', tintHex: '#a78bfa' },
  { textClass: 'text-amber-200', chipClass: 'bg-amber-500/20 border-amber-400/50', tintHex: '#fbbf24' },
  { textClass: 'text-rose-200', chipClass: 'bg-rose-500/20 border-rose-400/50', tintHex: '#fb7185' },
  { textClass: 'text-sky-200', chipClass: 'bg-sky-500/20 border-sky-400/50', tintHex: '#38bdf8' },
  { textClass: 'text-fuchsia-200', chipClass: 'bg-fuchsia-500/20 border-fuchsia-400/50', tintHex: '#e879f9' },
  { textClass: 'text-lime-200', chipClass: 'bg-lime-500/20 border-lime-400/50', tintHex: '#a3e635' },
  { textClass: 'text-orange-200', chipClass: 'bg-orange-500/20 border-orange-400/50', tintHex: '#fb923c' },
  { textClass: 'text-teal-200', chipClass: 'bg-teal-500/20 border-teal-400/50', tintHex: '#2dd4bf' },
  { textClass: 'text-indigo-200', chipClass: 'bg-indigo-500/20 border-indigo-400/50', tintHex: '#818cf8' },
  { textClass: 'text-pink-200', chipClass: 'bg-pink-500/20 border-pink-400/50', tintHex: '#f472b6' },
]

function stringHash(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3
    ? clean.split('').map((x) => x + x).join('')
    : clean
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

export function withAlpha(hex: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha))
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`
}

export function getManagerColorByIndex(index: number): ManagerColorDescriptor {
  const safeIndex = Math.abs(index) % MANAGER_PALETTE.length
  return MANAGER_PALETTE[safeIndex]!
}

export function getManagerColorBySlot(slot: number): ManagerColorDescriptor {
  return getManagerColorByIndex(Math.max(0, slot - 1))
}

export function getManagerColorBySeed(seed: string): ManagerColorDescriptor {
  return getManagerColorByIndex(stringHash(seed))
}
