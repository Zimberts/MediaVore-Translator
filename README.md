# MediaVore Translator

It is a website that will convert a CSV, JSON, or YAML file of Movie and series log into a new json syntax.

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

## Setup

This application has been rebuilt using modern web technologies: React, TypeScript, and Tailwind CSS.

### Project Stack
- **Framework**: React / Create React App
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Jest / React Testing Library

## Run (Development)

1. Make sure you have Node.js installed.
2. Run `npm install` to install dependencies.
3. Run `npm start` to start the development web server on port 3000.
4. Click Settings to provide your TMDB API Key.

To build the static application, run:
`npm run build`

## Documentation

For a deep dive into the project's architecture, APIs, and overall structure, please reference the [docs/README.md](docs/README.md). 

**Rule:** When adding new features or modifying the codebase, documentation must always be updated *first*. Please see the [Workflow Rules in docs/README.md](docs/README.md#development-rules).

## Project files

- `src/` - React components, hooks, and contexts.
- `src/utils/` - Utility functions for parsing and storage.
- `src/api/` - TMDB API integration and caching.
- `public/` - Static assets.
- `v1/` - The previous vanilla JavaScript version.
- `agents/`, `AGENTS.md` — agent metadata and guidance (optional automation files).

## Usage

- Configure your file mapping with the intelligent Setup step.
- The app will Auto-search unique titles against the TMDB API.
- For titles with multiple results, select the correct match from the UI card matches.
- Click **Export JSON** to download the converted JSON file. Each object contains `tmdbId`, `type` (`tv` or `movie`), `title`, `seenDate`, and for TV entries `seasonNumber` / `episodeNumber` when available.

Front-end only mode
- The entire process executes locally in the browser. 
- You can manage settings to easily clear caches or perform automatic matches.
