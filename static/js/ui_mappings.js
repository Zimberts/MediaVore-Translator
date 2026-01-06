// UI mapping helpers (createMappingElement) exposed as window.appUI
(function(){
  function createMappingElement(title, type, results, onConfirmed) {
    const el = document.createElement('div');
    el.className = 'mapping';
    // header row with title and type selector on the same line
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.justifyContent = 'flex-start';
    headerRow.style.gap = '10px';
    const h = document.createElement('h3');
    h.textContent = `${title}`;
    h.style.margin = '0';
    h.style.fontSize = '1.05em';
    headerRow.appendChild(h);
    // type selector (Film / Serie) so user can override — larger and on the header line
    const typeSelect = document.createElement('select');
    const optFilm = document.createElement('option'); optFilm.value = 'Film'; optFilm.textContent = 'Film';
    const optSerie = document.createElement('option'); optSerie.value = 'Serie'; optSerie.textContent = 'Serie';
    typeSelect.appendChild(optFilm); typeSelect.appendChild(optSerie);
    try { typeSelect.value = type || 'Film'; } catch (e) {}
    typeSelect.style.marginLeft = '0';
    typeSelect.style.fontSize = '1em';
    typeSelect.style.padding = '6px 10px';
    typeSelect.style.minWidth = '120px';
    typeSelect.style.height = '34px';
    typeSelect.style.borderRadius = '6px';
    typeSelect.className = 'type-select';
    headerRow.appendChild(typeSelect);
    el.appendChild(headerRow);
    function selectedTypeLabel() { try { return (typeSelect && typeSelect.value) ? typeSelect.value : (type || 'Film'); } catch (e) { return (type || 'Film'); } }
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '12px';
    wrapper.style.alignItems = 'flex-start';

    const inner = document.createElement('div');
    inner.style.display = 'flex';
    inner.style.gap = '12px';
    inner.style.flex = '1';

    let selectedObj = null;
    const selectedLabel = document.createElement('div');
    selectedLabel.textContent = '';
    selectedLabel.style.minWidth = '360px';
    selectedLabel.style.width = '360px';
    selectedLabel.style.fontSize = '0.95em';
    selectedLabel.style.color = '#222';

    const preview = document.createElement('div');
    preview.style.minWidth = '120px';
    preview.style.maxWidth = '360px';
    preview.style.fontSize = '0.9em';
    preview.className = 'mapping-preview';

    function updatePreviewFromObj(obj) {
      preview.innerHTML = '';
      if (!obj) return;
      if (obj.poster_path) {
        const img = document.createElement('img');
        img.src = `https://image.tmdb.org/t/p/w185${obj.poster_path}`;
        img.alt = obj.name;
        img.style.width = '92px';
        img.style.height = '138px';
        img.style.objectFit = 'cover';
        img.style.marginRight = '8px';
        preview.appendChild(img);
      }
      const txt = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.textContent = obj.name + (obj.year ? ` (${obj.year})` : '');
      titleEl.style.fontWeight = '600';
      txt.appendChild(titleEl);
      if (obj.overview) {
        const ov = document.createElement('div');
        ov.textContent = obj.overview.slice(0, 240) + (obj.overview.length > 240 ? '…' : '');
        ov.className = 'small';
        txt.appendChild(ov);
      }
      preview.appendChild(txt);
      // credits area (director + main actors)
      const creditsDiv = document.createElement('div');
      creditsDiv.className = 'credits small';
      creditsDiv.style.marginTop = '8px';
      creditsDiv.textContent = '';
      preview.appendChild(creditsDiv);
      // request credits asynchronously and fill in director/actors
      (async () => {
        try {
          const mediaType = (selectedTypeLabel() && (selectedTypeLabel().toLowerCase() === 'serie' || selectedTypeLabel().toLowerCase() === 'tv')) ? 'tv' : 'movie';
          const credits = (window.appTMDB && window.appTMDB.fetchCredits) ? await window.appTMDB.fetchCredits(obj.id, mediaType) : {};
          const actors = (credits && credits.actors) ? credits.actors.filter(Boolean) : [];
          const director = credits && credits.director ? credits.director : null;
          let parts = [];
          if (director) parts.push('Director: ' + director);
          if (actors && actors.length) parts.push('Starring: ' + actors.slice(0,2).join(', '));
          if (parts.length) creditsDiv.textContent = parts.join(' • ');
        } catch (e) {
          // ignore credit errors
        }
      })();
    }

    function markSelectedCard(obj) {
      try {
        const cards = el.querySelectorAll('.result-card');
        cards.forEach(c => {
          c.style.backgroundColor = '';
          c.style.border = '1px solid #ddd';
          c.style.boxShadow = '';
          c.removeAttribute('aria-pressed');
        });
        if (!obj) return;
        const targetId = String(obj.id || obj._id || obj.tmdbId || '');
        const targetName = String(obj.name || '');
        let found = null;
        for (const c of cards) {
          if ((c.dataset && c.dataset.candidateId && c.dataset.candidateId === targetId) || (c.dataset && c.dataset.candidateName && c.dataset.candidateName === targetName)) {
            found = c; break;
          }
        }
        if (found) {
          found.style.backgroundColor = '#e8f8ff';
          found.style.border = '2px solid #0b4a6f';
          found.style.boxShadow = '0 2px 6px rgba(11,74,111,0.12)';
          found.setAttribute('aria-pressed', 'true');
        }
      } catch (e) { /* non-fatal */ }
    }

    function setSelection(obj) {
      selectedObj = obj;
      try { el._selected = obj; } catch (e) {}
      selectedLabel.textContent = obj ? (obj.name + (obj.year ? ` (${obj.year})` : '')) : '— no selection —';
      updatePreviewFromObj(obj);
      // visually indicate which candidate is selected (if visible)
      try { markSelectedCard(obj); } catch (e) {}
      try {
        const activeInside = document.activeElement && el.contains(document.activeElement);
        if (el._userInteracted || activeInside) {
          confirmBtn.focus();
        }
      } catch (e) {}
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.marginLeft = '8px';
    confirmBtn.addEventListener('click', () => {
      if (!selectedObj) { window.showToast && window.showToast('Please select a candidate before confirming.', 'warn'); return; }
      try {
        const obj = selectedObj || {};
        // ensure the saved object records the user-selected type
        const objToSave = Object.assign({}, obj, { type: selectedTypeLabel() });
        try { window.confirmedMap[title] = objToSave; } catch (e) {}
        (async () => {
          try {
            // persist locally into confirmed map (localStorage via appTMDB when available)
            try { window.confirmedMap[title] = objToSave; } catch (e) {}
            if (window.appTMDB && window.appTMDB.importConfirmed) {
              // importConfirmed merges, so pass object
              window.appTMDB.importConfirmed({ [title]: objToSave });
            } else {
              const current = JSON.parse(localStorage.getItem('mediavore_confirmed_map_v1') || '{}');
              current[title] = objToSave;
              localStorage.setItem('mediavore_confirmed_map_v1', JSON.stringify(current));
            }
          } catch (e) {
            console.error('Error persisting confirmed selection locally', e);
            window.showToast && window.showToast('Warning: could not persist confirmation locally.', 'warn');
          }
          el.style.display = 'none';
          if (typeof onConfirmed === 'function') {
            try { onConfirmed(); } catch (e) { console.error('onConfirmed callback failed', e); }
          } else {
            try { window.confirmedCount = (window.confirmedCount||0) + 1; } catch (e) {}
            try { window.pendingCount = (window.totalDistinct||0) - (window.confirmedCount||0); } catch (e) {}
            const uc = document.getElementById('unique-confirmed'); if (uc) uc.textContent = `Confirmed: ${window.confirmedCount||0}`;
            const up = document.getElementById('unique-pending'); if (up) up.textContent = `To confirm: ${window.pendingCount||0}`;
          }
          setTimeout(() => { try { if (window.focusNextMapping) window.focusNextMapping(); } catch (e) {} }, 40);
        })();
      } catch (e) { window.showToast && window.showToast('Could not confirm selection', 'error'); }
    });

    const leftCol = document.createElement('div');
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'row';
    leftCol.style.gap = '8px';
    leftCol.style.alignItems = 'center';
    leftCol.style.flex = 'none';
    selectedLabel.style.flex = 'none';
    selectedLabel.style.width = '360px';

    confirmBtn.className = 'confirm-btn';
    confirmBtn.style.flex = 'none';
    confirmBtn.style.marginLeft = '0';

    leftCol.appendChild(selectedLabel);
    leftCol.appendChild(confirmBtn);

    preview.style.flex = '1';
    inner.appendChild(leftCol);
    inner.appendChild(preview);
    wrapper.appendChild(inner);
    el.appendChild(wrapper);

    const info = document.createElement('div'); info.className = 'small'; info.textContent = results.length === 0 ? 'No results' : `${results.length} results`; el.appendChild(info);
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = 'Show all';
    showAllBtn.style.marginLeft = '8px';
    showAllBtn.className = 'show-all-btn';
    let expanded = null;
    el._results = results || [];
    // reusable inline search control creator. returns the searchWrap element.
    function ensureSearchWrap(focusFirst = false) {
      let existing = el.querySelector('.search-wrap');
      if (existing) { if (focusFirst) { const inp = existing.querySelector('input'); if (inp) try { inp.focus(); } catch(e){} } return existing; }
      const searchWrap = document.createElement('div');
      searchWrap.className = 'search-wrap';
      searchWrap.style.marginTop = '8px';
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      // prefill without year when possible
      const yearStripMatch2 = title && title.match(/^(.*)\s*\(\s*(\d{4})(?:[-–—]\d{4})?\s*\)\s*$/);
      searchInput.value = (yearStripMatch2 && yearStripMatch2[1]) ? yearStripMatch2[1].trim() : title;
      searchInput.placeholder = 'Search term';
      searchInput.style.marginRight = '8px';
      const searchBtn = document.createElement('button');
      searchBtn.textContent = 'Search';
      function doSearchAndUpdate(q) {
        return (async () => {
          let qv = (q || searchInput.value || '').trim();
          if (!qv) { window.showToast && window.showToast('Enter a search term', 'warn'); try { searchInput.focus(); } catch (e){} return; }
          try {
            el._userInteracted = true;
            let newResults = await (window.appCore && window.appCore.searchTMDB ? window.appCore.searchTMDB(qv, selectedTypeLabel()) : []);
            results = newResults || [];
            info.textContent = results.length === 0 ? 'No results' : `${results.length} results`;
            if (results.length === 0) {
              const stripped = (function(s){ const m = s && s.match(/^(.*)\s*\(\s*(\d{4})(?:[-–—]\d{4})?\s*\)\s*$/); return m ? m[1].trim() : null; })(qv);
                if (stripped && stripped !== qv) {
                try { window.showToast && window.showToast(`No results for "${qv}" — retrying without year`, 'info', 1800); } catch (e) {}
                qv = stripped;
                searchInput.value = qv;
                newResults = await (window.appCore && window.appCore.searchTMDB ? window.appCore.searchTMDB(qv, selectedTypeLabel()) : []);
                results = newResults || [];
                info.textContent = results.length === 0 ? 'No results' : `${results.length} results`;
              }
            }
            if (results.length > 0) {
              try { showAllBtn.disabled = false; } catch (e) {}
              if (expanded) { expanded.remove(); expanded = null; showAllBtn.textContent = 'Show all'; }
              try { setSelection(results[0]); } catch (e) { console.error(e); }
              // Auto-confirm single result when preference enabled
              try { if (results.length === 1 && window._autoConfirm) { try { confirmBtn.click(); } catch (e) {} } } catch (e) {}
              if (results.length > 1) { try { openExpanded(false); } catch (e) {} }
            } else {
              try { showAllBtn.disabled = true; } catch (e) {}
              window.showToast && window.showToast(`No results for "${qv}"`, 'warn');
              try { searchInput.focus(); } catch (e) {}
            }
          } catch (e) { window.showToast && window.showToast('Search failed: ' + (e.message || e), 'error'); }
        })();
      }
      searchBtn.addEventListener('click', async () => { await doSearchAndUpdate(); });
      searchInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); searchBtn.click(); } });
      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(searchBtn);
      el.appendChild(searchWrap);
      if (focusFirst) try { searchInput.focus(); } catch(e){}
      return searchWrap;
    }
    // ensureIdWrap uses the selected type when fetching details
    function ensureIdWrap(focusFirst = false) {
      let existing = el.querySelector('.id-wrap');
      if (existing) { if (focusFirst) { const inp = existing.querySelector('input'); if (inp) try { inp.focus(); } catch(e){} } return existing; }
      const idWrap = document.createElement('div');
      idWrap.className = 'id-wrap';
      idWrap.style.marginTop = '8px';
      const idInput = document.createElement('input');
      idInput.type = 'text';
      idInput.placeholder = 'Enter TMDB id';
      idInput.style.marginRight = '8px';
      const useBtn = document.createElement('button');
      useBtn.textContent = 'Use ID';
      useBtn.addEventListener('click', async () => {
        const v = (idInput.value || '').trim();
        if (!v) { window.showToast && window.showToast('Please enter an id', 'warn'); try { idInput.focus(); } catch (e) {} return; }
        // basic numeric id check
        if (!/^[0-9]+$/.test(v)) { window.showToast && window.showToast('TMDB id should be numeric', 'warn'); try { idInput.focus(); } catch (e) {} return; }
        try {
          el._userInteracted = true;
          const mediaType = (selectedTypeLabel() && (selectedTypeLabel().toLowerCase() === 'serie' || selectedTypeLabel().toLowerCase() === 'tv')) ? 'tv' : 'movie';
          const details = (window.appTMDB && window.appTMDB.fetchDetails) ? await window.appTMDB.fetchDetails(v, mediaType) : {};
          if (!details || !details.id) {
            window.showToast && window.showToast('No details found for that TMDB id', 'warn');
            return;
          }
          // normalize object shape similar to search results
          const norm = { id: details.id, name: details.name || details.title || '', year: details.year || '', overview: details.overview || '', poster_path: details.poster_path || details.poster_path, type: selectedTypeLabel() };
          setSelection(norm);
          try { markSelectedCard(norm); } catch (e) {}
        } catch (e) {
          console.error('Failed to fetch details for id', e);
          window.showToast && window.showToast('Failed to fetch details for that id', 'error');
        }
      });
      idInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); useBtn.click(); } });
      idWrap.appendChild(idInput);
      idWrap.appendChild(useBtn);
      el.appendChild(idWrap);
      if (focusFirst) try { idInput.focus(); } catch(e){}
      return idWrap;
    }
    function openExpanded(focusFirst = false) {
      if (expanded) return;
      expanded = document.createElement('div');
      expanded.className = 'all-results';
      expanded.style.display = 'grid';
      expanded.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
      expanded.style.gap = '8px';
      expanded.style.marginTop = '8px';
      results.forEach(r => {
        const card = document.createElement('div');
        card.className = 'result-card';
        try { card.dataset.candidateId = String(r.id || r._id || r.tmdbId || ''); } catch (e) {}
        try { card.dataset.candidateName = String(r.name || ''); } catch (e) {}
        card.style.border = '1px solid #ddd';
        card.style.padding = '6px';
        card.style.borderRadius = '6px';
        card.style.cursor = 'pointer';
        card.style.display = 'flex';
        card.style.gap = '8px';
        card.style.alignItems = 'flex-start';
        if (r.poster_path) {
          const img = document.createElement('img');
          img.src = `https://image.tmdb.org/t/p/w154${r.poster_path}`;
          img.alt = r.name;
          img.style.width = '70px'; img.style.height = '105px'; img.style.objectFit = 'cover'; img.style.borderRadius = '4px';
          card.appendChild(img);
        }
        const txt = document.createElement('div');
        const nameEl = document.createElement('div'); nameEl.textContent = r.name + (r.year ? ` (${r.year})` : ''); nameEl.style.fontWeight = '600';
        const ov = document.createElement('div'); ov.textContent = r.overview ? r.overview.slice(0, 200) + (r.overview.length > 200 ? '…' : '') : ''; ov.className = 'small'; ov.style.marginTop = '6px';
        txt.appendChild(nameEl); txt.appendChild(ov);
        card.appendChild(txt);
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', r.name + (r.year ? ` (${r.year})` : ''));
        card.addEventListener('click', () => {
            try { el._userInteracted = true; setSelection(r); } catch (e) { console.error(e); }
            try { markSelectedCard(r); } catch (e) {}
            if (expanded) { expanded.remove(); expanded = null; showAllBtn.textContent = 'Show all'; }
            // Auto-confirm selection when preference enabled
            try { if (window._autoConfirm) { try { confirmBtn.click(); } catch (e) {} } } catch (e) {}
          });
        card.addEventListener('keydown', (ev) => {
          const key = ev.key;
          const parent = card.parentElement;
          if (!parent) return;
          const children = Array.from(parent.querySelectorAll('.result-card'));
          const idx = children.indexOf(card);
          if (key === 'Enter' || key === ' ') {
            ev.preventDefault();
            try { el._userInteracted = true; setSelection(r); } catch (e) { console.error(e); }
            try { markSelectedCard(r); } catch (e) {}
            if (expanded) { expanded.remove(); expanded = null; showAllBtn.textContent = 'Show all'; }
            // Auto-confirm when user selects via keyboard if enabled
            try { if (window._autoConfirm) { try { confirmBtn.click(); } catch (e) {} } } catch (e) {}
          } else if (key === 'ArrowRight' || key === 'ArrowDown') {
            ev.preventDefault();
            const next = children[idx + 1] || children[0];
            if (next) next.focus();
          } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            ev.preventDefault();
            const prev = children[idx - 1] || children[children.length - 1];
            if (prev) prev.focus();
          }
        });
        expanded.appendChild(card);
      });
      el.appendChild(expanded);
      showAllBtn.textContent = 'Hide';
      if (focusFirst) {
        setTimeout(() => { try { const first = expanded.querySelector('.result-card'); if (first) first.focus(); } catch (e) {} }, 50);
      }
    }
    showAllBtn.addEventListener('click', () => {
      if (expanded) { expanded.remove(); expanded = null; showAllBtn.textContent = 'Show all'; return; }
      openExpanded(true);
    });
    el.appendChild(showAllBtn);

    // provide an "Edit search" button so user can retry with a different title even when there are results
    const editSearchBtn = document.createElement('button');
    editSearchBtn.textContent = 'Edit search';
    editSearchBtn.style.marginLeft = '8px';
    editSearchBtn.className = 'edit-search-btn';
    editSearchBtn.addEventListener('click', () => {
      ensureSearchWrap(true);
    });
    el.appendChild(editSearchBtn);

    // add an "Enter ID" button to allow manual TMDB id input
    const enterIdBtn = document.createElement('button');
    enterIdBtn.textContent = 'Enter ID';
    enterIdBtn.style.marginLeft = '8px';
    enterIdBtn.className = 'enter-id-btn';
    enterIdBtn.addEventListener('click', () => {
      ensureIdWrap(true);
    });
    el.appendChild(enterIdBtn);

    if (!results || results.length === 0) {
      // show the reusable inline search control (but don't force focus)
      ensureSearchWrap(false);
    }

    try {
      showAllBtn.disabled = (!results || results.length === 0);
      if (results && results.length > 1) { try { openExpanded(false); } catch (e) {} }
    } catch (e) {}

    el._focusPrimary = function() {
      const rs = el._results || [];
      if (!rs || rs.length === 0) {
        const si = el.querySelector('input[type="text"]'); if (si) { try { si.focus(); } catch (e) {} return true; }
        return false;
      }
      if (rs.length === 1) {
        try { confirmBtn.focus(); return true; } catch (e) { return false; }
      }
      let ex = el.querySelector('.all-results');
      if (!ex) { const sab = el.querySelector('.show-all-btn'); if (sab) sab.click(); ex = el.querySelector('.all-results'); }
      const first = ex ? ex.querySelector('.result-card') : null;
      if (first) { try { first.focus(); return true; } catch (e) { return false; } }
      return false;
    };

    return { el, setSelection, preview, confirmBtn, showAllBtn };
  }

  window.appUI = { createMappingElement };
})();
