import { describe, expect, it } from 'vitest'
import { resolveDatabaseUrl } from '@/lib/env/database-url'

describe('resolveDatabaseUrl', () => {
  it('adds pgbouncer-safe params for Supabase transaction pooler URLs', () => {
    const url = resolveDatabaseUrl({
      DATABASE_URL:
        'postgresql://u:p@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require',
    })

    expect(url).toContain('pooler.supabase.com:6543')
    expect(url).toContain('pgbouncer=true')
    expect(url).toContain('connection_limit=1')
  })

  it('preserves non-pooler URLs unchanged', () => {
    const input = 'postgresql://u:p@db.iyobqczaobkyxvgrrcgq.supabase.co:5432/postgres?sslmode=require'
    const url = resolveDatabaseUrl({ DATABASE_URL: input })
    expect(url).toBe(input)
  })
})
