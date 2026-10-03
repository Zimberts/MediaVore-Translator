import { buildRowKey } from '../rowKey';
import { defaultFieldMapping, FieldMapping } from '../storage';

const mapping: FieldMapping = {
  ...defaultFieldMapping,
  title: 'title',
  year: 'year',
  type: 'type',
  season: 'season',
  episode: 'episode',
  tvdbId: 'tvdbId',
  hasMovies: true,
  hasSeries: true,
  typeValues: { series: 'tv', movie: 'movie' },
};

describe('buildRowKey', () => {
  it('keys movies by title, year and type', () => {
    const info = buildRowKey({ title: ' Fury ', year: '2014', type: 'movie' }, mapping);
    expect(info).toEqual({ key: 'Fury::2014::movie', title: 'Fury', year: '2014', type: 'movie', tvdbId: undefined });
  });

  it('keys series by TheTVDB id when available', () => {
    const info = buildRowKey({ title: 'Friends', type: 'tv', season: '1', episode: '2', tvdbId: '79168' }, mapping);
    expect(info?.key).toBe('tvdb:79168::tv');
    expect(info?.tvdbId).toBe('79168');
  });

  it('falls back to title key when the TheTVDB id is missing', () => {
    const info = buildRowKey({ title: 'Friends', type: 'tv', tvdbId: '' }, mapping);
    expect(info?.key).toBe('Friends::tv');
  });

  it('skips rows without a title', () => {
    expect(buildRowKey({ title: '  ' }, mapping)).toBeNull();
  });
});
