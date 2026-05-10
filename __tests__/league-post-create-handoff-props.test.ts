import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

describe('league post-create handoff props wiring', () => {
  it('League page maps post-create search params to LeagueShell props', () => {
    const src = read('app/league/[leagueId]/page.tsx')
    expect(src).toContain('const createdFromLeagueCreate = isPostCreateLeagueShellHandoff(sp)')
    expect(src).toContain('const defaultShowInvite = isTruthySearchParam(sp.showInvite)')
    expect(src).toContain("const defaultOpenChat = normalizeOpenChatQueryParam(firstSearchParam(sp.openChat)) === 'league' ? 'league' : null")
    expect(src).toContain('const shouldPlayIntro = isTruthySearchParam(sp.playIntro)')
    expect(src).toContain('createdFromLeagueCreate={createdFromLeagueCreate}')
    expect(src).toContain('defaultShowInvite={defaultShowInvite}')
    expect(src).toContain('defaultOpenChat={defaultOpenChat}')
    expect(src).toContain('shouldPlayIntro={shouldPlayIntro}')
  })

  it('LeagueShell accepts and consumes post-create handoff props', () => {
    const src = read('app/league/[leagueId]/LeagueShell.tsx')
    expect(src).toContain('createdFromLeagueCreate?: boolean')
    expect(src).toContain('defaultShowInvite?: boolean')
    expect(src).toContain("defaultOpenChat?: 'league' | null")
    expect(src).toContain('shouldPlayIntro?: boolean')
    expect(src).toContain('defaultShowInvite = false')
    expect(src).toContain('defaultOpenChat = null')
    expect(src).toContain('shouldPlayIntro = false')
    expect(src).toContain("openLeagueSettingsModal('invite')")
    expect(src).toContain('defaultOpenChat ?? normalizeOpenChatQueryParam(openChatQuery) ?? \'league\'')
  })
})
