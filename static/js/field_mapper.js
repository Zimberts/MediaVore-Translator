// Simple field mapping UI helper
(function(){
  function showMapper(rows, onSave) {
    // rows: array of objects (may be empty)
    // if no rows provided, try to read sample headers from localStorage key 'mediavore_field_map_sample_headers'
    let sample = (rows && rows.length) ? rows[0] : null;
    // Prefer opener's parsed sample if available (same-origin window.open)
    try {
      if (!sample && window.opener && window.opener._lastParsed && window.opener._lastParsed.rows && window.opener._lastParsed.rows.length) {
        sample = window.opener._lastParsed.rows[0];
      }
    } catch (e) { /* ignore cross-window errors */ }
    if (!sample) {
      // try stored sample row
      try {
        const rawRow = localStorage.getItem('mediavore_field_map_sample_row');
        if (rawRow) sample = JSON.parse(rawRow);
      } catch (e) { /* ignore */ }
    }
    if (!sample) {
      try {
        const raw = localStorage.getItem('mediavore_field_map_sample_headers');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length) sample = arr.reduce((acc,k)=>{ acc[k]=''; return acc; }, {});
        }
      } catch (e) { /* ignore */ }
    }
    const keys = sample ? Object.keys(sample).sort() : [];
    const container = document.getElementById('field-mapper');
    if (!container) return;
    container.innerHTML = '';
    const title = document.createElement('h3'); title.textContent = 'Configure input fields'; container.appendChild(title);

    // two-column layout: left = form, right = sample preview
    const layout = document.createElement('div'); layout.className = 'fm-layout';
    const formWrap = document.createElement('div'); formWrap.className = 'fm-form-wrap';
    const previewWrap = document.createElement('aside'); previewWrap.className = 'fm-preview-wrap';

    const form = document.createElement('div'); form.className = 'field-mapper-form';
    function mkRow(label, keyName) {
      const row = document.createElement('div'); row.className = 'fm-row';
      const lab = document.createElement('label'); lab.textContent = label; row.appendChild(lab);
      const sel = document.createElement('select'); sel.className = 'fm-select';
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = '(none)'; sel.appendChild(empty);
      keys.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o); });
      // auto-default selection using common header names if no saved value
      const saved = localStorage.getItem('mediavore_field_map_' + keyName) || '';
      if (saved) sel.value = saved;
      else {
        const normalized = (s) => String(s || '').toLowerCase();
        const candidates = {
          title: ['title','name','movie','film'],
          type: ['type','kind'],
          season: ['season','saison'],
          episode: ['episode','ep'],
          date: ['date','seen','watched','watch_date','viewed']
        };
        const wanted = candidates[keyName] || [];
        function tokens(s){ return String(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
        for (const k of keys) {
          const nk = normalized(k);
          const nkTokens = tokens(nk);
          let matched = false;
          for (const w of wanted) {
            const ww = String(w||'').toLowerCase();
            if (!ww) continue;
            // exact token match or token contains candidate (for longer words)
            if (nk === ww) { matched = true; break; }
            if (nkTokens.includes(ww)) { matched = true; break; }
            if (ww.length > 2 && nk.indexOf(ww) !== -1) { matched = true; break; }
          }
          if (matched) { sel.value = k; break; }
        }
      }
      row.appendChild(sel);
      return { row, sel };
    }

    // Build rows in the requested order:
    // Title, Date, Dataset contains series, Season (if series), Episode (if series), Dataset contains movies
    const titleRow = mkRow('Title field', 'title'); form.appendChild(titleRow.row);
    const dateRow = mkRow('Date/Seen field', 'date'); form.appendChild(dateRow.row);

    // dataset contains series? tri-state control (Auto / Yes / No)
    const datasetSeriesRow = document.createElement('div'); datasetSeriesRow.className = 'fm-row';
    const datasetSeriesLabel = document.createElement('label'); datasetSeriesLabel.textContent = 'Dataset contains series?';
    const dsSelect = document.createElement('select'); dsSelect.className = 'fm-select';
    ['auto','yes','no'].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v === 'auto' ? 'Auto-detect' : (v === 'yes' ? 'Yes' : 'No'); dsSelect.appendChild(o); });
    dsSelect.value = localStorage.getItem('mediavore_field_map_dataset_series') || 'auto';
    datasetSeriesRow.appendChild(datasetSeriesLabel); datasetSeriesRow.appendChild(dsSelect); form.appendChild(datasetSeriesRow);

    const seasonRow = mkRow('Season number field', 'season'); form.appendChild(seasonRow.row);
    const episodeRow = mkRow('Episode number field', 'episode'); form.appendChild(episodeRow.row);

    // dataset contains movies? tri-state control (Auto / Yes / No)
    const datasetMoviesRow = document.createElement('div'); datasetMoviesRow.className = 'fm-row';
    const datasetMoviesLabel = document.createElement('label'); datasetMoviesLabel.textContent = 'Dataset contains movies?';
    const dmSelect = document.createElement('select'); dmSelect.className = 'fm-select';
    ['auto','yes','no'].forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v === 'auto' ? 'Auto-detect' : (v === 'yes' ? 'Yes' : 'No'); dmSelect.appendChild(o); });
    dmSelect.value = localStorage.getItem('mediavore_field_map_dataset_movies') || 'auto';
    datasetMoviesRow.appendChild(datasetMoviesLabel); datasetMoviesRow.appendChild(dmSelect); form.appendChild(datasetMoviesRow);

    // build a hidden kind selector (used only for mixed-type detection UI)
    const kindRow = mkRow('Type field (movie/serie)', 'type');
    kindRow.row.style.display = 'none';

    // checkbox: is there explicit series flag (only visible when user says dataset has series)
    const hasSeriesRow = document.createElement('div'); hasSeriesRow.className = 'fm-row';
    const hasSeriesLabel = document.createElement('label'); hasSeriesLabel.textContent = 'Series indicator present?';
    const hasSeriesCheckbox = document.createElement('input'); hasSeriesCheckbox.type = 'checkbox'; hasSeriesCheckbox.checked = (localStorage.getItem('mediavore_field_map_has_series') === '1');
    hasSeriesRow.appendChild(hasSeriesLabel); hasSeriesRow.appendChild(hasSeriesCheckbox);
    // will append later depending on user selection

    const sampleArea = document.createElement('details'); const saSummary = document.createElement('summary'); saSummary.textContent = 'Sample row'; sampleArea.appendChild(saSummary);
    const pre = document.createElement('pre'); pre.textContent = JSON.stringify(sample || {}, null, 2); sampleArea.appendChild(pre);
    // put sample into previewWrap on the right
    previewWrap.appendChild(sampleArea);
    // also show a compact table view of sample keys/values
    const sampleTable = document.createElement('table'); sampleTable.className = 'fm-sample-table';
    const sthead = document.createElement('thead'); const thr = document.createElement('tr'); thr.innerHTML = '<th>Field</th><th>Value</th>'; sthead.appendChild(thr); sampleTable.appendChild(sthead);
    const stbody = document.createElement('tbody');
    (sample ? Object.keys(sample) : []).forEach(k => { const tr = document.createElement('tr'); const td1 = document.createElement('td'); td1.textContent = k; const td2 = document.createElement('td'); td2.textContent = String(sample[k]); tr.appendChild(td1); tr.appendChild(td2); stbody.appendChild(tr); });
    sampleTable.appendChild(stbody);
    previewWrap.appendChild(sampleTable);
    // add preview note
    const previewNote = document.createElement('div'); previewNote.className = 'type-values-note'; previewNote.textContent = 'Sample preview (first row) — used to suggest default mappings.'; previewWrap.appendChild(previewNote);

    // collect sample rows for type detection (prefer rows param, then opener, then stored rows)
    let sampleRows = (rows && rows.length) ? rows.slice(0,30) : null;
    try {
      if ((!sampleRows || sampleRows.length === 0) && window.opener && window.opener._lastParsed && window.opener._lastParsed.rows) {
        sampleRows = window.opener._lastParsed.rows.slice(0,30);
      }
    } catch (e) {}
    if ((!sampleRows || sampleRows.length === 0)) {
      try { const raw = localStorage.getItem('mediavore_field_map_sample_rows'); if (raw) sampleRows = JSON.parse(raw); } catch (e) {}
    }

    // helper to detect tv/movie like values
    function analyzeTypeDistribution(rows, keys) {
      const perKey = {};
      const tvRegex = /\b(tv|serie|series|show)\b/i;
      const mvRegex = /\b(movie|film)\b/i;
      const trueRegex = /^(1|true|yes)$/i;
      (rows || []).forEach(r => {
        keys.forEach(k => {
          const v = r && r[k] !== undefined && r[k] !== null ? String(r[k]).trim() : '';
          if (!perKey[k]) perKey[k] = { tvCount:0, mvCount:0, tvValues:new Set(), mvValues:new Set() };
          if (!v) return;
          if (tvRegex.test(v) || trueRegex.test(v)) { perKey[k].tvCount += 1; perKey[k].tvValues.add(v); }
          if (mvRegex.test(v)) { perKey[k].mvCount += 1; perKey[k].mvValues.add(v); }
          // also split comma-separated values
          if (v.indexOf(',') !== -1) {
            v.split(',').map(s=>s.trim()).forEach(part => {
              if (tvRegex.test(part) || trueRegex.test(part)) { perKey[k].tvCount += 0; perKey[k].tvValues.add(part); }
              if (mvRegex.test(part)) { perKey[k].mvCount += 0; perKey[k].mvValues.add(part); }
            });
          }
        });
      });
      // totals
      let totalTv = 0, totalMv = 0;
      Object.keys(perKey).forEach(k => { totalTv += perKey[k].tvCount; totalMv += perKey[k].mvCount; });
      return { perKey, totalTv, totalMv };
    }

    const detection = analyzeTypeDistribution(sampleRows || [], keys);
    const mixedTypes = detection.totalTv > 0 && detection.totalMv > 0;

    // If mixed, show UI to pick the type field and specify which values mean series/movie
    let typeValuesContainer = null;
    if (mixedTypes) {
      typeValuesContainer = document.createElement('div'); typeValuesContainer.className = 'fm-row fm-type-values';
      const tvNote = document.createElement('div'); tvNote.className = 'fm-type-note'; tvNote.textContent = 'Dataset appears to include both series and movies — select the field that indicates type and the values that correspond to Series and Movie.'; typeValuesContainer.appendChild(tvNote);
      const tvFieldLabel = document.createElement('label'); tvFieldLabel.textContent = 'Type field to inspect:'; tvFieldLabel.className = 'fm-type-label'; typeValuesContainer.appendChild(tvFieldLabel);
      // place the kind selector with a nicer wrapper
      const kindWrap = document.createElement('div'); kindWrap.className = 'fm-type-control'; kindWrap.appendChild(kindRow.sel); typeValuesContainer.appendChild(kindWrap);
      const seriesLabel = document.createElement('label'); seriesLabel.textContent = 'Values meaning SERIES (comma-separated):'; seriesLabel.className = 'fm-type-label';
      const seriesInput = document.createElement('input'); seriesInput.type = 'text'; seriesInput.className = 'fm-input fm-type-input';
      const movieLabel = document.createElement('label'); movieLabel.textContent = 'Values meaning MOVIE (comma-separated):'; movieLabel.className = 'fm-type-label';
      const movieInput = document.createElement('input'); movieInput.type = 'text'; movieInput.className = 'fm-input fm-type-input';
      typeValuesContainer.appendChild(seriesLabel); typeValuesContainer.appendChild(seriesInput);
      typeValuesContainer.appendChild(movieLabel); typeValuesContainer.appendChild(movieInput);
      form.appendChild(typeValuesContainer);

      // Show the mixed-type prompt when detection indicates mixed types and selector allows auto-detect,
      // or when the user explicitly indicates the dataset contains both series and movies (both 'yes').
      function updateTypePromptVisibility() {
        try {
          const ds = dsSelect ? dsSelect.value : 'auto';
          const dm = dmSelect ? dmSelect.value : 'auto';
          const show = (mixedTypes && ds === 'auto') || (ds === 'yes' && dm === 'yes');
          typeValuesContainer.style.display = show ? '' : 'none';
        } catch (e) { /* ignore */ }
      }
      try { updateTypePromptVisibility(); } catch (e) {}
      dsSelect && dsSelect.addEventListener('change', updateTypePromptVisibility);
      dmSelect && dmSelect.addEventListener('change', updateTypePromptVisibility);

      function updateTypeValueSuggestions() {
        const field = kindRow.sel.value;
        let vals = [];
        try { if (sampleRows && sampleRows.length && field) vals = Array.from(new Set(sampleRows.map(r => (r && r[field]) ? String(r[field]).trim() : '').filter(Boolean))).slice(0,30); } catch (e) {}
        // suggest tv-like and movie-like values
        const tvLike = vals.filter(v => /\b(tv|serie|series|show)\b/i.test(v) || /^(1|true|yes)$/i.test(v));
        const mvLike = vals.filter(v => /\b(movie|film)\b/i.test(v));
        if (tvLike.length && !seriesInput.value) seriesInput.value = tvLike.join(',');
        if (mvLike.length && !movieInput.value) movieInput.value = mvLike.join(',');
      }
      kindRow.sel.addEventListener('change', updateTypeValueSuggestions);
      // initial suggestion
      updateTypeValueSuggestions();
    } else {
      // if not mixed, set hasSeries checkbox based on detection totals
      if (detection.totalTv > 0 && detection.totalMv === 0) { hasSeriesCheckbox.checked = true; }
      if (detection.totalMv > 0 && detection.totalTv === 0) { hasSeriesCheckbox.checked = false; }
    }

    // Ensure season/episode visibility based on datasetSeriesRow selection and detection
    function updateSeriesVisibility() {
      const val = dsSelect.value || 'auto';
      const prefersSeries = (val === 'yes') || (val === 'auto' && detection.totalTv > 0 && detection.totalTv >= detection.totalMv);
      seasonRow.row.style.display = prefersSeries ? '' : 'none';
      episodeRow.row.style.display = prefersSeries ? '' : 'none';
      // show explicit series indicator only when series are present
      hasSeriesRow.style.display = prefersSeries ? '' : 'none';
      try { localStorage.setItem('mediavore_field_map_dataset_series', val); } catch (e) {}
      // Also hide/show the mixed-type typeValuesContainer (and kind selector) when user forces series/movies
      try { if (typeValuesContainer) {
        const ds = dsSelect ? dsSelect.value : 'auto';
        const dm = dmSelect ? dmSelect.value : 'auto';
        typeValuesContainer.style.display = ((mixedTypes && ds === 'auto') || (ds === 'yes' && dm === 'yes')) ? '' : 'none';
      } } catch (e) {}
    }
    dsSelect.addEventListener('change', updateSeriesVisibility);
    // initialize visibility
    updateSeriesVisibility();

    // Ensure datasetMoviesRow persists selection
    dmSelect.addEventListener('change', () => { try { localStorage.setItem('mediavore_field_map_dataset_movies', dmSelect.value || 'auto'); } catch (e) {} });

    // (Removed) Upload sample file UI: handled via the main page sample upload.

    const buttons = document.createElement('div'); buttons.className = 'fm-buttons';
    // Import mapping button (opens hidden file input)
    const importBtn = document.createElement('button'); importBtn.type = 'button'; importBtn.textContent = 'Import mapping';
    const importFileInput = document.createElement('input'); importFileInput.type = 'file'; importFileInput.accept = '.json'; importFileInput.style.display = 'none';
    // Export mapping button
    const exportBtn = document.createElement('button'); exportBtn.type = 'button'; exportBtn.textContent = 'Export mapping';
    buttons.appendChild(importBtn); buttons.appendChild(exportBtn); buttons.appendChild(importFileInput);
    form.appendChild(buttons);

    // Import behavior: trigger hidden file input
    importBtn.addEventListener('click', () => { importFileInput.click(); });
    importFileInput.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
        try {
          const obj = JSON.parse(r.result);
          if (obj.title) titleRow.sel.value = obj.title;
          if (obj.type) kindRow.sel.value = obj.type;
          if (obj.season) seasonRow.sel.value = obj.season;
          if (obj.episode) episodeRow.sel.value = obj.episode;
          if (obj.date) dateRow.sel.value = obj.date;
          hasSeriesCheckbox.checked = !!obj.hasSeries;
          // reflect dataset contains series selector when mapping includes hasSeries
          try { if (obj.hasSeries === true) dsSelect.value = 'yes'; else if (obj.hasSeries === false) dsSelect.value = 'no'; } catch (e) {}
          try { updateSeriesVisibility(); } catch (e) {}
          // reflect dataset contains movies if included in mapping file (optional)
          try { if (obj.hasMovies === true) dmSelect.value = 'yes'; else if (obj.hasMovies === false) dmSelect.value = 'no'; } catch (e) {}
          // import and persist immediately
          try { if (window.mappingUtils && window.mappingUtils.importMapping) window.mappingUtils.importMapping(obj); } catch (e) {}
          window.showToast && window.showToast('Mapping imported and saved', 'info');
        } catch (e) { window.showToast && window.showToast('Invalid mapping file', 'error'); }
      }; r.readAsText(f);
    });

    exportBtn.addEventListener('click', () => {
      const map = {
        title: titleRow.sel.value,
        type: kindRow.sel.value,
        season: seasonRow.sel.value,
        episode: episodeRow.sel.value,
        date: dateRow.sel.value,
        hasSeries: hasSeriesCheckbox.checked ? 1 : 0
      };
      const txt = (window.mappingUtils && window.mappingUtils.exportMapping) ? window.mappingUtils.exportMapping(map) : JSON.stringify(map, null, 2);
      if (window.appCore && window.appCore.download) window.appCore.download('field_mapping.json', txt);
    });

    // assemble layout
    formWrap.appendChild(form);
    layout.appendChild(formWrap);
    layout.appendChild(previewWrap);
    container.appendChild(layout);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { showMapper };
  if (typeof window !== 'undefined') window.fieldMapper = { showMapper };
})();
