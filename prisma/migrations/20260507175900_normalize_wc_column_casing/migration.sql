-- -----------------------------------------------------------------------------
-- Corrective migration: normalize World Cup table column casing
--
-- Context
-- -------
-- The init migration (20260429120000_world_cup_brackets) created all World Cup
-- tables using quoted camelCase column identifiers (e.g. "challengeId", "userId").
-- On PRODUCTION the tables were set up via `prisma db push` which follows the
-- Prisma schema.prisma @map directives and therefore uses snake_case column names.
-- This causes a discrepancy: the shadow DB (built by replaying migration files
-- from scratch) has camelCase columns, while production has snake_case columns.
--
-- The next migration (20260507180000_world_cup_bracket_entries) was written for
-- production (snake_case) and fails in the shadow DB because the SELECT/UPDATE
-- backfill references columns like p.challenge_id, p.user_id, etc. which do not
-- exist in the camelCase shadow DB.
--
-- Fix
-- ---
-- This migration renames all camelCase columns to snake_case in:
--   - world_cup_bracket_participants
--   - world_cup_bracket_picks
--   - world_cup_bracket_challenges
--   - world_cup_bracket_matches
--   - world_cup_teams
--   - world_cup_bracket_slots
--   - world_cup_bracket_invites
--   - world_cup_bracket_scoring_profiles
--
-- Every rename is wrapped in a DO block with an IF EXISTS guard so that:
--   - Shadow DB: camelCase columns ARE renamed (enabling subsequent migrations)
--   - Production: snake_case columns already exist — all checks return false,
--     every RENAME is skipped — this migration is a complete no-op on production
--
-- NEVER delete or modify this migration after it has been applied.
-- -----------------------------------------------------------------------------

-- world_cup_teams
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='apiTeamId') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "apiTeamId" TO api_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='fifaCode') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "fifaCode" TO fifa_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='flagUrl') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "flagUrl" TO flag_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='logoUrl') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "logoUrl" TO logo_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='groupName') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "groupName" TO group_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='qualificationStatus') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "qualificationStatus" TO qualification_status;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='sourcePayload') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "sourcePayload" TO source_payload;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_teams' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_teams RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_scoring_profiles
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='roundOf32Points') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "roundOf32Points" TO round_of_32_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='roundOf16Points') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "roundOf16Points" TO round_of_16_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='quarterFinalPoints') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "quarterFinalPoints" TO quarter_final_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='semiFinalPoints') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "semiFinalPoints" TO semi_final_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='finalPoints') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "finalPoints" TO final_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='championBonusPoints') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "championBonusPoints" TO champion_bonus_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='thirdPlacePoints') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "thirdPlacePoints" TO third_place_points;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='upsetBonusEnabled') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "upsetBonusEnabled" TO upset_bonus_enabled;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_scoring_profiles' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_scoring_profiles RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_challenges
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='ownerUserId') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "ownerUserId" TO owner_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='seasonYear') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "seasonYear" TO season_year;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='tournamentKey') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "tournamentKey" TO tournament_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='inviteCode') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "inviteCode" TO invite_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='inviteUrl') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "inviteUrl" TO invite_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='pickLockStrategy') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "pickLockStrategy" TO pick_lock_strategy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='pickLockAt') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "pickLockAt" TO pick_lock_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='scoringProfileId') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "scoringProfileId" TO scoring_profile_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='includeThirdPlace') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "includeThirdPlace" TO include_third_place;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='lastSyncedAt') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "lastSyncedAt" TO last_synced_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='sourcePayload') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "sourcePayload" TO source_payload;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_challenges' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_challenges RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_slots
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='challengeId') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "challengeId" TO challenge_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='slotKey') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "slotKey" TO slot_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='sourceGroup') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "sourceGroup" TO source_group;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='sourceRank') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "sourceRank" TO source_rank;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='teamId') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "teamId" TO team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='displayName') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "displayName" TO display_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='lockedAt') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "lockedAt" TO locked_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='isPlaceholder') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "isPlaceholder" TO is_placeholder;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_slots' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_slots RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_participants  (critical — referenced in 20260507180000 INSERT backfill)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='challengeId') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "challengeId" TO challenge_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='userId') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "userId" TO user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='displayName') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "displayName" TO display_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='joinedAt') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "joinedAt" TO joined_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='totalScore') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "totalScore" TO total_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='maxPossibleScore') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "maxPossibleScore" TO max_possible_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='championPickTeamId') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "championPickTeamId" TO champion_pick_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='championPickName') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "championPickName" TO champion_pick_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='correctPicks') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "correctPicks" TO correct_picks;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='roundBreakdown') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "roundBreakdown" TO round_breakdown;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_participants' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_participants RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_matches
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='challengeId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "challengeId" TO challenge_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='apiFixtureId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "apiFixtureId" TO api_fixture_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='roundIndex') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "roundIndex" TO round_index;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='matchNumber') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "matchNumber" TO match_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homeSlotKey') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homeSlotKey" TO home_slot_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awaySlotKey') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awaySlotKey" TO away_slot_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homeTeamId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homeTeamId" TO home_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awayTeamId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awayTeamId" TO away_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homeTeamName') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homeTeamName" TO home_team_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awayTeamName') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awayTeamName" TO away_team_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homeTeamLogo') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homeTeamLogo" TO home_team_logo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awayTeamLogo') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awayTeamLogo" TO away_team_logo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homeScore') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homeScore" TO home_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awayScore') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awayScore" TO away_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='homePenaltyScore') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "homePenaltyScore" TO home_penalty_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='awayPenaltyScore') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "awayPenaltyScore" TO away_penalty_score;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='startsAt') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "startsAt" TO starts_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='winnerTeamId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "winnerTeamId" TO winner_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='winnerTeamName') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "winnerTeamName" TO winner_team_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='nextMatchId') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "nextMatchId" TO next_match_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='nextMatchSlot') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "nextMatchSlot" TO next_match_slot;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='sourcePayload') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "sourcePayload" TO source_payload;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_matches' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_matches RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_picks  (critical — referenced in 20260507180000 UPDATE backfill + CREATE INDEX)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='challengeId') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "challengeId" TO challenge_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='participantId') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "participantId" TO participant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='matchId') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "matchId" TO match_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='selectedTeamId') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "selectedTeamId" TO selected_team_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='selectedSlotKey') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "selectedSlotKey" TO selected_slot_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='selectedTeamName') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "selectedTeamName" TO selected_team_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='pointsAwarded') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "pointsAwarded" TO points_awarded;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='isCorrect') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "isCorrect" TO is_correct;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='lockedAt') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "lockedAt" TO locked_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_picks' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_picks RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- world_cup_bracket_invites
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='challengeId') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "challengeId" TO challenge_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='inviteCode') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "inviteCode" TO invite_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='inviteEmail') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "inviteEmail" TO invite_email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='invitedBy') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "invitedBy" TO invited_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='acceptedBy') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "acceptedBy" TO accepted_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='acceptedAt') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "acceptedAt" TO accepted_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='expiresAt') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "expiresAt" TO expires_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='createdAt') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_cup_bracket_invites' AND column_name='updatedAt') THEN
    ALTER TABLE world_cup_bracket_invites RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;
