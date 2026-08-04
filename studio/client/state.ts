/**
 * The working copy of the library.
 *
 * Edits accumulate here rather than hitting the disk per keystroke; `dirty()`
 * reports what has drifted from the last saved baseline so the save bar can
 * say how much is pending.
 */
import type { PhotoEntry, TagInfo } from './types';

let baseline: PhotoEntry[] = [];
let working: PhotoEntry[] = [];
let vocabulary: TagInfo[] = [];

const listeners = new Set<() => void>();

function clone(photos: PhotoEntry[]): PhotoEntry[] {
  return photos.map((p) => ({ ...p, tags: [...p.tags] }));
}

/** Comparable form: drops blank optionals exactly as the server does. */
function canonical(entry: PhotoEntry): string {
  const { file, title, location, year, tags, width, height } = entry;
  return JSON.stringify({
    file,
    title: title.trim(),
    location: location?.trim() || undefined,
    year: year || undefined,
    tags,
    width,
    height,
  });
}

export function setBaseline(photos: PhotoEntry[], tags?: TagInfo[]): void {
  baseline = clone(photos);
  working = clone(photos);
  if (tags) vocabulary = tags;
  notify();
}

export function photos(): PhotoEntry[] {
  return working;
}

export function tagVocabulary(): TagInfo[] {
  return vocabulary;
}

export function find(file: string): PhotoEntry | undefined {
  return working.find((p) => p.file === file);
}

export function update(file: string, patch: Partial<PhotoEntry>): void {
  const entry = find(file);
  if (!entry) return;
  Object.assign(entry, patch);
  notify();
}

export function remove(file: string): void {
  working = working.filter((p) => p.file !== file);
  notify();
}

/** Reorders to match the given slugs; anything unlisted keeps its relative place. */
export function reorder(order: string[]): void {
  const rank = new Map(order.map((file, i) => [file, i]));
  working = [...working].sort(
    (a, b) => (rank.get(a.file) ?? Infinity) - (rank.get(b.file) ?? Infinity)
  );
  notify();
}

export function revert(): void {
  working = clone(baseline);
  notify();
}

export interface Dirty {
  total: number;
  edited: number;
  removed: number;
  reordered: boolean;
}

export function dirty(): Dirty {
  const before = new Map(baseline.map((p) => [p.file, canonical(p)]));
  let edited = 0;

  for (const entry of working) {
    const was = before.get(entry.file);
    if (was !== undefined && was !== canonical(entry)) edited += 1;
  }

  const present = new Set(working.map((p) => p.file));
  const removed = baseline.filter((p) => !present.has(p.file)).length;

  const survivors = baseline.filter((p) => present.has(p.file)).map((p) => p.file);
  const reordered = survivors.join() !== working.filter((p) => before.has(p.file)).map((p) => p.file).join();

  return { total: edited + removed + (reordered ? 1 : 0), edited, removed, reordered };
}

export function subscribe(fn: () => void): void {
  listeners.add(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}
