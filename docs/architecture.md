# Architecture & State Management

MediaVore Translator is built as a single-page React application (SPA). All processing, mapping, data pulling, and exporting occurs entirely locally within the user's browser securely, meaning no user file data ever touches a proprietary backend. External operations are strictly limited to TMDB metadata searches and scraping remote movie/tv profiles for titles.

## High-Level Data Flow

1. **File Ingestion:** The user selects a file (CSV, JSON, YAML). `src/utils/parsers.ts` parses the raw data into a structured array of generic row objects (`parsedFiles`).
2. **Column Mapping (`SetupPanel.tsx`):** The user interactively maps standard MediaVore fields (Title, Year, Type, Season, Episode) to the columns available in their ingested file. They can specify if the title field is literal text, or a URL that needs scraping.
3. **Data Distillation:** `MatchContainer.tsx` digests all parsed rows across all loaded files into a streamlined list of *unique* entities (`titlesList`). Duplicates are automatically pruned so each show or movie is only searched once.
4. **Data Population:**
   - **Scraping:** If an item is mapped via a URL, `scrapeData` fetches the title using CORS proxies and CSS Selectors.
   - **TMDB Query:** The resulting entity title and year are queried against the TMDB API.
5. **Human Review (`TitleCard.tsx`):** If a title resolves unambiguously (or `autoConfirm` is on), the item locks into the `confirmedMap`. Otherwise, the user manually selects the correct match.
6. **Exportation:** When all unique items hold a validated TMDB match, a final `.mdv` zip containing well-formatted `seen.csv`, `likes.csv`, `notifications.csv`, etc., is generated via `JSZip`.

## State Management (`AppContext.tsx`)

The app avoids Redux or Zustand in favor of native React Context (`AppContext.tsx`), which provides a centralized store for:
- `parsedFiles`: Collections of raw parsed row data.
- `fileMappings`: Dictionary mapping file names to their respective column mappings.
- `confirmedMap`: The ultimate dictionary associating a raw unique title (e.g. "The Matrix::movie") to its verified exact TMDB metadata object.
- `apiKey`: The user's provided TMDB API key.
- `autoConfirm`: User setting toggle.

This context ensures `SetupPanel`, `MatchContainer`, and various utility modals all remain naturally synchronized perfectly across rerenders.
