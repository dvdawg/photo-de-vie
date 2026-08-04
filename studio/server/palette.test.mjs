/**
 * `syncPalettes` rewrites a committed file, so each test restores it before
 * asserting — a failure must not leave `palettes.json` mangled.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { readPalettes } from '../../scripts/extract-palettes.mjs';
import { readLibrary } from './library.mjs';
import { syncPalettes } from './palette.mjs';
import { ROOT } from './paths.mjs';

const PALETTES = join(ROOT, 'src/data/palettes.json');

/** Runs `fn`, always putting the committed file back afterwards. */
function preserving(fn) {
  const original = readFileSync(PALETTES, 'utf8');
  try {
    return fn();
  } finally {
    writeFileSync(PALETTES, original);
  }
}

test('every library photo has swatches', () => {
  const palettes = readPalettes();
  for (const { file } of readLibrary()) {
    assert.ok(Array.isArray(palettes[file]), `${file} has no palette`);
    assert.ok(palettes[file].length > 0, `${file} has an empty palette`);
  }
});

test('no swatch is malformed', () => {
  for (const [file, palette] of Object.entries(readPalettes())) {
    for (const { angle, swatch } of palette) {
      assert.match(swatch, /^#[0-9a-f]{6}$/, `${file} has a bad swatch: ${swatch}`);
      assert.ok(Number.isInteger(angle) && angle >= 0 && angle < 360, `${file} angle ${angle}`);
    }
  }
});

test('syncing against the committed library is a no-op', () => {
  const before = readFileSync(PALETTES, 'utf8');
  preserving(() => syncPalettes(readLibrary()));
  assert.equal(readFileSync(PALETTES, 'utf8'), before);
});

test('syncing drops photos the library no longer has', () => {
  const library = readLibrary();
  const removed = library[0].file;

  const result = preserving(() => syncPalettes(library.slice(1)));

  assert.equal(removed in result, false, 'orphaned palette should be gone');
  assert.equal(Object.keys(result).length, library.length - 1);
});

test('syncing reorders palettes to match the library', () => {
  const library = readLibrary();
  const reversed = [...library].reverse();

  const result = preserving(() => syncPalettes(reversed));

  assert.deepEqual(
    Object.keys(result),
    reversed.map((p) => p.file)
  );
});
