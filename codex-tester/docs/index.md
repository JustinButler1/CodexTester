# Directory Guide

- `src/shared`: shared runtime utilities. Currently contains the in-memory Spades game store that coordinates data between the games list and live tracker.
- `supabase`: SQL migrations and database helpers. Use these scripts to keep the remote Supabase schema (profiles, etc.) in sync with the app.
