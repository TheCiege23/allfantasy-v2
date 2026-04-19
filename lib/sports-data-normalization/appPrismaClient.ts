import { prisma } from '@/lib/prisma'

/** Matches the extended Prisma client exported from `@/lib/prisma`. */
export type AppPrismaClient = typeof prisma
