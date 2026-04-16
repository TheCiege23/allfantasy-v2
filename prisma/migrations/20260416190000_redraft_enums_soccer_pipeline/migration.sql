-- Prisma enums: soccer pipeline variant, entry slot status, redraft member role.

CREATE TYPE "SoccerPipelineVariant" AS ENUM ('MLS', 'EURO');
CREATE TYPE "LeagueEntrySlotStatus" AS ENUM ('OPEN', 'FILLED', 'RESERVED');
CREATE TYPE "RedraftLeagueMemberRole" AS ENUM ('COMMISSIONER', 'MEMBER');

-- redraft_league_sport_integrations: replace sportVariant string with soccerPipelineVariant enum
ALTER TABLE "redraft_league_sport_integrations" ADD COLUMN "soccerPipelineVariant" "SoccerPipelineVariant";

UPDATE "redraft_league_sport_integrations"
SET "soccerPipelineVariant" = CASE
  WHEN LOWER("sportVariant") = 'mls' THEN 'MLS'::"SoccerPipelineVariant"
  WHEN LOWER("sportVariant") = 'euro' THEN 'EURO'::"SoccerPipelineVariant"
  ELSE NULL
END;

ALTER TABLE "redraft_league_sport_integrations" DROP COLUMN "sportVariant";

-- league_entry_slots.status: TEXT -> enum
ALTER TABLE "league_entry_slots" ADD COLUMN "status_new" "LeagueEntrySlotStatus";

UPDATE "league_entry_slots"
SET "status_new" = CASE UPPER("status")
  WHEN 'OPEN' THEN 'OPEN'::"LeagueEntrySlotStatus"
  WHEN 'FILLED' THEN 'FILLED'::"LeagueEntrySlotStatus"
  WHEN 'RESERVED' THEN 'RESERVED'::"LeagueEntrySlotStatus"
  ELSE 'OPEN'::"LeagueEntrySlotStatus"
END;

ALTER TABLE "league_entry_slots" DROP COLUMN "status";
ALTER TABLE "league_entry_slots" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "league_entry_slots" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "league_entry_slots" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"LeagueEntrySlotStatus";

-- redraft_league_members.role: TEXT -> enum
ALTER TABLE "redraft_league_members" ADD COLUMN "role_new" "RedraftLeagueMemberRole";

UPDATE "redraft_league_members"
SET "role_new" = CASE UPPER("role")
  WHEN 'COMMISSIONER' THEN 'COMMISSIONER'::"RedraftLeagueMemberRole"
  WHEN 'MEMBER' THEN 'MEMBER'::"RedraftLeagueMemberRole"
  ELSE 'COMMISSIONER'::"RedraftLeagueMemberRole"
END;

ALTER TABLE "redraft_league_members" DROP COLUMN "role";
ALTER TABLE "redraft_league_members" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "redraft_league_members" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "redraft_league_members" ALTER COLUMN "role" SET DEFAULT 'COMMISSIONER'::"RedraftLeagueMemberRole";
