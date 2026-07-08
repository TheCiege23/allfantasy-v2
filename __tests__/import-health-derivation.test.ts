import { describe, expect, it } from 'vitest'
import { deriveImportHealth } from '@/components/unified-import-ui/import-health'

describe('deriveImportHealth (Phase 4.2)', () => {
  it('healthy when the run completed cleanly with no warnings', () => {
    const r = deriveImportHealth({
      runStatus: 'completed',
      progress: 100,
      warningCounts: { error: 0, warn: 0, info: 0 },
    })
    expect(r.status).toBe('healthy')
    expect(r.tone).toBe('positive')
  })

  it('failed when the run itself failed', () => {
    const r = deriveImportHealth({ runStatus: 'failed', progress: 45 })
    expect(r.status).toBe('failed')
    expect(r.tone).toBe('critical')
  })

  it('pending when the run is still running (surfaces the % progress)', () => {
    const r = deriveImportHealth({ runStatus: 'running', progress: 62 })
    expect(r.status).toBe('pending')
    expect(r.tone).toBe('neutral')
    expect(r.detail).toContain('62%')
  })

  it('failed tone when there are error-severity warnings (even if run completed)', () => {
    const r = deriveImportHealth({
      runStatus: 'completed',
      progress: 100,
      warningCounts: { error: 2, warn: 1 },
    })
    expect(r.status).toBe('failed')
    expect(r.detail).toContain('2 import error')
  })

  it('incomplete + caution tone when progress landed between 0 and 100', () => {
    const r = deriveImportHealth({ runStatus: null, progress: 68 })
    expect(r.status).toBe('incomplete')
    expect(r.tone).toBe('caution')
  })

  it('attention tone when there are warn-severity warnings but no errors', () => {
    const r = deriveImportHealth({
      runStatus: 'completed',
      progress: 100,
      warningCounts: { warn: 3 },
    })
    expect(r.status).toBe('attention')
    expect(r.tone).toBe('caution')
    expect(r.detail).toContain('3 warning')
  })

  it('treats warn as tone caution (Monitor grammar) and singular messaging works', () => {
    const r = deriveImportHealth({
      runStatus: 'completed',
      progress: 100,
      warningCounts: { warn: 1 },
    })
    expect(r.detail).toContain('1 warning')
    expect(r.detail).not.toContain('warnings')
  })
})
