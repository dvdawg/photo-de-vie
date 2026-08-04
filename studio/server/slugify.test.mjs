/**
 * The slug rules are duplicated between `process-photos.sh` and `slugify.mjs`.
 * These tests pin the JS side to the shell's observed output — including the
 * real filenames in `originals/`, whose slugs are already committed in
 * `library.json`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LIBRARY_PATH } from './paths.mjs';
import { slugFromFilename, slugify } from './slugify.mjs';

test('lowercases and dashes separators', () => {
  assert.equal(slugify('IMG_1076_3_edited-11'), 'img-1076-3-edited-11');
  assert.equal(slugify('Dawn Ridge'), 'dawn-ridge');
  assert.equal(slugify('a_b c-d'), 'a-b-c-d');
});

test('drops characters outside [a-z0-9-]', () => {
  assert.equal(slugify("Point Reyes (2024) — #3!"), 'point-reyes-2024-3');
  assert.equal(slugify('café/bar'), 'cafbar');
});

test('collapses dash runs and trims the ends', () => {
  assert.equal(slugify('--a---b--'), 'a-b');
  assert.equal(slugify('___'), '');
  assert.equal(slugify(''), '');
});

test('strips one trailing extension, not dots inside the name', () => {
  assert.equal(slugFromFilename('IMG_1337.png'), 'img-1337');
  assert.equal(slugFromFilename('shot.v2.jpeg'), 'shotv2');
  assert.equal(slugFromFilename('no-extension'), 'no-extension');
});

test('reproduces every slug the shell script produced for the library', () => {
  const library = JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'));
  assert.ok(library.length > 0, 'library.json should not be empty');

  for (const { file } of library) {
    // A committed slug must be a fixed point: re-slugging it changes nothing.
    assert.equal(slugify(file), file, `${file} is not a stable slug`);
  }

  // The originals these came from, spot-checked against their committed slugs.
  assert.equal(slugFromFilename('IMG_1076_3_edited-11.png'), 'img-1076-3-edited-11');
  assert.equal(slugFromFilename('IMG_1374_3.png'), 'img-1374-3');
  assert.equal(slugFromFilename('IMG_3005.png'), 'img-3005');
});
