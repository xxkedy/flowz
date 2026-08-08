# Flowz v4.4.0 — Unified frontend rebuild

## Why

Since v3.4 the app had been shipped as a stack of "patch" scripts, each one
loaded after the last and each one independently rewriting the same DOM:

```
flowz-v3-duo.js            (core engine + render)
flowz-v3.4-override.js     (Notion-aware prompts, auto-record, version→v3.7)
flowz-v3.6-sync.js         (Duo Sync / Supabase, version→v3.6, 30s poll)
flowz-v3.6.1-ui.js         (label fixes, MutationObserver #1)
flowz-v3.6.2-ui.js         (label fixes, MutationObserver #2)
flowz-v3.8-history-vault.js(data recovery, 10s poll, can reload the page)
flowz-v3.8.1-backfill.js   (one-time historical backfill)
flowz-v3.9-workday-streak.js(workday streak, 5s poll)
flowz-v4.1-toeic-talk-prep.js (Talk Prep card, MutationObserver #3)
flowz-v4.3.7-toeic-study-voice.js (TOEIC Study, version→v4.3.7, 1s poll, MutationObserver #4)
flowz-v4.3.8-toeic-check-5q.js    (TOEIC Check, version→v4.3.8, 1s poll, MutationObserver #5)
flowz-v4.3.9-modes.js       (mode tile relabel/reorder)
flowz-v4.3.9-repair.js      (commute prompt, version→v4.3.9, 5s poll, MutationObserver #6)
```

Every one of those files ran its own copy of "rewrite the version label /
document.title / footer", its own `setInterval` poll loop, and (six of
them) its own `MutationObserver` on `document.body` or
`document.documentElement` with `subtree + childList + characterData`.
None of them knew about the others.

### Root cause of each reported symptom

- **Version flickering between v4.3.7 and v4.3.8** — both
  `flowz-v4.3.7-toeic-study-voice.js` and `flowz-v4.3.8-toeic-check-5q.js`
  ran an independent `setInterval(..., 1000)` that unconditionally
  overwrote `.version`, `document.title`, and the footer note with their
  own hard-coded string. The two intervals were not synchronized, so
  whichever one's tick landed last "won" for that second. A third writer
  (`flowz-v4.3.9-repair.js`, 5s interval) occasionally overwrote both.
- **Duo Sync panel reappearing at the top** — `flowz-v3.8-history-vault.js`
  (10s poll) and the auto-complete reconciliation in
  `flowz-v4.3.9-repair.js` both called `location.reload()` whenever they
  detected a state change. A full reload rebuilds the DOM from scratch,
  and `flowz-v3.6-sync.js` always re-inserts `#flowzCloudPanel`
  immediately after `.profile-switch` (the very top of the page) — so a
  background poll firing at the wrong moment looked like the panel
  "jumping" back to the top.
- **Periodic jank** — six competing `setInterval` loops (1s, 1s, 5s, 5s,
  10s, 30s) plus six `MutationObserver`s meant that essentially any
  `textContent`/`className` write from *any* of the six observed
  functions re-triggered all six others, which then also write to the
  DOM. On iPhone Safari this constant background layout/style
  recalculation is visible as stutter, especially while scrolling.
- **GitHub Pages build succeeding but the device still looking broken** —
  this was never a Pages/CDN caching problem. Pages was serving the
  correct files the whole time; the instability was 100% client-side
  script contention that resets on every load, so a fresh deploy "fixed"
  nothing.

## What changed

- **One controller file, `flowz-app.js`**, replaces all 13 scripts above.
  It owns state load/merge, rendering, mode tiles, prompts, the Talk Prep
  card, the TOEIC assessment panel, and Duo Sync (Supabase) — there is
  exactly one function that writes `.version` / `document.title` / the
  footer (`renderRelease()`), one that builds the mode tiles
  (`renderModes()`), and one that owns the Duo Sync panel
  (`renderCloudPanel()` / `bindCloudPanel()`).
- **Zero `MutationObserver`s, zero polling `setInterval`s.** All redraws
  are event-driven: profile-button clicks, mode-tile clicks (event
  delegation), the `startBtn`/`completeBtn` clicks, the `storage` event
  (cross-tab), `pageshow` / `visibilitychange` / `focus` (debounced into
  one shared `resync()`), and the Supabase realtime channel's
  `postgres_changes` push. Duo Sync used to poll every 30s; it now only
  syncs on those real events plus the manual "↻ SYNC" button.
- **No more `location.reload()` anywhere.** History-vault-style recovery
  and backfill now run once during bootstrap, *before* the first render,
  so recovered data shows up in the very first paint instead of causing a
  reload. Auto-completing a session (returning from ChatGPT) now calls
  `render()` in place instead of reloading the page.
- **Duo Sync panel moved next to Data & Backup**, per the new layout
  requirement, and is now a static `<section id="flowzCloudPanel">` in
  the HTML that JS only fills — it is never inserted/moved at runtime, so
  there's no layout jump.
- **Talk Prep card moved above the mode grid** (Profile → Today/Talk Prep
  → English Session), matching the required top-of-page order.
- **`#startBtn` had five separate competing capture-phase click
  listeners** (one per mode-specific script), each guessing whether it
  owned the current `pending.mode` and racing to call
  `stopImmediatePropagation()` first. Replaced with one plain listener
  that looks at `pending.mode` and dispatches to the right prompt
  builder — no capture-phase interception needed at all.
