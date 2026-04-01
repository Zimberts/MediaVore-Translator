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
  category?: string;
  listNameColumn?: string;
  isMultiList?: boolean;
  likesListName?: string;
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
  category: '',
  listNameColumn: '',
  isMultiList: false,
  likesListName: '',
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
      category: storage.getItem(_key('category')) || '',
      listNameColumn: storage.getItem(_key('list_name_column')) || '',
      isMultiList: storage.getItem(_key('is_multi_list')) === '1',
      likesListName: storage.getItem(_key('likes_list_name')) || '',
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
    storage.setItem(_key('category'), map.category || '');
    storage.setItem(_key('list_name_column'), map.listNameColumn || '');
    storage.setItem(_key('is_multi_list'), map.isMultiList ? '1' : '0');
    storage.setItem(_key('likes_list_name'), map.likesListName || '');
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

export function getFileMappings(): Record<string, FieldMapping> {
  const data = localStorage.getItem('mediavore_file_mappings');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {}
  }
  return {};
}

export function saveFileMappings(mappings: Record<string, FieldMapping>) {
  localStorage.setItem('mediavore_file_mappings', JSON.stringify(mappings));
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
      category: map.category || '',
      listNameColumn: map.listNameColumn || '',
      isMultiList: !!map.isMultiList,
      likesListName: map.likesListName || '',
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
    category: obj.category || '',
    listNameColumn: obj.listNameColumn || '',
    isMultiList: !!obj.isMultiList,
    likesListName: obj.likesListName || '',
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
