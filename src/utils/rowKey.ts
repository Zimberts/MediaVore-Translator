import { FieldMapping } from './storage';

export interface RowInfo {
  key: string;
  title: string;
  year?: string;
  type: 'movie' | 'tv';
  tvdbId?: string;
}

// Derive the unique matching key of a row. Shared by matching and export so both stay in sync.
export function buildRowKey(row: Record<string, any>, mapping: FieldMapping): RowInfo | null {
  const rawTitle = mapping.title ? row[mapping.title] : row[mapping.scrapeUrlColumn!];
  if (!rawTitle || typeof rawTitle !== 'string') return null;
  const title = rawTitle.trim();
  if (!title) return null;

  let isTv = false;
  if (mapping.hasSeries && !mapping.hasMovies) {
    isTv = true;
  } else if (mapping.hasSeries && mapping.hasMovies) {
    isTv = !!(
      (mapping.type && row[mapping.type] && mapping.typeValues?.series.includes(String(row[mapping.type]))) ||
      (mapping.season && row[mapping.season]) ||
      (mapping.episode && row[mapping.episode])
    );
  }
  const type = isTv ? 'tv' : 'movie';

  let year = mapping.year ? row[mapping.year] : undefined;
  if (year && typeof year === 'number') year = String(year);
  if (year && typeof year === 'string') year = year.trim();
  if (!year) year = undefined;

  const tvdbRaw = isTv && mapping.tvdbId ? String(row[mapping.tvdbId] ?? '').trim() : '';
  const tvdbId = /^\d+$/.test(tvdbRaw) ? tvdbRaw : undefined;

  let key: string;
  if (tvdbId) key = `tvdb:${tvdbId}::tv`;
  else key = year ? `${title}::${year}::${type}` : `${title}::${type}`;

  return { key, title, year, type, tvdbId };
}
