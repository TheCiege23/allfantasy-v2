// Helper to generate a random join code for BracketLeague
module.exports = function randomJoinCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};
