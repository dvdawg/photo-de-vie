/**
 * Keeps `src/data/palettes.json` in step with the library.
 *
 * The hue histogram itself lives in `scripts/extract-palettes.mjs` — this
 * module only decides which slugs to sample and in what order to store them.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractPalette, readPalettes, writePalettes } from '../../scripts/extract-palettes.mjs';
import { PROCESSED_DIR, StudioError } from './paths.mjs';

function thumbPath(file) {
  return join(PROCESSED_DIR, `${file}-sm.jpg`);
}

/** Re-samples one photo and stores the result. Returns the new swatches. */
export function resamplePalette(file) {
  const jpg = thumbPath(file);
  if (!existsSync(jpg)) {
    throw new StudioError(`no local thumbnail for "${file}" — expected ${file}-sm.jpg in processed/`);
  }

  const palette = extractPalette(jpg);
  const all = readPalettes();
  all[file] = palette;
  writePalettes(all);
  return palette;
}

/**
 * Drops palettes for photos no longer in the library and reorders the rest to
 * match it, so the JSON diff after a reorder or removal stays readable.
 */
export function syncPalettes(library) {
  const all = readPalettes();
  const next = {};
  for (const { file } of library) {
    if (all[file]) next[file] = all[file];
  }
  writePalettes(next);
  return next;
}

/** Whether we hold swatches for this slug. */
export function hasPalette(file) {
  const all = readPalettes();
  return Array.isArray(all[file]) && all[file].length > 0;
}
