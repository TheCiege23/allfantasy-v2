// Helper to generate a random tournament for BracketLeague tests
module.exports = async function createTestTournament(prisma) {
  return prisma.bracketTournament.create({
    data: {
      name: "Test Tournament",
      season: 2026,
      sport: "NFL",
    },
  });
};
