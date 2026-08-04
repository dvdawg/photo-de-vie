import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeEntry, normalizeLibrary, readLibrary } from './library.mjs';

const base = { file: 'dawn-ridge', title: 'Dawn Ridge', tags: ['landscape'], width: 100, height: 80 };

test('writes fields in a fixed order regardless of client key order', () => {
  const entry = normalizeEntry({ height: 80, tags: ['a'], width: 100, title: 'T', file: 'x' });
  assert.deepEqual(Object.keys(entry), ['file', 'title', 'tags', 'width', 'height']);
});

test('keeps location and year in their slot when present', () => {
  const entry = normalizeEntry({ ...base, location: 'Marin', year: 2024 });
  assert.deepEqual(Object.keys(entry), ['file', 'title', 'location', 'year', 'tags', 'width', 'height']);
});

test('drops blank optionals rather than storing empty values', () => {
  const entry = normalizeEntry({ ...base, location: '   ', year: '' });
  assert.equal('location' in entry, false);
  assert.equal('year' in entry, false);
});

test('lowercases, trims and de-duplicates tags', () => {
  const entry = normalizeEntry({ ...base, tags: [' Coast ', 'coast', 'WATER', ''] });
  assert.deepEqual(entry.tags, ['coast', 'water']);
});

test('coerces a year typed as text', () => {
  assert.equal(normalizeEntry({ ...base, year: '2024' }).year, 2024);
});

test('rejects entries that would break the site', () => {
  assert.throws(() => normalizeEntry({ ...base, file: '' }), /missing a file slug/);
  assert.throws(() => normalizeEntry({ ...base, file: 'Not A Slug' }), /not a valid slug/);
  assert.throws(() => normalizeEntry({ ...base, title: '  ' }), /needs a title/);
  assert.throws(() => normalizeEntry({ ...base, width: 0 }), /invalid dimensions/);
  assert.throws(() => normalizeEntry({ ...base, height: 12.5 }), /invalid dimensions/);
  assert.throws(() => normalizeEntry({ ...base, year: 1200 }), /invalid year/);
});

test('rejects a duplicate slug', () => {
  assert.throws(() => normalizeLibrary([base, base]), /appears twice/);
});

test('rejects a library that is not an array', () => {
  assert.throws(() => normalizeLibrary({ photos: [] }), /must be an array/);
});

test('the committed library is already canonical', () => {
  const library = readLibrary();
  assert.deepEqual(normalizeLibrary(library), library);
});
