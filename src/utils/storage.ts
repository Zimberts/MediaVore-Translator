export interface TypeValues {
  series: string;
  movie: string;
}

export interface FieldMapping {
  title: string;
  type: string;
  season: string;
  episode: string;
  date: string;
  hasSeries: boolean;
  typeValues: TypeValues | null;
  savedAt: string | null;
}

export const defaultFieldMapping: FieldMapping = {
  title: '',
  type: '',
  season: '',
  episode: '',
  date: '',
  hasSeries: false,
  typeValues: { series: 'Serie,TV', movie: 'Movie,Film' },
  savedAt: null,
};

function _key(k: string): string {
  return 'mediavore_field_map_' + k;
}

export function getMapping(storage: Storage = window.localStorage): FieldMapping {
  if (!storage) return defaultFieldMapping;
  try {
    const rawTypeValues = storage.getItem(_key('type_values'));
    let tv = null;
    try {
      tv = rawTypeValues ? JSON.parse(rawTypeValues) : defaultFieldMapping.typeValues;
    } catch (e) {
      tv = defaultFieldMapping.typeValues;
    }

    return {
      title: storage.getItem(_key('title')) || '',
      type: storage.getItem(_key('type')) || '',
      season: storage.getItem(_key('season')) || '',
      episode: storage.getItem(_key('episode')) || '',
      date: storage.getItem(_key('date')) || '',
      hasSeries: storage.getItem(_key('has_series')) === '1',
      typeValues: tv,
      savedAt: storage.getItem(_key('saved_at')) || storage.getItem('mediavore_field_map_saved_at') || null,
    };
  } catch (e) {
    return defaultFieldMapping;
  }
}

export function saveMapping(map: FieldMapping, storage: Storage = window.localStorage): boolean {
  if (!storage) return false;
  try {
    storage.setItem(_key('title'), map.title || '');
    storage.setItem(_key('type'), map.type || '');
    storage.setItem(_key('season'), map.season || '');
    storage.setItem(_key('episode'), map.episode || '');
    storage.setItem(_key('date'), map.date || '');
    storage.setItem(_key('has_series'), map.hasSeries ? '1' : '0');
    try {
      storage.setItem(_key('type_values'), JSON.stringify(map.typeValues || null));
    } catch (e) {}
    const now = new Date().toISOString();
    storage.setItem(_key('saved_at'), now);
    storage.setItem('mediavore_field_map_saved_at', now);
    return true;
  } catch (e) {
    return false;
  }
}

export function exportMapping(map: FieldMapping): string {
  return JSON.stringify(
    {
      title: map.title || '',
      type: map.type || '',
      season: map.season || '',
      episode: map.episode || '',
      date: map.date || '',
      hasSeries: !!map.hasSeries,
      typeValues: map.typeValues || null,
    },
    null,
    2
  );
}

export function importMapping(obj: Partial<FieldMapping>, storage: Storage = window.localStorage): boolean {
  if (!obj) return false;
  const map: FieldMapping = {
    title: obj.title || '',
    type: obj.type || '',
    season: obj.season || '',
    episode: obj.episode || '',
    date: obj.date || '',
    hasSeries: !!obj.hasSeries,
    typeValues: obj.typeValues || defaultFieldMapping.typeValues,
    savedAt: null,
  };
  return saveMapping(map, storage);
}

export function hasMapping(storage: Storage = window.localStorage): boolean {
  if (!storage) return false;
  return !!(
    storage.getItem(_key('title')) ||
    storage.getItem(_key('saved_at')) ||
    storage.getItem('mediavore_field_map_saved_at')
  );
}
