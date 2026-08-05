# Flowz v3.6 Duo Sync — 2026.8.5

## Added
- Supabase anonymous authentication with persisted browser sessions
- Six-digit Duo Room creation and join flow
- kedy / Leni device membership display
- Existing local history migration to the connected room
- Session and XP synchronization across devices
- Supabase Realtime updates for partner activity
- Latest partner completion card
- Local storage backup and offline-first fallback

## Security
- Uses only the public Supabase publishable key in the browser
- Room data is protected by Row Level Security
- Only authenticated members of the same room can read sessions
- A device can insert sessions only for its assigned profile

## Setup
1. On kedy's device, open Flowz as kedy and create a six-digit Duo Code.
2. On Leni's device, open Flowz as Leni and join using the code.
3. Keep browser data enabled because anonymous authentication is stored locally.
