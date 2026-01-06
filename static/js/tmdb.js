// Browser TMDB helpers — perform searches against TMDB directly from the browser
// and maintain a simple local cache in localStorage. Exposes `window.appTMDB`.
(function(){
  const STORAGE_KEY = 'mediavore_tmdb_cache_v1';
  const CONFIRMED_KEY = 'mediavore_confirmed_map_v1';

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveCache(c) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {} }
  function loadConfirmed() { try { return JSON.parse(localStorage.getItem(CONFIRMED_KEY) || '{}'); } catch (e) { return {}; } }
  function saveConfirmed(c) { try { localStorage.setItem(CONFIRMED_KEY, JSON.stringify(c)); } catch (e) {} }

  let tmdbCache = loadCache();
  let confirmedMapLocal = loadConfirmed();
  // ensure we only prompt the user once per page session
  let askedForKey = false;

  function getApiKey() {
    try { return localStorage.getItem('mediavore_tmdb_api_key') || '';} catch (e) { return ''; }
  }

  async function tmdbFetch(path, params = {}) {
    // Ensure we have an API key. Prompt at most once per session to avoid nagging.
    let key = getApiKey();
    if (!key) {
      if (!askedForKey) {
        try {
          // Inform the user and focus the inline API key field (no modal used)
          if (window && typeof window.showToast === 'function') window.showToast('Provide TMDB API key in the TMDB API Key field (top-right) to enable lookups', 'info');
          try { if (typeof document !== 'undefined') { const k = document.getElementById('tmdb-key'); if (k) k.focus(); } } catch (e) {}
        } catch (e) {}
        askedForKey = true;
      }
    }
    if (!key) throw new Error('No TMDB API key configured. Please provide one in the UI.');

    const url = new URL('https://api.themoviedb.org/3' + path);
    url.searchParams.set('api_key', key);
    Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

    let r = await fetch(url.toString());
    // If auth failed, clear saved key but do NOT re-prompt if we've already asked.
    if (r.status === 401 || r.status === 403) {
      try { setApiKey(''); } catch (e) {}
      if (!askedForKey) {
        try {
          if (window && typeof window.showToast === 'function') window.showToast('TMDB API key appears invalid. Update the TMDB API Key field and click Save key', 'error');
          try { if (typeof document !== 'undefined') { const k = document.getElementById('tmdb-key'); if (k) k.focus(); } } catch (e) {}
        } catch (e) {}
        askedForKey = true;
      }
      const txt = await r.text().catch(() => '');
      throw new Error(`TMDB authentication failed (${r.status}) ${r.statusText} ${txt}`);
    }

    if (!r.ok) { const txt = await r.text().catch(() => ''); throw new Error(`TMDB error ${r.status} ${r.statusText} ${txt}`); }
    return await r.json();
  }

  function cacheGet(key) { return tmdbCache[key]; }
  function cacheSet(key, val) { tmdbCache[key] = val; saveCache(tmdbCache); }

  async function searchTMDB(query, type) {
    if (!query || !query.trim()) return [];
    const kind = (type === 'Film' || type === 'movie') ? 'movie' : 'tv';
    const cacheKey = `search:${kind}:${query}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const data = await tmdbFetch(`/search/${kind}`, { query, page: 1, include_adult: false, language: 'en-US' });
    const results = (data && data.results) ? data.results.map(r => ({ id: r.id, name: r.title || r.name, poster_path: r.poster_path, release_date: r.release_date || r.first_air_date, overview: r.overview, raw: r })) : [];
    cacheSet(cacheKey, results);
    return results;
  }

  async function fetchDetails(tmdbId, mediaType = 'movie') {
    const kind = mediaType === 'tv' ? 'tv' : 'movie';
    const cacheKey = `details:${kind}:${tmdbId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const data = await tmdbFetch(`/${kind}/${tmdbId}`, { language: 'en-US' });
    cacheSet(cacheKey, data);
    return data;
  }

  async function fetchCredits(tmdbId, mediaType = 'movie') {
    const kind = mediaType === 'tv' ? 'tv' : 'movie';
    const cacheKey = `credits:${kind}:${tmdbId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const data = await tmdbFetch(`/${kind}/${tmdbId}/credits`, { language: 'en-US' });
    cacheSet(cacheKey, data);
    return data;
  }

  function importTMDBCache(obj) { tmdbCache = Object.assign({}, tmdbCache, obj || {}); saveCache(tmdbCache); }
  function exportTMDBCache() { return JSON.stringify(tmdbCache, null, 2); }
  function importConfirmed(obj) { confirmedMapLocal = Object.assign({}, confirmedMapLocal, obj || {}); saveConfirmed(confirmedMapLocal); }
  function exportConfirmed() { return JSON.stringify(confirmedMapLocal, null, 2); }
  function clearLocalCaches() { tmdbCache = {}; confirmedMapLocal = {}; saveCache(tmdbCache); saveConfirmed(confirmedMapLocal); }

  function setApiKey(k) { try { if (!k) localStorage.removeItem('mediavore_tmdb_api_key'); else localStorage.setItem('mediavore_tmdb_api_key', k); } catch (e) {} }

  // expose
  window.appTMDB = {
    searchTMDB, fetchDetails, fetchCredits,
    importTMDBCache, exportTMDBCache, importConfirmed, exportConfirmed,
    clearLocalCaches, setApiKey, getApiKey,
    _internal_getCache: () => tmdbCache,
    _internal_getConfirmed: () => confirmedMapLocal
  };
})();
