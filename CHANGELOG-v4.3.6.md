# Flowz v4.3.6 — Final UI Lock

## Fixed
- The upper version could stay current while the lower mode layout reverted to the legacy four-tile UI after Duo Sync or another delayed render.
- The legacy base `render()` clears and rebuilds `#modes`; v4.3.6 now detects that DOM replacement and reapplies the final mode groups immediately.
- The final layer also restores the current footer and title if an older script writes its own version text.

## Final kedy layout
- COMMUTE remains the single top start path.
- BATH ROUTINE contains TOEIC CHECK, TOEIC STUDY, and REVIEW.
- FREE remains a separate full-width ANYTIME option.

## Validation
1. Open Flowz and confirm `v4.3.6 (2026.8.6)`.
2. Watch the lower mode area through Duo Sync loading; it must not settle back to the legacy layout.
3. Leave the page open for at least 30 seconds and switch profiles once.
4. Confirm REVIEW and FREE still open their own missions.
