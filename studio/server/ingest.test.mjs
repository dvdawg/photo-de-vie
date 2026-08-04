/**
 * Only the checks that run before anything touches the filesystem. The `sips`
 * half is exercised by dropping a real photo into the studio.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingestPhoto } from './ingest.mjs';

const bytes = Buffer.from('not really a jpeg, but non-empty');
const library = [{ file: 'img-1337', title: 'Path to the Sea' }];

function attempt(filename, overrides = {}) {
  return () => ingestPhoto({ filename, bytes, library, ...overrides });
}

test('rejects a slug already in the library, naming the conflict', () => {
  assert.throws(attempt('IMG_1337.png'), /"Path to the Sea" already uses/);
});

test('rejects file types sips cannot read', () => {
  assert.throws(attempt('notes.txt'), /not an image sips can read/);
  assert.throws(attempt('clip.mov'), /not an image sips can read/);
});

test('rejects an empty upload', () => {
  assert.throws(attempt('new-photo.jpg', { bytes: Buffer.alloc(0) }), /arrived empty/);
});

test('rejects a missing filename', () => {
  assert.throws(attempt(''), /missing a filename/);
  assert.throws(attempt(undefined), /missing a filename/);
});

test('rejects a name with nothing slug-worthy in it', () => {
  assert.throws(attempt('!!!.jpg'), /no characters usable in a slug/);
});

test('a traversal attempt is reduced to its basename before anything else', () => {
  // '../../originals/IMG_1337.png' must collapse to 'IMG_1337.png', which then
  // trips the duplicate check — proving the path never survived.
  assert.throws(attempt('../../originals/IMG_1337.png'), /already uses/);
});
