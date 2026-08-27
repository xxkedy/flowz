# Flowz v4.8.6 — Verified Diary Sync

Date: 2026-08-22

## Changed
- Added a mandatory Diary Sync Gate for kedy Flowz prompts.
- `Wrap up` / `まとめて` now requires updating the existing Diary page and re-fetching it before the coach may claim the Diary was recorded.
- The existing yellow `🗽 English Log` block must be updated in place; duplicate Diary pages and duplicate English Log blocks are forbidden.
- The compact English Log contains 2–3 diary sentences, one Phrase, up to three Fix lines, and Coach Assessment / next focus when available.
- If Notion is unavailable or verification fails, the coach must explicitly report `Diary未記録` and return copy-ready log text instead of pretending the write succeeded.

## Hotfix r2 — 2026-08-27
- Added an explicit low-load shadowing override for kedy COMMUTE.
- When kedy clearly asks for more shadowing, says he does not want to use his brain, or asks to keep shadowing until work/home, that request now overrides the normal 90/10 ratio and the planned 2–3 sentence shadowing limit.
- Low-load shadowing gives exactly one new short natural sentence per coach turn, waits for one repetition, then moves directly to a different sentence.
- While kedy is asking to continue, the coach must not insert questions, advice, recaps, conversation switches, or stopping language such as `one last one` / `no more shadowing`.
- Repeated phrases are avoided unless kedy asks for review; low-load shadowing continues until he clearly returns to conversation, changes topic, or ends the session.

## Scope
- Base release remains Flowz v4.8.6.
- Hotfix r2 changes kedy COMMUTE prompt behavior only.
- Duo Sync, XP, history, Leni modes, storage behavior, and Diary Sync Gate are unchanged.
