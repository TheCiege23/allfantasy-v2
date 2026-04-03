/**
 * In-memory cache: AllFantasy user id → Sleeper user_id (owner_id).
 * Avoids repeated GET /user/{username} during a server lifetime.
 */
const sleeperUserIdBySessionUser = new Map<string, string>()

export function getCachedSleeperUserId(userId: string): string | undefined {
  return sleeperUserIdBySessionUser.get(userId)
}

export function setCachedSleeperUserId(userId: string, sleeperUserId: string): void {
  sleeperUserIdBySessionUser.set(userId, sleeperUserId)
}
