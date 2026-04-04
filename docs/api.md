# API & Services

The MediaVore Translator interacts with two distinct external service layers: The TMDB database and open web pages via CORS proxies.

## `src/api/tmdb.ts`

Manages all requests natively against the `api.themoviedb.org/3/search/` endpoints.

- **Storage Cached Requests:** Searches are wrapped in a fast `utils/storage.ts` logic layer. Before a network request fires, it checks `tmdb_cache_[type]_[query]_[year]`. If present, it instantaneously resolves it directly from local memory without consuming TMDB rate limits.
- **Data Normalization:** Movie objects and TV object structures from the API differ natively. The `normalizeResult` helper unifies `release_date`, `first_air_date`, `title`, and `name` fields so `TitleCard.tsx` can consume them generically as a standard typed `TMDBResult`.
- **Search Types:** Dynamically queries `search/movie` or `search/tv` based on user-provided or auto-detected configurations, passing `include_adult=false`, `language=en-US`, and optionally `primary_release_year` / `first_air_date_year`.

## `src/api/scrape.ts`

Fetches arbitrary HTML from raw URLs to infer media titles. A vital fallback for datasets consisting only of user-shared links.

- **CORS Proxies:** Direct browser-to-browser fetch requests fail on most modern domains due to strict CORS policies. The `scrapeData` function tunnels GET requests through `https://corsproxy.io/?` to fetch full HTML.
- **Parsing logic:** Uses `DOMParser()` to inflate the HTML text into a virtual `Document`.
  1. Locates the primary string string utilizing user-provided CSS selectors (e.g. `h1.title`).
  2. Fallbacks intelligently to standard Open Graph (`<meta property="og:title">`) or standard `<title>` tags if user selectors fail or aren't explicitly provided.
  3. Pre-cleans common site suffixes identically to how standard URLs appear (e.g., removing `" - IMDb"`, `" — The Movie Database (TMDB)"`, `" - Letterboxd"`).
- **Year Parsing:** Can optionally target a `yearSelector`. Regex logic (`/\d{4}/`) separates out 4-digit numbers ensuring strict year-formatted outputs without surrounding junk strings.
