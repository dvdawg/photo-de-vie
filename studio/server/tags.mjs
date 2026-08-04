/**
 * The tag vocabulary the editor autocompletes against.
 *
 * `tagCategories` is curated by hand in `src/data/photos.ts` and drives the
 * filter dropdown's headings; the studio reads it so it can warn when a tag
 * you type would land in the automatic "Other" group.
 */
import { readFileSync } from 'node:fs';
import { PHOTOS_TS_PATH } from './paths.mjs';

/** Extracts the `tagCategories` literal. It is plain data, so JS can parse it. */
export function readTagCategories() {
  const src = readFileSync(PHOTOS_TS_PATH, 'utf8');
  const start = src.indexOf('tagCategories');
  if (start < 0) return [];
  // Seek past the `=` first: the type annotation carries its own brackets
  // (`tags: string[]`), and starting at the nearest `[` would grab one of those.
  const assign = src.indexOf('=', start);
  const open = src.indexOf('[', assign);
  const close = src.indexOf('\n];', open);
  if (assign < 0 || open < 0 || close < 0) return [];
  try {
    return new Function(`return ${src.slice(open, close + 2)}`)();
  } catch {
    return [];
  }
}

/** Every tag in use, most-used first, with the category it belongs to. */
export function tagVocabulary(library) {
  const counts = new Map();
  for (const photo of library) {
    for (const tag of photo.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const categoryOf = new Map();
  for (const category of readTagCategories()) {
    for (const tag of category.tags) categoryOf.set(tag, category.name);
  }

  // Tags that are curated but unused still belong in the autocomplete.
  for (const tag of categoryOf.keys()) if (!counts.has(tag)) counts.set(tag, 0);

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count, category: categoryOf.get(tag) ?? 'Other' }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
