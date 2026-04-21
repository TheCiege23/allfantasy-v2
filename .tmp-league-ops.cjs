const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check for NFL: prefixed IDs
  const records = await prisma.sportsPlayerRecord.findMany({
    where: { id: { startsWith: 'NFL:' } },
    select: { id: true, name: true, injuryStatus: true },
    take: 10,
  });
  console.log('NFL: prefixed records:', JSON.stringify(records, null, 2));
  
  // Also check the specific IDs we tried to seed
  const specific = await prisma.sportsPlayerRecord.findMany({
    where: { id: { in: ['NFL:13405', 'NFL:13402', 'NFL:13401', 'NFL:13403', 'NFL:9486', '13405', '13402'] } },
    select: { id: true, name: true, injuryStatus: true },
  });
  console.log('Specific IDs:', JSON.stringify(specific, null, 2));
}

main().catch(e => console.error(String(e))).finally(() => prisma.$disconnect());