- **COMMUTE / FREE conversation rule preserved exactly**: replies made
  only of acknowledgement words ("Perfect", "You're welcome", "Got it",
  "Thanks", …) never end a turn — the coach always continues with a
  question, topic, or next sentence.
- **Notion is only touched at wrap-up.** The TOEIC Check / TOEIC Study
  prompts previously told ChatGPT to pre-read recent Notion logs "without
  delaying the opening" before the mission even started; that pre-read
  instruction was removed. Every mode's prompt now records to the
  existing daily Diary page only when the user says "まとめて"/"Wrap up".
- **Workday-based streak math kept** (the v3.9 behavior — Mon–Fri only
  for kedy; Leni keeps the original calendar-day streak), now computed
  inline in the single render pass instead of a separate 5s-interval
  script.
- **The TOEIC result modal now has real CSS.** It previously had no
  stylesheet rule anywhere in the loaded script set (the file that defined
  it, `flowz-v4.3.8-unified-ui-lock.js`, was not even wired into the HTML)
  so it rendered unstyled. It now has a proper centered overlay.
- **All existing `localStorage` keys and shapes are unchanged**:
  `flowz_duo_data`, `flowz_duo_data_backup`, `flowz_duo_v3`,
  `flowz_duo_pending`, `flowz_duo_cloud_v1`, `flowz_toeic_results_v1`,
  plus `flowz_history_vault_v1`, the daily `flowz_history_snapshot_*`
  keys, and the one-time backfill marker. Bootstrap merges every
  recognizable `flowz*`/legacy key it finds (max-wins per field) instead
  of picking a single "best" candidate, so nothing already on a device is
  ever dropped.
- **Same Supabase project / Room schema.** `SUPABASE_URL`,
  `SUPABASE_KEY`, and the `flowz_rooms` / `flowz_members` /
  `flowz_sessions` RPC calls (`flowz_create_room`, `flowz_join_room`) are
  unchanged, so existing Duo Rooms keep working.

## Retired files

The 13 scripts that were wired into `flowz-v3-duo.html` (listed above)
are no longer loaded — their logic now lives in `flowz-app.js`. They are
archived under `legacy/` (see `legacy/README.md` for the full
old-file → new-function mapping); nothing in that folder is referenced by
any HTML, and nothing there may be re-added to a `<script>` tag. Also
retired: nine files that were **already unused** (not referenced by any
HTML in `main`) before this change and were superseded by later patches:
`flowz-v3.3-override.js`, `flowz-v3.5-quick.js`,
`flowz-v4-conversation-first.js`, `flowz-v4.2-profile-sync-toeic-study.js`,
`flowz-v4.2.1-stability.js`, `flowz-v4.3-bath-review.js`,
`flowz-v4.3.4-audio-commute.js`, `flowz-v4.3.4-version.js`,
`flowz-v4.3.8-unified-ui-lock.js`. Their functionality was either dead
code or fully superseded by a later patch already folded into
`flowz-app.js`.

## Version

Fixed at a single new stable release: **v4.4.0 (2026.8.7)**. This is the
only version string in the codebase (`RELEASE` constant in
`flowz-app.js`); nothing else writes `.version`, `document.title`, or the
footer note.

## Post-consolidation fixes (browser-verified)

Found while verifying the consolidated build in a real browser:

- **Two-tab storage ping-pong.** The `storage` listener re-read state and
  then persisted it unconditionally. Two open tabs would therefore write
  to each other forever, each write firing the other's `storage` event.
  It now only persists when the merge actually produced new data.
- **Duo Code input wiped by a redraw.** Any `render()` while the user was
  halfway through typing a 6-digit Duo Code cleared the field. The typed
  value is now carried across the redraw.
- **REVIEW / FREE mission guides.** Both fell back to a generic mission
  guide; they now carry their own copy ("約3〜5分。直近のDiary English
  Logから3フレーズを1問ずつ復習。" and "固定レッスンなし。今日話したい
  ことを自然な英会話で続ける。").
- Dead ternary in `stateFromDates()`.

## Verification results

Measured in Chromium at iPhone viewport (375×812) against the real files:

| Check | Result |
| --- | --- |
| Idle 41s | 0 DOM mutations, snapshot byte-identical |
| Version / title / footer | never rewritten after first paint |
| Duo Sync panel position | fixed at body index 11 throughout |
| 10× kedy ↔ Leni switches | tile order + all node counts unchanged |
| 25× `render()` | all node counts unchanged (no DOM growth) |
| 24 resume events (visibility/focus/pageshow) | 0 DOM mutations, 0 XP change |
| Auto-complete | 10 XP / count 1 / 1 session, once — survives reload |
| Legacy migration | `flowz_duo_v3` + backup + `tm_days` + `tm_last` → union of 4 days, phrase bonus and Leni history intact |
| No-op `storage` events ×5 | 0 writes (ping-pong closed); real changes still applied |
| Prompt spec | 27/27 assertions pass across COMMUTE / TOEIC CHECK / TOEIC STUDY / REVIEW / FREE / Leni |
| Console errors | none |
| Horizontal overflow at 375px | none |
