These migrations were moved here to fix "drift" without resetting the database.
- 20260309_shared_platform_core
- 20260312_mock_draft_optional_league_metadata

The repo now uses 0_baseline (current DB state) + new migrations for future changes.
You can delete this folder after confirming migrate dev works.
