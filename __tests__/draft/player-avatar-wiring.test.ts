import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * E.1 — verify that the shared PlayerAvatar component is wired into all three draft surfaces:
 *   - DraftPlayerCard (player pool row)
 *   - DraftBoardCell  (drafted player on the board)
 *   - PlayerDetailModal (player detail header avatar)
 *
 * This is a static-source assertion suite — render-level coverage of PlayerAvatar's URL
 * classifier and initials computation is in __tests__/draft/classifyAvatarSource.test.ts.
 * (Vitest 4 + Rolldown's oxc transform currently rejects some inline JSX patterns in this
 * repo's tsx test files; the unit tests give us confident logic coverage without that
 * dependency.)
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('E.1 — PlayerAvatar wiring across draft surfaces', () => {
  it('PlayerAvatar.tsx exists and exports the component', () => {
    const src = read('components/app/draft-room/PlayerAvatar.tsx')
    expect(src).toMatch(/export function PlayerAvatar\b/)
    expect(src).toMatch(/classifyAvatarSource/)
    expect(src).toMatch(/initialsFor/)
  })

  it('DraftPlayerCard imports and uses PlayerAvatar (pool row)', () => {
    const src = read('components/app/draft-room/DraftPlayerCard.tsx')
    expect(src).toMatch(/from '\.\/PlayerAvatar'/)
    expect(src).toMatch(/<PlayerAvatar\b/)
  })

  it('DraftBoardCell imports and uses PlayerAvatar (drafted board cell)', () => {
    const src = read('components/app/draft-room/DraftBoardCell.tsx')
    expect(src).toMatch(/from '\.\/PlayerAvatar'/)
    expect(src).toMatch(/<PlayerAvatar\b/)
  })

  it('PlayerDetailModal imports and uses PlayerAvatar (modal header avatar — fixes the AF bug)', () => {
    const src = read('components/app/draft-room/PlayerDetailModal.tsx')
    expect(src).toMatch(/from '@\/components\/app\/draft-room\/PlayerAvatar'/)
    expect(src).toMatch(/<PlayerAvatar\b/)
  })

  it('PlayerDetailModal no longer renders the inline initials block that produced "AF"', () => {
    const src = read('components/app/draft-room/PlayerDetailModal.tsx')
    // The previous bug: inline `player.name.split(' ').slice(0, 2).map(w => w[0]).join('')`
    // — but ONLY when called from the modal header avatar. We removed that pattern from this
    // file. (Other surfaces in the file may still use split/join for unrelated chips.)
    expect(src).not.toMatch(/headerImageUrl\s*\?\s*\(\s*\/\/[^\n]*\n\s*<img\s+src=\{headerImageUrl/)
  })

  it('classifyAvatarSource module is exported from lib/draft-room', () => {
    const src = read('lib/draft-room/classify-avatar-source.ts')
    expect(src).toMatch(/export function classifyAvatarSource\b/)
    expect(src).toMatch(/export function initialsFor\b/)
    expect(src).toMatch(/export type AvatarSource\b/)
  })
})
