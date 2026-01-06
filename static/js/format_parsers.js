// Lightweight format parsers usable in Node and browser
(function(){
  // CSV parser (simple, handles quoted fields)
  function parseCSV(text) {
    if (!text) return { headers: [], rows: [] };
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = splitCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i]);
      if (cols.length === 0) continue;
      const row = {};
      for (let j = 0; j < headers.length; j++) row[headers[j]] = cols[j] || '';
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

  // JSON parser: accepts either an array of objects or an object with a top-level list
  function parseJSON(text) {
    if (!text) return { rows: [] };
    const v = JSON.parse(text);
    if (Array.isArray(v)) return { rows: v };
    // try common shapes: { items: [...] } or { data: [...] }
    if (v && typeof v === 'object') {
      if (Array.isArray(v.items)) return { rows: v.items };
      if (Array.isArray(v.data)) return { rows: v.data };
      // if object is a map of objects, convert to list
      const keys = Object.keys(v);
      if (keys.length > 0 && keys.every(k => typeof v[k] === 'object')) return { rows: keys.map(k => v[k]) };
    }
    return { rows: [] };
  }

  // Very small YAML subset parser to cover simple lists of mappings like:
  // - name: Foo
  //   year: 2020
  // - name: Bar
  function parseYAML(text) {
    if (!text) return { rows: [] };
    const lines = text.split(/\r?\n/);
    const rows = [];
    let cur = null;
    for (let raw of lines) {
      const line = raw.replace(/\t/g, '  ').replace(/\r/g,'');
      if (!line.trim()) continue;
      if (/^\s*-\s*/.test(line)) {
        if (cur) rows.push(cur);
        cur = {};
        const rest = line.replace(/^\s*-\s*/, '');
        if (rest) {
          const m = rest.match(/^([^:]+):\s*(.*)$/);
          if (m) cur[m[1].trim()] = tryParseValue(m[2].trim());
        }
        continue;
      }
      const m = line.match(/^\s*([^:]+):\s*(.*)$/);
      if (m && cur) cur[m[1].trim()] = tryParseValue(m[2].trim());
    }
    if (cur) rows.push(cur);
    return { rows };
  }

  function tryParseValue(s) {
    if (s === '') return '';
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
    if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
    // unquote
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    return s;
  }

  // Normalize an input text by extension hint and return rows array
  function parseByFilename(name, text) {
    const ext = (name || '').toLowerCase();
    if (ext.endsWith('.csv')) return parseCSV(text).rows;
    if (ext.endsWith('.json')) return parseJSON(text).rows;
    if (ext.endsWith('.yml') || ext.endsWith('.yaml')) return parseYAML(text).rows;
    // fallback: try JSON, then CSV, then YAML
    try { const j = JSON.parse(text); if (Array.isArray(j)) return j; } catch (e) {}
    const csv = parseCSV(text); if (csv.rows && csv.rows.length) return csv.rows;
    const y = parseYAML(text); return y.rows || [];
  }

  const api = { parseCSV, parseJSON, parseYAML, parseByFilename };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.formatParsers = api;
})();
