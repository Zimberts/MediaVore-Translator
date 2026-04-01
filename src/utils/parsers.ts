import JSZip from 'jszip';

// Lightweight format parsers

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, any>[];
}

// CSV parser (simple, handles quoted fields)
export function parseCSV(text: string): ParsedCSV {
  if (!text) return { headers: [], rows: [] };
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCSVLine(lines[0]);
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;
    const row: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] || '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

export function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(cur); cur = ''; continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result.map(s => s.trim());
}

// JSON parser: accepts either an array of objects or an object with a top-level list
export function parseJSON(text: string): { rows: any[] } {
  if (!text) return { rows: [] };
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return { rows: v };
    // try common shapes: { items: [...] } or { data: [...] }
    if (v && typeof v === 'object') {
      if (Array.isArray(v.items)) return { rows: v.items };
      if (Array.isArray(v.data)) return { rows: v.data };
      // if object is a map of objects, convert to list
      const keys = Object.keys(v);
      if (keys.length > 0 && keys.every(k => typeof v[k] === 'object')) {
        return { rows: keys.map(k => v[k]) };
      }
    }
  } catch (e) {
    // Ignore invalid JSON
  }
  return { rows: [] };
}

// Very small YAML subset parser to cover simple lists of mappings like:
// - name: Foo
//   year: 2020
// - name: Bar
export function parseYAML(text: string): { rows: any[] } {
  if (!text) return { rows: [] };
  const lines = text.split(/\r?\n/);
  const rows: any[] = [];
  let cur: any = null;
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

export function tryParseValue(s: string): any {
  if (s === '') return '';
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (/^\d+\.\d+$/.test(s)) return parseFloat(s);
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
  // unquote
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Normalize an input text by extension hint and return rows array
export function parseByFilename(name: string, text: string): Record<string, any>[] {
  const ext = (name || '').toLowerCase();

  if (ext.endsWith('.csv')) {
    return parseCSV(text).rows;
  }
  if (ext.endsWith('.json')) {
    return parseJSON(text).rows;
  }
  if (ext.endsWith('.yml') || ext.endsWith('.yaml')) {
    return parseYAML(text).rows;
  }

  // fallback: try JSON, then CSV, then YAML
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j)) return j;
  } catch (e) {}

  const csv = parseCSV(text);
  if (csv.rows && csv.rows.length) return csv.rows;

  const y = parseYAML(text);
  return y.rows || [];
}

export async function parseZipContent(file: File | Blob): Promise<{ fileName: string, headers: string[], rows: Record<string, any>[] }[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const results: { fileName: string, headers: string[], rows: Record<string, any>[] }[] = [];

  for (const [path, zipEntry] of Object.entries(loadedZip.files)) {
    if (!zipEntry.dir) {
      try {
        const text = await zipEntry.async('text');
        const rows = parseByFilename(zipEntry.name, text);
        if (rows && rows.length > 0) {
          const headers = Object.keys(rows[0]);
          results.push({ fileName: path, headers, rows });
        }
      } catch (e) {
        // ignore parsing errors and proceed thoroughly
      }
    }
  }
  return results;
}
