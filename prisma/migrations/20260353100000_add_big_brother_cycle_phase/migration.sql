-- PROMPT 3: Add phase column to big_brother_cycles for week state machine.

ALTER TABLE "big_brother_cycles" ADD COLUMN "phase" VARCHAR(40) NOT NULL DEFAULT 'HOH_OPEN';
