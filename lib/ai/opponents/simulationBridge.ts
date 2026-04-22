/**
 * Bridge for league / mock simulators — re-exports engine without importing app routes.
 */

export { decideDraftPickRequest, decideLineupRequest, decideWaiverClaimsRequest, decideLongTermPlan } from "./aiOpponentEngine"
export { BOT_PROFILES, pickProfileForSlot } from "./botProfiles"
