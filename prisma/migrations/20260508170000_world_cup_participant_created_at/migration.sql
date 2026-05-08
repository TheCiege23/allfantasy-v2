ALTER TABLE world_cup_bracket_participants
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE world_cup_bracket_participants
SET created_at = joined_at
WHERE created_at IS NULL;
