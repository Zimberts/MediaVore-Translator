// Core helper functions extracted from the main frontend for incremental refactor

async function fetchServerPage(page = 1, limit = 20) {
  throw new Error('Server mode disabled: upload a CSV using the file input to work in static mode.');
}

async function fetchServerUnique() {
  throw new Error('Server mode disabled: upload a CSV using the file input to work in static mode.');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  const headers = splitCSVLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] || '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

function splitCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function buildRowsTable(headers, rows) {
  const thead = document.querySelector('#rows-table thead');
  const tbody = document.querySelector('#rows-table tbody');
  thead.innerHTML = '';
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
  thead.appendChild(tr);
  rows.forEach(r => {
    const tr = document.createElement('tr');
    headers.forEach(h => { const td = document.createElement('td'); td.textContent = r[h] || ''; tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  const rowsCount = document.getElementById('rows-count');
  if (rowsCount) rowsCount.textContent = `${rows.length} rows`;
}

async function searchTMDB(query, type) {
  if (window.appTMDB && window.appTMDB.searchTMDB) return window.appTMDB.searchTMDB(query, type);
  // fallback: no TMDB helper available
  throw new Error('No TMDB search implementation available.');
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
}

function toIsoDate(s) {
  if (!s) return '';
  const parts = s.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00.000`;
  }
  return s;
}

// export to window for compatibility
window.appCore = {
  fetchServerPage, fetchServerUnique, parseCSV, splitCSVLine, buildRowsTable,
  searchTMDB, download, toIsoDate
};
