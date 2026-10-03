import { parseCSV } from '../utils/parsers';
import { defaultFieldMapping, FieldMapping } from '../utils/storage';

// Converts the TV Time personal data export (GDPR request) into pre-mapped datasets.
// See docs/tvtime-import.md for the source files and the records that are used.

export interface RawFile {
  name: string;
  text: string;
}

export interface ImportedDataset {
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
  category: string;
  mapping: FieldMapping;
}

const EPISODES_FILE = 'tracking-prod-records-v2.csv';
const MOVIES_FILE = 'tracking-prod-records.csv';
const LISTS_FILE = 'lists-prod-lists.csv';

const HEADERS = ['title', 'year', 'type', 'season', 'episode', 'date', 'tvdbId'];

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function isTVTimeExport(fileNames: string[]): boolean {
  return fileNames.some(n => {
    const b = baseName(n);
    return b === EPISODES_FILE || b === MOVIES_FILE;
  });
}

// TV Time timestamps are UTC "YYYY-MM-DD HH:MM:SS"
export function toISODate(value: string): string {
  const m = (value || '').trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}.000Z`;
  return (value || '').trim();
}

// "Doctor Who (2005)" -> { title: "Doctor Who", year: "2005" }
export function splitTitleYear(name: string): { title: string; year: string } {
  const trimmed = (name || '').trim();
  const m = trimmed.match(/^(.*\S)\s+\((\d{4})\)$/);
  if (m) return { title: m[1], year: m[2] };
  return { title: trimmed, year: '' };
}

// "watch-alpha-any-number-can-win" -> "any number can win" (used when movie_name is missing)
export function titleFromAlphaKey(key: string): string {
  const m = (key || '').match(/-alpha-(.+)$/);
  return m ? m[1].replace(/^\w+-alpha-/, '').replace(/-/g, ' ').trim() : '';
}

function row(values: Partial<Record<string, string>>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const h of HEADERS) r[h] = values[h] ?? '';
  return r;
}

function mapping(overrides: Partial<FieldMapping>): FieldMapping {
  return {
    ...defaultFieldMapping,
    title: 'title',
    year: 'year',
    date: 'date',
    typeValues: { series: 'tv', movie: 'movie' },
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function convertTVTimeExport(files: RawFile[], prefix = 'TV Time'): ImportedDataset[] {
  const byName: Record<string, string> = {};
  for (const f of files) byName[baseName(f.name)] = f.text;

  const episodeRecords = byName[EPISODES_FILE] ? parseCSV(byName[EPISODES_FILE]).rows : [];
  const movieRecords = byName[MOVIES_FILE] ? parseCSV(byName[MOVIES_FILE]).rows : [];
  const listRecords = byName[LISTS_FILE] ? parseCSV(byName[LISTS_FILE]).rows : [];

  // Some records (e.g. onboarding bulk imports) lack series_name: borrow it from another record of the series
  const seriesNames: Record<string, string> = {};
  for (const r of episodeRecords) if (r.s_id && r.series_name) seriesNames[r.s_id] = r.series_name;
  const seriesName = (r: Record<string, any>) => r.series_name || seriesNames[r.s_id] || (r.s_id ? `TVDB #${r.s_id}` : '');

  // Episodes: every watch and rewatch is a separate viewing
  const seenEpisodes = episodeRecords
    .filter(r => /^(re)?watch-episode-/.test(r.key || ''))
    .filter(r => seriesName(r) && (r.season_number || r.s_no) !== '' && (r.episode_number || r.ep_no) !== '')
    .map(r => {
      const { title, year } = splitTitleYear(seriesName(r));
      return row({
        title, year, type: 'tv',
        season: r.season_number || r.s_no,
        episode: r.episode_number || r.ep_no,
        date: toISODate(r.created_at),
        tvdbId: r.s_id,
      });
    });

  // Movies, indexed by TV Time uuid for list resolution
  const movieNames: Record<string, string> = {};
  for (const r of movieRecords) if (r.uuid && r.movie_name) movieNames[r.uuid] = r.movie_name.trim();
  const movieName = (r: Record<string, any>) => movieNames[r.uuid] || titleFromAlphaKey(r.alpha_range_key);

  const moviesByUuid: Record<string, Record<string, any>> = {};
  for (const r of movieRecords) {
    if (r.entity_type === 'movie' && r.uuid && movieName(r) && !moviesByUuid[r.uuid]) moviesByUuid[r.uuid] = r;
  }
  const movieYear = (r: Record<string, any>) => (r.release_date || '').slice(0, 4);

  const watchedMovieUuids = new Set<string>();
  const seenMovies = movieRecords
    .filter(r => r.entity_type === 'movie' && (r.type === 'watch' || r.type === 'rewatch') && movieName(r))
    .map(r => {
      watchedMovieUuids.add(r.uuid);
      return row({ title: movieName(r), year: movieYear(r), type: 'movie', date: toISODate(r.created_at) });
    });

  // Watchlist: movies to watch that were never watched, and followed series not started yet
  const seriesByUuid: Record<string, Record<string, any>> = {};
  const userSeries = episodeRecords.filter(r => (r.key || '').startsWith('user-series-'));
  for (const r of userSeries) if (r.uuid) seriesByUuid[r.uuid] = r;

  const watchlist = [
    ...movieRecords
      .filter(r => r.entity_type === 'movie' && r.type === 'towatch' && movieName(r) && !watchedMovieUuids.has(r.uuid))
      .map(r => row({ title: movieName(r), year: movieYear(r), type: 'movie', date: toISODate(r.created_at) })),
    ...userSeries
      .filter(r => seriesName(r) && r.is_followed === 'true' && r.is_archived !== 'true' && (r.ep_watch_count || '0') === '0')
      .map(r => {
        const { title, year } = splitTitleYear(seriesName(r));
        return row({ title, year, type: 'tv', date: toISODate(r.created_at), tvdbId: r.s_id });
      }),
  ];

  // Likes: objects of the favorite-* lists, e.g. "[map[created_at:1.69e+09 type:movie uuid:<uuid>]]"
  const likes: Record<string, any>[] = [];
  for (const list of listRecords) {
    if (!/^favorite-/.test(list.s_key || '')) continue;
    const re = /type:(\w+)\s+uuid:([0-9a-f-]{36})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(list.objects || '')) !== null) {
      const [, kind, uuid] = m;
      if (kind === 'movie' && moviesByUuid[uuid]) {
        const r = moviesByUuid[uuid];
        likes.push(row({ title: movieName(r), year: movieYear(r), type: 'movie' }));
      } else if (kind !== 'movie' && seriesByUuid[uuid]) {
        const r = seriesByUuid[uuid];
        const { title, year } = splitTitleYear(seriesName(r));
        likes.push(row({ title, year, type: 'tv', tvdbId: r.s_id }));
      }
    }
  }

  const datasets: ImportedDataset[] = [
    {
      fileName: `${prefix}/seen-episodes`, headers: HEADERS, rows: seenEpisodes, category: 'seen',
      mapping: mapping({ category: 'seen', hasSeries: true, hasMovies: false, season: 'season', episode: 'episode', tvdbId: 'tvdbId' }),
    },
    {
      fileName: `${prefix}/seen-movies`, headers: HEADERS, rows: seenMovies, category: 'seen',
      mapping: mapping({ category: 'seen', hasSeries: false, hasMovies: true }),
    },
    {
      fileName: `${prefix}/watchlist`, headers: HEADERS, rows: watchlist, category: 'watchlist',
      mapping: mapping({ category: 'watchlist', customListName: 'Watchlist', hasSeries: true, hasMovies: true, type: 'type', tvdbId: 'tvdbId' }),
    },
    {
      fileName: `${prefix}/likes`, headers: HEADERS, rows: likes, category: 'likes',
      mapping: mapping({ category: 'likes', hasSeries: true, hasMovies: true, type: 'type', tvdbId: 'tvdbId' }),
    },
  ];

  return datasets.filter(d => d.rows.length > 0);
}
