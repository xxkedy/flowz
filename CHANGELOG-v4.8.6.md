# Flowz v4.8.6 — Verified Diary Sync

Date: 2026-08-22

## Changed
- Added a mandatory Diary Sync Gate for kedy Flowz prompts.
- `Wrap up` / `まとめて` now requires updating the existing Diary page and re-fetching it before the coach may claim the Diary was recorded.
- The existing yellow `🗽 English Log` block must be updated in place; duplicate Diary pages and duplicate English Log blocks are forbidden.
- The compact English Log contains 2–3 diary sentences, one Phrase, up to three Fix lines, and Coach Assessment / next focus when available.
- If Notion is unavailable or verification fails, the coach must explicitly report `Diary未記録` and return copy-ready log text instead of pretending the write succeeded.

## Scope
- kedy Flowz session prompts only.
- Conversation continuity, Duo Sync, XP, history, Leni modes, and storage behavior are unchanged.
