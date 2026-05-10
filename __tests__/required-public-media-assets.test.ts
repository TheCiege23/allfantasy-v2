import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.join(process.cwd(), 'public')

/** Wired by `fix(media): wire redraft and snake draft intro assets` — CI fails if bundles are missing. */
const REQUIRED_RELATIVE = [
  'media/league-intros/redraft-league-intro.mp4',
  'images/league-types/redraft.png',
  'media/draft-intros/snake-draft-intro.mp4',
  'images/draft-types/snake-draft.png',
]

describe('required public media files', () => {
  it.each(REQUIRED_RELATIVE)('exists: %s', (rel) => {
    const full = path.join(ROOT, rel)
    expect(fs.existsSync(full), `missing ${full}`).toBe(true)
  })
})
