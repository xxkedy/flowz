# Flowz v4.3.5 — Version Lock + Cache Refresh

## Fixed
- History Vault no longer owns or rewrites the visible app version, page title, or footer.
- The visible version no longer falls back from v4.3.4 to v3.8 after load or every 10 seconds.
- The root entry now appends `v=4.3.5` when redirecting to the app, forcing Windows and Safari to request the current HTML instead of a stale cached copy.
- The updated History Vault file uses a new cache key (`v=3.8.2`).
- The final version layer now displays v4.3.5 consistently.

## Verify
1. Open the root Flowz URL and confirm `v4.3.5 (2026.8.6)`.
2. Keep the page open for at least 15 seconds and confirm it does not return to v3.8.
3. Reload on Windows and confirm the updated COMMUTE layout and version appear.
4. Confirm History Vault still protects the existing days and sessions.
