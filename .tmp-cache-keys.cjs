const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.sportsDataCache.findMany({
    select: { cacheKey: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('All cache keys:');
  keys.forEach(k => console.log(' ', k.cacheKey, '(exp:', k.expiresAt, ')'));
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
