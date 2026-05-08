# World Cup Bracket Testing

This checklist is for Prompt 6 production hardening verification.

## Entry Limits

1. Join a challenge and create entries until the maximum is reached.
2. Verify creation of a 6th entry is blocked with an error.
3. Verify deletion is blocked when only one entry remains.

## Pick Lock

1. Set challenge lock to tournament start with a lock time in the past.
2. Attempt to save a pick from board view.
3. Attempt to save a pick from guided picker.
4. Attempt to rename and delete entries.
5. Verify all actions are blocked with lock messaging.

## Guided Picker

1. Open guided picker with an unlocked entry.
2. Save a pick and verify auto-advance still works.
3. Verify read-only mode appears when challenge is locked.

## Cascade Invalidation

1. Pick winners through at least two rounds.
2. Change an earlier match winner.
3. Verify downstream picks are cleared for only the selected entry.
4. Verify success toast includes cleared pick count.
5. Simulate clear failure (network error) and verify pick is not misleadingly saved.

## Live Status Display

1. Load a challenge with live and final matches.
2. Verify ticker ordering and status badges still render.
3. Verify guided picker score/status displays are intact.

## Leaderboard Recalculation

1. Trigger the recalculate route from owner/admin controls.
2. Verify leaderboard and entry ranks update.
3. Verify locked entry flag consistency after recalc when challenge is locked.

## AI Preview Fallback

1. Disable AI key locally.
2. Open guided picker AI panel.
3. Verify deterministic preview still renders and "Use AI Pick" works.

## Admin Integrity Check

1. As owner/admin, run integrity check from the shell panel.
2. Verify stats render and errors/warnings display.
3. Verify non-owner users do not see admin integrity controls.
