import { getMapping, saveMapping, exportMapping, importMapping, FieldMapping } from '../storage';

function makeStorage(): Storage {
  const s: Record<string, string> = {};
  return {
    getItem(k: string) { return s.hasOwnProperty(k) ? s[k] : null; },
    setItem(k: string, v: string) { s[k] = String(v); },
    removeItem(k: string) { delete s[k]; },
    clear() { Object.keys(s).forEach(k => delete s[k]); },
    length: 0,
    key(index: number) { return Object.keys(s)[index] || null; }
  };
}

describe('Storage Mapping Utils', () => {
  it('should save and get mapping', () => {
    const storage = makeStorage();
    const map: FieldMapping = {
      title: 'Name', type: 'Type', season: 'S', episode: 'E', date: 'Date',
      hasSeries: true, typeValues: null, savedAt: null
    };

    const ok = saveMapping(map, storage);
    expect(ok).toBe(true);

    const got = getMapping(storage);
    expect(got.title).toBe('Name');
    expect(got.type).toBe('Type');
    expect(got.season).toBe('S');
    expect(got.episode).toBe('E');
    expect(got.date).toBe('Date');
    expect(got.hasSeries).toBe(true);
  });

  it('should export and import mapping', () => {
    const storage = makeStorage();
    const map: FieldMapping = {
      title: 'T', type: '', season: '', episode: '', date: '',
      hasSeries: false, typeValues: null, savedAt: null
    };

    saveMapping(map, storage);
    const txt = exportMapping(map);
    const obj = JSON.parse(txt);

    const storage2 = makeStorage();
    const ok = importMapping(obj, storage2);
    expect(ok).toBe(true);

    const got = getMapping(storage2);
    expect(got.title).toBe('T');
  });

  it('should handle typeValues correctly', () => {
    const storage = makeStorage();
    const map: FieldMapping = {
      title: 'Title', type: 'Type', season: '', episode: '', date: '',
      hasSeries: true,
      typeValues: { series: 'Serie,TV', movie: 'Movie,Film' },
      savedAt: null
    };

    saveMapping(map, storage);
    const got = getMapping(storage);

    expect(got.hasSeries).toBe(true);
    expect(got.typeValues).toEqual(map.typeValues);

    const txt = exportMapping(map);
    const parsed = JSON.parse(txt);

    const storage2 = makeStorage();
    importMapping(parsed, storage2);

    const got2 = getMapping(storage2);
    expect(got2.typeValues).toEqual(map.typeValues);
  });
});
