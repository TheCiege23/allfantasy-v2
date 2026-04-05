import { vi } from "vitest"

/**
 * Default Prisma delegate shape for Vitest route/mocks. Spread or merge into
 * `vi.mock("@/lib/prisma", …)` and override with hoisted `vi.fn()` refs when
 * a test must assert call counts/args.
 */
export function prismaModelStub() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  }
}
