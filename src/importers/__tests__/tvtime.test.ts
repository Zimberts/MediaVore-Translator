import { convertTVTimeExport, isTVTimeExport, splitTitleYear, titleFromAlphaKey, toISODate } from '../tvtime';
import { buildRowKey } from '../../utils/rowKey';
import { readZipEntries } from '../../utils/parsers';
import JSZip from 'jszip';

const MOVIE_A = '11111111-1111-1111-1111-111111111111';
const MOVIE_B = '22222222-2222-2222-2222-222222222222';
const MOVIE_C = '33333333-3333-3333-3333-333333333333';

const episodes = [
  'key,runtime,s_no,ep_no,ep_id,created_at,s_id,gsi,season_number,episode_id,episode_number,user_id,series_name,ep_watch_count,is_for_later,is_archived,uuid,is_followed',
  'watch-episode-aaa-bbb,3120,1,1,100,2024-01-02 20:00:00,79168,g,1,100,1,1,Friends,,,,,',
  'watch-episode-aaa-ccc,3120,1,2,101,2024-01-02 20:00:00,79168,g,1,101,2,1,Friends,,,,,',
  'rewatch-episode-aaa-bbb-1,3120,1,1,100,2025-03-04 21:30:00,79168,g,1,100,1,1,Friends,,,,,',
  'watch-episode-onb-fff,3120,1,3,102,2023-03-17 13:29:40,79168,,1,102,3,1,,,,,,',
  'watch-episode-ddd-eee,3000,1,1,200,2024-05-06 10:00:00,78804,g,1,200,1,1,Doctor Who (2005),,,,,',
  'user-series-s1,,,,,2023-03-17 13:33:46,79168,,,,,1,Friends,3,false,false,44444444-4444-4444-4444-444444444444,true',
  'user-series-s2,,,,,2023-03-17 13:33:31,270915,,,,,1,Peaky Blinders,0,false,false,55555555-5555-5555-5555-555555555555,true',
  'tracking-stats,,,,,2023-03-17 13:29:39,,,,,,1,,,,,,',
].join('\n');

const MOVIE_D = '66666666-6666-6666-6666-666666666666';

const movies = [
  'watch_count,user_id,type-uuid-n,uuid,release_date,runtime,type,created_at,alpha_range_key,entity_type,movie_name',
  `,1,watch-${MOVIE_D}-0,${MOVIE_D},1941-10-23 00:00:00,3840,watch,2023-03-17 14:12:47,watch-alpha-dumbo,movie,`,
  `,1,watch-${MOVIE_A}-0,${MOVIE_A},2021-11-24 00:00:00,6180,watch,2023-05-10 09:25:35,,movie,Encanto`,
  `,1,rewatch-${MOVIE_A}-1,${MOVIE_A},2021-11-24 00:00:00,6180,rewatch,2024-10-20 19:38:05,,movie,Encanto`,
  `,1,follow-${MOVIE_B}-0,${MOVIE_B},2014-10-22 00:00:00,8100,follow,2023-03-17 14:10:43,,movie,Fury`,
  `,1,towatch-${MOVIE_B},${MOVIE_B},2014-10-22 00:00:00,8100,towatch,2023-03-17 14:10:43,,movie,Fury`,
  `,1,towatch-${MOVIE_A},${MOVIE_A},2021-11-24 00:00:00,6180,towatch,2023-03-01 10:00:00,,movie,Encanto`,
  `,1,watch-${MOVIE_C}-0,${MOVIE_C},2011-11-02 00:00:00,6780,watch,2023-05-20 12:57:01,,movie,Intouchables`,
].join('\n');

const lists = [
  'lists,s_key,user_id,created_at,objects,type,name,description,is_public,ordering',
  `,favorite-movies,1,2023-09-23 17:15:07,[map[created_at:1.695489307e+09 type:movie uuid:${MOVIE_C}]],list,Favorite Movies,,false,0`,
  ',favorite-series,1,2025-12-08 10:13:11,[],list,,,false,0',
].join('\n');

