import { describe, it, expect } from 'vitest'
import { resolveDisplayName } from '@/lib/dashboard/resolve-display-name'

describe('resolveDisplayName', () => {
  it('prefers displayName over everything else', () => {
    expect(
      resolveDisplayName({
        displayName: 'Chimmy Fan',
        username: 'chimmyfan42',
        sessionName: 'someone',
        email: 'a@b.com',
      })
    ).toBe('Chimmy Fan')
  })

  it('falls back to username when displayName is missing', () => {
    expect(
      resolveDisplayName({
        displayName: null,
        username: 'chimmyfan42',
        sessionName: 'session person',
      })
    ).toBe('chimmyfan42')
  })

  it('uses sessionName when not an email and no displayName/username', () => {
    expect(resolveDisplayName({ sessionName: 'Coach K' })).toBe('Coach K')
  })

  it('never uses sessionName when it looks like an email', () => {
    expect(
      resolveDisplayName({ sessionName: 'jane.doe@example.com', email: 'jane.doe@example.com' })
    ).toBe('Manager')
  })

  it('honors custom fallback', () => {
    expect(resolveDisplayName({ fallback: 'Friend' })).toBe('Friend')
  })

  it('trims whitespace and ignores empty values', () => {
    expect(resolveDisplayName({ displayName: '   ', username: '  Alex ' })).toBe('Alex')
  })

  it('returns default fallback when nothing usable is provided', () => {
    expect(resolveDisplayName({})).toBe('Manager')
  })
})
