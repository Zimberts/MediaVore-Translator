# TV Time Import

MediaVore Translator recognises the personal data export sent by TV Time (GDPR "Subject Access Request") and converts it into ready-mapped datasets, so no manual column mapping is needed.

## Getting the files

TV Time emails a password-protected `tv-time-personal-data.zip` and sends the password in a second email. Select the ZIP in the Setup step: the app detects that it is encrypted and asks for the password (ZipCrypto and AES archives are read with `@zip.js/zip.js`, entirely in the browser). Selecting the extracted `.csv` files also works; irrelevant files are ignored.

## Detection

`src/importers/tvtime.ts` exposes `isTVTimeExport(fileNames)` and `convertTVTimeExport(files)`. An upload is treated as a TV Time export when it contains `tracking-prod-records-v2.csv` or `tracking-prod-records.csv`. When detected, the raw TV Time files are replaced by the normalized datasets below, each with a preset `FieldMapping`.

## Source files and generated datasets

| Generated dataset | Category | Source | Records used |
| --- | --- | --- | --- |
| `TV Time/seen-episodes` | `seen` | `tracking-prod-records-v2.csv` | `watch-episode-*` and `rewatch-episode-*` keys |
| `TV Time/seen-movies` | `seen` | `tracking-prod-records.csv` | `type` = `watch` or `rewatch` |
| `TV Time/watchlist` | `watchlist` | `tracking-prod-records.csv`, `tracking-prod-records-v2.csv` | movies with `type` = `towatch` that were never watched; followed series (`user-series-*`) with no watched episode |
| `TV Time/likes` | `likes` | `lists-prod-lists.csv` | `favorite-movies` / `favorite-series` objects, resolved to titles through their `uuid` |

Normalized columns: `title`, `year`, `type` (`movie`/`tv`), `season`, `episode`, `date` (ISO 8601, UTC), `tvdbId`.

Notes:
- TV Time timestamps (`YYYY-MM-DD HH:MM:SS`) are UTC; they are converted to ISO 8601 with a `Z` suffix.
- Series names that carry a disambiguation year (`Doctor Who (2005)`) are split into `title` and `year`.
- Movie years come from `release_date`.
- Some records have no name (onboarding bulk imports). Episodes borrow the series name from another record with the same `s_id` (or `TVDB #<id>`, matching relies on the id anyway); movies rebuild a lowercase title from `alpha_range_key` (`watch-alpha-dumbo` → `dumbo`).
- Everything else in the export (devices, IPs, tokens, notifications, comments, recommendations) is ignored.

## TMDB matching

- **Series** carry TV Time's `s_id`, which is a TheTVDB id. The `tvdbId` mapping column makes `MatchContainer` call TMDB `GET /find/{id}?external_source=tvdb_id`. A single result is an exact match and is confirmed automatically, even when Auto Confirm is off. When `/find` returns nothing, it falls back to a title search.
- **Movies** only have a TV Time internal UUID, so they go through the usual title + release year search and manual review.
