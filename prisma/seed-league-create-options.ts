import { PrismaClient } from '@prisma/client'
import { LEAGUE_CREATE_OPTIONS_CATALOG_V1 } from '../lib/league-creation/options-catalog-seed-data'

const prisma = new PrismaClient()

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "league_create_options_catalog" (
  "key" TEXT PRIMARY KEY,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

const UPSERT_SQL = `
INSERT INTO "league_create_options_catalog" ("key", "payload", "createdAt", "updatedAt")
VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key")
DO UPDATE SET
  "payload" = EXCLUDED."payload",
  "updatedAt" = CURRENT_TIMESTAMP;
`

async function main() {
  await prisma.$executeRawUnsafe(CREATE_TABLE_SQL)
  await prisma.$executeRawUnsafe(
    UPSERT_SQL,
    'default',
    JSON.stringify(LEAGUE_CREATE_OPTIONS_CATALOG_V1),
  )

  console.log('Seeded league create options catalog:', {
    key: 'default',
    version: LEAGUE_CREATE_OPTIONS_CATALOG_V1.version,
    concepts: LEAGUE_CREATE_OPTIONS_CATALOG_V1.concepts.length,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
