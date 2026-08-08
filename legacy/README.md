# legacy/ — archived, NOT loaded at runtime

These are the 22 patch scripts that made up the Flowz frontend up to v4.3.9.
They are kept for reference only. **Nothing in this folder is referenced by
`flowz-v3-duo.html` or `index.html`, and nothing here may be re-added to a
`<script>` tag.**

## Why they were retired

Each file independently rewrote the same DOM — the version label, the
`document.title`, the footer note, the mode tiles, the Duo Sync panel — on its
own `MutationObserver` and `setInterval` loop. Because they ran in load order
and then kept re-applying, whichever script fired last won. That is what
produced the version label rolling back (`v4.3.7` → `v4.3.8` → `v4.3.9`), the
Duo Sync panel jumping position, and the periodic jank on iPhone Safari.

Between them they held 6 `MutationObserver`s and 5 repeating `setInterval`s,
three of which called `location.reload()` on their own.

## Where each responsibility lives now

Everything below is in the single controller `flowz-app.js`:

| Old file | Responsibility | Now |
| --- | --- | --- |
| `flowz-v3-duo.js` | base state, render, missions, XP, week strip | state model + render pipeline |
| `flowz-v3.4-override.js` | auto-record, assessment panel, Notion prompts | `autoComplete()`, `renderAssessment()` |
| `flowz-v3.6-sync.js` | Supabase Duo Sync | Duo Sync section |
| `flowz-v3.6.1-ui.js`, `flowz-v3.6.2-ui.js` | profile name labels | `LABELS` + `render()` |
| `flowz-v3.8-history-vault.js` | localStorage merge/repair | `bootstrapState()` |
| `flowz-v3.8.1-backfill.js` | 2026-07/08 history backfill | `applyBackfill()` |
| `flowz-v3.9-workday-streak.js` | workday streak for kedy | `workdayStreak()` |
| `flowz-v4.1-toeic-talk-prep.js` | Talk Prep card | `renderTalkPrep()` |
| `flowz-v4.3.7-toeic-study-voice.js` | TOEIC STUDY prompt | `toeicStudyPrompt()` |
| `flowz-v4.3.8-toeic-check-5q.js` | TOEIC CHECK prompt + result modal | `toeicCheckPrompt()`, `openToeicModal()` |
| `flowz-v4.3.9-modes.js` | REVIEW / FREE tiles and prompts | `KEDY_GRID`, `reviewPrompt()`, `freePrompt()` |
| `flowz-v4.3.9-repair.js` | COMMUTE prompt, release label, auto-complete | `commutePrompt()`, `renderRelease()` |

The remaining files (`flowz-v3.3-override.js`, `flowz-v3.5-quick.js`,
`flowz-v4-conversation-first.js`, `flowz-v4.2-profile-sync-toeic-study.js`,
`flowz-v4.2.1-stability.js`, `flowz-v4.3-bath-review.js`,
`flowz-v4.3.4-audio-commute.js`, `flowz-v4.3.4-version.js`,
`flowz-v4.3.8-unified-ui-lock.js`) were already dead on `main` — present in the
repo but not referenced by any `<script>` tag.
