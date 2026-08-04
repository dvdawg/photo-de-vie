/**
 * The studio's HTTP surface, mounted on the Vite dev server.
 *
 * Everything lives under `/__studio/`: JSON under `/__studio/api/`, plus a
 * thumbnail route because `processed/` sits outside `public/` and the dev
 * server will not serve it otherwise.
 */
import { execFile } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ingestPhoto } from './ingest.mjs';
import { normalizeEntry, readLibrary, writeLibrary } from './library.mjs';
import { resamplePalette, syncPalettes } from './palette.mjs';
import { PROCESSED_DIR, StudioError } from './paths.mjs';
import { forgetR2, r2Status } from './r2.mjs';
import { slugify } from './slugify.mjs';
import { tagVocabulary } from './tags.mjs';

export const STUDIO_PREFIX = '/__studio/';

/** Refuse anything larger than this, so a stray drop cannot exhaust memory. */
const MAX_UPLOAD_BYTES = 120 * 1024 * 1024;

export async function handleStudio(req, res) {
  const url = new URL(req.url, 'http://studio.local');
  const path = url.pathname.slice('/__studio'.length);

  try {
    if (path.startsWith('/thumb/')) {
      sendThumb(res, decodeURIComponent(path.slice('/thumb/'.length)));
      return;
    }
    if (!path.startsWith('/api/')) throw new StudioError('unknown studio route', 404);
    sendJson(res, 200, await dispatch(path.slice('/api'.length), req, url));
  } catch (err) {
    const status = err instanceof StudioError ? err.status : 500;
    if (status >= 500) console.error('[studio]', err);
    sendJson(res, status, { error: err.message });
  }
}

async function dispatch(route, req, url) {
  const { method } = req;

  if (route === '/library' && method === 'GET') {
    const photos = readLibrary();
    return { photos, tags: tagVocabulary(photos) };
  }

  if (route === '/library' && method === 'PUT') {
    const { photos } = await readJson(req);
    const saved = writeLibrary(photos);
    syncPalettes(saved);
    return { photos: saved, tags: tagVocabulary(saved) };
  }

  if (route === '/ingest' && method === 'POST') {
    const bytes = await readBody(req);
    const library = readLibrary();
    const entry = ingestPhoto({
      // The client percent-encodes it, since headers cannot carry raw non-ASCII.
      filename: decodeURIComponent(req.headers['x-studio-filename'] ?? ''),
      bytes,
      library,
    });
    const saved = writeLibrary([...library, normalizeEntry(entry)]);
    resamplePalette(entry.file);
    forgetR2(entry.file);
    return { entry, photos: saved, tags: tagVocabulary(saved) };
  }

  if (route.startsWith('/palette/') && method === 'POST') {
    const file = safeSlug(route.slice('/palette/'.length));
    return { file, palette: resamplePalette(file) };
  }

  if (route === '/r2-status' && method === 'GET') {
    return r2Status(readLibrary(), { refresh: url.searchParams.get('refresh') === '1' });
  }

  if (route === '/reveal' && method === 'POST') {
    const { file } = await readJson(req);
    const thumb = file ? join(PROCESSED_DIR, `${safeSlug(file)}-sm.jpg`) : null;
    const target = thumb && existsSync(thumb) ? ['-R', thumb] : [PROCESSED_DIR];
    execFile('open', target, () => {});
    return { revealed: true };
  }

  throw new StudioError(`no studio route for ${method} ${route}`, 404);
}

function sendThumb(res, name) {
  const file = safeSlug(name.replace(/-sm\.jpg$/, ''));
  const path = join(PROCESSED_DIR, `${file}-sm.jpg`);
  if (!existsSync(path)) {
    sendJson(res, 404, { error: `no local thumbnail for "${file}"` });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': statSync(path).size,
    'Cache-Control': 'no-cache',
  });
  createReadStream(path).pipe(res);
}

/** Guards every path segment that reaches the filesystem. */
function safeSlug(raw) {
  const slug = String(raw ?? '').trim();
  if (!slug || slugify(slug) !== slug) throw new StudioError(`"${raw}" is not a valid slug`);
  return slug;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        reject(new StudioError('upload is too large (120 MB limit)', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new StudioError('request body was not valid JSON');
  }
}
