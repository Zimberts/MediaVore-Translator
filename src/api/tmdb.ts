export const STORAGE_KEY = 'mediavore_tmdb_cache_v1';
export const CONFIRMED_KEY = 'mediavore_confirmed_map_v1';
export const API_KEY_KEY = 'mediavore_tmdb_api_key';

export interface TMDBResult {
  id: number;
  name: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string;
  raw: any;
}

export type TMDBType = 'movie' | 'tv';

function loadCache(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveCache(c: Record<string, any>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch (e) {}
}

export function loadConfirmedMap(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

export function saveConfirmedMap(c: Record<string, any>) {
  try {
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify(c));
  } catch (e) {}
}

let tmdbCache = loadCache();
let askedForKey = false;

export function getApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setApiKey(k: string) {
  try {
    if (!k) localStorage.removeItem(API_KEY_KEY);
    else localStorage.setItem(API_KEY_KEY, k);
  } catch (e) {}
}

async function tmdbFetch(path: string, params: Record<string, string | number | boolean> = {}) {
  const key = getApiKey();
  if (!key) {
    if (!askedForKey) {
      askedForKey = true;
    }
    throw new Error('No TMDB API key configured. Please provide one in the Settings.');
  }

  const url = new URL('https://api.themoviedb.org/3' + path);
  Object.keys(params).forEach(k => url.searchParams.set(k, String(params[k])));

  const headers: Record<string, string> = {
    'accept': 'application/json'
  };

  // If the key looks like a JWT token (long), use Bearer auth. Otherwise use api_key param
  if (key.length > 50 && key.includes('.')) {
      headers['Authorization'] = `Bearer ${key}`;
  } else {
      url.searchParams.set('api_key', key);
  }

  const r = await fetch(url.toString(), { headers });
  if (r.status === 401 || r.status === 403) {
    setApiKey(''); // Clear invalid key
    const txt = await r.text().catch(() => '');
    throw new Error(`TMDB authentication failed (${r.status}) ${r.statusText} ${txt}`);
  }

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`TMDB error ${r.status} ${r.statusText} ${txt}`);
  }
  return await r.json();
}

function cacheGet(key: string) {
  return tmdbCache[key];
}

function cacheSet(key: string, val: any) {
  tmdbCache[key] = val;
  saveCache(tmdbCache);
}

export async function searchTMDB(query: string, type: string): Promise<TMDBResult[]> {
  if (!query || !query.trim()) return [];
  const kind: TMDBType = (type === 'Film' || type === 'movie' || type.toLowerCase().includes('movie') || type.toLowerCase().includes('film')) ? 'movie' : 'tv';
  const cacheKey = `search:${kind}:${query}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const data = await tmdbFetch(`/search/${kind}`, { query, page: 1, include_adult: false, language: 'en-US' });
  const results: TMDBResult[] = (data && data.results) ? data.results.map((r: any) => ({
    id: r.id,
    name: r.title || r.name,
    poster_path: r.poster_path,
    release_date: r.release_date || r.first_air_date,
    overview: r.overview,
    raw: r
  })) : [];
  cacheSet(cacheKey, results);
  return results;
}

export async function fetchDetails(tmdbId: number, mediaType: string = 'movie') {
  const kind = mediaType === 'tv' ? 'tv' : 'movie';
  const cacheKey = `details:${kind}:${tmdbId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await tmdbFetch(`/${kind}/${tmdbId}`, { language: 'en-US' });
  cacheSet(cacheKey, data);
  return data;
}

export async function fetchCredits(tmdbId: number, mediaType: string = 'movie') {
  const kind = mediaType === 'tv' ? 'tv' : 'movie';
  const cacheKey = `credits:${kind}:${tmdbId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const data = await tmdbFetch(`/${kind}/${tmdbId}/credits`, { language: 'en-US' });
  cacheSet(cacheKey, data);
  return data;
}

export function importTMDBCache(obj: Record<string, any>) {
  tmdbCache = Object.assign({}, tmdbCache, obj || {});
  saveCache(tmdbCache);
}

export function exportTMDBCache(): string {
  return JSON.stringify(tmdbCache, null, 2);
}

export function exportConfirmed(confirmedMap: Record<string, any>): string {
  return JSON.stringify(confirmedMap, null, 2);
}

export function clearLocalCaches() {
  tmdbCache = {};
  saveCache(tmdbCache);
  saveConfirmedMap({});
}
