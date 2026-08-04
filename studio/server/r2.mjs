/**
 * Answers "is this photograph actually live?" by asking the bucket.
 *
 * The bucket is public, so a plain `HEAD` needs no credentials. Results are
 * cached for the life of the dev server because uploads happen out-of-band —
 * the UI offers a refresh once you have dragged files into Cloudflare.
 */
import { readFileSync } from 'node:fs';
import { PHOTOS_TS_PATH } from './paths.mjs';

const CONCURRENCY = 8;
const TIMEOUT_MS = 8000;

/** slug → { lg: boolean, sm: boolean } */
const cache = new Map();

/** The bucket URL the site builds its `src`/`thumb` from. */
export function r2BaseUrl() {
  const src = readFileSync(PHOTOS_TS_PATH, 'utf8');
  return src.match(/const R2_BASE_URL = '([^']*)'/)?.[1] ?? '';
}

async function exists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok;
  } catch {
    // Offline, DNS failure, timeout — all mean "cannot confirm it is there".
    return false;
  }
}

export async function r2Status(library, { refresh = false } = {}) {
  const base = r2BaseUrl();
  if (!base) return { configured: false, photos: {} };
  if (refresh) cache.clear();

  const todo = library.filter((p) => !cache.has(p.file));
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, todo.length) }, async () => {
      while (next < todo.length) {
        const { file } = todo[next++];
        const [lg, sm] = await Promise.all([
          exists(`${base}/${file}-lg.jpg`),
          exists(`${base}/${file}-sm.jpg`),
        ]);
        cache.set(file, { lg, sm });
      }
    })
  );

  const photos = {};
  for (const { file } of library) photos[file] = cache.get(file) ?? { lg: false, sm: false };
  return { configured: true, base, photos };
}

/** Forget one slug, so a freshly ingested photo is not reported from cache. */
export function forgetR2(file) {
  cache.delete(file);
}
