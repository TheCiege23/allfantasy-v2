import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const totalImported = await p.earlyAccessSignup.count({ where: { source: 'legacy-import' } })
  const totalAll = await p.earlyAccessSignup.count()
  const sample = await p.earlyAccessSignup.findMany({
    where: { source: 'legacy-import' },
    select: { email: true, name: true, createdAt: true, source: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  console.log('legacy-import source count:', totalImported)
  console.log('total EarlyAccessSignup rows:', totalAll)
  console.log('sample (newest 5 from legacy-import):')
  for (const s of sample) {
    console.log('  -', s.email, '|', s.name ?? '<no name>', '|', s.createdAt.toISOString(), '|', s.source)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await p.$disconnect()
  })
