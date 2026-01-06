# Agent Tools & Integrations

This file documents the practical tools, endpoints and CI hooks the agent can rely on when
running tasks for this repository. It is intended as a human- and machine-readable reference.

Client-side usage
- This repository runs as a static front-end. Searches are performed from the browser
  against the TMDB API using a user-provided API key. CSV input is provided by the user
  (uploaded via the UI).

Local CLI commands (developer guidance)
No server required — open `index.html` in your browser and upload a CSV.

Agent-side utilities (suggested implementations)
`search_tmdb(title, type)` — perform a TMDB search from the browser using the stored API key, returning candidates with `id`, `name`, `release_date`, and optionally a score.
- `convert_row_to_json(row, chosen_candidate)` — map CSV fields to target JSON schema.

Telemetry & Safety
- Do not log `TMDB_API_TOKEN`.
- For bulk conversions, rate-limit calls to TMDB and batch unique title lookups.
