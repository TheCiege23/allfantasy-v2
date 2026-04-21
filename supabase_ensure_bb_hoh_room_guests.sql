-- big_brother_hoh_room_guests
-- HOH can invite/kick roster guests into the private HOH Room chat channel for a cycle.
-- Membership is scoped to one cycle; rows are cascade-deleted when the cycle is removed.

CREATE TABLE IF NOT EXISTS big_brother_hoh_room_guests (
  id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  cycle_id   TEXT        NOT NULL,
  roster_id  VARCHAR(64) NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_bb_hoh_room_guest_cycle
    FOREIGN KEY (cycle_id) REFERENCES big_brother_cycles(id) ON DELETE CASCADE,

  CONSTRAINT uq_bb_hoh_room_guest UNIQUE (cycle_id, roster_id)
);

CREATE INDEX IF NOT EXISTS idx_bb_hoh_room_guests_cycle ON big_brother_hoh_room_guests(cycle_id);
