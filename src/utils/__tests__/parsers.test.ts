import { parseCSV, parseJSON, parseYAML, parseByFilename, parseZipContent } from '../parsers';
import JSZip from 'jszip';

describe('Parsers', () => {
  it('should parse CSV correctly', () => {
    const csv = 'Name,Type,Date\n"My Movie",movie,01/02/2020\n"Other",Serie,03/04/2019';
    const res = parseCSV(csv);
    expect(Array.isArray(res.rows)).toBe(true);
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].Name).toBe('My Movie');
    expect(res.rows[1].Type).toBe('Serie');
  });

  it('should parse JSON correctly', () => {
    const json = JSON.stringify([{ name: 'A', year: 2021 }, { name: 'B', year: 2020 }]);
    const res = parseJSON(json);
    expect(Array.isArray(res.rows)).toBe(true);
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].name).toBe('A');
  });

  it('should parse simple YAML correctly', () => {
    const yaml = '- name: Foo\n  year: 2018\n- name: Bar\n  year: 2019';
    const res = parseYAML(yaml);
    expect(Array.isArray(res.rows)).toBe(true);
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].name).toBe('Foo');
    expect(res.rows[0].year).toBe(2018);
  });

  it('should detect CSV by filename', () => {
    const csv = 'Name,Type\nAlpha,movie\nBeta,tv';
    const blocks = parseByFilename('test.csv', csv);
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].rows.length).toBe(2);
    expect(blocks[0].rows[0].Name).toBe('Alpha');
  });

  it('should detect JSON by filename', () => {
    const json = JSON.stringify([{ name: 'A' }]);
    const blocks = parseByFilename('test.json', json);
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].rows.length).toBe(1);
    expect(blocks[0].rows[0].name).toBe('A');
  });

  it('should detect YAML by filename', () => {
    const yaml = '- name: Alpha\n  type: movie';
    const blocks = parseByFilename('test.yml', yaml);
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBe(1);
    expect(blocks[0].rows.length).toBe(1);
    expect(blocks[0].rows[0].name).toBe('Alpha');
  });

  it('should parse zip content correctly', async () => {
    const zip = new JSZip();
    zip.file('test1.csv', 'Name,Type\nMovie1,movie');
    zip.file('test2.json', JSON.stringify([{ Name: 'Movie2', Type: 'movie' }]));

    // JSZip generateAsync can create various formats. Using Blob for browsers
    // In node environment, we can generate a uint8array and treat it as a Blob
    const content = await zip.generateAsync({ type: 'uint8array' });
    const blob = new Blob([content], { type: 'application/zip' });

    const results = await parseZipContent(blob);
    expect(results).toHaveLength(2);

    const csvResult = results.find(r => r.fileName === 'test1.csv');
    expect(csvResult).toBeDefined();
    expect(csvResult?.rows[0].Name).toBe('Movie1');
    expect(csvResult?.headers).toContain('Name');

    const jsonResult = results.find(r => r.fileName === 'test2.json');
    expect(jsonResult).toBeDefined();
    expect(jsonResult?.rows[0].Name).toBe('Movie2');
    expect(jsonResult?.headers).toContain('Name');
  });
});
