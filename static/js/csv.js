// CSV helpers wrapper exposing `window.appCSV` (uses window.appCore when available)
(function(){
  function parseCSV(text) {
    if (window.appCore && window.appCore.parseCSV) return window.appCore.parseCSV(text);
    // fallback simple parser
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines.length ? splitCSVLine(lines[0]) : [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      const row = {};
      for (let j = 0; j < headers.length; j++) row[headers[j]] = cols[j] || '';
      rows.push(row);
    }
    return { headers, rows };
  }

  function splitCSVLine(line) {
    if (window.appCore && window.appCore.splitCSVLine) return window.appCore.splitCSVLine(line);
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
    if (window.appCore && window.appCore.buildRowsTable) return window.appCore.buildRowsTable(headers, rows);
    const thead = document.querySelector('#rows-table thead');
    const tbody = document.querySelector('#rows-table tbody');
    if (!thead || !tbody) return;
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
    const rowsCount = document.getElementById('rows-count'); if (rowsCount) rowsCount.textContent = `${rows.length} rows`;
  }

  window.appCSV = { parseCSV, splitCSVLine, buildRowsTable };
})();
