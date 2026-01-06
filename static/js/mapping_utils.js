// Mapping utilities: read/save/export/import mappings using a provided storage
(function(){
  function _key(k){ return 'mediavore_field_map_' + k; }

  function getMapping(storage = (typeof window !== 'undefined' ? window.localStorage : null)){
    if (!storage) return {};
    try {
      return {
        title: storage.getItem(_key('title')) || '',
        type: storage.getItem(_key('type')) || '',
        season: storage.getItem(_key('season')) || '',
        episode: storage.getItem(_key('episode')) || '',
        date: storage.getItem(_key('date')) || '',
        hasSeries: storage.getItem(_key('has_series')) === '1',
        typeValues: (function(){ try { const tv = storage.getItem(_key('type_values')); return tv ? JSON.parse(tv) : null; } catch(e){ return null; } })(),
        savedAt: storage.getItem(_key('saved_at')) || storage.getItem('mediavore_field_map_saved_at') || null
      };
    } catch (e) { return {}; }
  }

  function saveMapping(map, storage = (typeof window !== 'undefined' ? window.localStorage : null)){
    if (!storage) return false;
    try {
      storage.setItem(_key('title'), map.title || '');
      storage.setItem(_key('type'), map.type || '');
      storage.setItem(_key('season'), map.season || '');
      storage.setItem(_key('episode'), map.episode || '');
      storage.setItem(_key('date'), map.date || '');
      storage.setItem(_key('has_series'), map.hasSeries ? '1' : '0');
      try { storage.setItem(_key('type_values'), JSON.stringify(map.typeValues || null)); } catch (e) {}
      const now = new Date().toISOString();
      storage.setItem(_key('saved_at'), now);
      storage.setItem('mediavore_field_map_saved_at', now);
      return true;
    } catch (e) { return false; }
  }

  function exportMapping(map){
    return JSON.stringify({ title: map.title||'', type: map.type||'', season: map.season||'', episode: map.episode||'', date: map.date||'', hasSeries: !!map.hasSeries, typeValues: map.typeValues || null }, null, 2);
  }

  function importMapping(obj, storage = (typeof window !== 'undefined' ? window.localStorage : null)){
    if (!obj) return false;
    const map = {
      title: obj.title || '', type: obj.type || '', season: obj.season || '', episode: obj.episode || '', date: obj.date || '', hasSeries: !!obj.hasSeries, typeValues: obj.typeValues || null
    };
    return saveMapping(map, storage);
  }

  function hasMapping(storage = (typeof window !== 'undefined' ? window.localStorage : null)){
    if (!storage) return false;
    return !!(storage.getItem(_key('title')) || storage.getItem(_key('saved_at')) || storage.getItem('mediavore_field_map_saved_at'));
  }

  const api = { getMapping, saveMapping, exportMapping, importMapping, hasMapping };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.mappingUtils = api;
})();
