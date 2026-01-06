# MediaVore Translator

It is a website that will convert a CSV file of Movie and series log into a new json syntax

## CSV

the csv contains the following header
Name,Saison,episode,Type,Duree,Date,Rate,Comments

The name has 2 syntaxes possible :
- either just the name
- or `Name (year)`, year beeing the release year

## JSON

and the target json could be
{"tmdbId":211288,"type":"tv","title":"Tracker","seenDate":"2026-01-01T00:00:00.000","seasonNumber":1,"episodeNumber":9}

The title used in the json should be the matching title from the tmdb result, not the name from the CSV

## Logic

The tmdbid should be fetched using the TMDB api, the key being in the env variable TMDB_API_TOKEN

If a name is the same across the csv, then the tmdbId should not be fetched again

If there is no doubt, about the TMDBid, it should be chosen automatically, if there is multiple possibility, I should be aske to specify which was the right one

## Project files

- `index.html` - static front-end UI (open in browser, upload CSV).
- `static/*` - frontend files: `styles.css` and modular scripts in `static/js/`.
- `agents/`, `AGENTS.md` — agent metadata and guidance (optional automation files).

## Run (static)

This repository now supports a static, front-end-only workflow — you don't need to run the Python server.

1. Open `index.html` in your browser (double-click or File → Open).
2. Provide a TMDB API key in the UI (top-right) to enable searches from your browser.

Notes
- The TMDB API key is stored locally in your browser's storage and is not sent to any server.
- Upload a CSV file using the file input to begin; there is no bundled default CSV.

## Usage

- Click **Load existing `films.csv`** to load the CSV contained in this repo, or upload a CSV using the file input.
- Click **Auto-search unique titles** to run TMDB searches for each distinct name in the CSV (this uses the server-side TMDB API key).
- For titles with multiple results, select the correct match from the dropdown in the mappings area.
- Click **Export JSON** to download the converted JSON file (`output.json`). Each object contains `tmdbId`, `type` (`tv` or `movie`), `title`, `seenDate`, and for TV entries `seasonNumber` / `episodeNumber` when available.

Front-end only mode
- You can now run searches directly from the browser by providing your TMDB API key in the UI (top-right). The key is stored locally in your browser's storage and never sent to the server. You may also import/export TMDB cache files and confirmed mappings from the UI for faster operation or to share mappings across machines.

## Endpoints

This repository is front-end only. There are no server endpoints required to run the UI.

Notes
- If you prefer not to run the server, you can open `templates/index.html` (or serve the `static/` files) and run the application purely in the browser after providing a TMDB API key.

If you'd like, I can extend the backend to automatically choose unambiguous matches and perform a full server-side conversion (with a results preview), or add an interactive per-title confirmation flow. Tell me which direction you prefer and I will continue.

## Agents & automation

This repository contains a small set of agent metadata and guidance to help with
automating CSV -> JSON conversions and TMDB matching. See:

- `AGENTS.md` — best-practices and example prompts for authoring agents.
- `agents/` — agent manifest (`agent.yaml`), `persona.md`, and `tools.md` describing
	the agent's behavior and available local endpoints.

If you want me to wire a CLI command or add a small `tests/agents/` validation set,
I can implement that next.


## TODO:

- [ ] Implement object direction for yml and json
```json
{
	"test":[
		# my elements
	]
}
```

- [ ] Add a dark theme

- [ ] Add other fields
  - [ ] Year
  - [ ] Director
  - [ ] others


- [ ] Get nicer interface ?
