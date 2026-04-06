# Components

This document outlines the React component architecture in `src/components/`, designed for simplicity and strict separation of concerns.

## `MatchContainer.tsx`

The core orchestration container that manages the translation list.
- Calculates and removes duplicates.
- Generates `titlesList` representing every unique queried title across all files.
- Uses `useEffect` batch pipelines to asynchronously scrape raw URLs, immediately follow up with TMDB searches (up to 5 items simultaneously), and intelligently pause when rate-limited.
- Slices rows locally using Pagination (`currentPage`, `pageSize`).
- Contains the overall `Export Translation` logic that compiles `.csv` sheets via `JSZip`.

## `TitleCard.tsx`

Renders an individual unconfirmed search-validation row.
- Displays the currently evaluated Title, Year, and Type (Movie/TV).
- Displays the original scraped URL (demoted visually) if applicable.
- Conditionally renders `results` from TMDB:
  - If a scrape fails, displays a detailed error state.
  - If no TMDB matches occur, shows `No TMDB Matches` with an option to skip.
  - If matches exist, displays them in a short selectable list.
- Contains the `Edit Search` sub-component toggle, letting users forcibly rewrite incorrectly mapped or scraped strings manually and dispatching the new search immediately.

## `ScrapeVisualizerModal.tsx`

An interactive sandbox iframe tool allowing users to visually set up DOM queries.
- Connects to an external URL, safely parses its HTML.
- Injects a protocol-relative parser to force external CSS/fonts to load effectively.
- Suppresses native JavaScript execution via `sandbox` tags to block popups/redirects.
- Allows hovering over elements (using injected classes `.mediavore-hover`, `.mediavore-highlight`) and automatically deduces safe CSS queries (e.g. `h1.title`) to extract text data from user-clicks.
- Shows live parsed outputs ("Value: The Matrix") so users know their selectors work perfectly.

## `SetupPanel.tsx`

Step 1 of the app. Handles ingesting uploaded file objects via Dropzone logic.
- Renders the column mapping dropdowns.
- Differentiates generic text imports from explicit ID/URL mode imports.
- Conditionally spawns `FieldMapperModal` or `ScrapeVisualizerModal` when advanced configurations are requested.

## `FieldMapperModal.tsx` & `SettingsModal.tsx`

Auxiliary modals ensuring clean UI without bloating standard pages.
- `SettingsModal.tsx`: Accepts TMDB Keys, Toggle Toggles (Auto Confirm), and local Storage cache clearing.
- `FieldMapperModal.tsx`: Secondary modal for specific field values. It handles the "Content" configuration (toggling Movies and TV Series), dynamically showing conditional inputs like Season/Episode or Media Type values based on whether the dataset contains purely movies, purely series, or a mix of both.
