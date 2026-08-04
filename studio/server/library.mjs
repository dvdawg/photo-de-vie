/**
 * Reads and writes `src/data/library.json` — the studio's only owned file.
 *
 * Every write goes through `normalizeEntry`, so a malformed request can never
 * leave the site's data file in a state that breaks the build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { LIBRARY_PATH, StudioError } from './paths.mjs';
import { slugify } from './slugify.mjs';

/** Written in this order so diffs stay stable regardless of client key order. */
const FIELD_ORDER = ['file', 'title', 'location', 'year', 'tags', 'width', 'height'];

export function readLibrary() {
  return JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'));
}

/**
 * Coerces one client-supplied entry into exactly the `PhotoInput` shape,
 * dropping blank optional fields rather than storing empty strings.
 */
export function normalizeEntry(raw) {
  const file = String(raw?.file ?? '').trim();
  if (!file) throw new StudioError('entry is missing a file slug');
  if (slugify(file) !== file) {
    throw new StudioError(`"${file}" is not a valid slug`);
  }

  const title = String(raw.title ?? '').trim();
  if (!title) throw new StudioError(`"${file}" needs a title`);

  const width = Number(raw.width);
  const height = Number(raw.height);
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new StudioError(`"${file}" has invalid dimensions`);
  }

  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
    : [];

  const entry = { file, title, tags, width, height };

  const location = String(raw.location ?? '').trim();
  if (location) entry.location = location;

  if (raw.year !== undefined && raw.year !== null && String(raw.year).trim() !== '') {
    const year = Number(raw.year);
    if (!Number.isInteger(year) || year < 1800 || year > 2200) {
      throw new StudioError(`"${file}" has an invalid year`);
    }
    entry.year = year;
  }

  return Object.fromEntries(
    FIELD_ORDER.filter((k) => entry[k] !== undefined).map((k) => [k, entry[k]])
  );
}

/** Validates a whole library, rejecting duplicate slugs. */
export function normalizeLibrary(entries) {
  if (!Array.isArray(entries)) throw new StudioError('library must be an array');

  const seen = new Set();
  return entries.map((raw) => {
    const entry = normalizeEntry(raw);
    if (seen.has(entry.file)) throw new StudioError(`"${entry.file}" appears twice`);
    seen.add(entry.file);
    return entry;
  });
}

export function writeLibrary(entries) {
  const normalized = normalizeLibrary(entries);
  writeFileSync(LIBRARY_PATH, JSON.stringify(normalized, null, 2) + '\n');
  return normalized;
}
