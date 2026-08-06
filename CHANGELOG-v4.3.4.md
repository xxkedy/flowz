# Flowz v4.3.4 — Audio-first Commute

## Changed
- COMMUTE starts speaking immediately without reading Notion before the first reply.
- Notion lookup and Diary write now happen only after `まとめて` / `Wrap up` unless kedy explicitly asks for past records.
- Casual greetings are limited to one natural response before moving into a real topic.
- Shadowing is one compact 2–3 sentence recap based on the actual conversation, with no praise-word repetition loops.
- Arrival Review and Wrap-up are optimized for listening without looking at the screen.
- Spoken Wrap-up is limited to a short natural recap; the full structured English Log is written silently to Notion.
- REVIEW, FREE, TOEIC CHECK, and TOEIC STUDY keep their existing dedicated prompts.

## Reason
The previous COMMUTE prompt forced a Notion read before conversation, causing a long startup wait. Its Wrap-up also sounded like a visual checklist rather than an audio-first recap.

## Verify
1. Reload Safari and confirm `v4.3.4 (2026.8.6)`.
2. Start COMMUTE and confirm ChatGPT replies before any Notion tool call.
3. Confirm greetings do not continue for multiple exchanges unless the conversation naturally does.
4. Confirm normal shadowing uses a 2–3 sentence recap and does not chain phrases such as `nailed it` or `spot on`.
5. Say `Wrap up` and confirm the spoken recap is short and understandable by ear, then the existing Diary page is updated and fetched again.
6. Confirm REVIEW/FREE/TOEIC modes still open their existing prompts.
