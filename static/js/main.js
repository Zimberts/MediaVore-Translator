// Main frontend logic, uses window.appCore and window.appUI
(function(){
  function showToast(msg, type = 'info', ms = 3500) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return null;
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity 300ms ease'; t.style.opacity = '0'; setTimeout(() => { try { t.remove(); } catch(e){} }, 320); }, ms);
    return t;
  }

  function askConfirm(msg) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const mbox = document.getElementById('confirm-message');
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      mbox.textContent = msg;
      modal.classList.remove('hidden');
      const cleanup = () => { modal.classList.add('hidden'); yes.removeEventListener('click', onYes); no.removeEventListener('click', onNo); };
      const onYes = () => { cleanup(); resolve(true); };
      const onNo = () => { cleanup(); resolve(false); };
      yes.addEventListener('click', onYes);
      no.addEventListener('click', onNo);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.showToast = showToast; // expose for ui_mappings

    // API key is handled inline via the TMDB key input in the controls; no modal in this UI.
    const parsedEmpty = null;
    let parsed = parsedEmpty;
    const mappingsContainer = document.getElementById('mappings');
    window.confirmedMap = window.confirmedMap || {};

    window.focusNextMapping = function() {
      const mappings = mappingsContainer.querySelectorAll('.mapping');
      for (let i = 0; i < mappings.length; i++) {
        const m = mappings[i];
        if (!m || m.style.display === 'none') continue;
        const rs = m._results || [];
        if (!rs || rs.length === 0) {
          const si = m.querySelector('input[type="text"]');
          if (si) { try { si.focus(); } catch (e) {} return true; }
          continue;
        }
        if (rs.length === 1) {
          const cb = m.querySelector('.confirm-btn');
          if (cb) { try { cb.focus(); } catch (e) {} return true; }
          continue;
        }
        try {
          let ex = m.querySelector('.all-results');
          if (!ex) {
            const sab = m.querySelector('.show-all-btn'); if (sab) sab.click();
            ex = m.querySelector('.all-results');
          }
          const first = ex ? ex.querySelector('.result-card') : null;
          if (first) { try { first.focus(); } catch (e) {} return true; }
        } catch (e) {}
      }
      return false;
    };

    window.totalDistinct = 0;
    window.confirmedCount = 0;
    window.pendingCount = 0;

    // load confirmed mappings from localStorage (if any) via appTMDB
    (function(){
      try {
        if (window.appTMDB && window.appTMDB._internal_getConfirmed) window.confirmedMap = window.appTMDB._internal_getConfirmed() || {};
        else window.confirmedMap = JSON.parse(localStorage.getItem('mediavore_confirmed_map_v1') || '{}');
      } catch (e) { window.confirmedMap = {}; }
    })();

    // auto-confirm preference: read from localStorage and expose globally
    try {
      window._autoConfirm = (localStorage.getItem('mediavore_auto_confirm') === '1');
    } catch (e) { window._autoConfirm = false; }

    // populate TMDB key input if previously saved
    try {
      const existingKey = (window.appTMDB && window.appTMDB.getApiKey) ? window.appTMDB.getApiKey() : localStorage.getItem('mediavore_tmdb_api_key') || '';
      const keyInput = document.getElementById('tmdb-key'); if (keyInput) keyInput.value = existingKey;
    } catch (e) {}

    // ensure setup and settings UI elements are available
    const setupSection = document.getElementById('setup');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.createElement('button'); settingsBtn.id = 'open-settings'; settingsBtn.textContent = 'Settings'; settingsBtn.style.marginLeft = '8px';
    const controlsRight = document.querySelector('.controls-right'); if (controlsRight) controlsRight.appendChild(settingsBtn);
    // hide main action buttons until setup is finished
    const autoBtn = document.getElementById('auto-search'); const exportBtn = document.getElementById('export-json');
    function hideMainActions() { if (autoBtn) autoBtn.style.display = 'none'; if (exportBtn) exportBtn.style.display = 'none'; }
    function showMainActions() { if (autoBtn) autoBtn.style.display = ''; if (exportBtn) exportBtn.style.display = ''; }
    hideMainActions();

    // Initially hide all controls except the file input to keep the UI focused.
    const controlsLeft = document.querySelector('.controls-left');
    const controlsRightWrap = document.querySelector('.controls-right');
    function hideAllControlsExceptFile() {
      try {
        if (controlsLeft) {
          Array.from(controlsLeft.children).forEach(ch => { if (ch.id !== 'csv-file') ch.style.display = 'none'; });
        }
        if (controlsRightWrap) Array.from(controlsRightWrap.children).forEach(ch => ch.style.display = 'none');
        // also hide larger page sections to keep UI minimal during initial setup
        const mappingSummary = document.getElementById('mapping-summary'); if (mappingSummary) mappingSummary.style.display = 'none';
        const uniqueStats = document.getElementById('unique-stats'); if (uniqueStats) uniqueStats.style.display = 'none';
        const mappingsSection = document.getElementById('mappings'); if (mappingsSection) mappingsSection.style.display = 'none';
        const rowsSection = document.getElementById('rows'); if (rowsSection) rowsSection.style.display = 'none';
      } catch (e) {}
    }
    function showAllControls() {
      try {
        if (controlsLeft) Array.from(controlsLeft.children).forEach(ch => ch.style.display = '');
        if (controlsRightWrap) Array.from(controlsRightWrap.children).forEach(ch => ch.style.display = '');
        const mappingSummary = document.getElementById('mapping-summary'); if (mappingSummary) mappingSummary.style.display = '';
        const uniqueStats = document.getElementById('unique-stats'); if (uniqueStats) uniqueStats.style.display = '';
        const mappingsSection = document.getElementById('mappings'); if (mappingsSection) mappingsSection.style.display = '';
        const rowsSection = document.getElementById('rows'); if (rowsSection) rowsSection.style.display = '';
      } catch (e) {}
    }
    // Show only the minimal post-setup controls: Match titles, Export JSON and Settings
    function showPostSetupControls() {
      try {
        // controlsLeft: show only auto-search and export-json
        if (controlsLeft) Array.from(controlsLeft.children).forEach(ch => {
          if (ch.id === 'auto-search' || ch.id === 'export-json' || ch.id === 'auto-confirm-toggle' || ch.id === 'auto-confirm-toggle-wrap') ch.style.display = '';
          else ch.style.display = 'none';
        });
        // controlsRight: show only open-settings (settings button)
        if (controlsRightWrap) Array.from(controlsRightWrap.children).forEach(ch => {
          if (ch.id === 'open-settings') ch.style.display = '';
          else ch.style.display = 'none';
        });

        // hide other page sections until user triggers Match titles
        const mappingSummary = document.getElementById('mapping-summary'); if (mappingSummary) mappingSummary.style.display = 'none';
        const uniqueStats = document.getElementById('unique-stats'); if (uniqueStats) uniqueStats.style.display = 'none';
        const mappingsSection = document.getElementById('mappings'); if (mappingsSection) mappingsSection.style.display = 'none';
        const rowsSection = document.getElementById('rows'); if (rowsSection) rowsSection.style.display = 'none';
      } catch (e) {}
    }

    // Reveal mapping-related UI when Auto-search (Match titles) runs
    function showMappingsView() {
      try {
        const mappingSummary = document.getElementById('mapping-summary'); if (mappingSummary) mappingSummary.style.display = '';
        const uniqueStats = document.getElementById('unique-stats'); if (uniqueStats) uniqueStats.style.display = '';
        const mappingsSection = document.getElementById('mappings'); if (mappingsSection) mappingsSection.style.display = '';
        const rowsSection = document.getElementById('rows'); if (rowsSection) rowsSection.style.display = 'none';
      } catch (e) {}
    }
    hideAllControlsExceptFile();

    // Ensure the initial setup area is visible on first load
    try { if (setupSection) setupSection.classList.remove('hidden'); updateSetupSteps(); } catch (e) {}

    // disable mapper/configure buttons until a file is selected
    const openMapperBtn = document.getElementById('open-mapper'); if (openMapperBtn) openMapperBtn.disabled = true;
    const setupConfigureBtn = document.getElementById('setup-configure'); if (setupConfigureBtn) setupConfigureBtn.disabled = true;

    // helper to show setup section when file uploaded and mapping configured
    function showSetupIfReady() {
      try {
        const parsedReady = !!window._lastParsed;
        const hasMapping = !!(localStorage.getItem('mediavore_field_map_title') || localStorage.getItem('mediavore_field_map_saved_at'));
        // Always reveal the setup area once a file is uploaded; mapping step will show as incomplete until saved.
        if (parsedReady) {
          setupSection && setupSection.classList.remove('hidden');
          updateSetupSteps();
        }
        // If mapping already exists, ensure the rest of the setup steps are visible
        if (parsedReady && hasMapping) {
          // keep minimal controls until user finishes setup; updateSetupSteps handles toggles
          updateSetupSteps();
        }
      } catch (e) {}
    }

    // Update visual setup steps indicators
    function updateSetupSteps() {
      try {
        const stepFile = document.getElementById('step-file');
        const stepMapping = document.getElementById('step-mapping');
        const stepCache = document.getElementById('step-cache');
        const stepApi = document.getElementById('step-apikey');
        const hasFile = !!window._lastParsed;
        const hasMapping = !!(localStorage.getItem('mediavore_field_map_title') || localStorage.getItem('mediavore_field_map_saved_at'));
        const hasCache = !!(localStorage.getItem('mediavore_tmdb_cache_v1')) || false;
        const hasConfirmed = !!(localStorage.getItem('mediavore_confirmed_map_v1')) || false;
        const key = (window.appTMDB && window.appTMDB.getApiKey) ? window.appTMDB.getApiKey() : (localStorage.getItem('mediavore_tmdb_api_key') || '');
        const hasApi = !!(key && key.length > 0);
        if (stepFile) stepFile.classList.toggle('done', !!hasFile);
        if (stepMapping) stepMapping.classList.toggle('done', !!hasMapping);
        if (stepCache) stepCache.classList.toggle('done', !!(hasCache || hasConfirmed));
        if (stepApi) stepApi.classList.toggle('done', !!hasApi);
        const finishBtn = document.getElementById('finish-setup'); if (finishBtn) finishBtn.disabled = !(hasFile && hasMapping);
      } catch (e) { /* ignore */ }
    }

    // Listen for mapping saved in another window (mapper) to reveal setup and update steps
    window.addEventListener('storage', (ev) => { if (ev.key && ev.key.startsWith('mediavore_field_map_')) { showSetupIfReady(); updateSetupSteps(); } });

    // render mapping summary widget
    try {
      function renderMappingSummary(){
        let txt = '(none)';
        try {
          if (window.mappingUtils && window.mappingUtils.getMapping) {
            const m = window.mappingUtils.getMapping();
            if (m && (m.title || m.type || m.season || m.episode || m.date)) {
              txt = `title:${m.title || '-'} type:${m.type || '-'} season:${m.season || '-'} episode:${m.episode || '-'} date:${m.date || '-'} saved:${m.savedAt || m.saved_at || m.savedAt || '(unknown)'} `;
            }
          } else {
            const saved = localStorage.getItem('mediavore_field_map_saved_at') || localStorage.getItem('mediavore_field_map_savedAt') || null;
            const t = localStorage.getItem('mediavore_field_map_title') || localStorage.getItem('mediavore_field_map_title') || '';
            if (t) txt = `title:${t} saved:${saved || '(unknown)'}`;
          }
        } catch (e) { txt = '(error)'; }
        const el = document.getElementById('mapping-active'); if (el) el.textContent = txt;
      }
      renderMappingSummary();
      const open2 = document.getElementById('open-mapper-2'); if (open2) open2.addEventListener('click', () => { try {
          const mapperModal = document.getElementById('mapper-modal');
          if (mapperModal) mapperModal.classList.remove('hidden');
          try { window.fieldMapper && window.fieldMapper.showMapper && window.fieldMapper.showMapper(window._lastParsed ? window._lastParsed.rows : [], function(m){ mapperModal && mapperModal.classList.add('hidden'); showSetupIfReady(); showAllControls(); updateSetupSteps(); }); } catch (e) {}
        } catch (e) { showToast('Could not open mapper page', 'error'); } });
      // update mapping summary when storage changes (other window saved mapping)
      window.addEventListener('storage', (ev) => { if (ev.key && ev.key.startsWith('mediavore_field_map_')) renderMappingSummary(); });
    } catch (e) { console.warn('Mapping summary init failed', e); }

    const clearCachesBtn = document.getElementById('clear-local-caches');
    if (clearCachesBtn) clearCachesBtn.addEventListener('click', async () => {
      if (!await askConfirm('Clear local TMDB and confirmed caches? This will remove local data.')) return;
      try {
        if (window.appTMDB && window.appTMDB.clearLocalCaches) window.appTMDB.clearLocalCaches();
        localStorage.removeItem('mediavore_tmdb_cache_v1');
        localStorage.removeItem('mediavore_confirmed_map_v1');
        window.confirmedMap = {};
        showToast('Local caches cleared', 'info');
      } catch (e) { showToast('Error clearing local caches: ' + e.message, 'error'); }
    });

    // load server-side confirmed mappings already done above

    const PAGE_LIMIT = 20;
    // Server-mode removed: user must upload a CSV using the file input.
    // The page-prev/page-next and bundled CSV handlers were removed to keep the app static-only.

    const csvFileInput = document.getElementById('csv-file');
    if (csvFileInput) csvFileInput.addEventListener('change', (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result || '';
        // choose parser by filename/extension when available
        let rows = [];
        try {
          if (window.formatParsers) rows = window.formatParsers.parseByFilename(f.name, text);
          else if (window.appCore && window.appCore.parseCSV) rows = window.appCore.parseCSV(text).rows;
        } catch (e) { showToast('Could not parse file: ' + e.message, 'error'); return; }
        parsed = { headers: Object.keys(rows[0] || {}), rows };
        // persist sample headers and some sample rows so mapper window can use them without re-upload
        try {
          localStorage.setItem('mediavore_field_map_sample_headers', JSON.stringify(parsed.headers || []));
          try { localStorage.setItem('mediavore_field_map_sample_row', JSON.stringify(parsed.rows[0] || {})); } catch (e) {}
          try { localStorage.setItem('mediavore_field_map_sample_rows', JSON.stringify((parsed.rows || []).slice(0, 30))); } catch (e) {}
        } catch (e) {}
        // expose parsed to other windows opened from this page (mapper) so they can read rows without upload
        try { window._lastParsed = parsed; } catch (e) {}
        parsed.serverSide = false; parsed._page = 1;
        if (window.appCore && window.appCore.buildRowsTable) window.appCore.buildRowsTable(parsed.headers, parsed.rows.slice(0, PAGE_LIMIT));
        mappingsContainer.innerHTML = '';
        // enable configure buttons now that a file is selected
        try { const openMapperBtn = document.getElementById('open-mapper'); if (openMapperBtn) openMapperBtn.disabled = false; const setupConfigureBtn = document.getElementById('setup-configure'); if (setupConfigureBtn) setupConfigureBtn.disabled = false; } catch (e) {}
        // update file name display
        try { const nameEl = document.getElementById('csv-file-name'); if (nameEl) nameEl.textContent = f.name || 'Selected file'; } catch(e) {}
        // mark the file step as completed and show the setup area (so user proceeds to configure mapping)
        try { const stepFile = document.getElementById('step-file'); if (stepFile) stepFile.classList.add('done'); } catch (e) {}
        try { hideAllControlsExceptFile(); showSetupIfReady(); } catch (e) {}
        // If the user has no saved mapping, open the dedicated mapper page to configure fields.
        try {
          const hasSaved = !!(localStorage.getItem('mediavore_field_map_title') || localStorage.getItem('mediavore_field_map_saved_at'));
          if (!hasSaved) {
              // show the inline mapper modal so user configures mapping without leaving the page
              window.showToast && window.showToast('No field mapping found — configure fields now', 'info');
              try {
                // ensure modal is visible and invoke field mapper with parsed rows
                const mapperModal = document.getElementById('mapper-modal');
                if (mapperModal) mapperModal.classList.remove('hidden');
                try { window.fieldMapper && window.fieldMapper.showMapper && window.fieldMapper.showMapper(parsed.rows || [], function(m){ try { mapperModal && mapperModal.classList.add('hidden'); showSetupIfReady(); showAllControls(); updateSetupSteps(); } catch(e){} }); } catch (e) {}
                return;
              } catch (e) { console.warn('Could not open mapper modal', e); }
            } else {
            // load last mapping for immediate use
            window._lastFieldMap = {
              title: localStorage.getItem('mediavore_field_map_title') || '',
              type: localStorage.getItem('mediavore_field_map_type') || '',
              season: localStorage.getItem('mediavore_field_map_season') || '',
              episode: localStorage.getItem('mediavore_field_map_episode') || '',
              date: localStorage.getItem('mediavore_field_map_date') || '',
              hasSeries: localStorage.getItem('mediavore_field_map_has_series') === '1'
            };

            // Onboarding: show setup and suggest actions inline (no modal prompts)
            try {
              showSetupIfReady();
              showToast('Ready — configure mapping and optional caches/key in the setup area', 'info');
            } catch (e) { console.warn('Onboarding step failed', e); }
          }
        } catch (e) { console.warn('Field mapping check failed', e); }
      };
      reader.readAsText(f);
    });

    const _autoSearch = document.getElementById('auto-search');
    if (_autoSearch) {
      _autoSearch.addEventListener('click', async () => {
        if (!parsed) { showToast('Load a CSV first', 'warn'); return; }
        // ensure mapping area is visible when user starts Match titles
        try { showMappingsView(); } catch (e) {}
        mappingsContainer.innerHTML = '';
        let uniqueItems = [];
        let totalCount = 0;
        if (parsed.serverSide) {
          try { const data = await (window.appCore && window.appCore.fetchServerUnique ? window.appCore.fetchServerUnique() : Promise.reject(new Error('No fetchServerUnique'))); uniqueItems = data.items || []; totalCount = data.count || uniqueItems.length; } catch (err) { showToast('Could not fetch unique titles from server: ' + err.message, 'error'); return; }
        } else {
          // build unique list using configured mapping if available
          const mapping = window._lastFieldMap || (window.mappingUtils && window.mappingUtils.getMapping && window.mappingUtils.getMapping()) || {};
          function getVal(row, fieldName, fallbacks){
            if (!row) return '';
            if (fieldName) {
              const v = row[fieldName]; if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
            }
            if (fallbacks && Array.isArray(fallbacks)) {
              for (const f of fallbacks) { if (row[f] !== undefined && row[f] !== null && String(row[f]).trim() !== '') return String(row[f]).trim(); }
            }
            return '';
          }
          const unique = {};
          parsed.rows.forEach(r => {
            const name = getVal(r, mapping.title, ['Name','name','title']);
            if (!name) return;
            let typeVal = getVal(r, mapping.type, ['Type','type']);
            // determine media type using mapping.typeValues when provided
            let detected = 'Film';
            const tvCandidates = (mapping.typeValues && mapping.typeValues.series) ? mapping.typeValues.series : null;
            const mvCandidates = (mapping.typeValues && mapping.typeValues.movie) ? mapping.typeValues.movie : null;
            function valueMatches(v, cand){
              if (!v) return false;
              const vs = String(v).toLowerCase();
              if (!cand) return false;
              if (Array.isArray(cand)) return cand.map(x=>String(x).toLowerCase().trim()).includes(vs);
              if (typeof cand === 'string') return cand.split(',').map(x=>x.toLowerCase().trim()).includes(vs);
              return false;
            }
            if (tvCandidates || mvCandidates) {
              if (valueMatches(typeVal, tvCandidates)) detected = 'Serie';
              else if (valueMatches(typeVal, mvCandidates)) detected = 'Film';
              else {
                // fallback heuristics
                const tvLike = String(typeVal || '').toLowerCase();
                if (tvLike === '1' || tvLike === 'true' || tvLike.includes('serie') || tvLike.includes('tv') || tvLike.includes('show')) detected = 'Serie';
              }
            } else {
              const tvLike = String(typeVal || '').toLowerCase();
              if (tvLike === '1' || tvLike === 'true' || tvLike.includes('serie') || tvLike.includes('tv') || tvLike.includes('show')) detected = 'Serie';
            }
            if (!unique[name]) unique[name] = detected;
          });
          uniqueItems = Object.entries(unique).map(([name, type]) => ({ name, type }));
          totalCount = uniqueItems.length;
        }
        totalDistinct = totalCount;
        confirmedCount = 0;
        try { confirmedCount = uniqueItems.reduce((acc, it) => acc + (window.confirmedMap && window.confirmedMap[it.name] ? 1 : 0), 0); } catch (e) { confirmedCount = 0; }
        const uTotal = document.getElementById('unique-total'); if (uTotal) uTotal.textContent = `Distinct titles: ${totalCount}`;
        const uAuto = document.getElementById('unique-auto'); if (uAuto) uAuto.textContent = `Auto-selected: 0`;
        const uConfirmed = document.getElementById('unique-confirmed'); if (uConfirmed) uConfirmed.textContent = `Confirmed: ${confirmedCount}`;
        const uPending = document.getElementById('unique-pending'); if (uPending) uPending.textContent = `To confirm: ${totalDistinct - confirmedCount}`;

        const rowsSection = document.getElementById('rows');
        const pagingControls = document.getElementById('paging-controls');
        if (rowsSection) rowsSection.style.display = 'none';
        if (pagingControls) pagingControls.style.display = 'none';

        const VISIBLE_WINDOW = 10;
        const CONCURRENCY = 6;
        let nextIndex = 0;
        let visibleCount = 0;
        let autoSelected = 0;

        async function tryFillWindow() {
          while (visibleCount < VISIBLE_WINDOW && nextIndex < uniqueItems.length) {
            const pair = uniqueItems[nextIndex++];
            if (window.confirmedMap && window.confirmedMap[pair.name]) { continue; }
            visibleCount += 1;
            (async (title, type) => {
              try {
                const results = await (window.appCore && window.appCore.searchTMDB ? window.appCore.searchTMDB(title, type) : []);
                const ui = window.appUI && window.appUI.createMappingElement ? window.appUI.createMappingElement(title, type, results, () => {
                  visibleCount = Math.max(0, visibleCount - 1);
                  confirmedCount += 1;
                  const uc = document.getElementById('unique-confirmed'); if (uc) uc.textContent = `Confirmed: ${confirmedCount}`;
                  const up = document.getElementById('unique-pending'); if (up) up.textContent = `To confirm: ${totalDistinct - confirmedCount}`;
                  tryFillWindow();
                }) : null;
                if (ui && ui.el) mappingsContainer.appendChild(ui.el);
                if (results.length === 1) {
                  try { ui && ui.setSelection && ui.setSelection(results[0]); } catch (e) { console.error(e); }
                  // If auto-confirm preference enabled, trigger confirmation
                  try { if (window._autoConfirm && ui && ui.confirmBtn) { ui.confirmBtn.click(); } } catch (e) {}
                  autoSelected += 1; const ua = document.getElementById('unique-auto'); if (ua) ua.textContent = `Auto-selected: ${autoSelected}`;
                }
              } catch (err) {
                const errEl = document.createElement('div'); errEl.className = 'mapping'; errEl.textContent = `Error searching ${title}: ${err.message || err}`; mappingsContainer.appendChild(errEl);
                visibleCount = Math.max(0, visibleCount - 1);
                tryFillWindow();
              }
            })(pair.name, pair.type || 'Film');
          }
        }

        tryFillWindow();
      });
    }

    // wire import/export of caches and API key management
    const _saveTmdbKey = document.getElementById('save-tmdb-key');
    if (_saveTmdbKey) _saveTmdbKey.addEventListener('click', () => {
      const v = (document.getElementById('tmdb-key') && document.getElementById('tmdb-key').value) || '';
      try { if (window.appTMDB && window.appTMDB.setApiKey) window.appTMDB.setApiKey(v); else localStorage.setItem('mediavore_tmdb_api_key', v); showToast('API key saved locally', 'info'); } catch (e) { showToast('Could not save key: ' + e.message, 'error'); }
    });

    // open the inline mapper modal when user clicks the configure button
    const om = document.getElementById('open-mapper'); if (om) om.addEventListener('click', () => {
      try {
        const mapperModal = document.getElementById('mapper-modal');
        if (mapperModal) mapperModal.classList.remove('hidden');
        try { window.fieldMapper && window.fieldMapper.showMapper && window.fieldMapper.showMapper(window._lastParsed ? window._lastParsed.rows : [], function(m){ mapperModal && mapperModal.classList.add('hidden'); showSetupIfReady(); showAllControls(); updateSetupSteps(); }); } catch (e) {}
      } catch (e) { showToast('Could not open mapper modal', 'error'); }
    });

    const _importTmdbCache = document.getElementById('import-tmdb-cache');
    if (_importTmdbCache) _importTmdbCache.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importTMDBCache) window.appTMDB.importTMDBCache(obj); else localStorage.setItem('mediavore_tmdb_cache_v1', JSON.stringify(obj)); showToast('TMDB cache imported', 'info'); } catch (e) { showToast('Invalid cache file', 'error'); } }; r.readAsText(f);
    });

    const _importConfirmed = document.getElementById('import-confirmed');
    if (_importConfirmed) _importConfirmed.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importConfirmed) window.appTMDB.importConfirmed(obj); else localStorage.setItem('mediavore_confirmed_map_v1', JSON.stringify(obj)); window.confirmedMap = obj; showToast('Confirmed mappings imported', 'info'); } catch (e) { showToast('Invalid confirmed file', 'error'); } }; r.readAsText(f);
    });

    // setup-specific import inputs
    const setupImportCache = document.getElementById('setup-import-tmdb-cache');
    const setupImportConfirmed = document.getElementById('setup-import-confirmed');
    if (setupImportCache) setupImportCache.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importTMDBCache) window.appTMDB.importTMDBCache(obj); else localStorage.setItem('mediavore_tmdb_cache_v1', JSON.stringify(obj)); showToast('TMDB cache imported', 'info'); updateSetupSteps(); } catch (e) { showToast('Invalid cache file', 'error'); } }; r.readAsText(f);
    });
    if (setupImportConfirmed) setupImportConfirmed.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importConfirmed) window.appTMDB.importConfirmed(obj); else localStorage.setItem('mediavore_confirmed_map_v1', JSON.stringify(obj)); window.confirmedMap = obj; showToast('Confirmed mappings imported', 'info'); updateSetupSteps(); } catch (e) { showToast('Invalid confirmed file', 'error'); } }; r.readAsText(f);
    });

    // setup buttons
    const setupConfigure = document.getElementById('setup-configure'); if (setupConfigure) setupConfigure.addEventListener('click', () => { try {
        const mapperModal = document.getElementById('mapper-modal'); if (mapperModal) mapperModal.classList.remove('hidden');
        try { window.fieldMapper && window.fieldMapper.showMapper && window.fieldMapper.showMapper(window._lastParsed ? window._lastParsed.rows : [], function(m){ mapperModal && mapperModal.classList.add('hidden'); showSetupIfReady(); showAllControls(); updateSetupSteps(); }); } catch (e) {}
      } catch (e) { showToast('Could not open mapper', 'error'); } });
    const setupOpenApikey = document.getElementById('setup-open-apikey'); if (setupOpenApikey) setupOpenApikey.addEventListener('click', () => { try { showToast('Enter your TMDB API key in the TMDB API Key field (top-right) and click Save key when done', 'info'); const keyEl = document.getElementById('tmdb-key'); if (keyEl) keyEl.focus(); } catch (e) {} });
    const finishSetup = document.getElementById('finish-setup'); if (finishSetup) finishSetup.addEventListener('click', () => { try { setupSection && setupSection.classList.add('hidden'); showPostSetupControls(); showToast('Setup finished — ready', 'info'); } catch (e) {} });

    // Settings modal wiring
    const openSettings = document.getElementById('open-settings');
    // wire csv-file button to hidden file input
    const csvFileBtn = document.getElementById('csv-file-btn');
    if (csvFileBtn) csvFileBtn.addEventListener('click', () => { try { const inp = document.getElementById('csv-file'); if (inp) inp.click(); } catch (e) {} });
    // wire setup 'Choose dataset' button to the same hidden csv-file input
    const setupChooseBtn = document.getElementById('setup-choose-dataset-btn');
    if (setupChooseBtn) setupChooseBtn.addEventListener('click', () => { try { const inp = document.getElementById('csv-file'); if (inp) inp.click(); } catch (e) {} });
    // wire import/chooser buttons to their hidden inputs and update name labels
    const wireFileChooser = (btnId, inputId, nameId) => {
      const b = document.getElementById(btnId);
      const inp = document.getElementById(inputId);
      const nameEl = document.getElementById(nameId);
      if (b && inp) b.addEventListener('click', () => { try { inp.click(); } catch (e) {} });
      if (inp && nameEl) inp.addEventListener('change', (ev) => { const f = ev.target.files && ev.target.files[0]; nameEl.textContent = f ? f.name : '(none)'; });
    };
    wireFileChooser('import-tmdb-cache-btn', 'import-tmdb-cache', 'import-tmdb-cache-name');
    wireFileChooser('import-confirmed-btn', 'import-confirmed', 'import-confirmed-name');
    wireFileChooser('setup-import-tmdb-cache-btn', 'setup-import-tmdb-cache', 'setup-import-tmdb-cache-name');
    wireFileChooser('setup-import-confirmed-btn', 'setup-import-confirmed', 'setup-import-confirmed-name');
    wireFileChooser('settings-import-tmdb-cache-btn', 'settings-import-tmdb-cache', 'settings-import-tmdb-cache-name');
    wireFileChooser('settings-import-confirmed-btn', 'settings-import-confirmed', 'settings-import-confirmed-name');
    const settingsClose = document.getElementById('settings-close');
    const settingsImportCache = document.getElementById('settings-import-tmdb-cache');
    const settingsImportConfirmed = document.getElementById('settings-import-confirmed');
    const settingsSaveKey = document.getElementById('settings-save-key');
    const settingsKeyInput = document.getElementById('settings-tmdb-key');
    const settingsClearConfirmed = document.getElementById('settings-clear-confirmed');
    if (openSettings) openSettings.addEventListener('click', () => { try { if (settingsKeyInput) settingsKeyInput.value = (window.appTMDB && window.appTMDB.getApiKey) ? (window.appTMDB.getApiKey() || '') : (localStorage.getItem('mediavore_tmdb_api_key') || ''); if (autoConfirmToggle) autoConfirmToggle.checked = !!window._autoConfirm; settingsModal && settingsModal.classList.remove('hidden'); } catch (e) {} });
    // toolbar auto-confirm toggle wiring (moved out of settings)
    const autoConfirmToggle = document.getElementById('auto-confirm-toggle');
    function autoConfirmExistingMappings() {
      try {
        const maps = Array.from(document.querySelectorAll('#mappings .mapping'));
        for (const m of maps) {
          try {
            if (!m || m.style.display === 'none') continue;
            const results = m._results || [];
            if (results && results.length === 1) {
              // trigger the confirm button inside this mapping element
              const btn = m.querySelector('.confirm-btn');
              if (btn) btn.click();
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
    if (autoConfirmToggle) {
      try { autoConfirmToggle.checked = !!window._autoConfirm; } catch (e) {}
      autoConfirmToggle.addEventListener('change', (ev) => {
        try {
          const on = !!ev.target.checked;
          window._autoConfirm = on;
          localStorage.setItem('mediavore_auto_confirm', on ? '1' : '0');
          showToast('Auto-confirm ' + (on ? 'enabled' : 'disabled'), 'info');
          if (on) autoConfirmExistingMappings();
        } catch (e) {}
      });
    }
    const settingsConfigure = document.getElementById('settings-configure');
    if (settingsConfigure) settingsConfigure.addEventListener('click', () => { try {
      const mapperModal = document.getElementById('mapper-modal');
      if (mapperModal) mapperModal.classList.remove('hidden');
      try { window.fieldMapper && window.fieldMapper.showMapper && window.fieldMapper.showMapper(window._lastParsed ? window._lastParsed.rows : [], function(m){ mapperModal && mapperModal.classList.add('hidden'); settingsModal && settingsModal.classList.add('hidden'); showSetupIfReady(); showAllControls(); updateSetupSteps(); renderMappingSummary(); showToast('Mapping saved', 'info'); }); } catch (e) { console.warn('Could not open mapper from settings', e); }
    } catch (e) { showToast('Could not open mapper', 'error'); } });
    if (settingsClose) settingsClose.addEventListener('click', () => { settingsModal && settingsModal.classList.add('hidden'); });
    if (settingsImportCache) settingsImportCache.addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importTMDBCache) window.appTMDB.importTMDBCache(obj); else localStorage.setItem('mediavore_tmdb_cache_v1', JSON.stringify(obj)); showToast('TMDB cache imported', 'info'); } catch (e) { showToast('Invalid cache file', 'error'); } }; r.readAsText(f); });
    if (settingsImportConfirmed) settingsImportConfirmed.addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const obj = JSON.parse(r.result); if (window.appTMDB && window.appTMDB.importConfirmed) window.appTMDB.importConfirmed(obj); else localStorage.setItem('mediavore_confirmed_map_v1', JSON.stringify(obj)); window.confirmedMap = obj; showToast('Confirmed mappings imported', 'info'); } catch (e) { showToast('Invalid confirmed file', 'error'); } }; r.readAsText(f); });
    if (settingsClearConfirmed) settingsClearConfirmed.addEventListener('click', async () => {
      try {
        const ok = await askConfirm('Clear confirmed mappings? This will remove locally confirmed selections.');
        if (!ok) return;
        if (window.appTMDB && window.appTMDB.clearConfirmed) {
          try { window.appTMDB.clearConfirmed(); } catch (e) {}
        }
        localStorage.removeItem('mediavore_confirmed_map_v1');
        window.confirmedMap = {};
        try { renderMappingSummary(); } catch (e) {}
        try { updateSetupSteps(); } catch (e) {}
        // If mappings are currently visible, clear and reload them so the UI reflects cleared confirmations
        try {
          const mappingsContainer = document.getElementById('mappings');
          if (mappingsContainer) mappingsContainer.innerHTML = '';
          // re-run auto-search if we have a parsed CSV to repopulate mapping items
          const autoBtn = document.getElementById('auto-search');
          if (autoBtn && typeof autoBtn.click === 'function' && window._lastParsed) {
            // small timeout to allow UI updates to settle
            setTimeout(() => { try { autoBtn.click(); } catch (e) {} }, 120);
          }
        } catch (e) {}
        showToast('Confirmed mappings cleared', 'info');
      } catch (e) { showToast('Could not clear confirmed mappings: ' + (e.message || e), 'error'); }
    });
    if (settingsSaveKey) settingsSaveKey.addEventListener('click', () => { try { const v = settingsKeyInput.value || ''; if (window.appTMDB && window.appTMDB.setApiKey) window.appTMDB.setApiKey(v); else localStorage.setItem('mediavore_tmdb_api_key', v); showToast('API key saved', 'info'); } catch (e) { showToast('Could not save key', 'error'); } });

    // mapper modal close button and backdrop handlers — auto-save mapping on close
    try {
      const mapperModal = document.getElementById('mapper-modal');
      const mapperClose = document.getElementById('mapper-close');
      const mapperBackdrop = document.getElementById('mapper-backdrop');

      function collectAndSaveMapping() {
        try {
          const container = document.getElementById('field-mapper');
          if (!container) return null;
          // find rows and map labels to controls
          const rows = Array.from(container.querySelectorAll('.fm-row'));
          const map = { title: '', type: '', season: '', episode: '', date: '', hasSeries: 0, typeValues: null };
          rows.forEach(r => {
            const lab = r.querySelector('label');
            if (!lab) return;
            const key = (lab.textContent || '').trim().toLowerCase();
            if (key.startsWith('title field')) {
              const sel = r.querySelector('select'); if (sel) map.title = sel.value || '';
            } else if (key.startsWith('type field')) {
              const sel = r.querySelector('select'); if (sel) map.type = sel.value || '';
            } else if (key.startsWith('season number')) {
              const sel = r.querySelector('select'); if (sel) map.season = sel.value || '';
            } else if (key.startsWith('episode number')) {
              const sel = r.querySelector('select'); if (sel) map.episode = sel.value || '';
            } else if (key.startsWith('date/seen') || key.startsWith('date/seen field') || key.startsWith('date/seen')) {
              const sel = r.querySelector('select'); if (sel) map.date = sel.value || '';
            } else if (key.startsWith('dataset contains series')) {
              const sel = r.querySelector('select'); if (sel) {
                const v = sel.value || 'auto'; if (v === 'yes') map.hasSeries = 1; else map.hasSeries = (v === 'no' ? 0 : map.hasSeries);
              }
            }
          });
          // find explicit hasSeries checkbox if present
          const hasChk = container.querySelector('input[type="checkbox"]'); if (hasChk) map.hasSeries = hasChk.checked ? 1 : 0;
          // find typeValues inputs if present
          const tvInputs = container.querySelectorAll('.fm-row input[type="text"]');
          if (tvInputs && tvInputs.length >= 2) {
            map.typeValues = { series: tvInputs[0].value || null, movie: tvInputs[1].value || null };
          }
          if (window.mappingUtils && window.mappingUtils.saveMapping) window.mappingUtils.saveMapping(map);
          else {
            for (const k of ['title','type','season','episode','date']) localStorage.setItem('mediavore_field_map_' + k, map[k] || '');
            localStorage.setItem('mediavore_field_map_has_series', map.hasSeries ? '1' : '0');
            localStorage.setItem('mediavore_field_map_saved_at', new Date().toISOString());
          }
          // persist dataset contains movies selection if present in the modal
          try {
            const dmRow = Array.from(container.querySelectorAll('.fm-row')).find(r => {
              const lab = r.querySelector('label'); return lab && /contains movies\?/i.test(lab.textContent || '');
            });
            if (dmRow) {
              const sel = dmRow.querySelector('select'); if (sel) localStorage.setItem('mediavore_field_map_dataset_movies', sel.value || 'auto');
            }
          } catch (e) {}
          return map;
        } catch (e) { console.warn('Could not collect mapping on close', e); return null; }
      }

      if (mapperClose) mapperClose.addEventListener('click', () => { try { collectAndSaveMapping(); mapperModal && mapperModal.classList.add('hidden'); updateSetupSteps(); try { renderMappingSummary(); } catch(e){} showToast('Mapping saved', 'info'); } catch(e){} });
      if (mapperBackdrop) mapperBackdrop.addEventListener('click', () => { try { collectAndSaveMapping(); mapperModal && mapperModal.classList.add('hidden'); updateSetupSteps(); try { renderMappingSummary(); } catch(e){} showToast('Mapping saved', 'info'); } catch(e){} });
    } catch (e) { /* ignore */ }

    const _downloadTmdbCache = document.getElementById('download-tmdb-cache');
    if (_downloadTmdbCache) _downloadTmdbCache.addEventListener('click', () => {
      try { const text = (window.appTMDB && window.appTMDB.exportTMDBCache) ? window.appTMDB.exportTMDBCache() : (localStorage.getItem('mediavore_tmdb_cache_v1') || '{}'); if (window.appCore && window.appCore.download) window.appCore.download('tmdb_cache.json', text); } catch (e) { showToast('Could not export TMDB cache: ' + e.message, 'error'); }
    });

    const _downloadConfirmed = document.getElementById('download-confirmed');
    if (_downloadConfirmed) _downloadConfirmed.addEventListener('click', () => {
      try { const text = (window.appTMDB && window.appTMDB.exportConfirmed) ? window.appTMDB.exportConfirmed() : (localStorage.getItem('mediavore_confirmed_map_v1') || '{}'); if (window.appCore && window.appCore.download) window.appCore.download('confirmed_map.json', text); } catch (e) { showToast('Could not export confirmed map: ' + e.message, 'error'); }
    });

    const _exportJson = document.getElementById('export-json');
    if (_exportJson) _exportJson.addEventListener('click', () => {
      if (!parsed) { showToast('Load a CSV first', 'warn'); return; }
      try {
        // Build a map of confirmed selections from the UI and storage
        const selectionMap = Object.assign({}, window.confirmedMap || {});
        const mappings = mappingsContainer.querySelectorAll('.mapping');
        mappings.forEach(m => {
          const h3 = m.querySelector('h3');
          const title = h3 ? h3.textContent.split(' (')[0] : null;
          const sel = m._selected || null;
          if (title && sel) selectionMap[title] = sel;
        });

        const mapping = window._lastFieldMap || (window.mappingUtils && window.mappingUtils.getMapping && window.mappingUtils.getMapping()) || {};

        function getVal(row, fieldName, fallbacks){
          if (!row) return '';
          if (fieldName) {
            const v = row[fieldName]; if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
          }
          if (fallbacks && Array.isArray(fallbacks)) {
            for (const f of fallbacks) { if (row[f] !== undefined && row[f] !== null && String(row[f]).trim() !== '') return String(row[f]).trim(); }
          }
          return '';
        }

        function valueMatches(v, cand){
          if (!v) return false;
          const vs = String(v).toLowerCase();
          if (!cand) return false;
          if (Array.isArray(cand)) return cand.map(x=>String(x).toLowerCase().trim()).includes(vs);
          if (typeof cand === 'string') return cand.split(',').map(x=>x.toLowerCase().trim()).includes(vs);
          return false;
        }

        const out = [];
        parsed.rows.forEach(r => {
          const titleVal = getVal(r, mapping.title, ['Name','name','title']);
          if (!titleVal) return;
          const sel = selectionMap[titleVal] || null;
          if (!sel) return; // skip rows without a selected TMDB match

          // determine media type
          let mediaType = 'movie';
          const typeRaw = getVal(r, mapping.type, ['Type','type']);
          const tvCandidates = (mapping.typeValues && mapping.typeValues.series) ? mapping.typeValues.series : null;
          const mvCandidates = (mapping.typeValues && mapping.typeValues.movie) ? mapping.typeValues.movie : null;
          const typeNorm = String(typeRaw || '').toLowerCase();
          if (tvCandidates || mvCandidates) {
            if (valueMatches(typeRaw, tvCandidates)) mediaType = 'tv';
            else if (valueMatches(typeRaw, mvCandidates)) mediaType = 'movie';
            else if (mapping.hasSeries || typeNorm.includes('serie') || typeNorm.includes('tv') || typeNorm.includes('show')) mediaType = 'tv';
          } else {
            if (mapping.hasSeries || typeNorm.includes('serie') || typeNorm.includes('tv') || typeNorm.includes('show')) mediaType = 'tv';
          }

          const seenDateRaw = getVal(r, mapping.date, ['Date','date']);
          const obj = {
            tmdbId: sel.id,
            type: mediaType,
            title: sel.name || titleVal,
            seenDate: (window.appCore && window.appCore.toIsoDate) ? window.appCore.toIsoDate(seenDateRaw) : seenDateRaw,
          };
          if (obj.type === 'tv') {
            const sNum = parseInt(getVal(r, mapping.season, ['Saison','season']) || '') || null;
            const eNum = parseInt(getVal(r, mapping.episode, ['episode','Episode']) || '') || null;
            if (sNum) obj.seasonNumber = sNum;
            if (eNum) obj.episodeNumber = eNum;
          }
          out.push(obj);
        });

        if (window.appCore && window.appCore.download) window.appCore.download('output.json', JSON.stringify(out, null, 2));
      } catch (err) { showToast('Export failed: ' + (err.message || err), 'error'); }
    });

  });

})();
