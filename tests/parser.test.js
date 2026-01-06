const assert = require('assert');
const path = require('path');
const fs = require('fs');
const parsers = require(path.join(__dirname, '..', 'static', 'js', 'format_parsers.js'));

function testCSV() {
  const csv = 'Name,Type,Date\n"My Movie",movie,01/02/2020\n"Other",Serie,03/04/2019';
  const res = parsers.parseCSV(csv);
  assert(Array.isArray(res.rows));
  assert.strictEqual(res.rows.length, 2);
  assert.strictEqual(res.rows[0].Name, 'My Movie');
  assert.strictEqual(res.rows[1].Type, 'Serie');
}

function testJSON() {
  const json = JSON.stringify([{ name: 'A', year: 2021 }, { name: 'B', year: 2020 }]);
  const res = parsers.parseJSON(json);
  assert(Array.isArray(res.rows));
  assert.strictEqual(res.rows.length, 2);
  assert.strictEqual(res.rows[0].name, 'A');
}

function testYAML() {
  const yaml = '- name: Foo\n  year: 2018\n- name: Bar\n  year: 2019';
  const res = parsers.parseYAML(yaml);
  assert(Array.isArray(res.rows));
  assert.strictEqual(res.rows.length, 2);
  assert.strictEqual(res.rows[0].name, 'Foo');
  assert.strictEqual(res.rows[0].year, 2018);
}

function testCSVFile() {
  const p = path.join(__dirname, 'samples', 'sample.csv');
  const txt = fs.readFileSync(p, 'utf8');
  const rows = parsers.parseByFilename(p, txt);
  assert(Array.isArray(rows));
  assert.strictEqual(rows.length, 3);
  // check first row
  assert.strictEqual(rows[0].Name, 'My Movie');
}

function testJSONFile() {
  const p = path.join(__dirname, 'samples', 'sample.json');
  const txt = fs.readFileSync(p, 'utf8');
  const rows = parsers.parseByFilename(p, txt);
  assert(Array.isArray(rows));
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].name, 'Alpha');
}

function testYAMLFile() {
  const p = path.join(__dirname, 'samples', 'sample.yaml');
  const txt = fs.readFileSync(p, 'utf8');
  const rows = parsers.parseByFilename(p, txt);
  assert(Array.isArray(rows));
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1].type, 'Serie');
}

function runAll() {
  console.log('Running parser tests...');
  testCSV(); console.log(' CSV OK');
  testJSON(); console.log(' JSON OK');
  testYAML(); console.log(' YAML OK');
  testCSVFile(); console.log(' CSV File OK');
  testJSONFile(); console.log(' JSON File OK');
  testYAMLFile(); console.log(' YAML File OK');
  console.log('All parser tests passed.');
}

runAll();
