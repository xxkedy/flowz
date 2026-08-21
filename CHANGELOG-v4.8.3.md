# Flowz v4.8.3 — session date reliability

- Auto-complete now records a session on the calendar date when it was started, even when Flowz is reopened the next day or later.
- The session history timestamp also keeps the original startedAt value, so cloud migration preserves the correct study date.
- Restores kedy's user-confirmed 2026-08-19 and 2026-08-20 study days once, with a migration marker preventing duplicate XP or sessions. Repair events use the current sync timestamp while keeping their intended session_date so they can still reach Duo Sync after prior migrations.
- LAST 7 DAYS, COMMUTE / TOEIC / FREE, Personal Context, Duo Sync, History Vault, and Leni learning behavior otherwise stay unchanged.