const files = [
  { name: 'tv-time-personal-data/tracking-prod-records-v2.csv', text: episodes },
  { name: 'tv-time-personal-data/tracking-prod-records.csv', text: movies },
  { name: 'tv-time-personal-data/lists-prod-lists.csv', text: lists },
  { name: 'tv-time-personal-data/ip_address.csv', text: 'ip\n127.0.0.1' },
];

describe('TV Time importer', () => {
  it('detects a TV Time export from file names', () => {
    expect(isTVTimeExport(files.map(f => f.name))).toBe(true);
    expect(isTVTimeExport(['films.csv'])).toBe(false);
  });

  it('normalizes dates and series years', () => {
    expect(toISODate('2024-01-02 20:00:00')).toBe('2024-01-02T20:00:00.000Z');
    expect(splitTitleYear('Doctor Who (2005)')).toEqual({ title: 'Doctor Who', year: '2005' });
    expect(splitTitleYear('Friends')).toEqual({ title: 'Friends', year: '' });
    expect(titleFromAlphaKey('watch-alpha-any-number-can-win')).toBe('any number can win');
    expect(titleFromAlphaKey('rewatch_count-alpha-watch-alpha-mamma-mia')).toBe('mamma mia');
  });

  const datasets = convertTVTimeExport(files);
  const byName = Object.fromEntries(datasets.map(d => [d.fileName, d]));

  it('produces one dataset per MediaVore category', () => {
    expect(datasets.map(d => d.fileName)).toEqual([
      'TV Time/seen-episodes', 'TV Time/seen-movies', 'TV Time/watchlist', 'TV Time/likes',
    ]);
  });

  it('keeps every episode viewing, including rewatches, keyed by TheTVDB id', () => {
    const ds = byName['TV Time/seen-episodes'];
    expect(ds.rows).toHaveLength(5);
    expect(ds.rows[3]).toMatchObject({ title: 'Friends', season: '1', episode: '3', tvdbId: '79168' });
    expect(ds.rows[0]).toEqual({ title: 'Friends', year: '', type: 'tv', season: '1', episode: '1', date: '2024-01-02T20:00:00.000Z', tvdbId: '79168' });
    expect(ds.rows[4]).toMatchObject({ title: 'Doctor Who', year: '2005', tvdbId: '78804' });
    expect(buildRowKey(ds.rows[0], ds.mapping)?.key).toBe('tvdb:79168::tv');
  });

  it('exports watched and rewatched movies with their release year', () => {
    const ds = byName['TV Time/seen-movies'];
    expect(ds.rows.map(r => [r.title, r.year, r.date])).toEqual([
      ['dumbo', '1941', '2023-03-17T14:12:47.000Z'],
      ['Encanto', '2021', '2023-05-10T09:25:35.000Z'],
      ['Encanto', '2021', '2024-10-20T19:38:05.000Z'],
      ['Intouchables', '2011', '2023-05-20T12:57:01.000Z'],
    ]);
    expect(buildRowKey(ds.rows[1], ds.mapping)?.key).toBe('Encanto::2021::movie');
  });

  it('builds the watchlist from unwatched movies and not-started series', () => {
    const ds = byName['TV Time/watchlist'];
    expect(ds.rows.map(r => [r.title, r.type])).toEqual([['Fury', 'movie'], ['Peaky Blinders', 'tv']]);
    expect(buildRowKey(ds.rows[0], ds.mapping)?.type).toBe('movie');
    expect(buildRowKey(ds.rows[1], ds.mapping)?.key).toBe('tvdb:270915::tv');
  });

  it('resolves favorite list entries to titles', () => {
    expect(byName['TV Time/likes'].rows.map(r => r.title)).toEqual(['Intouchables']);
  });

  it('reads an unencrypted ZIP of the export', async () => {
    const zip = new JSZip();
    files.forEach(f => zip.file(f.name, f.text));
    const blob = await zip.generateAsync({ type: 'uint8array' });
    const entries = await readZipEntries(blob);
    expect(isTVTimeExport(entries.map(e => e.name))).toBe(true);
    expect(convertTVTimeExport(entries)).toHaveLength(4);
  });
});
