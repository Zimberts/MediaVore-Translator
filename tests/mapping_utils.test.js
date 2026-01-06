const assert = require('assert');
const mappingUtils = require('../static/js/mapping_utils.js');

function makeStorage(){
  const s = {};
  return {
    getItem(k){ return s.hasOwnProperty(k) ? s[k] : null; },
    setItem(k,v){ s[k]=String(v); },
    removeItem(k){ delete s[k]; }
  };
}

function testSaveAndGet(){
  const storage = makeStorage();
  const map = { title: 'Name', type: 'Type', season: 'S', episode: 'E', date: 'Date', hasSeries: true };
  const ok = mappingUtils.saveMapping(map, storage);
  assert.ok(ok, 'saveMapping returned true');
  const got = mappingUtils.getMapping(storage);
  assert.strictEqual(got.title, 'Name');
  assert.strictEqual(got.type, 'Type');
  assert.strictEqual(got.season, 'S');
  assert.strictEqual(got.episode, 'E');
  assert.strictEqual(got.date, 'Date');
  assert.strictEqual(got.hasSeries, true);
}

function testExportImport(){
  const storage = makeStorage();
  const map = { title: 'T', type: '', season: '', episode: '', date: '', hasSeries: false };
  mappingUtils.saveMapping(map, storage);
  const txt = mappingUtils.exportMapping(map);
  const obj = JSON.parse(txt);
  const storage2 = makeStorage();
  const ok = mappingUtils.importMapping(obj, storage2);
  assert.ok(ok);
  const got = mappingUtils.getMapping(storage2);
  assert.strictEqual(got.title, 'T');
}

function testTypeValues(){
  const storage = makeStorage();
  const map = { title: 'Title', type: 'Type', season: '', episode: '', date: '', hasSeries: true, typeValues: { series: 'Serie,TV', movie: 'Movie,Film' } };
  mappingUtils.saveMapping(map, storage);
  const got = mappingUtils.getMapping(storage);
  assert.strictEqual(got.hasSeries, true);
  assert.deepStrictEqual(got.typeValues, map.typeValues);
  const txt = mappingUtils.exportMapping(map);
  const parsed = JSON.parse(txt);
  const storage2 = makeStorage();
  mappingUtils.importMapping(parsed, storage2);
  const got2 = mappingUtils.getMapping(storage2);
  assert.deepStrictEqual(got2.typeValues, map.typeValues);
}

function runAll(){
  console.log('Running mapping utils tests...');
  testSaveAndGet(); console.log(' save/get OK');
  testExportImport(); console.log(' export/import OK');
  testTypeValues(); console.log(' typeValues OK');
  console.log('All mapping utils tests passed.');
}

runAll();
