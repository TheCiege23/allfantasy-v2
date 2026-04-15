import { prisma } from '../../../../lib/prisma'
import type { SqlExecutor } from './executor'

export class PrismaSqlExecutor implements SqlExecutor {
  async query<T>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> {
    const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as T[]
    return { rows }
  }
}

export function createPrismaSqlExecutor(): SqlExecutor {
  return new PrismaSqlExecutor()
}
