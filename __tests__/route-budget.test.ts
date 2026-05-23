import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}
function exists(rel: string): boolean {
  return existsSync(resolve(root, rel))
}

describe('Route budget — deleted routes must stay gone', () => {
  it('app/api/ai/context/route.ts is removed from disk', () => {
    expect(exists('app/api/ai/context/route.ts')).toBe(false)
  })

  it('no active fetch of /api/ai/context in app/', () => {
    // Guard: if someone re-adds a caller without re-adding the route they'll get a 404.
    // This test catches that drift at CI time.
    const suspects = [
      'app/dashboard/page.tsx',
      'app/dashboard/DashboardShell.tsx',
    ]
    for (const rel of suspects) {
      if (!exists(rel)) continue
      const src = read(rel)
      expect(src, `${rel} should not reference /api/ai/context`).not.toContain('/api/ai/context')
    }
  })
})

describe('Admin AI monitor — gating and wiring', () => {
  const dashPage = read('app/dashboard/page.tsx')

  it('imports isAdminEmailAllowed', () => {
    expect(dashPage).toContain("from '@/lib/adminAuth'")
    expect(dashPage).toContain('isAdminEmailAllowed')
  })

  it('imports getAiUsageReport', () => {
    expect(dashPage).toContain("from '@/lib/ai/aiUsageMonitor'")
    expect(dashPage).toContain('getAiUsageReport')
  })

  it('imports AiUsageMonitorPanel', () => {
    expect(dashPage).toContain("from '@/components/admin/AiUsageMonitorPanel'")
    expect(dashPage).toContain('AiUsageMonitorPanel')
  })

  it('panel is gated: only renders when adminReport is truthy', () => {
    // The pattern `{adminReport && (` ensures non-admins see nothing.
    expect(dashPage).toContain('{adminReport && (')
  })

  it('report fetch is conditional on isAdmin', () => {
    // Must not unconditionally call getAiUsageReport() for all users.
    expect(dashPage).toContain('isAdmin ? getAiUsageReport()')
  })

  it('panel is rendered as a sibling of DashboardShell inside a fragment', () => {
    expect(dashPage).toContain('<>')
    expect(dashPage).toContain('</>')
    expect(dashPage).toContain('<AiUsageMonitorPanel')
    expect(dashPage).toContain('<DashboardShell')
  })

  it('monitor panel component file exists', () => {
    expect(exists('components/admin/AiUsageMonitorPanel.tsx')).toBe(true)
  })

  it('monitor lib file exists', () => {
    expect(exists('lib/ai/aiUsageMonitor.ts')).toBe(true)
  })

  it('panel is positioned as a floating overlay (fixed class)', () => {
    expect(dashPage).toContain('fixed bottom-4 right-4')
  })
})
