# Flowz v3.5 — Quick Commute

## Added
- A prominent `⚡ QUICK COMMUTE` button for kedy.
- One-tap launch support through `?profile=kedy&quick=commute`.
- Automatic kedy profile selection, COMMUTE mission creation, and ChatGPT launch.
- URL cleanup before leaving Flowz to prevent an automatic reopen loop after returning.

## Preserved
- Existing local history and backup keys.
- The current hidden-mission conversation prompt.
- Automatic base 10 XP recording after a session of at least two minutes.
- Leni profile behavior and normal manual mode selection.

## Validation
- `flowz-v3.5-quick.js` passes `node --check`.
- Version and cache-busting references updated to v3.5.
