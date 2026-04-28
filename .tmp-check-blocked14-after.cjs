const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const blocked = [
    'Aaron Rodgers','Anthony Firkser','Austin Trammell','Chris Moore','Curtis Samuel','Dare Ogunbowale','Dareke Young','Darren Waller','David Njoku','DeAndre Hopkins','Denard Robinson','Keenan Allen','Nick Chubb','Tre Harris'
  ];
  const rows = await prisma.playerIdentityMap.findMany({
    where: { sport: 'NFL', canonicalName: { in: blocked } },
    select: { canonicalName: true, position: true, currentTeam: true, sleeperId: true },
    orderBy: { canonicalName: 'asc' }
  });
  const unresolved = rows.filter(r => !r.sleeperId).length;
  console.log(JSON.stringify({ total: rows.length, unresolved, rows }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error(String(e)); await prisma.$disconnect(); process.exit(1); });
