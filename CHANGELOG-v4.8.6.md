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

## Hotfix r3 — 2026-09-02
- Strengthened kedy COMMUTE from simple continuity into conversation quality: the coach must react to the specific thing kedy said, add its own short opinion / observation / joke / mini-story, and actively extend the topic.
- `lead me` / `you lead` / `lead us` / `talk to me` / `会話を広げて` now explicitly switch to coach-led conversation with roughly 2–4 short audio-friendly sentences of concrete content before any question.
- Generic praise, motivational filler, and counselling-style lines such as `You've got this` / `one step at a time` are discouraged when they add no conversational content.
- Voice direction now asks for varied tone, rhythm, pacing, pauses, surprise, amusement, mild teasing, or disagreement when appropriate instead of a flat therapeutic delivery.
- Unusual phrases, complaints, titles, and strong wording should become material for the conversation rather than being merely repeated or praised.
- If kedy is bored or irritated, the coach changes content domain immediately instead of defending or rephrasing the same coaching frame.
- Immediate safety hazards may briefly interrupt the conversation, but once the hazard is resolved and kedy wants English again, generic `stop` / `breathe` / `stay safe` loops should not continue unless a new immediate hazard appears.
- COMMUTE adapter cache token bumped to `v4.8.6-r3` and regression assertions extended.
- The top-right badge now visually shows `v4.8.6 r3 · 09/02` and carries `data-release="4.8.6-r3"`, so the loaded hotfix can be checked immediately on iPhone.
- The old bottom `Last updated` line is hidden from the UI, leaving one visible release indicator at the top-right. Its underlying DOM marker remains only for compatibility with the existing release-stability contract.
- Root no-cache + timestamp cache busting remains unchanged; the COMMUTE adapter itself continues to use the explicit `v4.8.6-r3` cache token.

## Scope
- Base release remains Flowz v4.8.6.
- Hotfix r3 changes kedy COMMUTE prompt behavior only; the deployment badge change only affects release visibility.
- Duo Sync, XP, history, TOEIC, FREE, Leni modes, storage behavior, and Diary Sync Gate are unchanged.
