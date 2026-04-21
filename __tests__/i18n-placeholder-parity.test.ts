import { describe, expect, it } from 'vitest'
import { translations } from '@/lib/i18n/translations'

const PLACEHOLDER_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g

function placeholdersIn(s: string): Set<string> {
  const out = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(PLACEHOLDER_RE.source, 'g')
  while ((m = re.exec(s)) !== null) out.add(m[1]!)
  return out
}

describe('i18n placeholder parity (en vs es)', () => {
  const en = translations.en
  const es = translations.es

  it('for every key present in both en and es, {{placeholder}} names match', () => {
    const mismatches: string[] = []
    for (const key of Object.keys(en)) {
      if (!(key in es)) continue
      const ev = en[key] ?? ''
      const sv = es[key] ?? ''
      const pe = placeholdersIn(ev)
      const ps = placeholdersIn(sv)
      if (pe.size === 0 && ps.size === 0) continue
      if (pe.size !== ps.size || [...pe].some((p) => !ps.has(p)) || [...ps].some((p) => !pe.has(p))) {
        mismatches.push(
          `${key}: en=[${[...pe].sort().join(', ')}] es=[${[...ps].sort().join(', ')}]`,
        )
      }
    }
    expect(mismatches, mismatches.join('\n')).toEqual([])
  })
})
